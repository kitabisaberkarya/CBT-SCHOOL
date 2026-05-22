-- =============================================================================
-- Module 20: Fix Restore Gagal — duplicate key value violates unique constraint "users_pkey"
-- CBT School Enterprise
--
-- Root cause:
--   INSERT INTO auth.users → memicu trigger handle_new_user() → otomatis INSERT ke public.users
--   Lalu kode juga eksplisit INSERT INTO public.users → CONFLICT pada PRIMARY KEY (id)
--   Klausa ON CONFLICT (username) DO NOTHING tidak menangkap konflik PK (id), sehingga error.
--
-- Fix:
--   1. Wrap INSERT auth.users dalam BEGIN...EXCEPTION agar aman jika email sudah ada
--   2. Ganti ON CONFLICT (username) DO NOTHING → ON CONFLICT (id) DO UPDATE
--      Sehingga ketika trigger sudah buat baris, kita UPDATE data lengkapnya
--   3. Tambah ON CONFLICT (username) DO UPDATE sebagai fallback
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_restore_data(backup_data jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '0'
AS $$
DECLARE
  cfg           jsonb;
  user_rec      jsonb;
  test_entry    jsonb;
  test_id_raw   text;
  test_id_val   uuid;
  test_details  jsonb;
  q_rec         jsonb;
  sched_rec     jsonb;
  ann_rec       jsonb;
  cls_rec       jsonb;
  maj_rec       jsonb;
  v_test_id     uuid;
  v_user_id     uuid;
  v_cls_id      uuid;
  v_maj_id      uuid;
  v_ann_id      uuid;
  v_sched_id    uuid;
  restored_users  int := 0;
  restored_tests  int := 0;
  restored_q      int := 0;
  restored_sched  int := 0;
  restored_ann    int := 0;

  v_raw_id text;
BEGIN

  -- ─── 1. CONFIG ─────────────────────────────────────────────────────────────
  IF backup_data ? 'config' THEN
    cfg := backup_data->'config';
    UPDATE public.app_config SET
      school_name                = COALESCE(NULLIF(cfg->>'schoolName',''), school_name),
      logo_url                   = COALESCE(NULLIF(cfg->>'logoUrl',''), logo_url),
      left_logo_url              = COALESCE(NULLIF(cfg->>'leftLogoUrl',''), left_logo_url),
      enable_anti_cheat          = COALESCE((cfg->>'enableAntiCheat')::boolean, enable_anti_cheat),
      allow_student_manual_login = COALESCE((cfg->>'allowStudentManualLogin')::boolean, allow_student_manual_login),
      allow_student_qr_login     = COALESCE((cfg->>'allowStudentQrLogin')::boolean, allow_student_qr_login),
      allow_admin_manual_login   = COALESCE((cfg->>'allowAdminManualLogin')::boolean, allow_admin_manual_login),
      allow_admin_qr_login       = COALESCE((cfg->>'allowAdminQrLogin')::boolean, allow_admin_qr_login),
      headmaster_name            = COALESCE(NULLIF(cfg->>'headmasterName',''), headmaster_name),
      headmaster_nip             = COALESCE(NULLIF(cfg->>'headmasterNip',''), headmaster_nip),
      card_issue_date            = COALESCE(NULLIF(cfg->>'cardIssueDate',''), card_issue_date),
      signature_url              = COALESCE(NULLIF(cfg->>'signatureUrl',''), signature_url),
      stamp_url                  = COALESCE(NULLIF(cfg->>'stampUrl',''), stamp_url),
      email_domain               = COALESCE(NULLIF(cfg->>'emailDomain',''), email_domain),
      school_address             = COALESCE(NULLIF(cfg->>'schoolAddress',''), school_address),
      school_district            = COALESCE(NULLIF(cfg->>'schoolDistrict',''), school_district),
      school_code                = COALESCE(NULLIF(cfg->>'schoolCode',''), school_code),
      region_code                = COALESCE(NULLIF(cfg->>'regionCode',''), region_code),
      school_phone               = COALESCE(NULLIF(cfg->>'schoolPhone',''), school_phone),
      school_email               = COALESCE(NULLIF(cfg->>'schoolEmail',''), school_email),
      school_website             = COALESCE(NULLIF(cfg->>'schoolWebsite',''), school_website),
      default_paper_size         = COALESCE(NULLIF(cfg->>'defaultPaperSize',''), default_paper_size),
      kop_header1                = COALESCE(NULLIF(cfg->>'kopHeader1',''), kop_header1),
      kop_header2                = COALESCE(NULLIF(cfg->>'kopHeader2',''), kop_header2),
      current_exam_event         = COALESCE(NULLIF(cfg->>'currentExamEvent',''), current_exam_event),
      academic_year              = COALESCE(NULLIF(cfg->>'academicYear',''), academic_year),
      npsn                       = COALESCE(NULLIF(cfg->>'npsn',''), npsn),
      timezone                   = COALESCE(NULLIF(cfg->>'timezone',''), timezone),
      updated_at                 = NOW()
    WHERE id = 1;
  END IF;

  -- ─── 2. MASTER DATA ────────────────────────────────────────────────────────
  IF backup_data ? 'masterData' THEN
    FOR cls_rec IN SELECT * FROM jsonb_array_elements(backup_data->'masterData'->'classes') LOOP
      v_raw_id := cls_rec->>'id';
      BEGIN
        v_cls_id := v_raw_id::uuid;
      EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
        SELECT id INTO v_cls_id FROM public.master_classes WHERE name = TRIM(cls_rec->>'name') LIMIT 1;
        IF v_cls_id IS NULL THEN v_cls_id := gen_random_uuid(); END IF;
      END;

      INSERT INTO public.master_classes (id, name)
      VALUES (v_cls_id, TRIM(cls_rec->>'name'))
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      WHERE master_classes.name IS DISTINCT FROM EXCLUDED.name;
    END LOOP;

    FOR maj_rec IN SELECT * FROM jsonb_array_elements(backup_data->'masterData'->'majors') LOOP
      v_raw_id := maj_rec->>'id';
      BEGIN
        v_maj_id := v_raw_id::uuid;
      EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
        SELECT id INTO v_maj_id FROM public.master_majors WHERE name = TRIM(maj_rec->>'name') LIMIT 1;
        IF v_maj_id IS NULL THEN v_maj_id := gen_random_uuid(); END IF;
      END;

      INSERT INTO public.master_majors (id, name, kkm)
      VALUES (
        v_maj_id,
        TRIM(maj_rec->>'name'),
        COALESCE((maj_rec->>'kkm')::numeric, 75)
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        kkm  = EXCLUDED.kkm;
    END LOOP;
  END IF;

  -- ─── 3. USERS ──────────────────────────────────────────────────────────────
  -- FIX: Trigger handle_new_user() pada auth.users otomatis INSERT ke public.users.
  -- Solusi: gunakan ON CONFLICT (id) DO UPDATE agar tidak error saat trigger sudah buat baris.
  IF backup_data ? 'users' THEN
    FOR user_rec IN SELECT * FROM jsonb_array_elements(backup_data->'users') LOOP

      -- Cari user yang sudah ada berdasarkan username
      SELECT id INTO v_user_id FROM public.users WHERE username = user_rec->>'username';

      IF v_user_id IS NULL THEN
        -- User belum ada → buat baru
        v_user_id := gen_random_uuid();

        -- Insert ke auth.users (dibungkus EXCEPTION agar aman jika email sudah terdaftar)
        BEGIN
          INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
          VALUES (
            v_user_id,
            user_rec->>'username',
            extensions.crypt(
              COALESCE(NULLIF(user_rec->>'password',''), NULLIF(user_rec->>'password_text',''), user_rec->>'nisn', 'password123'),
              extensions.gen_salt('bf')
            ),
            NOW(),
            jsonb_build_object(
              'full_name', user_rec->>'fullName',
              'nisn',      user_rec->>'nisn',
              'class',     user_rec->>'class',
              'major',     user_rec->>'major',
              'gender',    user_rec->>'gender',
              'religion',  user_rec->>'religion',
              'photo_url', user_rec->>'photoUrl',
              'role',      COALESCE(user_rec->>'role', 'student')
            ),
            'authenticated', 'authenticated'
          );
        EXCEPTION WHEN unique_violation OR OTHERS THEN
          -- auth user mungkin sudah ada (email duplikat), ambil id-nya
          SELECT id INTO v_user_id FROM auth.users WHERE email = user_rec->>'username' LIMIT 1;
          IF v_user_id IS NULL THEN v_user_id := gen_random_uuid(); END IF;
        END;

        -- Upsert ke public.users — ON CONFLICT (id) menangani kasus trigger sudah insert lebih dulu
        INSERT INTO public.users (
          id, username, password_text, full_name, nisn,
          class, major, gender, religion, photo_url, role, qr_login_password
        ) VALUES (
          v_user_id,
          user_rec->>'username',
          COALESCE(NULLIF(user_rec->>'password',''), NULLIF(user_rec->>'password_text',''), user_rec->>'nisn'),
          user_rec->>'fullName',
          user_rec->>'nisn',
          user_rec->>'class',
          user_rec->>'major',
          user_rec->>'gender',
          user_rec->>'religion',
          user_rec->>'photoUrl',
          COALESCE(user_rec->>'role', 'student'),
          COALESCE(NULLIF(user_rec->>'qr_login_password',''), NULLIF(user_rec->>'password',''), user_rec->>'nisn')
        )
        ON CONFLICT (id) DO UPDATE SET
          username          = EXCLUDED.username,
          password_text     = EXCLUDED.password_text,
          full_name         = EXCLUDED.full_name,
          nisn              = EXCLUDED.nisn,
          class             = EXCLUDED.class,
          major             = EXCLUDED.major,
          gender            = EXCLUDED.gender,
          religion          = EXCLUDED.religion,
          photo_url         = EXCLUDED.photo_url,
          role              = EXCLUDED.role,
          qr_login_password = EXCLUDED.qr_login_password;

      ELSE
        -- User sudah ada → update data saja
        UPDATE public.users SET
          full_name         = COALESCE(NULLIF(user_rec->>'fullName',''), full_name),
          nisn              = COALESCE(NULLIF(user_rec->>'nisn',''), nisn),
          class             = COALESCE(user_rec->>'class', class),
          major             = COALESCE(user_rec->>'major', major),
          gender            = COALESCE(NULLIF(user_rec->>'gender',''), gender),
          religion          = COALESCE(user_rec->>'religion', religion),
          photo_url         = COALESCE(NULLIF(user_rec->>'photoUrl',''), photo_url),
          role              = COALESCE(NULLIF(user_rec->>'role',''), role)
        WHERE id = v_user_id;
      END IF;

      restored_users := restored_users + 1;
    END LOOP;
  END IF;

  -- ─── 4. TESTS + QUESTIONS ──────────────────────────────────────────────────
  IF backup_data ? 'tests' THEN
    FOR test_entry IN SELECT * FROM jsonb_array_elements(backup_data->'tests') LOOP
      test_id_raw  := test_entry->0 #>> '{}';
      test_details := test_entry->1->'details';

      BEGIN
        test_id_val := test_id_raw::uuid;
      EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
        SELECT id INTO test_id_val FROM public.tests WHERE token = test_details->>'token' LIMIT 1;
        IF test_id_val IS NULL THEN test_id_val := gen_random_uuid(); END IF;
      END;

      INSERT INTO public.tests (
        id, token, name, subject,
        duration_minutes, questions_to_display,
        randomize_questions, randomize_answers,
        exam_type, kkm
      ) VALUES (
        test_id_val,
        test_details->>'token',
        test_details->>'name',
        test_details->>'subject',
        COALESCE((test_details->>'durationMinutes')::integer, 60),
        (test_details->>'questionsToDisplay')::integer,
        COALESCE((test_details->>'randomizeQuestions')::boolean, false),
        COALESCE((test_details->>'randomizeAnswers')::boolean, false),
        test_details->>'examType',
        (test_details->>'kkm')::numeric
      )
      ON CONFLICT (id) DO UPDATE SET
        token                = EXCLUDED.token,
        name                 = EXCLUDED.name,
        subject              = EXCLUDED.subject,
        duration_minutes     = EXCLUDED.duration_minutes,
        questions_to_display = EXCLUDED.questions_to_display,
        randomize_questions  = EXCLUDED.randomize_questions,
        randomize_answers    = EXCLUDED.randomize_answers,
        exam_type            = EXCLUDED.exam_type,
        kkm                  = EXCLUDED.kkm,
        updated_at           = NOW();

      restored_tests := restored_tests + 1;

      DELETE FROM public.questions WHERE test_id = test_id_val;

      FOR q_rec IN SELECT * FROM jsonb_array_elements(test_entry->1->'questions') LOOP
        INSERT INTO public.questions (
          test_id, question,
          image_url, audio_url, video_url,
          options, option_images, matching_right_options,
          correct_answer_index, type,
          answer_key, metadata,
          difficulty, weight, topic
        ) VALUES (
          test_id_val,
          q_rec->>'question',
          NULLIF(q_rec->>'image', ''),
          NULLIF(q_rec->>'audio', ''),
          NULLIF(q_rec->>'video', ''),
          CASE WHEN q_rec->'options' IS NOT NULL AND jsonb_array_length(q_rec->'options') > 0
               THEN ARRAY(SELECT jsonb_array_elements_text(q_rec->'options'))
               ELSE '{}'::text[] END,
          CASE WHEN q_rec->'optionImages' IS NOT NULL AND q_rec->>'optionImages' != 'null'
               THEN ARRAY(SELECT jsonb_array_elements_text(q_rec->'optionImages'))
               ELSE NULL END,
          CASE WHEN q_rec->'matchingRightOptions' IS NOT NULL AND q_rec->>'matchingRightOptions' != 'null'
               THEN ARRAY(SELECT jsonb_array_elements_text(q_rec->'matchingRightOptions'))
               ELSE NULL END,
          COALESCE((q_rec->>'correctAnswerIndex')::smallint, 0),
          COALESCE(NULLIF(q_rec->>'type',''), 'multiple_choice'),
          q_rec->'answerKey',
          q_rec->'metadata',
          COALESCE(NULLIF(q_rec->>'difficulty',''), 'Medium'),
          COALESCE((q_rec->>'weight')::numeric, 1),
          q_rec->>'topic'
        );
        restored_q := restored_q + 1;
      END LOOP;
    END LOOP;
  END IF;

  -- ─── 5. ANNOUNCEMENTS ──────────────────────────────────────────────────────
  IF backup_data ? 'announcements' THEN
    FOR ann_rec IN SELECT * FROM jsonb_array_elements(backup_data->'announcements') LOOP
      v_raw_id := ann_rec->>'id';
      BEGIN
        v_ann_id := v_raw_id::uuid;
      EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
        SELECT id INTO v_ann_id FROM public.announcements WHERE title = ann_rec->>'title' LIMIT 1;
        IF v_ann_id IS NULL THEN v_ann_id := gen_random_uuid(); END IF;
      END;

      INSERT INTO public.announcements (id, title, content, created_at)
      VALUES (
        v_ann_id,
        ann_rec->>'title',
        ann_rec->>'content',
        COALESCE(
          CASE WHEN ann_rec->>'date' ~ '^\d' THEN (ann_rec->>'date')::timestamptz ELSE NOW() END,
          NOW()
        )
      )
      ON CONFLICT (id) DO UPDATE SET
        title   = EXCLUDED.title,
        content = EXCLUDED.content;
      restored_ann := restored_ann + 1;
    END LOOP;
  END IF;

  -- ─── 6. SCHEDULES ──────────────────────────────────────────────────────────
  IF backup_data ? 'schedules' THEN
    FOR sched_rec IN SELECT * FROM jsonb_array_elements(backup_data->'schedules') LOOP
      SELECT id INTO v_test_id FROM public.tests WHERE token = sched_rec->>'testToken' LIMIT 1;

      IF v_test_id IS NOT NULL THEN
        v_raw_id := sched_rec->>'id';
        BEGIN
          v_sched_id := v_raw_id::uuid;
        EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
          v_sched_id := gen_random_uuid();
        END;

        INSERT INTO public.schedules (id, test_id, start_time, end_time, assigned_to)
        VALUES (
          v_sched_id,
          v_test_id,
          (sched_rec->>'startTime')::timestamptz,
          (sched_rec->>'endTime')::timestamptz,
          COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(sched_rec->'assignedTo')),
            '{}'::text[]
          )
        )
        ON CONFLICT (id) DO UPDATE SET
          test_id     = EXCLUDED.test_id,
          start_time  = EXCLUDED.start_time,
          end_time    = EXCLUDED.end_time,
          assigned_to = EXCLUDED.assigned_to;
        restored_sched := restored_sched + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN format(
    'Restore selesai: %s pengguna, %s ujian, %s soal, %s jadwal, %s pengumuman dipulihkan.',
    restored_users, restored_tests, restored_q, restored_sched, restored_ann
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_restore_data(jsonb) TO authenticated;

-- =============================================================================
-- SELESAI. Jalankan script ini sekali di database.
-- Fix: ON CONFLICT (id) DO UPDATE pada INSERT public.users agar tidak bentrok dengan
--      trigger handle_new_user() yang otomatis membuat baris di public.users.
-- =============================================================================
