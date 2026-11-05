// Les outils communs aux défis des étapes (etapes/*.js) : lire le monde,
// trouver le sommet des colonnes, contrôler les couches. Chaque vérification
// renvoie `ok(message)` ou `rate(message)`, le message étant écrit pour
// l'élève : il dit où regarder, pas seulement que c'est faux.
import { TAILLE, HAUTEUR, B, index, nomDuBloc } from "./blocs.js";

export { blocEn, nomDuBloc, index, B, TAILLE, HAUTEUR } from "./blocs.js";

export const ok = (message) => ({ ok: true, message });
export const rate = (message) => ({ ok: false, message });

/** Combien de blocs d'un type dans le monde. */
export function compter(monde, type) {
  let n = 0;
  for (let i = 0; i < monde.length; i++) if (monde[i] === type) n++;
  return n;
}

/** Le premier bloc non vide, en balayant par hauteur croissante ; null si le monde est vide. */
export function premierBloc(monde) {
  for (let y = 0; y < HAUTEUR; y++)
    for (let z = 0; z < TAILLE; z++)
      for (let x = 0; x < TAILLE; x++) {
        const b = monde[index(x, y, z)];
        if (b) return { x, y, z, b };
      }
  return null;
}

/** Les arbres ne comptent pas comme du terrain. */
const VEGETATION = new Set([B.BOIS, B.FEUILLES]);

/**
 * Le y du sommet de chaque colonne (Int16Array de TAILLE × TAILLE, indexée
 * x + TAILLE * z), -1 pour une colonne vide. Les arbres sont ignorés, et
 * l'eau aussi avec `sansEau`.
 */
export function hauteurs(monde, { sansEau = false } = {}) {
  const sommets = new Int16Array(TAILLE * TAILLE).fill(-1);
  for (let z = 0; z < TAILLE; z++)
    for (let x = 0; x < TAILLE; x++)
      for (let y = HAUTEUR - 1; y >= 0; y--) {
        const b = monde[index(x, y, z)];
        if (b === B.AIR || VEGETATION.has(b) || (sansEau && b === B.EAU)) continue;
        sommets[x + TAILLE * z] = y;
        break;
      }
  return sommets;
}

/** La plus grande différence de hauteur entre deux colonnes voisines, et où elle est. */
export function plusGrandeMarche(sommets) {
  let max = 0;
  let ou = null;
  for (let z = 0; z < TAILLE; z++)
    for (let x = 0; x < TAILLE; x++) {
      const h = sommets[x + TAILLE * z];
      if (x + 1 < TAILLE) {
        const d = Math.abs(h - sommets[x + 1 + TAILLE * z]);
        if (d > max) [max, ou] = [d, [x, z, x + 1, z]];
      }
      if (z + 1 < TAILLE) {
        const d = Math.abs(h - sommets[x + TAILLE * (z + 1)]);
        if (d > max) [max, ou] = [d, [x, z, x, z + 1]];
      }
    }
  return { max, ou };
}

const nomsDesBlocs = (types) =>
  [...types]
    .filter((t) => t !== B.AIR)
    .map(nomDuBloc)
    .join(" ou ");

/**
 * Chaque colonne doit être, de bas en haut : BEDROCK à y = 0, des `pierres`,
 * trois blocs de `sous`, puis un bloc de `dessus` au sommet. Avec AIR parmi
 * les `pierres`, les grottes sont permises.
 */
export function verifierCouches(
  monde,
  {
    dessus = new Set([B.HERBE]),
    sous = new Set([B.TERRE]),
    pierres = new Set([B.PIERRE]),
    hauteurMin = 5,
  } = {},
) {
  const sommets = hauteurs(monde, { sansEau: true });
  for (let z = 0; z < TAILLE; z++)
    for (let x = 0; x < TAILLE; x++) {
      const sommet = sommets[x + TAILLE * z];
      if (sommet < 0) return rate(`La colonne (${x}, ${z}) est vide.`);
      if (sommet < hauteurMin) {
        return rate(
          `En (${x}, ${z}), le sol n'est qu'à y = ${sommet}. Il faut au moins ${hauteurMin} blocs pour loger toutes les couches.`,
        );
      }
      const attendu = (y) =>
        y === 0
          ? [new Set([B.BEDROCK]), "BEDROCK"]
          : y === sommet
            ? [dessus, nomsDesBlocs(dessus)]
            : y >= sommet - 3
              ? [sous, nomsDesBlocs(sous)]
              : [pierres, nomsDesBlocs(pierres)];
      for (let y = 0; y <= sommet; y++) {
        const b = monde[index(x, y, z)];
        const [types, nom] = attendu(y);
        if (types.has(b)) continue;
        if (b === B.AIR && pierres.has(B.AIR)) continue;
        return rate(
          `En (${x}, ${y}, ${z}) il y a ${nomDuBloc(b)}, il faudrait ${nom} (le sommet de cette colonne est à y = ${sommet}).`,
        );
      }
    }
  return ok("Toutes les colonnes ont leurs couches dans le bon ordre.");
}
