// Les textures des blocs ne sont pas des images : elles sont dessinées ici,
// pixel par pixel, sur un canvas de 128 × 128 qui tient toutes les tuiles de
// 16 × 16 (huit par ligne). Le dessin est déterministe, chaque tuile ayant son
// propre générateur pseudo-aléatoire, donc l'atlas est le même à chaque
// chargement. `uv` donne, pour chaque nom de texture, le rectangle à
// appliquer sur une face : [u0, v0, u1, v1], rentré d'un demi-pixel pour que
// les tuiles voisines ne bavent pas l'une sur l'autre.

/** Un générateur pseudo-aléatoire (mulberry32) : une graine, des nombres entre 0 et 1. */
export function aleatoire(graine) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 1831565813) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb([r, g, b], facteur = 1) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * facteur)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/** Une tuile unie, chaque pixel éclairci ou assombri un peu au hasard. */
function aplat(ctx, rnd, couleur, variation = 0.12) {
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      ctx.fillStyle = rgb(couleur, 1 - variation + rnd() * variation * 2);
      ctx.fillRect(x, y, 1, 1);
    }
}

/** Quelques taches carrées d'une autre couleur, posées au hasard. */
function taches(ctx, rnd, couleur, nombre, taille = 2) {
  for (let i = 0; i < nombre; i++) {
    const x = Math.floor(rnd() * (16 - taille + 1));
    const y = Math.floor(rnd() * (16 - taille + 1));
    for (let dy = 0; dy < taille; dy++)
      for (let dx = 0; dx < taille; dx++)
        if (rnd() < 0.8) {
          ctx.fillStyle = rgb(couleur, 0.9 + rnd() * 0.2);
          ctx.fillRect(x + dx, y + dy, 1, 1);
        }
  }
}

const VERT_HERBE = [96, 160, 64];
const BRUN_TERRE = [134, 96, 67];
const GRIS_PIERRE = [125, 125, 125];

/** De la pierre avec six taches de minerai. */
function minerai(couleur) {
  return (ctx, rnd) => {
    aplat(ctx, rnd, GRIS_PIERRE);
    taches(ctx, rnd, couleur, 6, 2);
  };
}

/** Un dessinateur par nom de texture (voir `faces` dans blocs.js). */
export const DESSINS = {
  bedrock(ctx, rnd) {
    aplat(ctx, rnd, [60, 60, 60], 0.35);
  },
  pierre(ctx, rnd) {
    aplat(ctx, rnd, GRIS_PIERRE);
    taches(ctx, rnd, [105, 105, 105], 8, 2);
  },
  terre(ctx, rnd) {
    aplat(ctx, rnd, BRUN_TERRE, 0.15);
    taches(ctx, rnd, [110, 78, 54], 6, 1);
  },
  herbe(ctx, rnd) {
    aplat(ctx, rnd, VERT_HERBE, 0.18);
  },
  herbe_cote(ctx, rnd) {
    DESSINS.terre(ctx, rnd);
    for (let x = 0; x < 16; x++) {
      const h = 3 + Math.floor(rnd() * 3);
      for (let y = 0; y < h; y++) {
        ctx.fillStyle = rgb(VERT_HERBE, 0.85 + rnd() * 0.3);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  },
  sable(ctx, rnd) {
    aplat(ctx, rnd, [219, 207, 163], 0.06);
  },
  eau(ctx, rnd) {
    aplat(ctx, rnd, [52, 110, 220], 0.08);
  },
  bois(ctx, rnd) {
    for (let x = 0; x < 16; x++) {
      const strie = x % 4 === 0 ? 0.75 : 0.95 + rnd() * 0.1;
      for (let y = 0; y < 16; y++) {
        ctx.fillStyle = rgb([104, 82, 50], strie * (0.95 + rnd() * 0.1));
        ctx.fillRect(x, y, 1, 1);
      }
    }
  },
  bois_dessus(ctx, rnd) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const anneau = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        const sombre = Math.floor(anneau) % 3 === 0;
        ctx.fillStyle =
          anneau > 6.5 ? rgb([104, 82, 50]) : rgb([176, 142, 90], sombre ? 0.8 : 0.95 + rnd() * 0.1);
        ctx.fillRect(x, y, 1, 1);
      }
  },
  feuilles(ctx, rnd) {
    aplat(ctx, rnd, [58, 120, 40], 0.25);
    taches(ctx, rnd, [36, 80, 26], 10, 2);
  },
  neige(ctx, rnd) {
    aplat(ctx, rnd, [240, 248, 255], 0.04);
  },
  neige_cote(ctx, rnd) {
    DESSINS.terre(ctx, rnd);
    for (let x = 0; x < 16; x++) {
      const h = 3 + Math.floor(rnd() * 3);
      for (let y = 0; y < h; y++) {
        ctx.fillStyle = rgb([240, 248, 255], 0.95 + rnd() * 0.05);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  },
  gravier(ctx, rnd) {
    aplat(ctx, rnd, [136, 126, 126], 0.2);
    taches(ctx, rnd, [100, 92, 92], 12, 2);
  },
  charbon: minerai([30, 30, 30]),
  fer: minerai([216, 175, 147]),
  diamant: minerai([93, 236, 245]),
  glace(ctx, rnd) {
    aplat(ctx, rnd, [160, 190, 250], 0.05);
  },
};

/** Dessine l'atlas. Renvoie le canvas et, par nom de texture, son rectangle [u0, v0, u1, v1]. */
export function dessinerAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const uv = {};
  const marge = 0.5 / canvas.width;
  Object.keys(DESSINS).forEach((nom, i) => {
    const x = (i % 8) * 16;
    const y = Math.floor(i / 8) * 16;
    ctx.save();
    ctx.translate(x, y);
    DESSINS[nom](ctx, aleatoire(i * 7919 + 17));
    ctx.restore();
    uv[nom] = [
      x / canvas.width + marge,
      1 - (y + 16) / canvas.height + marge,
      (x + 16) / canvas.width - marge,
      1 - y / canvas.height - marge,
    ];
  });
  return { canvas, uv };
}
