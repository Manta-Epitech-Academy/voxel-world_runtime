# World Generator — runtime

Le moteur de l'atelier « World Generator » : le monde en 3D, l'éditeur Lua et la console, dans
une seule page. Le code de l'élève est du **Lua**, exécuté dans le navigateur par wasmoon.

**Ce dépôt ne contient pas le sujet de l'atelier**, il vit dans
[voxel-world_subject](https://github.com/Manta-Epitech-Academy/voxel-world_subject) et la
plateforme l'affiche à côté de ce runtime. La page ne montre, de chaque étape, que son titre et
la liste de ses défis, dans le panneau « Vérification » ; deux flèches changent d'étape quand
aucun hôte ne le fait à la place du participant.

Essayer : <https://manta-epitech-academy.github.io/voxel-world_runtime/>

## Les sources

L'application d'origine n'existait que sous la forme d'une page minifiée (`World-Generator.zip`,
un build Vite d'un seul fichier). Elle a été reconstituée ici en sources lisibles, module par
module, avec le même comportement et les mêmes textes. Trois différences voulues :

- **Les panneaux sont posés par [dockview](https://dockview.dev)**, comme dans l'éditeur TIC-80 de
  l'organisation : on les redimensionne, on les déplace par leur onglet, on agrandit un groupe
  à toute la page (⛶), et la disposition est gardée dans le navigateur. La console est un
  panneau à part, sous le code ; la vérification, sous le monde.
- **L'éditeur Monaco est réglé pour un débutant**, comme dans le runtime Pac-Man : rien
  n'apparaît que l'élève n'ait tapé. Pas de parenthèse fermée toute seule, pas de liste de
  suggestions pendant la frappe (elle reste disponible par Ctrl + Espace), pas de reformatage.
  La bulle de documentation au survol d'une fonction reste.
- **La console est aussi une invite Lua**, comme dans le runtime Pac-Man : sous ce que le code
  affiche, une ligne où taper du Lua et appuyer sur Entrée. Elle tourne dans l'état laissé par la
  dernière génération : les fonctions de l'élève sont visibles, `lire` regarde le monde affiché,
  et un `bloc(...)` tapé là pose le bloc dans la vue. Une expression seule affiche sa valeur ;
  un morceau sur plusieurs lignes (un `if` sans son `end`) fait passer l'invite à `>>`.
- **Les fonctions en anglais simple** : `set_block`, `get_block`, `perlin2d`, `perlin3d`, `random`,
  `print`, et les mots de Minecraft `BEDROCK` et `SEED` (renommés le 5 novembre 2026 ; les
  autres constantes restent en français). Les anciens noms (`bloc`, `lire`, `bruit`, `bruit3d`,
  `hasard`, `afficher`, `SOCLE`, `GRAINE`) restent des alias dans le Lua, sans être documentés :
  le code écrit avant tourne toujours.
- **Pas de corrigés.** Le bouton « Corrigé précédent » et les sept solutions ne sont pas dans
  les sources : un élève n'a jamais le code d'une étape qu'il doit écrire.

| Dossier / fichier | Rôle |
|---|---|
| `index.html` | la page : la barre du haut et le contenu de chaque panneau |
| `src/main.js` | le point d'entrée : relie l'éditeur, l'exécution, la vue 3D, les consignes, la progression |
| `src/blocs.js` | les types de bloc, la taille du monde, `index(x, y, z)` |
| `src/lua/prelude.lua` | ce que le code de l'élève trouve défini : `set_block`, `get_block`, `perlin2d`, `perlin3d`, `random`, `print` |
| `src/lua/worker.js` | le worker qui exécute le Lua (wasmoon), coupé de la page ; garde l'état pour l'invite |
| `src/executeur.js` | côté page : lance le worker, le relance après une boucle infinie |
| `src/erreurs.js` | les erreurs de Lua traduites pour un débutant |
| `src/editeur.js` | Monaco : thème, complétion, documentation au survol, réglage débutant |
| `src/textures.js`, `src/maillage.js` | l'atlas de textures dessiné au pixel, et les chunks de triangles |
| `src/deplacement.js`, `src/monde3d.js` | le vol et la marche ; la scène three.js |
| `src/etapes/` | les sept étapes : leur titre, et les défis qui vérifient le monde (le texte vit dans le sujet) |
| `src/verifications.js` | les outils communs aux défis (couches, hauteurs, marches) |
| `src/verification.js`, `src/console.js` | le panneau de vérification ; la console et son invite Lua |
| `src/disposition.js` | les panneaux (dockview) |
| `src/plateforme.js` | ce que la plateforme d'atelier attend : code de validation, mode plateforme |
| `scripts/export_scene.py` | exporte un monde en scène glTF (`.glb`) pour le sujet |
| `tests/check.py` | vérifie les sept étapes de bout en bout, le mode plateforme et le vol |

## Développement

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
```

Le test de bout en bout a besoin de Playwright avec Chromium, et des solutions officielles, qui
ne sont pas dans les sources : elles sont dans l'archive d'origine, gardée dans l'historique.

```sh
git show ab2d5b3:World-Generator.zip > /tmp/World-Generator.zip
npm run build
python3 tests/check.py /tmp/World-Generator.zip
```

Pour chaque étape, le test charge la solution, clique sur « ▶ Générer », et vérifie que le code
de validation affiché est celui que la plateforme attend. Il vérifie aussi qu'aucune ligne des
solutions n'est dans le build.

## Validation des étapes

Chaque étape a une liste de défis que l'application vérifie au clic sur « ▶ Générer ». Quand
tous sont au vert, et que la plateforme a fourni son secret, `src/plateforme.js` affiche un
code de validation :

```
monde{ 12 premiers caractères hexadécimaux de HMAC-SHA256(secret, "voxel-world:<n° d'étape>") }
```

La plateforme calcule la même valeur et en fait le flag de l'étape. Le secret est propre à
chaque instance, donc un code ne sert pas d'une session à l'autre. Le code Lua de l'élève ne
peut pas lire ce secret : wasmoon tourne dans un worker sans accès au JavaScript de la page
(`injectObjects` et `enableProxy` désactivés).

## Intégration dans la plateforme

Servi à l'identique sous `/runtime/voxel-world/<version>/` (toutes les adresses sont relatives,
`base: "./"` dans `vite.config.js`). L'adaptateur `voxel-world.js` côté plateforme transmet le
secret, suit l'étape lue par le participant et recopie le code de validation dans la case de
l'étape. Le code de l'élève est sauvegardé dans `localStorage`, clés `mwg.*`.

Deux paramètres d'adresse : `?plateforme=1` (mode plateforme sans hôte, pour un runtime servi
depuis une autre origine) et `?limite=600` (les secondes accordées au code, pour l'export de
scènes ; les élèves en ont cinq).

## Déploiement

- **GitHub Pages** (`.github/workflows/pages.yml`) : le build de `main`, à la racine du site, que
  `ctf-0110.epiboost.fr` affiche comme runtime externe — chaque push sur `main` y est en ligne.
- **Image Docker** (`.github/workflows/docker.yml`) : construit par le `Dockerfile` (Node pour
  le build, nginx pour servir) et publiée sur GHCR à chaque push sur `main`.
