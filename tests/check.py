#!/usr/bin/env python3
"""End-to-end check of the ported runtime, in a headless Chromium.

    python3 tests/check.py <World-Generator.zip>

The zip is the original archive (main branch). It is read for its solutions
only, which this test needs twice: to prove none of them is left in
index.html, and to drive each step to green. Needs Playwright with Chromium.

For every step N it loads N's official solution into the editor, clicks
« Générer », and checks that the token box shows exactly what the platform
computes for that step: monde{HMAC-SHA256(secret, "voxel-world:N")[:12]}.
"""
import functools, hashlib, hmac, http.server, json, socketserver, sys, threading, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SECRET = "test-secret-not-a-real-one"


def expected(step):
    d = hmac.new(SECRET.encode(), f"voxel-world:{step}".encode(), hashlib.sha256).hexdigest()
    return f"monde{{{d[:12]}}}"


def solutions(zip_path):
    with zipfile.ZipFile(zip_path) as z:
        return {n: z.read(f"World-Generator/corriges/etape-{n}.lua").decode() for n in range(1, 8)}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(Quiet, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    sols = solutions(sys.argv[1])
    with zipfile.ZipFile(sys.argv[1]) as z:
        original = z.read("World-Generator/World-Generator.html").decode()
    page = (ROOT / "index.html").read_text(encoding="utf-8")

    def shown_to_students(line):
        """A line the workshop text itself shows (a toolbox example) also sits
        in some solutions. It is only a leak when it appears nowhere in the
        original page except inside a solution."""
        return original.count(line) > sum(c.count(line) for c in sols.values())
    failures = []
    for n, code in sols.items():
        # Whole files, and every long line: a solution must not be recoverable
        # even in pieces. Short lines (`end`, a loop header) prove nothing.
        long_lines = {l.strip() for l in code.splitlines() if len(l.strip()) > 30}
        leaked = [l for l in long_lines if l in page and not shown_to_students(l)]
        if code.strip() in page or leaked:
            failures.append(f"step {n}: solution text still in index.html: {leaked[:1]}")
    if "corrige" in page.lower() or "corrigé" in page.lower():
        failures.append("index.html still mentions the corrigés")

    httpd = serve()
    url = f"http://127.0.0.1:{httpd.server_address[1]}/index.html"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page(viewport={"width": 1280, "height": 800})
        tokens = []
        pg.expose_function("__record", lambda d: tokens.append(d))
        for n in range(1, 8):
            pg.goto(url)
            pg.evaluate("([e,c])=>{localStorage.clear();localStorage.setItem('mwg.etape',JSON.stringify(e));"
                        "localStorage.setItem('mwg.code',JSON.stringify(c))}", [n - 1, sols[n]])
            pg.reload()
            pg.wait_for_selector("#generer")
            if pg.query_selector("#corrige"):
                failures.append("the « Corrigé précédent » button is still there")
            pg.evaluate("s=>{VoxelWorld.setSecret(s);VoxelWorld.enable();"
                        "addEventListener('wg:jeton',e=>__record(e.detail))}", SECRET)
            pg.click("#generer")
            try:
                pg.wait_for_selector("#wg-jeton:not([hidden]) .wg-code", timeout=60000)
            except Exception:
                defis = pg.inner_text("#defis")
                failures.append(f"step {n}: no token shown. Checks: {defis!r}")
                continue
            shown = pg.inner_text("#wg-jeton .wg-code")
            ok = shown == expected(n)
            print(f"step {n}: {'ok  ' if ok else 'FAIL'} {shown}")
            if not ok:
                failures.append(f"step {n}: shows {shown}, platform expects {expected(n)}")
        # Platform mode hides the app's own copy of the workshop text.
        visible = pg.evaluate("()=>[...document.querySelectorAll('#consignes > *')]"
                              ".filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id||e.className)")
        print("visible in platform mode:", visible)
        if any(v in ("indice", "callout outil") for v in visible) or pg.is_visible("#etapes"):
            failures.append(f"platform mode still shows the app's own text: {visible}")
        # A platform step with no check in the app: one neutral note, nothing else.
        pg.evaluate("VoxelWorld.etapeSansDefi(true)")
        pg.wait_for_timeout(200)
        note = pg.is_visible("#wg-sans-defi")
        others = pg.evaluate("()=>[...document.querySelectorAll('#consignes > *')]"
                             ".filter(e=>e.id!=='wg-sans-defi'&&getComputedStyle(e).display!=='none').length")
        print("no-check step: note", note, "| other visible blocks", others)
        if not note or others:
            failures.append("etapeSansDefi(true) does not show the note alone")
        pg.evaluate("VoxelWorld.etapeSansDefi(false)")
        pg.wait_for_timeout(200)
        if pg.query_selector("#wg-sans-defi"):
            failures.append("etapeSansDefi(false) leaves the note")
        # Step API used by the adapter.
        pg.evaluate("WorldGenerator.allerA(2)")
        if pg.evaluate("WorldGenerator.etape()") != 2:
            failures.append("WorldGenerator.allerA does not change the step")
        # `?plateforme=1`: the same hiding with no host, step list kept.
        pg.goto(url + "?plateforme=1")
        pg.wait_for_selector("#generer")
        pg.wait_for_timeout(500)
        shown = pg.evaluate("()=>[...document.querySelectorAll('#consignes > *')]"
                            ".filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id||e.className)")
        print("visible with ?plateforme=1:", shown, "| step list:", pg.is_visible("#etapes"))
        if any(v in ("indice", "callout outil") for v in shown) or not pg.is_visible("#etapes"):
            failures.append(f"?plateforme=1 does not hide the text or hides the step list: {shown}")
        if len(tokens) < 7:
            failures.append(f"wg:jeton fired {len(tokens)} times, expected 7")
        browser.close()
    httpd.shutdown()
    for f in failures:
        print("FAIL:", f)
    print("all good" if not failures else f"{len(failures)} failure(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
