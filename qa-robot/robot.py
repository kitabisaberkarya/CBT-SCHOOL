#!/usr/bin/env python3
"""
CBT School QA Robot
Automated end-to-end tester untuk semua role: Admin, Guru, Pengawas, Siswa.

Usage:
  python robot.py                  # Tes semua role
  python robot.py --role admin     # Tes role tertentu saja
  python robot.py --headless false # Lihat browser berjalan
"""

import asyncio
import argparse
import base64
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from playwright.async_api import async_playwright, Page, BrowserContext, Request, Response
except ImportError:
    print("ERROR: playwright belum terinstall.")
    print("  pip install playwright")
    print("  playwright install chromium")
    sys.exit(1)

# Import konfigurasi
try:
    import config as cfg
except ImportError:
    print("ERROR: config.py tidak ditemukan. Salin dari config.py dan isi kredensial.")
    sys.exit(1)

# ──────────────────────────────────────────────────────────────────────────────
# Model data hasil tes
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class TestResult:
    name:       str
    role:       str
    status:     str = "SKIP"   # PASS | FAIL | ERROR | SKIP
    duration:   float = 0.0
    error:      str = ""
    detail:     str = ""
    screenshot: str = ""
    _start:     float = field(default_factory=time.time, repr=False)

    def ok(self, detail: str = "", screenshot: str = ""):
        self.status = "PASS"
        self.duration = time.time() - self._start
        self.detail = detail
        self.screenshot = screenshot

    def fail(self, error: str, screenshot: str = ""):
        self.status = "FAIL"
        self.duration = time.time() - self._start
        self.error = error
        self.screenshot = screenshot

    def crash(self, exc, screenshot: str = ""):
        self.status = "ERROR"
        self.duration = time.time() - self._start
        self.error = f"{type(exc).__name__}: {exc}"
        self.screenshot = screenshot

    def skip(self, reason: str = ""):
        self.status = "SKIP"
        self.detail = reason


# ──────────────────────────────────────────────────────────────────────────────
# Robot utama
# ──────────────────────────────────────────────────────────────────────────────

class CBTRobot:

    def __init__(self, headless: bool = True, roles: Optional[list] = None):
        self.headless = headless
        self.roles    = roles or ["system", "admin", "guru", "pengawas", "siswa"]
        self.results: list[TestResult] = []

        # State yang di-reset per sesi browser
        self.page:      Optional[Page] = None
        self.ctx:       Optional[BrowserContext] = None
        self.js_errors: list[str] = []
        self.net_fails: list[str] = []
        self.slow_apis: list[str] = []

        self.report_dir = Path(__file__).parent / "reports"
        self.ss_dir     = self.report_dir / "screenshots"
        self.ss_dir.mkdir(parents=True, exist_ok=True)

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _result(self, name: str, role: str) -> TestResult:
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

    async def _has_text(self, *texts: str, timeout: int = 5000) -> bool:
        try:
            for t in texts:
                await self.page.wait_for_function(
                    f"document.body.innerText.includes({repr(t)})",
                    timeout=timeout
                )
            return True
        except Exception:
            return False

    async def _click(self, selector: str, timeout: int = cfg.TIMEOUT_MS) -> bool:
        try:
            await self.page.click(selector, timeout=timeout)
            return True
        except Exception:
            return False

    async def _body(self) -> str:
        try:
            return await self.page.inner_text("body") or ""
        except Exception:
            return ""

    def _attach_listeners(self):
        """Pasang listener JS error + network monitoring."""
        self.js_errors.clear()
        self.net_fails.clear()
        self.slow_apis.clear()

        self.page.on("pageerror", lambda e: self.js_errors.append(str(e)))
        self.page.on("console",   lambda m: (
            self.js_errors.append(f"[console.error] {m.text}")
            if m.type == "error" else None
        ))

        req_times: dict[str, float] = {}

        def on_request(req: Request):
            if "supabase" in req.url or "localhost:8000" in req.url:
                req_times[req.url] = time.time()

        def on_response(resp: Response):
            url = resp.url
            if url in req_times:
                elapsed_ms = (time.time() - req_times.pop(url)) * 1000
                if resp.status >= 400:
                    self.net_fails.append(f"HTTP {resp.status} → {url[:80]}")
                elif elapsed_ms > cfg.SLOW_API_MS:
                    self.slow_apis.append(f"{elapsed_ms:.0f}ms → {url[:80]}")

        self.page.on("request",  on_request)
        self.page.on("response", on_response)

    # ── Auth helpers ─────────────────────────────────────────────────────────

    async def _login_admin(self) -> bool:
        await self.page.goto(cfg.CBT_URL, wait_until="domcontentloaded", timeout=cfg.TIMEOUT_MS)
        await self.page.wait_for_timeout(1500)
        # Klik logo 5× untuk unlock panel admin
        img = await self.page.query_selector("img")
        if not img:
            return False
        for _ in range(5):
            await img.click()
            await self.page.wait_for_timeout(200)
        await self.page.wait_for_timeout(600)
        # Isi form
        inp_user = await self.page.query_selector('input[placeholder="Username Admin"]')
        inp_pass = await self.page.query_selector_all('input[type="password"]')
        if not inp_user or not inp_pass:
            return False
        await inp_user.fill(cfg.ADMIN_USERNAME)
        await inp_pass[-1].fill(cfg.ADMIN_PASSWORD)
        await self._click('button:has-text("Authenticate")')
        await self.page.wait_for_timeout(5000)
        body = await self._body()
        return any(k in body for k in ["Dashboard", "Rekap", "Ujian", "Soal", "Lisensi"])

    async def _login_guru(self) -> bool:
        if not cfg.GURU_USERNAME:
            return False
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
        if not cfg.PENGAWAS_USERNAME:
            return False
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
        if not cfg.SISWA_USERNAME:
            return False
        await self.page.goto(cfg.CBT_URL, wait_until="domcontentloaded", timeout=cfg.TIMEOUT_MS)
        await self.page.wait_for_timeout(1000)
        inp_t = await self.page.query_selector_all('input[type="text"]')
        inp_p = await self.page.query_selector_all('input[type="password"]')
        if inp_t: await inp_t[0].fill(cfg.SISWA_USERNAME)
        if inp_p: await inp_p[0].fill(cfg.SISWA_PASSWORD)
        await self._click('button:has-text("Masuk Sekarang")')
        await self.page.wait_for_timeout(4000)
        body = await self._body()
        return any(k in body for k in ["Ujian", "Token", "Selamat datang", "Mulai", "Jadwal"])

    async def _logout(self):
        try:
            ok = await self._click('button:has-text("Logout")', timeout=3000)
            if not ok:
                await self._click('button:has-text("Keluar")', timeout=3000)
            await self.page.wait_for_timeout(1500)
        except Exception:
            pass

    async def _nav_menu(self, keyword: str) -> bool:
        """Klik item menu yang mengandung kata kunci."""
        buttons = await self.page.query_selector_all("button, a, li")
        for btn in buttons:
            try:
                txt = await btn.inner_text()
                if keyword.lower() in txt.lower():
                    await btn.click()
                    await self.page.wait_for_timeout(2500)
                    return True
            except Exception:
                continue
        return False

    # ── System Tests ─────────────────────────────────────────────────────────

    async def _test_api_health(self):
        import urllib.request, urllib.error
        r = self._result("API & App Health Check", "System")
        issues = []
        endpoints = {
            "Aplikasi CBT (nginx)":   cfg.CBT_URL,
            "Supabase Kong API":      "http://localhost:8000/health",
            "Supabase DB (postgres)": "http://localhost:8000/rest/v1/",
        }
        for name, url in endpoints.items():
            try:
                req = urllib.request.Request(url, headers={"apikey": "any"})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    code = resp.status
                    if code >= 500:
                        issues.append(f"❌ {name}: HTTP {code}")
            except urllib.error.HTTPError as e:
                if e.code < 500:
                    pass  # 4xx = server up, hanya auth issue
                else:
                    issues.append(f"❌ {name}: HTTP {e.code}")
            except Exception as e:
                issues.append(f"❌ {name}: {str(e)[:60]}")
        if issues:
            r.fail("Endpoint bermasalah:\n" + "\n".join(issues))
        else:
            r.ok("Semua endpoint merespons normal")

    # ── Admin Tests ──────────────────────────────────────────────────────────

    async def _tests_admin(self):
        print("  [Admin] Login...")
        r_login = self._result("Login Admin", "Admin")
        ss = ""
        try:
            ok = await self._login_admin()
            ss = await self._ss("admin_01_login")
            if ok:
                r_login.ok("Login berhasil", ss)
            else:
                r_login.fail("Login gagal — cek ADMIN_USERNAME / ADMIN_PASSWORD di config.py", ss)
                return
        except Exception as e:
            r_login.crash(e, await self._ss("admin_err_login"))
            return

        # Dashboard
        print("  [Admin] Dashboard...")
        r_dash = self._result("Dashboard Admin", "Admin")
        try:
            body = await self._body()
            missing = [k for k in ["Rekap", "Soal", "Ujian"] if k not in body]
            ss = await self._ss("admin_02_dashboard")
            if missing:
                r_dash.fail(f"Elemen hilang di dashboard: {missing}", ss)
            else:
                r_dash.ok("Semua elemen dashboard ada", ss)
        except Exception as e:
            r_dash.crash(e, await self._ss("admin_err_dash"))

        # Navigasi menu — pasangan (keyword_klik, teks_verifikasi, nama_tes)
        menus = [
            ("Rekap Nilai",      "Rekapitulasi",       "Admin → Rekap Nilai"),
            ("Analisa Jawaban",  "Analisa",             "Admin → Analisa Jawaban"),
            ("Bank Soal",        "Soal",                "Admin → Bank Soal"),
            ("Konfigurasi",      "Konfigurasi",         "Admin → Konfigurasi"),
            ("Manajemen",        "User",                "Admin → Manajemen User"),
        ]
        for keyword, verify, name in menus:
            print(f"  [Admin] Navigasi: {name}...")
            r = self._result(name, "Admin")
            try:
                found = await self._nav_menu(keyword)
                if not found:
                    r.fail(f'Menu "{keyword}" tidak ditemukan di halaman')
                    continue
                body = await self._body()
                ss   = await self._ss(f"admin_nav_{keyword.replace(' ', '_').lower()}")
                if verify.lower() in body.lower():
                    r.ok(f'Halaman "{keyword}" berhasil dimuat', ss)
                else:
                    r.fail(f'Konten "{verify}" tidak muncul setelah klik "{keyword}"', ss)
            except Exception as e:
                r.crash(e, await self._ss("admin_err_nav"))

        # JS Errors check
        r_js = self._result("JavaScript Errors (Admin)", "Admin")
        if self.js_errors:
            r_js.fail(f"{len(self.js_errors)} JS error:\n" + "\n".join(self.js_errors[:5]))
        else:
            r_js.ok("Tidak ada JavaScript error")

        # Network Fails
        r_net = self._result("API Errors (Admin)", "Admin")
        if self.net_fails:
            r_net.fail(f"{len(self.net_fails)} request gagal:\n" + "\n".join(self.net_fails[:5]))
        else:
            r_net.ok(
                f"Tidak ada request gagal" +
                (f" | {len(self.slow_apis)} request lambat" if self.slow_apis else "")
            )

        await self._logout()

    # ── Guru Tests ───────────────────────────────────────────────────────────

    async def _tests_guru(self):
        print("  [Guru] Login...")
        r_login = self._result("Login Guru", "Guru")
        if not cfg.GURU_USERNAME:
            r_login.skip("GURU_USERNAME tidak diisi di config.py")
            return
        try:
            ok  = await self._login_guru()
            ss  = await self._ss("guru_01_login")
            if ok:
                r_login.ok("Login guru berhasil", ss)
            else:
                r_login.fail("Login guru gagal — cek GURU_USERNAME/PASSWORD", ss)
                return
        except Exception as e:
            r_login.crash(e, await self._ss("guru_err_login"))
            return

        print("  [Guru] Dashboard...")
        r_dash = self._result("Dashboard Guru", "Guru")
        try:
            body = await self._body()
            ss   = await self._ss("guru_02_dashboard")
            if any(k in body for k in ["Soal", "Jadwal", "Dashboard", "Ujian"]):
                r_dash.ok("Dashboard guru berhasil dimuat", ss)
            else:
                r_dash.fail("Dashboard guru tidak memuat konten yang diharapkan", ss)
        except Exception as e:
            r_dash.crash(e)

        r_js = self._result("JavaScript Errors (Guru)", "Guru")
        if self.js_errors:
            r_js.fail(f"{len(self.js_errors)} JS error:\n" + "\n".join(self.js_errors[:3]))
        else:
            r_js.ok("Tidak ada JavaScript error")

        await self._logout()

    # ── Pengawas Tests ───────────────────────────────────────────────────────

    async def _tests_pengawas(self):
        print("  [Pengawas] Login...")
        r_login = self._result("Login Pengawas", "Pengawas")
        if not cfg.PENGAWAS_USERNAME:
            r_login.skip("PENGAWAS_USERNAME tidak diisi di config.py")
            return
        try:
            ok = await self._login_pengawas()
            ss = await self._ss("pengawas_01_login")
            if ok:
                r_login.ok("Login pengawas berhasil", ss)
            else:
                r_login.fail("Login pengawas gagal", ss)
                return
        except Exception as e:
            r_login.crash(e, await self._ss("pengawas_err"))
            return

        print("  [Pengawas] Halaman monitor...")
        r_mon = self._result("Pengawas Monitor Page", "Pengawas")
        try:
            body = await self._body()
            ss   = await self._ss("pengawas_02_monitor")
            if any(k in body for k in ["Monitor", "Ruangan", "Peserta", "Sesi"]):
                r_mon.ok("Halaman monitor pengawas berhasil dimuat", ss)
            else:
                r_mon.fail("Konten monitor pengawas tidak ditemukan", ss)
        except Exception as e:
            r_mon.crash(e)

        r_js = self._result("JavaScript Errors (Pengawas)", "Pengawas")
        r_js.ok("Tidak ada JavaScript error") if not self.js_errors else \
            r_js.fail("\n".join(self.js_errors[:3]))

        await self._logout()

    # ── Siswa Tests ──────────────────────────────────────────────────────────

    async def _tests_siswa(self):
        print("  [Siswa] Login...")
        r_login = self._result("Login Siswa", "Siswa")
        if not cfg.SISWA_USERNAME:
            r_login.skip("SISWA_USERNAME tidak diisi di config.py")
            return
        try:
            ok = await self._login_siswa()
            ss = await self._ss("siswa_01_login")
            if ok:
                r_login.ok("Login siswa berhasil", ss)
            else:
                r_login.fail("Login siswa gagal — cek NISN/password", ss)
                return
        except Exception as e:
            r_login.crash(e, await self._ss("siswa_err"))
            return

        print("  [Siswa] Halaman ujian...")
        r_ujian = self._result("Siswa Halaman Ujian", "Siswa")
        try:
            body = await self._body()
            ss   = await self._ss("siswa_02_home")
            # Tidak ada ujian aktif = normal (bukan error)
            if any(k in body for k in ["Ujian", "Token", "Belum ada", "Selamat", "Jadwal", "Mulai"]):
                r_ujian.ok("Halaman siswa berhasil dimuat", ss)
            else:
                r_ujian.fail("Halaman siswa tidak memuat konten yang diharapkan", ss)
        except Exception as e:
            r_ujian.crash(e)

        r_js = self._result("JavaScript Errors (Siswa)", "Siswa")
        r_js.ok("Tidak ada JavaScript error") if not self.js_errors else \
            r_js.fail("\n".join(self.js_errors[:3]))

        await self._logout()

    # ── HTML Report ──────────────────────────────────────────────────────────

    def _generate_report(self):
        ts     = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        total  = len(self.results)
        passed = sum(1 for r in self.results if r.status == "PASS")
        failed = sum(1 for r in self.results if r.status == "FAIL")
        errors = sum(1 for r in self.results if r.status == "ERROR")
        skip   = sum(1 for r in self.results if r.status == "SKIP")

        def b64_img(path: str) -> str:
            try:
                with open(path, "rb") as f:
                    return base64.b64encode(f.read()).decode()
            except Exception:
                return ""

        rows = []
        for r in self.results:
            sc   = {"PASS":"pass","FAIL":"fail","ERROR":"error","SKIP":"skip"}.get(r.status,"skip")
            icon = {"PASS":"✅","FAIL":"❌","ERROR":"💥","SKIP":"⏭️"}.get(r.status,"")
            ss_html = ""
            if r.screenshot:
                b64 = b64_img(r.screenshot)
                if b64:
                    ss_html = (
                        f'<img src="data:image/png;base64,{b64}" '
                        f'class="ss" onclick="zoom(this)" title="Klik untuk perbesar" />'
                    )
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

        html = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CBT QA Report — {ts}</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}}
.hdr{{background:linear-gradient(135deg,#1e3a5f 0%,#0f2b4c 100%);padding:2rem;text-align:center;border-bottom:2px solid #2d6a9f}}
.hdr h1{{font-size:2rem;font-weight:900;color:#fff;margin-bottom:.4rem}}
.hdr p{{color:#94a3b8;font-size:.9rem}}
.stats{{display:flex;justify-content:center;gap:1rem;padding:1.5rem;flex-wrap:wrap}}
.stat{{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:.9rem 1.8rem;text-align:center;min-width:110px}}
.stat .n{{font-size:2.2rem;font-weight:900}}.stat .l{{font-size:.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em}}
.total .n{{color:#60a5fa}}.pass .n{{color:#10b981}}.fail .n{{color:#ef4444}}.error .n{{color:#f97316}}.skip .n{{color:#64748b}}
.wrap{{max-width:1500px;margin:0 auto;padding:1rem 1.5rem 4rem}}
table{{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.5)}}
thead tr{{background:#0f2b4c}}
th{{padding:.85rem 1rem;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700}}
td{{padding:.75rem 1rem;border-bottom:1px solid #334155;font-size:.85rem;vertical-align:top}}
tr:last-child td{{border-bottom:none}}
tr.pass{{background:rgba(16,185,129,.06)}}tr.fail{{background:rgba(239,68,68,.08)}}
tr.error{{background:rgba(249,115,22,.08)}}tr.skip{{background:rgba(71,85,105,.08)}}
.badge{{display:inline-block;padding:.2rem .7rem;border-radius:99px;font-weight:700;font-size:.75rem;white-space:nowrap}}
.badge.pass{{background:#10b981;color:#fff}}.badge.fail{{background:#ef4444;color:#fff}}
.badge.error{{background:#f97316;color:#fff}}.badge.skip{{background:#475569;color:#fff}}
.role{{font-weight:700;color:#60a5fa;white-space:nowrap}}
.name{{font-weight:600;color:#e2e8f0}}
.dur{{color:#94a3b8;white-space:nowrap}}
.msg{{font-family:monospace;font-size:.78rem;color:#fca5a5;white-space:pre-wrap;max-width:380px;word-break:break-word}}
tr.pass .msg{{color:#86efac}}tr.skip .msg{{color:#94a3b8}}
.ss{{max-width:180px;max-height:110px;border-radius:6px;cursor:pointer;border:2px solid #334155;transition:opacity .2s}}
.ss:hover{{opacity:.85}}
.overlay{{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;align-items:center;justify-content:center;cursor:zoom-out}}
.overlay.on{{display:flex}}.overlay img{{max-width:92vw;max-height:92vh;border-radius:10px;box-shadow:0 0 80px rgba(0,0,0,.8)}}
.footer{{text-align:center;color:#475569;font-size:.78rem;padding:2rem}}
</style>
</head>
<body>
<div class="hdr">
  <h1>🤖 CBT School QA Robot</h1>
  <p>Laporan Otomatis &nbsp;•&nbsp; {ts} &nbsp;•&nbsp; Target: {cfg.CBT_URL}</p>
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
  <thead><tr>
    <th>Status</th><th>Role</th><th>Nama Test</th><th>Durasi</th><th>Pesan / Error</th><th>Screenshot</th>
  </tr></thead>
  <tbody>{"".join(rows)}</tbody>
</table>
</div>
<div class="overlay" id="ov" onclick="this.classList.remove('on')">
  <img id="ov-img" src="" alt="screenshot" />
</div>
<div class="footer">Generated by CBT School QA Robot &nbsp;•&nbsp; {ts}</div>
<script>
function zoom(el){{
  document.getElementById('ov-img').src = el.src;
  document.getElementById('ov').classList.add('on');
}}
document.addEventListener('keydown', e => {{
  if(e.key==='Escape') document.getElementById('ov').classList.remove('on');
}});
</script>
</body></html>"""

        path = self.report_dir / "report.html"
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return path

    # ── Summary di terminal ──────────────────────────────────────────────────

    def _print_summary(self):
        total  = len(self.results)
        passed = sum(1 for r in self.results if r.status == "PASS")
        failed = sum(1 for r in self.results if r.status == "FAIL")
        errors = sum(1 for r in self.results if r.status == "ERROR")
        skip   = sum(1 for r in self.results if r.status == "SKIP")

        sep = "─" * 60
        print(f"\n{sep}")
        print(f"  HASIL  {passed}/{total} PASS  |  {failed} FAIL  |  {errors} ERROR  |  {skip} SKIP")
        print(sep)
        for r in self.results:
            icon = {"PASS":"✅","FAIL":"❌","ERROR":"💥","SKIP":"⏭️"}.get(r.status,"?")
            print(f"  {icon}  [{r.role:<10}] {r.name}")
            if r.status in ("FAIL","ERROR") and r.error:
                for line in r.error.splitlines()[:2]:
                    print(f"           ↳ {line[:70]}")
        print(sep)
        if failed + errors:
            print(f"\n  ⚠️  Ada {failed + errors} masalah yang perlu diperbaiki.")
        else:
            print(f"\n  ✅ Semua tes lulus!")
        print()

    # ── Main runner ──────────────────────────────────────────────────────────

    async def run(self):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n{'='*60}")
        print(f"  🤖 CBT School QA Robot")
        print(f"  {ts}")
        print(f"  Target : {cfg.CBT_URL}")
        print(f"  Roles  : {', '.join(self.roles)}")
        print(f"{'='*60}\n")

        # System check (tanpa browser)
        if "system" in self.roles:
            print("  [System] Health check...")
            await self._test_api_health()

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=self.headless,
                executable_path=cfg.CHROMIUM_PATH,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            self.ctx  = await browser.new_context(viewport={"width": 1280, "height": 900})
            self.page = await self.ctx.new_page()
            self._attach_listeners()

            try:
                if "admin"    in self.roles: await self._tests_admin()
                if "guru"     in self.roles: await self._tests_guru()
                if "pengawas" in self.roles: await self._tests_pengawas()
                if "siswa"    in self.roles: await self._tests_siswa()
            finally:
                await browser.close()

        self._print_summary()
        report_path = self._generate_report()
        print(f"  📋 Report HTML: {report_path.absolute()}\n")


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="CBT School QA Robot")
    parser.add_argument("--role", nargs="+",
                        choices=["system","admin","guru","pengawas","siswa"],
                        help="Jalankan hanya role tertentu (default: semua)")
    parser.add_argument("--headless", default="true",
                        choices=["true","false"],
                        help="true = headless, false = lihat browser (default: true)")
    args = parser.parse_args()

    roles    = args.role or ["system","admin","guru","pengawas","siswa"]
    headless = args.headless.lower() == "true"

    robot = CBTRobot(headless=headless, roles=roles)
    asyncio.run(robot.run())


if __name__ == "__main__":
    main()
