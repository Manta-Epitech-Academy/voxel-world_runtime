#!/usr/bin/env python3
"""Export the world a Lua program generates as a glTF binary scene (.glb).

    python3 scripts/export_scene.py programme.lua -o scenes/etape5.glb [--seed 1]
           [--cut x,64] [--poster img/etape5.png --camera -30,72,-30 --target 64,12,64]

The workshop subject shows each step's expected result as a 3D scene the
participant can turn around (convention §3.8b). This produces that scene from
a program — the step's solution, kept in a private repository — in the same
headless runtime that students use, so the world is exactly what their own
code would build with that seed. The output is a mesh: no code can be recovered
from it, no more than from a screenshot.

The file is standard glTF 2.0, binary, one file, readable by any glTF viewer:

- the world is meshed from its visible faces only, and coplanar faces of the
  same block are merged (greedy meshing), so a 128×128 world is tens of
  thousands of quads rather than millions;
- each block texture is a 16×16 PNG drawn with the runtime's own generators,
  seeded like the runtime's, with REPEAT wrapping and NEAREST filtering, so a
  merged quad tiles it exactly as the pane draws it;
- the runtime's face shading (top 1, sides .8 and .65, bottom .5) rides in
  vertex colours on unlit materials (KHR_materials_unlit), like in the pane;
- positions, texture coordinates and colours are bytes (KHR_mesh_quantization),
  which the three.js loader the platform uses understands: 12 bytes a vertex.

`--cut x,64` adds a second node named `cut`: the same world with everything at
x ≥ 64 removed (`--cut x,64,above` removes x < 64 instead), meshed again so the cut surface shows the layers and the
caves. The platform's viewer swaps to that node when the participant presses
« Cut away » (convention §3.8b); any other glTF viewer shows both nodes, which
is what the node name is for.

With `--poster`, the same camera renders the still that stands in for the
scene where WebGL is missing (and on GitHub), so the two match.

Needs Playwright with Chromium and the runtime's index.html beside this script
(built by scripts/port.py). The page does not expose its world object, and a
hook for this has no place in what students get, so a scratch copy with the
hook is served, as tests/check.py does. The meshing runs in the page, in
JavaScript, because a million cells is a long loop in Python.
"""
import argparse
import base64
import functools
import http.server
import json
import shutil
import socketserver
import struct
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Runs in the scratch page once the world is generated. Returns the textures as
# PNG data URLs and, per material, the merged quads of the world (and of its
# cut-away, when asked), as base64 typed arrays.
MESHER_JS = r"""
([cut]) => {
  const W = 128, H = 64, D = 128, WATER = 6;
  const world = __monde.vol.corps.monde;
  /* ---- the runtime's textures, same generators, same seeds ---- */
  const rng = (seed) => { let e = seed >>> 0; return () => { e = (e + 1831565813) >>> 0; let t = e;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const css = ([r, g, b], k = 1) => { const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return `rgb(${c(r)},${c(g)},${c(b)})`; };
  const noise = (c, r, base, amp = 0.12) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    c.fillStyle = css(base, 1 - amp + r() * amp * 2); c.fillRect(x, y, 1, 1); } };
  const specks = (c, r, col, n, s = 2) => { for (let k = 0; k < n; k++) {
    const px = Math.floor(r() * (16 - s + 1)), py = Math.floor(r() * (16 - s + 1));
    for (let l = 0; l < s; l++) for (let m = 0; m < s; m++) if (r() < 0.8) {
      c.fillStyle = css(col, 0.9 + r() * 0.2); c.fillRect(px + m, py + l, 1, 1); } } };
  const GRASS = [96, 160, 64], DIRT = [134, 96, 67], STONE = [125, 125, 125];
  const ore = (col) => (c, r) => { noise(c, r, STONE); specks(c, r, col, 6, 2); };
  const T = {
    socle: (c, r) => noise(c, r, [60, 60, 60], 0.35),
    pierre: (c, r) => { noise(c, r, STONE); specks(c, r, [105, 105, 105], 8, 2); },
    terre: (c, r) => { noise(c, r, DIRT, 0.15); specks(c, r, [110, 78, 54], 6, 1); },
    herbe: (c, r) => noise(c, r, GRASS, 0.18),
    herbe_cote: (c, r) => { T.terre(c, r); for (let x = 0; x < 16; x++) { const h = 3 + Math.floor(r() * 3);
      for (let y = 0; y < h; y++) { c.fillStyle = css(GRASS, 0.85 + r() * 0.3); c.fillRect(x, y, 1, 1); } } },
    sable: (c, r) => noise(c, r, [219, 207, 163], 0.06),
    eau: (c, r) => noise(c, r, [52, 110, 220], 0.08),
    bois: (c, r) => { for (let x = 0; x < 16; x++) { const k = x % 4 === 0 ? 0.75 : 0.95 + r() * 0.1;
      for (let y = 0; y < 16; y++) { c.fillStyle = css([104, 82, 50], k * (0.95 + r() * 0.1)); c.fillRect(x, y, 1, 1); } } },
    bois_dessus: (c, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)), ring = Math.floor(d) % 3 === 0;
      c.fillStyle = d > 6.5 ? css([104, 82, 50]) : css([176, 142, 90], ring ? 0.8 : 0.95 + r() * 0.1);
      c.fillRect(x, y, 1, 1); } },
    feuilles: (c, r) => { noise(c, r, [58, 120, 40], 0.25); specks(c, r, [36, 80, 26], 10, 2); },
    neige: (c, r) => noise(c, r, [240, 248, 255], 0.04),
    neige_cote: (c, r) => { T.terre(c, r); for (let x = 0; x < 16; x++) { const h = 3 + Math.floor(r() * 3);
      for (let y = 0; y < h; y++) { c.fillStyle = css([240, 248, 255], 0.95 + r() * 0.05); c.fillRect(x, y, 1, 1); } } },
    gravier: (c, r) => { noise(c, r, [136, 126, 126], 0.2); specks(c, r, [100, 92, 92], 12, 2); },
    charbon: ore([30, 30, 30]), fer: ore([216, 175, 147]), diamant: ore([93, 236, 245]),
    glace: (c, r) => noise(c, r, [160, 190, 250], 0.05),
  };
  const names = Object.keys(T);
  const textures = {};
  names.forEach((name, i) => { const c = document.createElement("canvas"); c.width = c.height = 16;
    T[name](c.getContext("2d"), rng(i * 7919 + 17)); textures[name] = c.toDataURL("image/png"); });
  // block id -> [top, side, bottom]
  const FACES = { 1: ["socle","socle","socle"], 2: ["pierre","pierre","pierre"], 3: ["terre","terre","terre"],
    4: ["herbe","herbe_cote","terre"], 5: ["sable","sable","sable"], 6: ["eau","eau","eau"],
    7: ["bois_dessus","bois","bois_dessus"], 8: ["feuilles","feuilles","feuilles"], 9: ["neige","neige_cote","terre"],
    10: ["gravier","gravier","gravier"], 11: ["charbon","charbon","charbon"], 12: ["fer","fer","fer"],
    13: ["diamant","diamant","diamant"], 14: ["glace","glace","glace"] };
  const texIndex = (n) => names.indexOf(n);
  /* ---- greedy meshing ---- */
  function mesh(filter) {
    const dims = [W, H, D];
    const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D || !filter(x, y, z))
      ? 0 : world[x + W * z + W * D * y];
    const out = {};   // material name -> {pos:[], uv:[], col:[], idx:[]}
    const bucket = (n) => out[n] || (out[n] = { pos: [], uv: [], col: [], idx: [] });
    const x = [0, 0, 0], q = [0, 0, 0];
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3, w = (d + 2) % 3;
      q[0] = q[1] = q[2] = 0; q[d] = 1;
      const mask = new Int32Array(dims[u] * dims[w]);
      for (x[d] = -1; x[d] < dims[d]; x[d]++) {
        let n = 0;
        for (x[w] = 0; x[w] < dims[w]; x[w]++) for (x[u] = 0; x[u] < dims[u]; x[u]++) {
          const a = at(x[0], x[1], x[2]), b = at(x[0] + q[0], x[1] + q[1], x[2] + q[2]);
          let key = 0;
          if (a && (b === 0 || (b === WATER && a !== WATER))) key = 1 + texIndex(FACES[a][d === 1 ? 0 : 1]);
          else if (b && (a === 0 || (a === WATER && b !== WATER))) key = -(1 + texIndex(FACES[b][d === 1 ? 2 : 1]));
          mask[n++] = key;
        }
        n = 0;
        for (let j = 0; j < dims[w]; j++) for (let i = 0; i < dims[u];) {
          const c = mask[n];
          if (!c) { i++; n++; continue; }
          let ww = 1; while (i + ww < dims[u] && mask[n + ww] === c) ww++;
          let hh = 1, done = false;
          for (; j + hh < dims[w]; hh++) { for (let k = 0; k < ww; k++) if (mask[n + k + hh * dims[u]] !== c) { done = true; break; } if (done) break; }
          x[u] = i; x[w] = j;
          const base = [x[0], x[1], x[2]]; base[d] += 1;
          const du = [0, 0, 0], dv = [0, 0, 0]; du[u] = ww; dv[w] = hh;
          const p = [base, [base[0] + du[0], base[1] + du[1], base[2] + du[2]],
            [base[0] + du[0] + dv[0], base[1] + du[1] + dv[1], base[2] + du[2] + dv[2]],
            [base[0] + dv[0], base[1] + dv[1], base[2] + dv[2]]];
          const front = c > 0, name = names[Math.abs(c) - 1], g = bucket(name);
          const lum = d === 1 ? (front ? 1 : 0.5) : d === 0 ? 0.8 : 0.65;
          const h = d === 0 ? 2 : 0, top = base[1] + (d === 1 ? 0 : du[1] + dv[1]);
          const v0 = g.pos.length / 3;
          for (const pt of p) {
            g.pos.push(pt[0], pt[1], pt[2]);
            if (d === 1) g.uv.push(pt[0] - base[0], pt[2] - base[2]);
            else g.uv.push(pt[h] - base[h], top - pt[1]);
            g.col.push(lum, lum, lum);
          }
          if (front) g.idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
          else g.idx.push(v0, v0 + 3, v0 + 2, v0, v0 + 2, v0 + 1);
          for (let l = 0; l < hh; l++) for (let k = 0; k < ww; k++) mask[n + k + l * dims[u]] = 0;
          i += ww; n += ww;
        }
      }
    }
    const b64 = (arr) => { let s = ""; const b = new Uint8Array(arr.buffer); for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(s); };
    const prims = [];
    for (const name of Object.keys(out)) {
      const g = out[name];
      prims.push({ material: name, count: g.pos.length / 3, indices: g.idx.length,
        pos: b64(Uint8Array.from(g.pos)), uv: b64(Uint8Array.from(g.uv)),
        col: b64(Uint8Array.from(g.col.map((v) => Math.round(v * 255)))),
        idx: b64(g.pos.length / 3 > 65535 ? Uint32Array.from(g.idx) : Uint16Array.from(g.idx)) });
    }
    return prims;
  }
  const nodes = { world: mesh(() => true) };
  if (cut) {
    const ax = { x: 0, y: 1, z: 2 }[cut.axis];
    nodes.cut = cut.keep === "above" ? mesh((x, y, z) => [x, y, z][ax] >= cut.at)
                                     : mesh((x, y, z) => [x, y, z][ax] < cut.at);
  }
  return { textures, nodes };
}
"""


def pad4(b):
    return b + b"\x00" * ((4 - len(b) % 4) % 4)


def build_glb(data, program_name):
    """Pack the mesher's output as a glTF binary. One mesh per node, one
    primitive per material, every attribute a byte (KHR_mesh_quantization)."""
    bin_parts, views, accessors, images, textures, materials, meshes, nodes = [], [], [], [], [], [], [], []
    offset = 0

    def view(blob, stride=None, target=None):
        nonlocal offset
        blob = pad4(blob)
        v = {"buffer": 0, "byteOffset": offset, "byteLength": len(blob)}
        if stride:
            v["byteStride"] = stride
        if target:
            v["target"] = target
        views.append(v)
        bin_parts.append(blob)
        offset += len(blob)
        return len(views) - 1

    tex_index = {}
    for name, url in data["textures"].items():
        png = base64.b64decode(url.split(",", 1)[1])
        images.append({"bufferView": view(png), "mimeType": "image/png", "name": name})
        textures.append({"source": len(images) - 1, "sampler": 0, "name": name})
        tex_index[name] = len(textures) - 1
    samplers = [{"magFilter": 9728, "minFilter": 9985, "wrapS": 10497, "wrapT": 10497}]

    mat_index = {}

    def material(name):
        if name in mat_index:
            return mat_index[name]
        m = {"name": name, "extensions": {"KHR_materials_unlit": {}},
             "pbrMetallicRoughness": {"baseColorTexture": {"index": tex_index[name]},
                                      "metallicFactor": 0, "roughnessFactor": 1}}
        if name == "eau":
            m["alphaMode"] = "BLEND"
            m["doubleSided"] = True
            m["pbrMetallicRoughness"]["baseColorFactor"] = [1, 1, 1, 0.72]
        materials.append(m)
        mat_index[name] = len(materials) - 1
        return mat_index[name]

    def padded(raw, comps):
        """Bytes grouped by `comps`, each group padded to a 4-byte stride."""
        out = bytearray()
        for i in range(0, len(raw), comps):
            out += raw[i:i + comps] + b"\x00" * (4 - comps)
        return bytes(out)

    for node_name, prims in data["nodes"].items():
        primitives = []
        for p in prims:
            pos = base64.b64decode(p["pos"])
            uv = base64.b64decode(p["uv"])
            col = base64.b64decode(p["col"])
            idx = base64.b64decode(p["idx"])
            n = p["count"]
            mn = [min(pos[i::3]) for i in range(3)]
            mx = [max(pos[i::3]) for i in range(3)]
            a_pos = len(accessors)
            accessors.append({"bufferView": view(padded(pos, 3), stride=4, target=34962),
                              "componentType": 5121, "count": n, "type": "VEC3",
                              "min": mn, "max": mx})
            a_uv = len(accessors)
            accessors.append({"bufferView": view(padded(uv, 2), stride=4, target=34962),
                              "componentType": 5121, "count": n, "type": "VEC2"})
            a_col = len(accessors)
            accessors.append({"bufferView": view(padded(col, 3), stride=4, target=34962),
                              "componentType": 5121, "normalized": True, "count": n, "type": "VEC3"})
            a_idx = len(accessors)
            accessors.append({"bufferView": view(idx, target=34963),
                              "componentType": 5125 if n > 65535 else 5123,
                              "count": p["indices"], "type": "SCALAR"})
            primitives.append({"attributes": {"POSITION": a_pos, "TEXCOORD_0": a_uv, "COLOR_0": a_col},
                               "indices": a_idx, "material": material(p["material"]), "mode": 4})
        meshes.append({"name": node_name, "primitives": primitives})
        nodes.append({"name": node_name, "mesh": len(meshes) - 1})

    gltf = {
        "asset": {"version": "2.0", "generator": f"voxel-world_runtime export_scene.py ({program_name})"},
        "extensionsUsed": ["KHR_mesh_quantization", "KHR_materials_unlit"],
        "extensionsRequired": ["KHR_mesh_quantization"],
        "scene": 0, "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes, "meshes": meshes, "materials": materials,
        "textures": textures, "images": images, "samplers": samplers,
        "accessors": accessors, "bufferViews": views,
        "buffers": [{"byteLength": offset}],
    }
    json_blob = pad4(json.dumps(gltf, separators=(",", ":")).encode("utf-8").replace(b"\x00", b" "))
    json_blob = json_blob.rstrip(b"\x00")
    json_blob += b" " * ((4 - len(json_blob) % 4) % 4)
    bin_blob = b"".join(bin_parts)
    total = 12 + 8 + len(json_blob) + 8 + len(bin_blob)
    return (b"glTF" + struct.pack("<II", 2, total)
            + struct.pack("<I", len(json_blob)) + b"JSON" + json_blob
            + struct.pack("<I", len(bin_blob)) + b"BIN\x00" + bin_blob)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("program", help="the Lua program to run")
    ap.add_argument("-o", "--output", required=True, help="the .glb to write")
    ap.add_argument("--seed", type=int, default=1, help="the world's seed (graine)")
    ap.add_argument("--cut", help="also export the cut-away as a node named `cut`: axis,at[,keep] "
                                  "(x,64 keeps x < 64; x,64,above keeps x >= 64)")
    ap.add_argument("--poster", help="also render a still of the same world")
    ap.add_argument("--camera", default="-30,72,-30", help="poster camera x,y,z")
    ap.add_argument("--target", default="64,12,64", help="poster look-at x,y,z")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    cut = None
    if args.cut:
        parts = args.cut.split(",")
        axis, at = parts[0], parts[1]
        keep = parts[2] if len(parts) > 2 else "below"
        if axis not in ("x", "y", "z") or keep not in ("below", "above"):
            sys.exit("--cut wants axis,at[,keep]: x,64 or x,64,above")
        cut = {"axis": axis, "at": int(at), "keep": keep}

    code = Path(args.program).read_text(encoding="utf-8")
    tmp = Path(tempfile.mkdtemp())
    page = (ROOT / "index.html").read_text(encoding="utf-8")
    hook = 'co("recentrer").addEventListener("click",()=>Hy.recentrer());'
    if page.count(hook) != 1:
        sys.exit("the hook anchor is not in index.html: rebuild it with scripts/port.py")
    # Students get five seconds per run, a kindness for an infinite loop. A
    # headless build on a loaded machine can need more for the full generator,
    # and a world cut short is the wrong scene (no trees, half the ore), so the
    # scratch copy allows ten minutes — and any run that is still cut is refused.
    # Two timers: the Lua hook's limit (seconds), and the page's own watchdog
    # that kills the worker after nine seconds whatever Lua says.
    limit, watchdog = "limite:$=5}", "},9*1e3)"
    if page.count(limit) != 1 or page.count(watchdog) != 1:
        sys.exit("the time-limit anchors are not in index.html: rebuild it with scripts/port.py")
    page = (page.replace(hook, "window.__monde=Hy;" + hook)
                .replace(limit, "limite:$=600}").replace(watchdog, "},600*1e3)"))
    (tmp / "index.html").write_text(page, encoding="utf-8")
    shutil.copy(ROOT / "embed.js", tmp / "embed.js")
    httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(tmp)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{httpd.server_address[1]}/index.html"

    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=2)
        pg.goto(url)
        pg.evaluate("([c, g]) => { localStorage.clear(); localStorage.setItem('mwg.etape', '0');"
                    " localStorage.setItem('mwg.code', JSON.stringify(c));"
                    " localStorage.setItem('mwg.graine', JSON.stringify(g)); }", [code, args.seed])
        pg.reload()
        pg.wait_for_selector("#generer")
        # The page runs the saved program by itself on load; wait for that run
        # rather than start a second one on top of it.
        pg.wait_for_function("() => !document.querySelector('#generer').disabled", timeout=600000)
        if not pg.evaluate("() => __monde.vol.corps.monde.some(v => v)"):
            pg.click("#generer")
            pg.wait_for_function("() => !document.querySelector('#generer').disabled", timeout=600000)
        console = pg.inner_text("#console")
        if "rreur" in console or "secondes" in console or "arrêté" in console:
            sys.exit(f"the program failed or was cut short:\n{console}")
        data = pg.evaluate(MESHER_JS, [cut])
        glb = build_glb(data, Path(args.program).name)
        Path(args.output).write_bytes(glb)
        quads = sum(p["indices"] // 6 for p in data["nodes"]["world"])
        extra = f", cut-away {sum(p['indices'] // 6 for p in data['nodes']['cut']):,} quads" if cut else ""
        print(f"wrote {args.output}: {quads:,} quads{extra}, {len(glb) // 1024} KB")
        if args.poster:
            cx, cy, cz = (float(v) for v in args.camera.split(","))
            tx, ty, tz = (float(v) for v in args.target.split(","))
            pg.evaluate("([px,py,pz,tx,ty,tz]) => { const dx=tx-px, dy=ty-py, dz=tz-pz;"
                        " __monde.vol.placer(px,py,pz, Math.atan2(-dx,-dz), Math.atan2(dy, Math.hypot(dx,dz))); }",
                        [cx, cy, cz, tx, ty, tz])
            pg.add_style_tag(content="#aide-vol,#mode,#recentrer,#monde button{visibility:hidden!important}")
            pg.wait_for_timeout(800)
            pg.locator("#monde").screenshot(path=args.poster)
            print(f"wrote {args.poster}")
        browser.close()
    httpd.shutdown()
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
