#!/usr/bin/env python3
"""Build the served runtime (index.html) from the original World-Generator page.

    python3 scripts/port.py <World-Generator.zip | World-Generator.html> [-o index.html]

There are no readable sources for World Generator: the only thing that exists
is the single-file page in World-Generator.zip (main branch), a minified Vite
build with Monaco, three.js and wasmoon inlined. So this port does not rebuild
the app, it patches that page, and every patch is a literal string that must
match exactly once. If the input ever changes, the script stops and says which
patch no longer applies, instead of producing a page that half works.

What the patches do:

1. Remove the seven step solutions (the « corrigés ») from the page. They are
   blanked in the bundle itself, not just hidden: anyone can read a page's
   source, and the workshop rule is that a student never gets the code of a
   step they must write.
2. Remove the « ↺ Corrigé précédent » button and its handler, which loaded
   those solutions into the editor.
3. Announce every check result as a DOM event (`wg:verifie`), so embed.js can
   turn a fully green step into a validation token.
4. Expose two functions on `window.WorldGenerator`: go to a step, and read the
   current one. The platform adapter uses them to follow the step the
   participant is reading.
5. Load embed.js, the readable part of this runtime (token, platform mode).
6. In fly mode, forward and back (Z/S on AZERTY, W/S on QWERTY, arrows) follow
   the crosshair: looking down and going forward goes down. The original moved
   only horizontally. Strafing stays level, Space and Shift stay vertical, and
   a diagonal is no faster than a straight move. Walking mode is unchanged.

Nothing else in the app changes. Opened on its own, the page behaves like the
original minus the solutions.
"""
import argparse
import re
import sys
import zipfile
from pathlib import Path

PAGE_IN_ZIP = "World-Generator/World-Generator.html"


def read_input(path):
    path = Path(path)
    if path.suffix == ".zip":
        with zipfile.ZipFile(path) as z:
            return z.read(PAGE_IN_ZIP).decode("utf-8")
    return path.read_text(encoding="utf-8")


def replace_once(page, old, new, what):
    count = page.count(old)
    if count != 1:
        sys.exit(f"patch '{what}': expected exactly one match, found {count}. "
                 f"The input page is not the one this port was written for.")
    return page.replace(old, new)


def blank_solutions(page):
    """The step solutions are seven template literals gathered in one array,
    `var <arr>=[a,b,c,d,e,f,g],<starter>=...`. Blank each literal."""
    m = re.search(r"var (\w+)=\[([\w$]+(?:,[\w$]+){6})\],(\w+)=`-- Bienvenue, architecte !", page)
    if not m:
        sys.exit("patch 'solutions': the array of the seven solutions was not found")
    names = m.group(2).split(",")
    for name in names:
        decl = re.compile(r"(?<=[\s,;])" + re.escape(name) + r"=`")
        hits = list(decl.finditer(page))
        if len(hits) != 1:
            sys.exit(f"patch 'solutions': {name} is declared {len(hits)} times")
        start = hits[0].end()
        end = page.index("`", start)          # Lua code holds no backtick
        if "${" in page[start:end]:
            sys.exit(f"patch 'solutions': {name} is a template with substitutions")
        page = page[:hits[0].start()] + f"{name}=``" + page[end + 1:]
    return page, len(names)


PATCHES = [
    ("corrigé button",
     '        <button id="corrige" class="bouton discret" title="Remplace ton code par le corrigé de l\'étape précédente">↺ Corrigé précédent</button>\n',
     ""),
    ("corrigé handler",
     'co("corrige").addEventListener("click",()=>{let o=Js.etape,e=o===0?ple:n6e[o-1],t=o===0?"repartir d\'un fichier vide":`charger le corrig\\xE9 de l\'\\xE9tape ${o}`;confirm(`Ton code actuel sera remplac\\xE9. Veux-tu vraiment ${t} ?`)&&(x0.valeur=e,tI())});',
     ""),
    ("check event",
     "Gu.ecrire(\"reussites\",Js.reussites),mle(o),Ile()}",
     "Gu.ecrire(\"reussites\",Js.reussites),mle(o),Ile(),window.dispatchEvent("
     "new CustomEvent(\"wg:verifie\",{detail:{etape:Js.etape,defis:o.map(t=>({nom:t.nom,ok:!!t.ok})),"
     "reussi:fle(Js.etape)}}))}"),
    ("step API",
     "Js.dernierResultat&&sve()}function Wo(",
     "Js.dernierResultat&&sve()}window.WorldGenerator={allerA:o=>{o>=0&&o<TA.length&&_le(o)},"
     "etape:()=>Js.etape,nombreEtapes:()=>TA.length};function Wo("),
    ("fly along the crosshair",
     "g=R9e*(s?N9e:1)*e;h.x+=l*g,h.z+=c*g,h.y+=u*g}else{let u=this.corps",
     "g=R9e*(s?N9e:1)*e;let wgC=Math.cos(this.tangage),wgX=-r*wgC*i+a*n,"
     "wgY=Math.sin(this.tangage)*i,wgZ=-a*wgC*i-r*n,wgM=Math.hypot(wgX,wgY,wgZ);"
     "wgM>1&&(wgX/=wgM,wgY/=wgM,wgZ/=wgM);h.x+=wgX*g,h.z+=wgZ*g,h.y+=(wgY+u)*g}"
     "else{let u=this.corps"),
    ("embed.js",
     "</style>\n</head>\n<body>",
     '</style>\n<script src="embed.js"></script>\n</head>\n<body>'),
]


def port(page):
    page, n = blank_solutions(page)
    for what, old, new in PATCHES:
        page = replace_once(page, old, new, what)
    if re.search(r"[Cc]orrig", page):
        sys.exit("a mention of the solutions is still in the page")
    return page, n


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("source", help="World-Generator.zip or World-Generator.html")
    ap.add_argument("-o", "--output", default=str(Path(__file__).resolve().parent.parent / "index.html"))
    args = ap.parse_args()
    page, n = port(read_input(args.source))
    Path(args.output).write_text(page, encoding="utf-8")
    print(f"wrote {args.output}: {n} solutions removed, {len(PATCHES)} patches applied")


if __name__ == "__main__":
    main()
