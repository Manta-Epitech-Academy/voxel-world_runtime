// Les blocs du monde, et la forme du monde lui-même.
//
// Un monde est un Uint8Array de TAILLE × HAUTEUR × TAILLE octets, un type de
// bloc par case, rangé par `index(x, y, z)`. Le même tableau circule du
// worker Lua (qui le remplit) au maillage (qui le dessine) et aux
// vérifications (qui le lisent) : personne n'en fait de copie.

export const TAILLE = 128;
export const HAUTEUR = 64;
export const NB_CASES = TAILLE * TAILLE * HAUTEUR;

/** Les types de bloc. `faces` : la texture du dessus, des côtés, du dessous. */
export const BLOCS = [
  { id: 0, nom: "AIR", libelle: "Air" },
  { id: 1, nom: "BEDROCK", libelle: "Bedrock (indestructible)", faces: ["bedrock", "bedrock", "bedrock"] },
  { id: 2, nom: "PIERRE", libelle: "Pierre", faces: ["pierre", "pierre", "pierre"] },
  { id: 3, nom: "TERRE", libelle: "Terre", faces: ["terre", "terre", "terre"] },
  { id: 4, nom: "HERBE", libelle: "Herbe", faces: ["herbe", "herbe_cote", "terre"] },
  { id: 5, nom: "SABLE", libelle: "Sable", faces: ["sable", "sable", "sable"] },
  { id: 6, nom: "EAU", libelle: "Eau", faces: ["eau", "eau", "eau"], liquide: true },
  { id: 7, nom: "BOIS", libelle: "Tronc", faces: ["bois_dessus", "bois", "bois_dessus"] },
  { id: 8, nom: "FEUILLES", libelle: "Feuilles", faces: ["feuilles", "feuilles", "feuilles"] },
  { id: 9, nom: "NEIGE", libelle: "Neige", faces: ["neige", "neige_cote", "terre"] },
  { id: 10, nom: "GRAVIER", libelle: "Gravier", faces: ["gravier", "gravier", "gravier"] },
  { id: 11, nom: "CHARBON", libelle: "Minerai de charbon", faces: ["charbon", "charbon", "charbon"] },
  { id: 12, nom: "FER", libelle: "Minerai de fer", faces: ["fer", "fer", "fer"] },
  { id: 13, nom: "DIAMANT", libelle: "Minerai de diamant", faces: ["diamant", "diamant", "diamant"] },
  { id: 14, nom: "GLACE", libelle: "Glace", faces: ["glace", "glace", "glace"] },
];

/**
 * Les anciens noms, gardés comme alias dans le Lua : le code écrit avant le
 * renommage (2026-11-05) tourne toujours. Ni documentés, ni proposés.
 */
export const ALIAS = { SOCLE: "BEDROCK", GRAINE: "SEED" };

/** `B.PIERRE` vaut 2 : le nom de chaque bloc, comme dans le code Lua. */
export const B = Object.fromEntries(BLOCS.map((b) => [b.nom, b.id]));

const NOM_PAR_ID = Object.fromEntries(BLOCS.map((b) => [b.id, b.nom]));

/** Le nom d'un bloc d'après son numéro, pour les messages. */
export const nomDuBloc = (id) => NOM_PAR_ID[id] ?? `bloc inconnu (${id})`;

/** 1 pour un bloc qui bloque le passage et la lumière, 0 pour l'air et l'eau. Indexé par id. */
export const SOLIDE = new Uint8Array(256);
for (const b of BLOCS) SOLIDE[b.id] = b.id !== 0 && !b.liquide ? 1 : 0;

/** La case du tableau monde pour (x, y, z). Aucune vérification des bornes. */
export function index(x, y, z) {
  return x + TAILLE * (z + TAILLE * y);
}

/** Le bloc en (x, y, z), AIR en dehors du monde. */
export function blocEn(monde, x, y, z) {
  if (x < 0 || x >= TAILLE || z < 0 || z >= TAILLE || y < 0 || y >= HAUTEUR) return B.AIR;
  return monde[index(x, y, z)];
}
