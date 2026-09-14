-- =============================================================================
-- FIX: submitted_at di student_exam_sessions + admin_restore_data WHERE clause
-- CBT School Enterprise
-- Dibuat: 2026-03-06
-- =============================================================================

-- =============================================================================
-- 1. Tambah kolom submitted_at ke student_exam_sessions
-- =============================================================================
ALTER TABLE public.student_exam_sessions
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- Backfill: isi submitted_at dari updated_at untuk sesi yang sudah Selesai
UPDATE public.student_exam_sessions
SET submitted_at = updated_at
WHERE status = 'Selesai' AND submitted_at IS NULL;

-- =============================================================================
-- 2. Update submit_exam: set submitted_at = now() saat ujian selesai
-- =============================================================================
CREATE OR REPLACE FUNCTION public.submit_exam(
  p_session_id bigint,
  p_score      numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE public.student_exam_sessions
  SET
    score        = p_score,
    status       = 'Selesai',
    time_left_seconds = 0,
    submitted_at = now(),
    updated_at   = now()
  WHERE id = p_session_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  RETURN json_build_object('success', true, 'score', p_score);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_exam(bigint, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam(bigint, numeric) TO anon;

-- =============================================================================
-- 3. Fix admin_restore_data: tambah WHERE id = 1 pada UPDATE app_config
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_restore_data(backup_data jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cfg           jsonb;
  user_rec      jsonb;
  users_arr     jsonb;
  test_entry    jsonb;
  test_id_val   uuid;
  test_details  jsonb;
  q_rec         jsonb;
  sched_rec     jsonb;
  ann_rec       jsonb;
  cls_rec       jsonb;
  maj_rec       jsonb;
  v_test_id     uuid;
  v_user_id     uuid;
  restored_users  int := 0;
  restored_tests  int := 0;
  restored_q      int := 0;
  restored_sched  int := 0;
  restored_ann    int := 0;
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
      INSERT INTO public.master_classes (id, name)
      VALUES ((cls_rec->>'id')::uuid, TRIM(cls_rec->>'name'))
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      WHERE master_classes.name IS DISTINCT FROM EXCLUDED.name;
    END LOOP;

    FOR maj_rec IN SELECT * FROM jsonb_array_elements(backup_data->'masterData'->'majors') LOOP
      INSERT INTO public.master_majors (id, name, kkm)
      VALUES (
        (maj_rec->>'id')::uuid,
        TRIM(maj_rec->>'name'),
        COALESCE((maj_rec->>'kkm')::numeric, 75)
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        kkm  = EXCLUDED.kkm;
    END LOOP;
  END IF;

  -- ─── 3. USERS ──────────────────────────────────────────────────────────────
  IF backup_data ? 'users' THEN
    FOR user_rec IN SELECT * FROM jsonb_array_elements(backup_data->'users') LOOP
      SELECT id INTO v_user_id FROM public.users WHERE username = user_rec->>'username';

      IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
        VALUES (
          v_user_id,
          user_rec->>'username',
          crypt(
            COALESCE(NULLIF(user_rec->>'password',''), NULLIF(user_rec->>'password_text',''), user_rec->>'nisn', 'password123'),
            gen_salt('bf')
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
        ON CONFLICT (username) DO NOTHING;
      ELSE
        UPDATE public.users SET
          full_name  = COALESCE(NULLIF(user_rec->>'fullName',''), full_name),
          nisn       = COALESCE(NULLIF(user_rec->>'nisn',''), nisn),
          class      = COALESCE(user_rec->>'class', class),
          major      = COALESCE(user_rec->>'major', major),
          gender     = COALESCE(NULLIF(user_rec->>'gender',''), gender),
          religion   = COALESCE(user_rec->>'religion', religion),
          photo_url  = COALESCE(NULLIF(user_rec->>'photoUrl',''), photo_url),
          role       = COALESCE(NULLIF(user_rec->>'role',''), role)
        WHERE id = v_user_id;
      END IF;

      restored_users := restored_users + 1;
    END LOOP;
  END IF;

  -- ─── 4. TESTS + QUESTIONS ──────────────────────────────────────────────────
  IF backup_data ? 'tests' THEN
    FOR test_entry IN SELECT * FROM jsonb_array_elements(backup_data->'tests') LOOP
      test_id_val  := (test_entry->0 #>> '{}')::uuid;
      test_details := test_entry->1->'details';

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
      INSERT INTO public.announcements (id, title, content, created_at)
      VALUES (
        (ann_rec->>'id')::uuid,
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
        INSERT INTO public.schedules (id, test_id, start_time, end_time, assigned_to)
        VALUES (
          (sched_rec->>'id')::uuid,
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
-- =============================================================================
