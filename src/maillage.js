// Du tableau de blocs au maillage : pour chaque bloc, seules les faces qui
// donnent sur de l'air (ou, pour un solide, sur l'eau) deviennent des
// triangles. Le monde est découpé en chunks de 16 × 16 colonnes, chacun
// donnant deux maillages : les solides, et l'eau (translucide, dessinée après).
//
// L'éclairage est cuit dans la couleur des sommets : une teinte par
// orientation de face (`lum`), assombrie dans les coins où des blocs voisins
// font de l'ombre (occlusion ambiante, quatre niveaux).
import { TAILLE, HAUTEUR, B, SOLIDE, index } from "./blocs.js";

export const TAILLE_CHUNK = 16;

/** Le dessus de l'eau est un peu plus bas que le bloc, pour qu'on voie la surface. */
const NIVEAU_EAU = 0.875;

/** Les quatre coins d'une face, dans l'ordre de l'atlas : (0,0) (1,0) (1,1) (0,1). */
const UV_FACE = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/**
 * Les six faces d'un cube. `n` : la normale ; `coins` : les quatre sommets ;
 * `lum` : la lumière de cette orientation ; `tuile` : la texture (0 dessus,
 * 1 côtés, 2 dessous, voir `faces` dans blocs.js).
 */
export const FACES = [
  {
    n: [1, 0, 0],
    coins: [
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
    lum: 0.8,
    tuile: 1,
  },
  {
    n: [-1, 0, 0],
    coins: [
      [0, 0, 1],
      [0, 0, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    lum: 0.8,
    tuile: 1,
  },
  {
    n: [0, 0, 1],
    coins: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    lum: 0.65,
    tuile: 1,
  },
  {
    n: [0, 0, -1],
    coins: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    lum: 0.65,
    tuile: 1,
  },
  {
    n: [0, 1, 0],
    coins: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    lum: 1,
    tuile: 0,
  },
  {
    n: [0, -1, 0],
    coins: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    lum: 0.5,
    tuile: 2,
  },
];

// Chaque face est orientée pour que ses triangles regardent vers l'extérieur
// (le produit vectoriel des deux premiers côtés suit la normale), et connaît
// les deux axes de son plan, pour l'occlusion ambiante.
for (const face of FACES) {
  const [a, b, c] = face.coins;
  const ab = b.map((v, i) => v - a[i]);
  const ac = c.map((v, i) => v - a[i]);
  const produit = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  if (produit[0] * face.n[0] + produit[1] * face.n[1] + produit[2] * face.n[2] < 0) {
    face.coins.reverse();
    face.uv = [...UV_FACE].reverse();
  } else {
    face.uv = UV_FACE;
  }
  const axeNormal = face.n.findIndex((v) => v !== 0);
  face.axes = [0, 1, 2].filter((i) => i !== axeNormal);
}

/** L'occlusion ambiante : la lumière selon le nombre de voisins qui font de l'ombre (3 : aucun). */
const OCCLUSION = [0.45, 0.65, 0.82, 1];

/** Les tableaux d'un maillage en construction. */
class Tampon {
  constructor() {
    this.pos = [];
    this.uv = [];
    this.couleur = [];
    this.indices = [];
  }
  get vide() {
    return this.indices.length === 0;
  }
  tableaux() {
    return {
      positions: new Float32Array(this.pos),
      uvs: new Float32Array(this.uv),
      couleurs: new Float32Array(this.couleur),
      indices: new Uint32Array(this.indices),
    };
  }
}

/**
 * Maille le chunk (cx, cz) du monde. `uvParBloc[id]` donne les trois
 * rectangles de texture d'un bloc (dessus, côtés, dessous).
 * Renvoie `{ solide, eau }`, chacun null s'il n'y a rien à dessiner.
 */
export function maillerChunk(monde, uvParBloc, cx, cz) {
  const solide = new Tampon();
  const eau = new Tampon();
  // Sous le monde, un mur : on ne dessine pas le dessous du socle.
  const bloc = (x, y, z) =>
    y < 0 ? 1 : x < 0 || x >= TAILLE || z < 0 || z >= TAILLE || y >= HAUTEUR ? 0 : monde[index(x, y, z)];
  const opaque = (x, y, z) => SOLIDE[bloc(x, y, z)];
  const x0 = cx * TAILLE_CHUNK;
  const z0 = cz * TAILLE_CHUNK;

  for (let y = 0; y < HAUTEUR; y++)
    for (let z = z0; z < z0 + TAILLE_CHUNK; z++)
      for (let x = x0; x < x0 + TAILLE_CHUNK; x++) {
        const type = monde[index(x, y, z)];
        if (type === 0) continue;
        const liquide = type === B.EAU;
        for (const face of FACES) {
          const vx = x + face.n[0];
          const vy = y + face.n[1];
          const vz = z + face.n[2];
          const voisin = bloc(vx, vy, vz);
          // L'eau ne montre ses faces que contre l'air, jamais son dessous ;
          // un solide cache les siennes derrière un autre solide.
          if (liquide ? voisin !== 0 : SOLIDE[voisin]) continue;
          if (liquide && face.n[1] === -1) continue;

          const tampon = liquide ? eau : solide;
          const [u0, v0, u1, v1] = uvParBloc[type][face.tuile];
          const premier = tampon.pos.length / 3;
          const ombres = [];
          for (let i = 0; i < 4; i++) {
            const coin = face.coins[i];
            let haut = y + coin[1];
            // La surface de l'eau est abaissée, sauf sous un autre bloc d'eau.
            if (liquide && coin[1] === 1 && bloc(x, y + 1, z) !== B.EAU) haut = y + NIVEAU_EAU;
            tampon.pos.push(x + coin[0], haut, z + coin[2]);
            const [su, sv] = face.uv[i];
            tampon.uv.push(su ? u1 : u0, sv ? v1 : v0);

            // Occlusion ambiante du coin : les deux voisins le long des axes
            // de la face, et celui en diagonale, devant la face.
            let ombre = 3;
            if (!liquide) {
              const d1 = [0, 0, 0];
              const d2 = [0, 0, 0];
              d1[face.axes[0]] = coin[face.axes[0]] * 2 - 1;
              d2[face.axes[1]] = coin[face.axes[1]] * 2 - 1;
              const cote1 = opaque(vx + d1[0], vy + d1[1], vz + d1[2]);
              const cote2 = opaque(vx + d2[0], vy + d2[1], vz + d2[2]);
              const coinD = opaque(vx + d1[0] + d2[0], vy + d1[1] + d2[1], vz + d1[2] + d2[2]);
              ombre = cote1 && cote2 ? 0 : 3 - (cote1 + cote2 + coinD);
            }
            ombres.push(ombre);
            const lum = face.lum * OCCLUSION[ombre];
            tampon.couleur.push(lum, lum, lum);
          }
          // La diagonale du quad passe par les deux coins les plus sombres,
          // sinon l'ombre fait une pliure.
          if (ombres[0] + ombres[2] < ombres[1] + ombres[3]) {
            tampon.indices.push(premier + 1, premier + 2, premier + 3, premier + 1, premier + 3, premier);
          } else {
            tampon.indices.push(premier, premier + 1, premier + 2, premier, premier + 2, premier + 3);
          }
        }
      }
  return { solide: solide.vide ? null : solide.tableaux(), eau: eau.vide ? null : eau.tableaux() };
}
