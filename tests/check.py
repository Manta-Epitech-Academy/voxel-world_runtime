#!/usr/bin/env python3
"""End-to-end check of the built runtime (dist/), in a headless Chromium.

    npm run build
    python3 tests/check.py <World-Generator.zip>

The zip is the original single-file archive (`git show ab2d5b3:World-Generator.zip`).
It is read for its solutions only, which this test needs twice: to prove none
of them is in the build, and to drive each step to green. Needs Playwright
with Chromium.

For every step N it loads N's official solution into the editor and checks
that it builds a world. Automatic validation is off (src/main.js), so no
token is expected; the platform hooks must still be callable.
"""
import functools, hashlib, hmac, http.server, socketserver, sys, threading, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
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
    handler = functools.partial(Quiet, directory=str(DIST))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def flight(browser, url):
    """Fly mode: Z/S (codes KeyW/KeyS) follow the crosshair, Q/D stay level.

    The page exposes its pieces on `window.__mwg` (main.js): the camera is
    placed through `__mwg.rendu.vol`, then real keys are held and measured.
    """
    import math
    pg = browser.new_page(viewport={"width": 1280, "height": 800})
    pg.goto(url)
    pg.wait_for_selector("#generer")
    pg.wait_for_timeout(500)
    box = pg.locator("#monde canvas").last.bounding_box()
    pg.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)   # pointer lock
    pg.wait_for_timeout(300)

    def move(key, pitch):
        pg.evaluate(f"__mwg.rendu.vol.placer(64, 40, 64, 0, {pitch})")
        pg.wait_for_timeout(100)
        before = pg.evaluate("(({x,y,z})=>[x,y,z])(__mwg.rendu.vol.camera.position)")
        pg.keyboard.down(key); pg.wait_for_timeout(400); pg.keyboard.up(key)
        pg.wait_for_timeout(100)
        after = pg.evaluate("(({x,y,z})=>[x,y,z])(__mwg.rendu.vol.camera.position)")
        return [round(a - b, 2) for a, b in zip(after, before)]

    problems = []
    down = move("KeyW", -math.pi / 4)   # looking 45° down, forward
    up = move("KeyW", math.pi / 4)      # looking 45° up, forward
    level = move("KeyW", 0)
    back = move("KeyS", -math.pi / 4)   # looking down, backward: goes up
    side = move("KeyD", -math.pi / 4)   # strafe while looking down: stays level
    print(f"flight (dx, dy, dz): forward looking down {down}, up {up}, level {level}, "
          f"back looking down {back}, strafe {side}")
    if not (down[1] < -0.5 and down[2] < -0.5 and abs(abs(down[1]) - abs(down[2])) < 0.35 * abs(down[2])):
        problems.append(f"forward while looking 45° down should go down as much as forward: {down}")
    if not up[1] > 0.5:
        problems.append(f"forward while looking up should climb: {up}")
    if abs(level[1]) > 0.01 or level[2] > -0.5:
        problems.append(f"forward while looking level should stay level: {level}")
    if not back[1] > 0.5:
        problems.append(f"back while looking down should climb: {back}")
    if abs(side[1]) > 0.01 or side[0] < 0.5:
        problems.append(f"strafing should stay level: {side}")
    pg.close()
    return problems


def main():
    sols = solutions(sys.argv[1])
    with zipfile.ZipFile(sys.argv[1]) as z:
        original = z.read("World-Generator/World-Generator.html").decode()
    page = "\n".join(f.read_text(encoding="utf-8", errors="ignore")
                     for f in DIST.rglob("*") if f.suffix in (".html", ".js", ".css"))

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
            failures.append(f"step {n}: solution text still in the build: {leaked[:1]}")
    if "corrigé" in page.lower():
        failures.append("the build still mentions the corrigés")

    httpd = serve()
    url = f"http://127.0.0.1:{httpd.server_address[1]}/index.html"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page(viewport={"width": 1280, "height": 800})
        # Automatic validation is off (main.js VERIFICATION_AUTO): no panel, no
        # token. Each official solution must still run to a world.
        for n in range(1, 8):
            pg.goto(url)
            pg.evaluate("([e,c])=>{localStorage.clear();localStorage.setItem('mwg.etape',JSON.stringify(e));"
                        "localStorage.setItem('mwg.code',JSON.stringify(c))}", [n - 1, sols[n]])
            pg.reload()
            pg.wait_for_selector("#generer")
            pg.wait_for_function("() => !document.querySelector('#generer').disabled", timeout=60000)
            statut = pg.inner_text("#statut")
            ok = "blocs" in statut and not pg.query_selector("#panneau-verification")
            print(f"step {n}: {'ok  ' if ok else 'FAIL'} {statut}")
            if not ok:
                failures.append(f"step {n}: solution did not build a world, or the verification pane is back")
        if pg.evaluate(r"() => [...document.querySelectorAll('button')].some(b => /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(b.textContent))"):
            failures.append("a button still carries an emoji")
        # The console prompt: the step's own functions, the world, an expression's value.
        def repl(line):
            pg.fill("#console-entree", line)
            pg.press("#console-entree", "Enter")
            pg.wait_for_function("() => !document.querySelector('#console-entree').disabled")
            pg.wait_for_timeout(300)
            return pg.inner_text("#console").strip().split("\n")[-1], pg.inner_text("#console-invite")
        got = [repl(l) for l in ("1 + 1", "get_block(64, 0, 64) == BEDROCK", "if true then", "print(7) end",
                                  "set_block(64, 60, 64, DIAMANT)", "get_block(64, 60, 64)",
                                  "SOCLE == BEDROCK and GRAINE == SEED and bloc == set_block and lire == get_block",
                                  "bruit == perlin2d and bruit3d == perlin3d and hasard == random and afficher == print")]
        print("console prompt:", got)
        want = [("2", ">"), ("true", ">"), ("> if true then", ">>"), ("7", ">"), ("> set_block(64, 60, 64, DIAMANT)", ">"), ("13", ">"), ("true", ">"), ("true", ">")]
        if got != want:
            failures.append(f"console prompt: got {got}, wanted {want}")
        # Platform hooks stay callable for the adapter.
        pg.evaluate("s=>{VoxelWorld.setSecret(s);VoxelWorld.enable();VoxelWorld.etapeSansDefi(true);WorldGenerator.allerA(2)}", SECRET)
        if pg.evaluate("WorldGenerator.etape()") != 2:
            failures.append("WorldGenerator.allerA does not change the step")
        failures.extend(flight(browser, url))
        browser.close()
    httpd.shutdown()
    for f in failures:
        print("FAIL:", f)
    print("all good" if not failures else f"{len(failures)} failure(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
