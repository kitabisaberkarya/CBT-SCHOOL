# ============================================================
#  Shepherd — CBT School Guardian Robot
#  Edit file ini sesuai kredensial di sekolah masing-masing
# ============================================================

CBT_URL = "http://localhost"

# ── Admin ─────────────────────────────────────────────────
ADMIN_USERNAME = "admin@cbtschool.com"   # email lengkap admin
ADMIN_PASSWORD = "admin"                 # password admin

# ── Guru (kosongkan jika tidak ingin tes role ini) ────────
GURU_USERNAME  = ""   # username / NIP guru
GURU_PASSWORD  = ""

# ── Pengawas ──────────────────────────────────────────────
PENGAWAS_USERNAME = ""
PENGAWAS_PASSWORD = ""

# ── Siswa ─────────────────────────────────────────────────
SISWA_USERNAME        = "0099999999"    # NISN siswa Shepherd demo (Module 36)
SISWA_PASSWORD        = "shepherd123"
EXAM_TEST_TOKEN       = "SHEPHERD-001"  # Token identitas ujian (di tabel tests.token)
EXAM_SESSION_TOKEN    = "12345"         # Token sesi proktor (exam_token_settings.current_token)
                                        # Kosongkan ("") jika token proktor tidak aktif

# ── Browser ───────────────────────────────────────────────
HEADLESS       = True    # False = lihat browser berjalan
TIMEOUT_MS     = 15_000  # timeout per aksi (ms)
SLOW_API_MS    = 3_000   # threshold API lambat (ms)

# ── Chromium path (hasil playwright install) ──────────────
CHROMIUM_PATH  = "/usr/bin/google-chrome"
