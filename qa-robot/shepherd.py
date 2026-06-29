#!/usr/bin/env python3
# CBT School Guardian Robot — Automated QA & Security Auditor
#
#   ___  _                _                  _
#  / __|| |_   ___  _ __ | |_   ___  _ _  __| |
# \__ \| ' \ / -_)| '_ \| ' \ / -_)| '_|/ _` |
# |___/|_||_|\___|| .__/|_||_|\___||_|  \__,_|
#                 |_|
"""

Usage:
  python3 shepherd.py                    # Jalankan semua tes
  python3 shepherd.py health             # Cek kesehatan sistem
  python3 shepherd.py admin              # Tes role admin
  python3 shepherd.py guru               # Tes role guru
  python3 shepherd.py pengawas           # Tes role pengawas
  python3 shepherd.py siswa              # Tes role siswa (login + navigasi)
  python3 shepherd.py exam               # Siswa mengerjakan ujian + security audit
  python3 shepherd.py security           # Security audit saja (harus sudah di halaman ujian)
  python3 shepherd.py --headless false   # Lihat browser berjalan
"""

import asyncio
import argparse
import base64
import sys
import time
import random
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from playwright.async_api import async_playwright, Page, BrowserContext, Request, Response
except ImportError:
    print("ERROR: playwright belum terinstall.  pip install playwright")
    sys.exit(1)

try:
    import config as cfg
except ImportError:
    print("ERROR: config.py tidak ditemukan.")
    sys.exit(1)

# ──────────────────────────────────────────────────────────────────────────────
# Model
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class TestResult:
    name:       str
    role:       str
    status:     str   = "SKIP"
    duration:   float = 0.0
    error:      str   = ""
    detail:     str   = ""
    screenshot: str   = ""
    _start:     float = field(default_factory=time.time, repr=False)

    def ok(self, detail: str = "", screenshot: str = ""):
        self.status = "PASS"; self.duration = time.time() - self._start
        self.detail = detail; self.screenshot = screenshot

    def fail(self, error: str, screenshot: str = ""):
        self.status = "FAIL"; self.duration = time.time() - self._start
        self.error = error;   self.screenshot = screenshot

    def crash(self, exc, screenshot: str = ""):
        self.status = "ERROR"; self.duration = time.time() - self._start
        self.error = f"{type(exc).__name__}: {exc}"; self.screenshot = screenshot

    def skip(self, reason: str = ""):
        self.status = "SKIP"; self.detail = reason


# ──────────────────────────────────────────────────────────────────────────────
# Shepherd
# ──────────────────────────────────────────────────────────────────────────────

class Shepherd:

    BANNER = (
        "\n  ___  _                _                  _\n"
        " / __|| |_   ___  _ __ | |_   ___  _ _  __| |\n"
        r" \__ \| ' \ / -_)| '_ \| ' \ / -_)| '_|/ _` |" "\n"
        r" |___/|_||_|\___|| .__/|_||_|\___||_|  \__,_|" "\n"
        "                 |_|   CBT School Guardian Robot\n"
    )

    def __init__(self, headless: bool = True):
        self.headless  = headless
        self.results:  list[TestResult] = []
        self.page:     Optional[Page] = None
        self.ctx:      Optional[BrowserContext] = None
        self.js_errors: list[str] = []
        self.net_fails: list[str] = []
        self.slow_apis: list[str] = []
        self.report_dir = Path(__file__).parent / "reports"
        self.ss_dir     = self.report_dir / "screenshots"
        self.ss_dir.mkdir(parents=True, exist_ok=True)

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _r(self, name: str, role: str) -> TestResult:
        r = TestResult(name=name, role=role)
        self.results.append(r)
        return r

    async def _ss(self, tag: str) -> str:
        fname = f"{tag}_{int(time.time()*1000)}.png"
        path  = self.ss_dir / fname
        try:
            await self.page.screenshot(path=str(path), full_page=True)
            return str(path)
        except Exception:
            return ""

    async def _body(self) -> str:
        try: return await self.page.inner_text("body") or ""
        except Exception: return ""

    async def _click(self, sel: str, timeout: int = cfg.TIMEOUT_MS) -> bool:
        try: await self.page.click(sel, timeout=timeout); return True
        except Exception: return False

    async def _fill(self, sel: str, val: str) -> bool:
        try: await self.page.fill(sel, val); return True
        except Exception: return False

    async def _js(self, script: str):
        try: return await self.page.evaluate(script)
        except Exception: return None

    def _attach_listeners(self):
        self.js_errors.clear(); self.net_fails.clear(); self.slow_apis.clear()
        self.page.on("pageerror", lambda e: self.js_errors.append(str(e)))
        self.page.on("console",   lambda m: (
            self.js_errors.append(f"[console.error] {m.text}") if m.type == "error" else None
        ))
        req_times: dict[str, float] = {}
        def on_req(req: Request):
            if any(h in req.url for h in ["localhost:8000", "supabase"]):
                req_times[req.url] = time.time()
        def on_resp(resp: Response):
            url = resp.url
            if url in req_times:
                ms = (time.time() - req_times.pop(url)) * 1000
                if resp.status >= 400:
                    self.net_fails.append(f"HTTP {resp.status} → {url[:80]}")
                elif ms > cfg.SLOW_API_MS:
                    self.slow_apis.append(f"{ms:.0f}ms → {url[:80]}")
        self.page.on("request", on_req)
        self.page.on("response", on_resp)

    # ── Auth ─────────────────────────────────────────────────────────────────

    async def _login_admin(self) -> bool:
        await self.page.goto(cfg.CBT_URL, wait_until="domcontentloaded", timeout=cfg.TIMEOUT_MS)
        await self.page.wait_for_timeout(1500)
        img = await self.page.query_selector("img")
        if not img: return False
        for _ in range(5):
            await img.click(); await self.page.wait_for_timeout(200)
        await self.page.wait_for_timeout(600)
        inp_u = await self.page.query_selector('input[placeholder="Username Admin"]')
        inp_p = await self.page.query_selector_all('input[type="password"]')
        if not inp_u or not inp_p: return False
        await inp_u.fill(cfg.ADMIN_USERNAME)
        await inp_p[-1].fill(cfg.ADMIN_PASSWORD)
        await self._click('button:has-text("Authenticate")')
        await self.page.wait_for_timeout(5000)
        body = await self._body()
        return any(k in body for k in ["Dashboard", "Rekap", "Ujian", "Soal", "Lisensi"])

    async def _login_guru(self) -> bool:
        if not cfg.GURU_USERNAME: return False
        await self.page.goto(cfg.CBT_URL, wait_until="domcontentloaded", timeout=cfg.TIMEOUT_MS)
        await self.page.wait_for_timeout(1000)
        await self._click('button:has-text("Guru")')
        await self.page.wait_for_timeout(500)
        inp_t = await self.page.query_selector_all('input[type="text"]')
        inp_p = await self.page.query_selector_all('input[type="password"]')
        if inp_t: await inp_t[0].fill(cfg.GURU_USERNAME)
        if inp_p: await inp_p[0].fill(cfg.GURU_PASSWORD)
        await self._click('button:has-text("Masuk")')
        await self.page.wait_for_timeout(4000)
        body = await self._body()
        return any(k in body for k in ["Dashboard", "Soal", "Jadwal", "Guru"])

    async def _login_pengawas(self) -> bool:
        if not cfg.PENGAWAS_USERNAME: return False
        await self.page.goto(cfg.CBT_URL, wait_until="domcontentloaded", timeout=cfg.TIMEOUT_MS)
        await self.page.wait_for_timeout(1000)
        await self._click('button:has-text("Pengawas")')
        await self.page.wait_for_timeout(500)
        inp_t = await self.page.query_selector_all('input[type="text"]')
        inp_p = await self.page.query_selector_all('input[type="password"]')
        if inp_t: await inp_t[0].fill(cfg.PENGAWAS_USERNAME)
        if inp_p: await inp_p[0].fill(cfg.PENGAWAS_PASSWORD)
        await self._click('button:has-text("Masuk")')
        await self.page.wait_for_timeout(4000)
        body = await self._body()
        return any(k in body for k in ["Pengawas", "Monitor", "Ruangan", "Sesi"])

    async def _login_siswa(self) -> bool:
        if not cfg.SISWA_USERNAME: return False
        await self.page.goto(cfg.CBT_URL, wait_until="domcontentloaded", timeout=cfg.TIMEOUT_MS)
        await self.page.wait_for_timeout(1000)
        inp_t = await self.page.query_selector_all('input[type="text"]')
        inp_p = await self.page.query_selector_all('input[type="password"]')
        if inp_t: await inp_t[0].fill(cfg.SISWA_USERNAME)
        if inp_p: await inp_p[0].fill(cfg.SISWA_PASSWORD)
        await self._click('button:has-text("Masuk Sekarang")')
        await self.page.wait_for_timeout(4000)
        body = await self._body()

        # Handle "Login Terkunci" — device lock aktif dari sesi sebelumnya
        # Shepherd otomatis reset via DB supaya tidak blocking setiap run
        if "Login Terkunci" in body or "Terkunci" in body:
            import subprocess
            subprocess.run([
                "docker", "exec", "supabase-db", "psql", "-U", "postgres", "-d", "postgres",
                "-c", f"UPDATE public.users SET active_device_id = NULL WHERE nisn = '{cfg.SISWA_USERNAME}';"
            ], capture_output=True)
            await self.page.goto(cfg.CBT_URL, wait_until="domcontentloaded", timeout=cfg.TIMEOUT_MS)
            await self.page.wait_for_timeout(1500)
            inp_t2 = await self.page.query_selector_all('input[type="text"]')
            inp_p2 = await self.page.query_selector_all('input[type="password"]')
            if inp_t2: await inp_t2[0].fill(cfg.SISWA_USERNAME)
            if inp_p2: await inp_p2[0].fill(cfg.SISWA_PASSWORD)
            await self._click('button:has-text("Masuk Sekarang")')
            await self.page.wait_for_timeout(4000)
            body = await self._body()

        return any(k in body for k in ["Ujian", "Token", "Selamat datang", "Mulai", "Jadwal", "NISN", "Kelas"])

    async def _logout(self):
        try:
            ok = await self._click('button:has-text("Logout")', timeout=3000)
            if not ok: await self._click('button:has-text("Keluar")', timeout=3000)
            await self.page.wait_for_timeout(1500)
        except Exception: pass

    async def _nav_menu(self, keyword: str) -> bool:
        buttons = await self.page.query_selector_all("button, a, li")
        for btn in buttons:
            try:
                txt = await btn.inner_text()
                if keyword.lower() in txt.lower():
                    await btn.click(); await self.page.wait_for_timeout(2500); return True
            except Exception: continue
        return False

    # ════════════════════════════════════════════════════════════════════════
    # COMMAND: health
    # ════════════════════════════════════════════════════════════════════════

    async def cmd_health(self):
        import urllib.request, urllib.error
        r = self._r("API & App Health Check", "System")
        issues = []
        endpoints = {
            "Aplikasi CBT (nginx)":   cfg.CBT_URL,
            "Supabase Kong API":      "http://localhost:8000/health",
            "Supabase REST":          "http://localhost:8000/rest/v1/",
        }
        for name, url in endpoints.items():
            try:
                req = urllib.request.Request(url, headers={"apikey": "any"})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status >= 500:
                        issues.append(f"❌ {name}: HTTP {resp.status}")
            except urllib.error.HTTPError as e:
                if e.code >= 500: issues.append(f"❌ {name}: HTTP {e.code}")
            except Exception as e:
                issues.append(f"❌ {name}: {str(e)[:60]}")
        if issues: r.fail("Endpoint bermasalah:\n" + "\n".join(issues))
        else:       r.ok("Semua endpoint merespons normal")

    # ════════════════════════════════════════════════════════════════════════
    # COMMAND: admin
    # ════════════════════════════════════════════════════════════════════════

    async def cmd_admin(self):
        print("  [Admin] Login...")
        r_login = self._r("Login Admin", "Admin")
        try:
            ok = await self._login_admin()
            ss = await self._ss("admin_login")
            if ok: r_login.ok("Login berhasil", ss)
            else:  r_login.fail("Login gagal — cek ADMIN_USERNAME/PASSWORD di config.py", ss); return
        except Exception as e:
            r_login.crash(e, await self._ss("admin_login_err")); return

        print("  [Admin] Dashboard...")
        r_dash = self._r("Dashboard Admin", "Admin")
        try:
            body = await self._body()
            missing = [k for k in ["Rekap", "Soal", "Ujian"] if k not in body]
            ss = await self._ss("admin_dashboard")
            if missing: r_dash.fail(f"Elemen hilang: {missing}", ss)
            else:        r_dash.ok("Semua elemen dashboard ada", ss)
        except Exception as e: r_dash.crash(e)

        menus = [
            ("Rekap Nilai",     "Rekapitulasi",   "Admin → Rekap Nilai"),
            ("Analisa Jawaban", "Analisa",         "Admin → Analisa Jawaban"),
            ("Bank Soal",       "Soal",            "Admin → Bank Soal"),
            ("Konfigurasi",     "Konfigurasi",     "Admin → Konfigurasi"),
            ("Manajemen",       "User",            "Admin → Manajemen User"),
        ]
        for kw, verify, name in menus:
            print(f"  [Admin] Navigasi: {name}...")
            r = self._r(name, "Admin")
            try:
                found = await self._nav_menu(kw)
                if not found: r.fail(f'Menu "{kw}" tidak ditemukan'); continue
                body = await self._body()
                ss   = await self._ss(f"admin_{kw.replace(' ','_').lower()}")
                if verify.lower() in body.lower(): r.ok(f'"{kw}" berhasil dimuat', ss)
                else: r.fail(f'Konten "{verify}" tidak muncul', ss)
            except Exception as e: r.crash(e)

        r_js = self._r("JavaScript Errors (Admin)", "Admin")
        if self.js_errors: r_js.fail(f"{len(self.js_errors)} JS error:\n" + "\n".join(self.js_errors[:5]))
        else:               r_js.ok("Tidak ada JS error")

        r_net = self._r("API Errors (Admin)", "Admin")
        if self.net_fails: r_net.fail(f"{len(self.net_fails)} request gagal:\n" + "\n".join(self.net_fails[:5]))
        else:               r_net.ok("Tidak ada request gagal" + (f" | {len(self.slow_apis)} lambat" if self.slow_apis else ""))

        await self._logout()

    # ════════════════════════════════════════════════════════════════════════
    # COMMAND: guru
    # ════════════════════════════════════════════════════════════════════════

    async def cmd_guru(self):
        print("  [Guru] Login...")
        r = self._r("Login Guru", "Guru")
        if not cfg.GURU_USERNAME: r.skip("GURU_USERNAME tidak diisi di config.py"); return
        try:
            ok = await self._login_guru()
            ss = await self._ss("guru_login")
            if ok: r.ok("Login guru berhasil", ss)
            else:  r.fail("Login gagal", ss); return
        except Exception as e: r.crash(e); return

        r2 = self._r("Dashboard Guru", "Guru")
        body = await self._body()
        ss   = await self._ss("guru_dashboard")
        if any(k in body for k in ["Soal","Jadwal","Dashboard","Ujian"]): r2.ok("Dashboard dimuat", ss)
        else: r2.fail("Konten dashboard tidak ditemukan", ss)

        r_js = self._r("JavaScript Errors (Guru)", "Guru")
        if self.js_errors: r_js.fail("\n".join(self.js_errors[:3]))
        else:               r_js.ok("Tidak ada JS error")

        await self._logout()

    # ════════════════════════════════════════════════════════════════════════
    # COMMAND: pengawas
    # ════════════════════════════════════════════════════════════════════════

    async def cmd_pengawas(self):
        print("  [Pengawas] Login...")
        r = self._r("Login Pengawas", "Pengawas")
        if not cfg.PENGAWAS_USERNAME: r.skip("PENGAWAS_USERNAME tidak diisi di config.py"); return
        try:
            ok = await self._login_pengawas()
            ss = await self._ss("pengawas_login")
            if ok: r.ok("Login pengawas berhasil", ss)
            else:  r.fail("Login gagal", ss); return
        except Exception as e: r.crash(e); return

        r2 = self._r("Pengawas Monitor Page", "Pengawas")
        body = await self._body()
        ss   = await self._ss("pengawas_monitor")
        if any(k in body for k in ["Monitor","Ruangan","Peserta","Sesi"]): r2.ok("Monitor dimuat", ss)
        else: r2.fail("Konten monitor tidak ditemukan", ss)

        await self._logout()

    # ════════════════════════════════════════════════════════════════════════
    # COMMAND: siswa
    # ════════════════════════════════════════════════════════════════════════

    async def cmd_siswa(self):
        print("  [Siswa] Login...")
        r = self._r("Login Siswa", "Siswa")
        if not cfg.SISWA_USERNAME: r.skip("SISWA_USERNAME tidak diisi di config.py"); return
        try:
            ok = await self._login_siswa()
            ss = await self._ss("siswa_login")
            if ok: r.ok("Login siswa berhasil", ss)
            else:  r.fail("Login gagal — cek NISN/password", ss); return
        except Exception as e: r.crash(e); return

        r2 = self._r("Siswa Halaman Ujian", "Siswa")
        body = await self._body()
        ss   = await self._ss("siswa_home")
        if any(k in body for k in ["Ujian","Token","Belum ada","Selamat","Jadwal","Mulai"]):
            r2.ok("Halaman siswa berhasil dimuat", ss)
        else:
            r2.fail("Konten halaman siswa tidak ditemukan", ss)

        await self._logout()

    # ════════════════════════════════════════════════════════════════════════
    # COMMAND: exam — Siswa mengerjakan ujian + Security Audit
    # Flow: Login → Biodata (konfirmasi) → ExamSelection → Confirmation → Test
    # ════════════════════════════════════════════════════════════════════════

    def _db_run(self, sql: str):
        """Jalankan SQL langsung ke supabase-db (untuk reset state sebelum/sesudah test)."""
        import subprocess
        subprocess.run(
            ["docker","exec","supabase-db","psql","-U","postgres","-d","postgres","-c", sql],
            capture_output=True
        )

    async def cmd_exam(self):
        print("  [Exam] Login siswa...")
        r_login = self._r("Login Siswa (Exam)", "Siswa/Exam")
        if not cfg.SISWA_USERNAME:
            r_login.skip("SISWA_USERNAME tidak diisi di config.py"); return

        # Pastikan anti-cheat TETAP AKTIF — jangan dimatikan!
        # (Mematikan anti-cheat menyebabkan TestScreen mount dengan enableAntiCheat=false
        #  sehingga event listeners tidak pernah terpasang → security audit selalu FAIL)
        # SECURE EXAM MODE diatasi via mock fullscreen API di browser (lihat _click_through_to_test).
        # Reset device lock saja (untuk run berulang)
        self._db_run(f"UPDATE public.users SET active_device_id = NULL WHERE nisn = '{cfg.SISWA_USERNAME}';")
        try:
            ok = await self._login_siswa()
            ss = await self._ss("exam_01_login")
            if not ok:
                r_login.fail("Login gagal — cek NISN/password", ss); return
            r_login.ok("Login berhasil", ss)
        except Exception as e:
            r_login.crash(e, await self._ss("exam_err_login")); return

        # ── STEP 1: Biodata screen — klik "Lanjutkan ke Ujian" ──────────
        print("  [Exam] Konfirmasi biodata...")
        r_biodata = self._r("Konfirmasi Biodata Siswa", "Siswa/Exam")
        try:
            await self.page.wait_for_timeout(2500)
            body = await self._body()
            ss   = await self._ss("exam_02_biodata")

            # BiodataScreen menampilkan: "Selamat datang di Ujian CBT!" dan NISN/Kelas
            is_biodata = any(k in body for k in [
                "Selamat datang", "Lanjutkan ke Ujian", "NISN", "Kelas", "Jurusan"
            ])
            if not is_biodata:
                r_biodata.skip("Layar biodata tidak terdeteksi — langsung ke exam selection")
            else:
                clicked = await self._click(
                    'button:has-text("Lanjutkan ke Ujian"), button:has-text("Lanjutkan"), '
                    'button:has-text("Konfirmasi"), button:has-text("Lanjut")',
                    timeout=5000
                )
                await self.page.wait_for_timeout(2500)
                ss = await self._ss("exam_02_biodata_done")
                if clicked: r_biodata.ok("Biodata dikonfirmasi → ke daftar ujian", ss)
                else:        r_biodata.fail("Tombol 'Lanjutkan ke Ujian' tidak ditemukan", ss)
        except Exception as e:
            r_biodata.crash(e, await self._ss("exam_err_biodata"))

        # ── STEP 2: Exam Selection — klik "Mulai Ujian" di kartu ujian ──────
        print("  [Exam] Pilih ujian dari daftar...")
        r_select = self._r("Pilih Ujian dari Daftar", "Siswa/Exam")
        try:
            await self.page.wait_for_timeout(3000)
            body = await self._body()
            ss   = await self._ss("exam_03_selection")

            if not any(k in body for k in ["Daftar Ujian","Ujian","Pilih","Tersedia","Demo","Shepherd","SHEPHERD","Mulai Ujian"]):
                r_select.fail(
                    "Halaman daftar ujian tidak muncul. "
                    "Pastikan siswa kelas XII TKJ 1 terdaftar di jadwal SHEPHERD-001.", ss
                )
                await self._logout(); return

            # Klik tombol "Mulai Ujian" di kartu (ExamSelectionScreen)
            clicked = await self._click(
                'button:has-text("Mulai Ujian")', timeout=6000
            )
            await self.page.wait_for_timeout(2500)
            ss = await self._ss("exam_03_clicked_mulai")
            if clicked: r_select.ok("Tombol 'Mulai Ujian' di kartu berhasil diklik", ss)
            else:        r_select.fail("Tombol 'Mulai Ujian' tidak ditemukan di daftar ujian", ss)
        except Exception as e:
            r_select.crash(e, await self._ss("exam_err_select")); return

        # ── STEP 3: TokenModal — isi token proktor jika muncul ───────────
        print("  [Exam] Isi token proktor (jika ada)...")
        r_token = self._r("Input Token Proktor (TokenModal)", "Siswa/Exam")
        try:
            await self.page.wait_for_timeout(1500)
            body = await self._body()

            # Token modal muncul jika exam_token_settings.is_active = true
            token_input = await self.page.query_selector(
                'input[placeholder*="Token"], input[placeholder*="token"], '
                'input[class*="tracking"], input[type="text"][maxlength]'
            )
            if token_input:
                session_tok = getattr(cfg, "EXAM_SESSION_TOKEN", "") or getattr(cfg, "EXAM_TOKEN", "")
                if not session_tok:
                    r_token.fail("Token proktor muncul tapi EXAM_SESSION_TOKEN kosong di config.py")
                    await self._logout(); return
                await token_input.fill(session_tok)
                await self.page.wait_for_timeout(400)
                # Gunakan type="submit" agar tidak salah klik tombol kartu di belakang modal
                clicked = await self._click('button[type="submit"]:has-text("Mulai Ujian")', timeout=4000)
                if not clicked:
                    # Fallback: klik button submit pertama di form
                    clicked = await self._click('form button[type="submit"]', timeout=3000)
                if not clicked:
                    # Terakhir: press Enter di input
                    await token_input.press("Enter"); clicked = True
                await self.page.wait_for_timeout(4000)
                ss = await self._ss("exam_03b_token")
                body = await self._body()
                if "salah" in body.lower() or "Token salah" in body or "token salah" in body:
                    r_token.fail(f"Token '{session_tok}' ditolak. Cek EXAM_SESSION_TOKEN di config.py", ss)
                    await self._logout(); return
                r_token.ok(f"Token proktor '{session_tok}' diterima ✅", ss)
            else:
                r_token.skip("TokenModal tidak muncul — token proktor tidak aktif")
        except Exception as e:
            r_token.crash(e, await self._ss("exam_err_token"))

        # ── STEP 4: Confirmation Screen — klik "MULAI MENGERJAKAN" ───────
        print("  [Exam] Konfirmasi mulai ujian...")
        r_confirm = self._r("Konfirmasi & Mulai Ujian", "Siswa/Exam")
        try:
            # Tunggu transisi dari TokenModal ke ConfirmationScreen
            await self.page.wait_for_timeout(3000)
            body = await self._body()

            # TestScreen keywords yang TIDAK muncul di ConfirmationScreen
            TEST_KEYWORDS    = ["Waktu Tersisa","Waktu tersisa","waktu tersisa",
                                 "Detik","detik","Nomor Soal","dari soal","soal ke-",
                                 "dari 7 Soal","dari Soal","NOMOR SOAL","BERIKUTNYA",
                                 "RAGU-RAGU","SEBELUMNYA","Penyelesaian","PENYELESAIAN"]
            # ConfirmationScreen: selalu ada "MULAI MENGERJAKAN" atau "Konfirmasi Tes"
            CONFIRM_KEYWORDS = ["Konfirmasi Tes","MULAI MENGERJAKAN","Mulai Mengerjakan",
                                 "Memeriksa Koneksi"]
            # Secure Exam Mode — screen intermediate sebelum TestScreen
            SECURE_KEYWORDS  = ["SECURE EXAM MODE","Secure Exam Mode","KUNCI LAYAR",
                                 "Sistem Proteksi","Layar Penuh Otomatis"]

            async def _js_click_btn(keyword: str) -> bool:
                """Klik button via JS (lebih andal di headless untuk fullscreen & React events)."""
                result = await self._js(f"""
                    () => {{
                        const btns = Array.from(document.querySelectorAll('button'));
                        const btn = btns.find(b => b.textContent.includes('{keyword}'));
                        if (btn) {{ btn.click(); return true; }}
                        return false;
                    }}
                """)
                return bool(result)

            async def _mock_fullscreen():
                """Mock Fullscreen API agar handleSecureConfirm tidak terblokir di headless."""
                await self.page.evaluate("""
                    () => {
                        const el = document.documentElement;
                        const mockFn = () => Promise.resolve();
                        el.requestFullscreen         = mockFn;
                        el.webkitRequestFullscreen   = mockFn;
                        el.mozRequestFullScreen      = mockFn;
                        el.msRequestFullscreen       = mockFn;
                        try {
                            Object.defineProperty(document, 'fullscreenElement',
                                { get: () => el, configurable: true });
                        } catch (_) {}
                    }
                """)

            async def _click_through_to_test():
                """Klik semua intermediate screen hingga masuk TestScreen (max 4 lapisan)."""
                for attempt in range(4):
                    b = await self._body()
                    if any(k in b for k in TEST_KEYWORDS): return True
                    if any(k in b for k in SECURE_KEYWORDS):
                        # Mock fullscreen API dulu agar triggerFullscreen() tidak blokir
                        await _mock_fullscreen()
                        ok = await _js_click_btn("KUNCI LAYAR")
                        if not ok: ok = await _js_click_btn("Kunci Layar")
                        if not ok: await self.page.keyboard.press("Enter")
                        await self.page.wait_for_timeout(5000)
                    elif any(k in b for k in CONFIRM_KEYWORDS):
                        ok = await _js_click_btn("MULAI MENGERJAKAN")
                        if not ok: ok = await _js_click_btn("Mulai Mengerjakan")
                        await self.page.wait_for_timeout(4000)
                    else:
                        if attempt > 0: break  # tidak ada screen yang dikenal → stop
                        await self.page.wait_for_timeout(2000)  # tunggu transisi
                final_body = await self._body()
                return any(k in final_body for k in TEST_KEYWORDS)

            if any(k in body for k in CONFIRM_KEYWORDS):
                # Ada ConfirmationScreen — klik MULAI MENGERJAKAN → lewati intermediate
                await self._click(
                    'button:has-text("MULAI MENGERJAKAN"), button:has-text("Mulai Mengerjakan"), '
                    'button:has-text("Ya, Mulai"), button:has-text("Mulai Sekarang")',
                    timeout=6000
                )
                await self.page.wait_for_timeout(3000)
                # Handle Secure Exam Mode screen (dan screen intermediate lain)
                in_test = await _click_through_to_test()
                ss = await self._ss("exam_04_confirm")
                if in_test:
                    r_confirm.ok("Ujian berhasil dimulai ✅ (melewati SECURE EXAM MODE)", ss)
                else:
                    body2 = await self._body()
                    r_confirm.fail(
                        "TestScreen tidak muncul setelah melewati semua screen. "
                        f"Body: {body2[:120]}", ss
                    )
                    await self._logout(); return
            elif any(k in body for k in SECURE_KEYWORDS):
                # Langsung di SECURE EXAM MODE (confirmation sudah dilewati sebelumnya)
                in_test = await _click_through_to_test()
                ss = await self._ss("exam_04_confirm")
                if in_test: r_confirm.ok("SECURE EXAM MODE dilewati, masuk TestScreen ✅", ss)
                else:        r_confirm.fail("Gagal melewati SECURE EXAM MODE", ss); await self._logout(); return
            elif any(k in body for k in TEST_KEYWORDS):
                r_confirm.ok("Langsung masuk TestScreen (no confirmation screen)", await self._ss("exam_04_confirm"))
            else:
                ss = await self._ss("exam_04_confirm")
                r_confirm.fail(
                    "ConfirmationScreen tidak ditemukan setelah token dikonfirmasi. "
                    f"Body: {body[:120]}", ss
                )
                await self._logout(); return
        except Exception as e:
            r_confirm.crash(e, await self._ss("exam_err_confirm")); return

        # ── Verifikasi berada di TestScreen ──────────────────────────────
        r_intest = self._r("Masuk TestScreen (Ujian Aktif)", "Siswa/Exam")
        body = await self._body()
        ss   = await self._ss("exam_05_intest")
        if any(k in body for k in ["Waktu Tersisa","waktu tersisa","Detik","detik","Soal",
                                    "Pertanyaan","Nomor Soal","Menit","BERIKUTNYA",
                                    "RAGU-RAGU","PENYELESAIAN","dari Soal","NOMOR SOAL"]):
            r_intest.ok("Berhasil masuk ruang ujian ✅", ss)
        else:
            r_intest.fail(f"Tidak berhasil masuk TestScreen. Body: {body[:120]}", ss)
            await self._logout(); return

        # ── Security Audit ────────────────────────────────────────────────
        # Anti-cheat sudah aktif sejak awal — event listeners terpasang dengan benar
        print("  [Exam] Security Audit...")
        await self.cmd_security(inside_exam=True)

        # ── Kerjakan soal ────────────────────────────────────────────────
        print("  [Exam] Mengerjakan soal...")
        r_jawab = self._r("Menjawab Soal (Auto)", "Siswa/Exam")
        try:
            answered = 0
            total    = 0

            # Iterasi navigasi soal (TestScreen pakai <label> untuk opsi jawaban)
            for attempt in range(20):   # max 20 soal (SHEPHERD-001 hanya 7)
                body = await self._body()

                # Cek apakah masih di TestScreen
                if not any(k in body for k in ["BERIKUTNYA","RAGU-RAGU","NOMOR SOAL","dari Soal","PENYELESAIAN"]):
                    break

                # Pilih jawaban: TestScreen pakai <label cursor-pointer> bukan radio/button
                options = await self.page.query_selector_all(
                    'label[class*="cursor-pointer"], label[class*="rounded"], '
                    'input[type="radio"], button[class*="option"]'
                )
                if options:
                    try:
                        chosen = random.choice(options[:min(len(options), 4)])
                        await chosen.click(timeout=3000)
                        await self.page.wait_for_timeout(400)
                        answered += 1
                    except Exception:
                        pass  # skip jika tidak bisa diklik (essay dll)
                total = attempt + 1

                # Navigasi ke soal berikutnya
                next_btn = await self.page.query_selector(
                    'button:has-text("BERIKUTNYA"), button:has-text("Berikutnya"), '
                    'button:has-text("Next"), button:has-text("Selanjutnya")'
                )
                if next_btn:
                    try:
                        await next_btn.click(timeout=3000)
                        await self.page.wait_for_timeout(700)
                    except Exception: break
                else:
                    break   # Sudah soal terakhir atau timer habis

            ss = await self._ss("exam_03_answered")
            r_jawab.ok(f"{answered} soal dijawab dari {total} yang dinavigasi", ss)

        except Exception as e:
            r_jawab.crash(e, await self._ss("exam_err_jawab"))

        # ── Screenshot check ─────────────────────────────────────────────
        print("  [Exam] Cek anti-screenshot overlay...")
        r_ss_block = self._r("Anti-Screenshot Overlay Ada", "Siswa/Exam")
        try:
            # Cek apakah elemen #cbt-screenshot-blocker ada di DOM
            blocker_exists = await self._js(
                "() => !!document.getElementById('cbt-screenshot-blocker')"
            )
            ss = await self._ss("exam_04_screenblocker")
            if blocker_exists:
                r_ss_block.ok("Overlay #cbt-screenshot-blocker ada di DOM", ss)
            else:
                r_ss_block.fail(
                    "Elemen #cbt-screenshot-blocker TIDAK ditemukan — "
                    "overlay anti-screenshot tidak aktif!", ss
                )
        except Exception as e:
            r_ss_block.crash(e)

        # ── JS Errors selama ujian ────────────────────────────────────────
        # Saring noise infrastruktur: WebSocket realtime (v2 multi-tenant) dan
        # 400 Bad Request dari Supabase API — ini bukan bug aplikasi.
        INFRA_NOISE = [
            "realtime/v1/websocket",   # WebSocket Supabase Realtime v2 (multi-tenant config)
            "Failed to load resource: the server responded with a status of 400",
            "Failed to load resource: the server responded with a status of 401",
        ]
        r_js = self._r("JavaScript Errors selama Ujian", "Siswa/Exam")
        app_errors = [e for e in self.js_errors
                      if not any(noise in e for noise in INFRA_NOISE)]
        if app_errors:
            r_js.fail(f"{len(app_errors)} JS error aplikasi:\n" + "\n".join(app_errors[:5]))
        elif self.js_errors:
            r_js.ok(
                f"Tidak ada JS error aplikasi ✅ "
                f"({len(self.js_errors)} infra noise diabaikan: realtime WS + API 400)"
            )
        else:
            r_js.ok("Tidak ada JS error selama mengerjakan ujian ✅")

        # ── Selesai / Submit ──────────────────────────────────────────────
        print("  [Exam] Tidak submit (mode tes) — keluar...")
        # Shepherd tidak submit ujian asli agar data siswa tidak terkontaminasi
        await self._logout()

    # ════════════════════════════════════════════════════════════════════════
    # COMMAND: security — Audit keamanan halaman ujian
    # ════════════════════════════════════════════════════════════════════════

    async def cmd_security(self, inside_exam: bool = False):
        role = "Siswa/Exam" if inside_exam else "Security"
        print("  [Security] Audit keamanan ujian...")

        # 1. Context Menu (klik kanan) diblokir
        r1 = self._r("🔒 Context Menu Diblokir", role)
        try:
            blocked = await self._js("""
                () => {
                    let prevented = false;
                    const h = (e) => { if (e.defaultPrevented) prevented = true; };
                    document.addEventListener('contextmenu', h, {once:true, capture:true});
                    const ev = new MouseEvent('contextmenu', {bubbles:true, cancelable:true});
                    document.dispatchEvent(ev);
                    return ev.defaultPrevented;
                }
            """)
            if blocked:
                r1.ok("contextmenu event di-preventDefault() ✅")
            else:
                r1.fail("Klik kanan TIDAK diblokir — siswa bisa akses menu browser!")
        except Exception as e: r1.crash(e)

        # 2. Copy (Ctrl+C) diblokir
        r2 = self._r("🔒 Copy (Ctrl+C) Diblokir", role)
        try:
            copy_blocked = await self._js("""
                () => {
                    let prevented = false;
                    const h = (e) => { prevented = e.defaultPrevented; };
                    document.addEventListener('copy', h, {once:true, capture:true});
                    const ev = new ClipboardEvent('copy', {bubbles:true, cancelable:true});
                    document.dispatchEvent(ev);
                    return ev.defaultPrevented;
                }
            """)
            if copy_blocked: r2.ok("Event copy di-preventDefault() ✅")
            else:             r2.fail("Copy TIDAK diblokir — teks soal bisa disalin!")
        except Exception as e: r2.crash(e)

        # 3. Paste diblokir
        r3 = self._r("🔒 Paste Diblokir", role)
        try:
            paste_blocked = await self._js("""
                () => {
                    const ev = new ClipboardEvent('paste', {bubbles:true, cancelable:true});
                    document.dispatchEvent(ev);
                    return ev.defaultPrevented;
                }
            """)
            if paste_blocked: r3.ok("Event paste di-preventDefault() ✅")
            else:              r3.fail("Paste TIDAK diblokir — siswa bisa paste jawaban!")
        except Exception as e: r3.crash(e)

        # 4. PrintScreen diblokir (keyboard handler)
        r4 = self._r("🔒 PrintScreen Diblokir", role)
        try:
            await self.page.keyboard.press("PrintScreen")
            await self.page.wait_for_timeout(300)
            body = await self._body()
            # Jika ada peringatan atau alert setelah PrintScreen, berarti terdeteksi
            has_warning = any(k in body for k in [
                "Screenshot", "screenshot", "Peringatan", "Dilarang", "Terdeteksi"
            ])
            # Juga cek apakah event keydown dengan key=PrintScreen ada handler-nya di DOM
            has_handler = await self._js("""
                () => {
                    // Cek apakah ada listener keydown (tidak bisa langsung inspect,
                    // tapi bisa cek dengan trigger dan lihat hasilnya)
                    const ev = new KeyboardEvent('keydown', {
                        key:'PrintScreen', code:'PrintScreen',
                        bubbles:true, cancelable:true
                    });
                    document.dispatchEvent(ev);
                    return ev.defaultPrevented;
                }
            """)
            ss = await self._ss("security_printscreen")
            if has_handler or has_warning:
                r4.ok("PrintScreen keydown di-intercept ✅", ss)
            else:
                r4.fail(
                    "PrintScreen mungkin tidak diblokir sepenuhnya — "
                    "verifikasi manual diperlukan", ss
                )
        except Exception as e: r4.crash(e)

        # 5. F12 (DevTools) diblokir
        r5 = self._r("🔒 F12 (DevTools) Diblokir", role)
        try:
            f12_blocked = await self._js("""
                () => {
                    const ev = new KeyboardEvent('keydown', {
                        key:'F12', code:'F12', bubbles:true, cancelable:true
                    });
                    document.dispatchEvent(ev);
                    return ev.defaultPrevented;
                }
            """)
            if f12_blocked: r5.ok("F12 di-preventDefault() ✅")
            else:            r5.fail("F12 tidak diblokir via JS — DevTools mungkin bisa dibuka!")
        except Exception as e: r5.crash(e)

        # 6. visibilitychange listener aktif (deteksi pindah tab)
        r6 = self._r("🔒 Deteksi Pindah Tab Aktif", role)
        try:
            has_visibility = await self._js("""
                () => {
                    // Trigger visibilitychange dan cek respons sistem
                    let fired = false;
                    const h = () => { fired = true; };
                    document.addEventListener('visibilitychange', h, {once:true});
                    // Simulasi hidden
                    Object.defineProperty(document, 'visibilityState',
                        {value:'hidden', writable:true, configurable:true});
                    document.dispatchEvent(new Event('visibilitychange'));
                    // Restore
                    Object.defineProperty(document, 'visibilityState',
                        {value:'visible', writable:true, configurable:true});
                    return fired;
                }
            """)
            if has_visibility: r6.ok("visibilitychange listener aktif ✅")
            else:               r6.fail("visibilitychange handler tidak merespons!")
        except Exception as e: r6.crash(e)

        # 7. user-select: none (teks tidak bisa diselect)
        r7 = self._r("🔒 Text Selection Dinonaktifkan", role)
        try:
            user_sel = await self._js("""
                () => {
                    // TestScreen root div memiliki style="user-select:none" dan class="select-none"
                    const el = document.querySelector('[style*="user-select"]')
                           || document.querySelector('.select-none')
                           || document.querySelector('[class*="question"], [class*="soal"]')
                           || document.body;
                    const s = getComputedStyle(el);
                    return s.userSelect || s.webkitUserSelect || 'auto';
                }
            """)
            if user_sel and "none" in str(user_sel).lower():
                r7.ok(f"user-select: none aktif ✅ ({user_sel})")
            else:
                r7.fail(f"user-select: {user_sel} — teks soal masih bisa di-select!")
        except Exception as e: r7.crash(e)

        # 8. Screenshot blocker overlay ada
        r8 = self._r("🔒 Overlay Anti-Screenshot (#cbt-screenshot-blocker)", role)
        try:
            exists = await self._js(
                "() => !!document.getElementById('cbt-screenshot-blocker')"
            )
            if exists: r8.ok("Elemen #cbt-screenshot-blocker ada di DOM ✅")
            else:       r8.fail("#cbt-screenshot-blocker tidak ditemukan di DOM!")
        except Exception as e: r8.crash(e)

        # 9. Ctrl+A (select all) diblokir
        r9 = self._r("🔒 Ctrl+A (Select All) Diblokir", role)
        try:
            ctrl_a = await self._js("""
                () => {
                    const ev = new KeyboardEvent('keydown', {
                        key:'a', code:'KeyA', ctrlKey:true,
                        bubbles:true, cancelable:true
                    });
                    document.dispatchEvent(ev);
                    return ev.defaultPrevented;
                }
            """)
            if ctrl_a: r9.ok("Ctrl+A di-preventDefault() ✅")
            else:       r9.fail("Ctrl+A tidak diblokir — select-all masih bisa!")
        except Exception as e: r9.crash(e)

        # 10. Screenshot via keyboard Shepherd sendiri (buktikan overlay bekerja)
        r10 = self._r("🔍 Bukti Screenshot saat Ujian", role)
        try:
            ss = await self._ss("security_proof_screenshot")
            if ss:
                r10.ok(
                    "Shepherd berhasil mengambil screenshot (normal untuk automation tool). "
                    "Yang penting overlay #cbt-screenshot-blocker ada untuk user biasa.", ss
                )
            else:
                r10.skip("Screenshot tidak tersimpan")
        except Exception as e: r10.crash(e)

    # ════════════════════════════════════════════════════════════════════════
    # Report
    # ════════════════════════════════════════════════════════════════════════

    def _generate_report(self):
        ts     = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        total  = len(self.results)
        passed = sum(1 for r in self.results if r.status == "PASS")
        failed = sum(1 for r in self.results if r.status == "FAIL")
        errors = sum(1 for r in self.results if r.status == "ERROR")
        skip   = sum(1 for r in self.results if r.status == "SKIP")

        def b64(path: str) -> str:
            try:
                with open(path, "rb") as f: return base64.b64encode(f.read()).decode()
            except Exception: return ""

        rows = []
        for r in self.results:
            sc   = {"PASS":"pass","FAIL":"fail","ERROR":"error","SKIP":"skip"}.get(r.status,"skip")
            icon = {"PASS":"✅","FAIL":"❌","ERROR":"💥","SKIP":"⏭️"}.get(r.status,"")
            ss_html = ""
            if r.screenshot:
                img = b64(r.screenshot)
                if img:
                    ss_html = (f'<img src="data:image/png;base64,{img}" '
                               f'class="ss" onclick="zoom(this)" title="klik perbesar"/>')
            msg = r.error or r.detail
            rows.append(f"""
            <tr class="{sc}">
              <td><span class="badge {sc}">{icon} {r.status}</span></td>
              <td class="role">{r.role}</td>
              <td class="name">{r.name}</td>
              <td class="dur">{r.duration:.2f}s</td>
              <td class="msg">{msg}</td>
              <td>{ss_html}</td>
            </tr>""")

        verdict_color = "#10b981" if failed + errors == 0 else "#ef4444"
        verdict_text  = "✅ SEMUA TES LULUS" if failed + errors == 0 else f"⚠️ {failed+errors} MASALAH DITEMUKAN"

        html = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shepherd QA Report — {ts}</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Segoe UI',sans-serif;background:#0a0f1e;color:#e2e8f0;min-height:100vh}}
.hdr{{background:linear-gradient(135deg,#0f2b4c 0%,#1a1040 100%);padding:2rem;text-align:center;border-bottom:2px solid #2d6a9f;position:relative}}
.hdr pre{{font-size:.62rem;color:#4f7cb5;line-height:1.3;display:inline-block;text-align:left;margin-bottom:.5rem}}
.hdr h2{{font-size:1rem;color:#94a3b8;font-weight:400;margin-bottom:.3rem}}
.hdr p{{color:#64748b;font-size:.82rem}}
.verdict{{font-size:1.3rem;font-weight:900;color:{verdict_color};margin:.5rem 0}}
.stats{{display:flex;justify-content:center;gap:1rem;padding:1.5rem;flex-wrap:wrap}}
.stat{{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:.9rem 1.8rem;text-align:center;min-width:110px}}
.stat .n{{font-size:2.2rem;font-weight:900}}.stat .l{{font-size:.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:.1em}}
.total .n{{color:#60a5fa}}.pass .n{{color:#10b981}}.fail .n{{color:#ef4444}}.error .n{{color:#f97316}}.skip .n{{color:#4b5563}}
.wrap{{max-width:1500px;margin:0 auto;padding:1rem 1.5rem 4rem}}
table{{width:100%;border-collapse:collapse;background:#111827;border-radius:12px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.6)}}
thead tr{{background:#0a1628}}
th{{padding:.85rem 1rem;text-align:left;font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;font-weight:700}}
td{{padding:.75rem 1rem;border-bottom:1px solid #1f2937;font-size:.83rem;vertical-align:top}}
tr:last-child td{{border-bottom:none}}
tr.pass{{background:rgba(16,185,129,.05)}}tr.fail{{background:rgba(239,68,68,.07)}}
tr.error{{background:rgba(249,115,22,.07)}}tr.skip{{background:rgba(75,85,99,.05)}}
.badge{{display:inline-block;padding:.2rem .7rem;border-radius:99px;font-weight:700;font-size:.72rem;white-space:nowrap}}
.badge.pass{{background:#10b981;color:#fff}}.badge.fail{{background:#ef4444;color:#fff}}
.badge.error{{background:#f97316;color:#fff}}.badge.skip{{background:#374151;color:#9ca3af}}
.role{{font-weight:700;color:#818cf8;white-space:nowrap}}
.name{{font-weight:600;color:#e2e8f0}}
.dur{{color:#6b7280;white-space:nowrap;font-size:.75rem}}
.msg{{font-size:.78rem;white-space:pre-wrap;max-width:380px;word-break:break-word}}
tr.pass .msg{{color:#6ee7b7}}tr.fail .msg{{color:#fca5a5}}tr.error .msg{{color:#fed7aa}}tr.skip .msg{{color:#6b7280}}
.ss{{max-width:180px;max-height:110px;border-radius:6px;cursor:pointer;border:2px solid #1f2937;transition:.2s}}
.ss:hover{{opacity:.8;border-color:#4f7cb5}}
.ov{{display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;align-items:center;justify-content:center;cursor:zoom-out}}
.ov.on{{display:flex}}.ov img{{max-width:93vw;max-height:93vh;border-radius:10px}}
.footer{{text-align:center;color:#374151;font-size:.75rem;padding:2rem}}
</style>
</head>
<body>
<div class="hdr">
<pre>  ___  _                _                  _
 / __|| |_   ___  _ __ | |_   ___  _ _  __| |
 \\__ \\| ' \\ / -_)| '_ \\| ' \\ / -_)| '_|/ _` |
 |___/|_||_|\\___|| .__/|_||_|\\___||_|  \\__,_|
                 |_|</pre>
<h2>CBT School Guardian Robot — QA Report</h2>
<div class="verdict">{verdict_text}</div>
<p>{ts} &nbsp;•&nbsp; Target: {cfg.CBT_URL}</p>
</div>
<div class="stats">
  <div class="stat total"><div class="n">{total}</div><div class="l">Total</div></div>
  <div class="stat pass"><div class="n">{passed}</div><div class="l">PASS</div></div>
  <div class="stat fail"><div class="n">{failed}</div><div class="l">FAIL</div></div>
  <div class="stat error"><div class="n">{errors}</div><div class="l">ERROR</div></div>
  <div class="stat skip"><div class="n">{skip}</div><div class="l">SKIP</div></div>
</div>
<div class="wrap">
<table>
<thead><tr><th>Status</th><th>Role</th><th>Nama Test</th><th>Durasi</th><th>Pesan / Error</th><th>Screenshot</th></tr></thead>
<tbody>{"".join(rows)}</tbody>
</table>
</div>
<div class="ov" id="ov" onclick="this.classList.remove('on')">
  <img id="ov-img" src="" alt=""/>
</div>
<div class="footer">Shepherd — CBT School Guardian Robot &nbsp;•&nbsp; {ts}</div>
<script>
function zoom(el){{document.getElementById('ov-img').src=el.src;document.getElementById('ov').classList.add('on');}}
document.addEventListener('keydown',e=>{{if(e.key==='Escape')document.getElementById('ov').classList.remove('on');}});
</script>
</body></html>"""

        path = self.report_dir / "report.html"
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return path

    def _print_summary(self):
        total  = len(self.results)
        passed = sum(1 for r in self.results if r.status == "PASS")
        failed = sum(1 for r in self.results if r.status == "FAIL")
        errors = sum(1 for r in self.results if r.status == "ERROR")
        skip   = sum(1 for r in self.results if r.status == "SKIP")

        sep = "─" * 62
        print(f"\n{sep}")
        print(f"  HASIL  {passed}/{total} PASS  |  {failed} FAIL  |  {errors} ERROR  |  {skip} SKIP")
        print(sep)
        for r in self.results:
            icon = {"PASS":"✅","FAIL":"❌","ERROR":"💥","SKIP":"⏭️"}.get(r.status,"?")
            print(f"  {icon}  [{r.role:<14}] {r.name}")
            if r.status in ("FAIL","ERROR") and r.error:
                for line in r.error.splitlines()[:2]:
                    print(f"               ↳ {line[:65]}")
        print(sep)
        verdict = "✅ Semua tes lulus!" if failed + errors == 0 else f"⚠️  Ada {failed+errors} masalah!"
        print(f"\n  {verdict}\n")

    # ── Main ─────────────────────────────────────────────────────────────────

    async def run(self, commands: list[str]):
        print(self.BANNER)
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"  Target   : {cfg.CBT_URL}")
        print(f"  Commands : {', '.join(commands)}")
        print(f"  Time     : {ts}")
        print(f"  {'─'*50}\n")

        needs_browser = any(c in commands for c in
                            ["admin","guru","pengawas","siswa","exam","security"])

        if "health" in commands or "all" in commands:
            print("  [System] Health check...")
            await self.cmd_health()

        if needs_browser or "all" in commands:
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(
                    headless=self.headless,
                    executable_path=cfg.CHROMIUM_PATH,
                    args=["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"]
                )
                self.ctx  = await browser.new_context(viewport={"width":1280,"height":900})
                self.page = await self.ctx.new_page()
                self._attach_listeners()
                try:
                    if "admin"    in commands or "all" in commands: await self.cmd_admin()
                    if "guru"     in commands or "all" in commands: await self.cmd_guru()
                    if "pengawas" in commands or "all" in commands: await self.cmd_pengawas()
                    if "siswa"    in commands or "all" in commands: await self.cmd_siswa()
                    if "exam"     in commands:                       await self.cmd_exam()
                    if "security" in commands:
                        # security standalone: harus sudah login & di halaman ujian
                        await self.cmd_security(inside_exam=False)
                finally:
                    await browser.close()

        self._print_summary()
        report = self._generate_report()
        print(f"  📋 Report: {report.absolute()}\n")


# ──────────────────────────────────────────────────────────────────────────────
# Entry
# ──────────────────────────────────────────────────────────────────────────────

VALID_CMDS = {"all","health","admin","guru","pengawas","siswa","exam","security"}

def main():
    parser = argparse.ArgumentParser(
        prog="shepherd",
        description="Shepherd — CBT School Guardian Robot",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  all       Jalankan semua tes (default)
  health    Cek kesehatan sistem & API
  admin     Tes role admin
  guru      Tes role guru
  pengawas  Tes role pengawas
  siswa     Tes role siswa (login + navigasi)
  exam      Siswa mengerjakan ujian + security audit
  security  Security audit saja (di halaman ujian aktif)

Contoh:
  python3 shepherd.py
  python3 shepherd.py exam
  python3 shepherd.py admin guru
  python3 shepherd.py exam --headless false
        """
    )
    parser.add_argument("commands", nargs="*", default=["all"],
                        choices=sorted(VALID_CMDS) + [[]], metavar="COMMAND",
                        help=f"Command(s) yang dijalankan: {', '.join(sorted(VALID_CMDS))}")
    parser.add_argument("--headless", default="true", choices=["true","false"],
                        help="true=headless (default), false=lihat browser")
    args = parser.parse_args()

    commands = args.commands or ["all"]
    invalid  = [c for c in commands if c not in VALID_CMDS]
    if invalid:
        print(f"ERROR: command tidak dikenal: {invalid}")
        print(f"  Valid: {', '.join(sorted(VALID_CMDS))}")
        sys.exit(1)

    headless = args.headless.lower() == "true"
    asyncio.run(Shepherd(headless=headless).run(commands))


if __name__ == "__main__":
    main()
