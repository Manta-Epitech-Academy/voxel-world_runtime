// Les messages d'erreur de Lua, traduits pour un débutant. Chaque motif
// reconnu donne une phrase qui dit quoi faire ; le message brut de Lua reste
// affiché en dessous, en gris, pour qui veut le lire.
import { NOMS_CONNUS } from "./api.js";

/** La distance de Levenshtein : combien de lettres séparent deux mots. */
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Les identifiants qui apparaissent dans un code, sans doublon. */
function identifiants(code) {
  return [...new Set(code.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [])];
}

/**
 * Le nom connu le plus proche d'un mot mal tapé, ou null si rien n'est assez
 * proche (une lettre de travers pour trois lettres du mot, au plus).
 */
export function suggestion(mot, autresNoms = []) {
  let meilleur = null;
  let meilleure = Infinity;
  for (const nom of [...NOMS_CONNUS, ...autresNoms]) {
    const d = distance(mot.toLowerCase(), nom.toLowerCase());
    if (d < meilleure) [meilleur, meilleure] = [nom, d];
  }
  return meilleure > 0 && meilleure <= Math.max(1, Math.floor(mot.length / 3)) ? meilleur : null;
}

function typeLua(nom) {
  return (
    { number: "nombre", nil: "vide (nil)", string: "texte", table: "table", boolean: "booléen" }[nom] || nom
  );
}

/** [motif, (correspondance, identifiants du code) => phrase] */
const TRADUCTIONS = [
  [
    /attempt to call a nil value \(global '(\w+)'\)/,
    (m, noms) => {
      const s = suggestion(m[1], noms);
      return (
        `La fonction « ${m[1]} » n'existe pas.` +
        (s
          ? ` Faute de frappe ? Tu voulais peut-être écrire « ${s} ».`
          : " As-tu bien écrit son nom, et l'as-tu définie avant de l'appeler ?")
      );
    },
  ],
  [
    /attempt to perform arithmetic on a nil value \(global '(\w+)'\)/,
    (m, noms) => {
      const s = suggestion(m[1], noms);
      return (
        `La variable « ${m[1]} » n'a pas de valeur : elle n'a jamais été créée.` +
        (s
          ? ` Tu voulais peut-être écrire « ${s} ».`
          : " Vérifie son orthographe, ou donne-lui une valeur avant ce calcul.")
      );
    },
  ],
  [
    /attempt to perform arithmetic on a nil value \(local '(\w+)'\)/,
    (m) =>
      `La variable « ${m[1]} » ne contient rien (nil) au moment du calcul. Vérifie la ligne où tu lui donnes une valeur.`,
  ],
  [
    /attempt to perform arithmetic on a nil value/,
    () => "Un calcul utilise une valeur vide (nil). Une variable mal orthographiée, peut-être ?",
  ],
  [
    /attempt to compare (\w+) with (\w+)/,
    (m) =>
      `Impossible de comparer un ${typeLua(m[1])} avec un ${typeLua(m[2])}. Une des deux valeurs est sans doute vide (nil) ou mal orthographiée.`,
  ],
  [
    /attempt to concatenate a nil value/,
    () => "Tu colles du texte avec « .. » mais l'une des valeurs est vide (nil).",
  ],
  [
    /'end' expected \(to close '(\w+)' at line (\d+)\)/,
    (m) =>
      `Il manque un « end » pour fermer le « ${m[1]} » de la ligne ${m[2]}. Chaque for, if, while et function se termine par end.`,
  ],
  [
    /'end' expected near/,
    () => "Il manque un « end ». Chaque for, if, while et function se termine par end.",
  ],
  [
    /'then' expected near '='/,
    () =>
      "Pour comparer dans un if, on écrit == (deux signes égal) : if h == 20 then. Un seul = sert à ranger une valeur.",
  ],
  [/'then' expected near/, () => "Il manque « then » après la condition du if : if condition then … end"],
  [/'do' expected near/, () => "Il manque « do » : for x = 0, 10 do … end"],
  [/'=' or 'in' expected near/, () => "La boucle for est mal écrite. La forme est : for x = 0, 10 do … end"],
  [/'\)' expected near/, () => "Il manque une parenthèse fermante « ) »."],
  [
    /unexpected symbol near '(.+)'/,
    (m) =>
      `Lua ne comprend pas « ${m[1]} » à cet endroit. Une virgule ou une parenthèse en trop ou en moins ?`,
  ],
  [/'<eof>' expected near 'end'/, () => "Il y a un « end » de trop : il ne ferme rien."],
  [/unfinished string/, () => `Un texte n'est pas fermé : il manque un guillemet " à la fin.`],
  [
    /bad argument #(\d+) to '(\w+)'/,
    (m) => `Le paramètre n°${m[1]} donné à « ${m[2]} » n'est pas du bon type.`,
  ],
  [/stack overflow/, () => "Une fonction s'appelle elle-même sans jamais s'arrêter."],
  [/not enough memory/, () => "Ton code utilise trop de mémoire : une table qui grandit sans fin ?"],
];

/**
 * La phrase à montrer pour une erreur `{ type, brut, ligne }` renvoyée par
 * l'exécuteur. `limite` : les secondes accordées au code ; `code` : le code
 * de l'élève, pour suggérer un nom proche en cas de faute de frappe.
 */
export function expliquerErreur(erreur, limite = 5, code = "") {
  if (erreur.type === "temps") {
    return (
      `Ton code tourne depuis ${limite} seconde${limite > 1 ? "s" : ""}, il a été arrêté. Une boucle qui ne s'arrête jamais ?` +
      (erreur.ligne ? ` Il était en train d'exécuter la ligne ${erreur.ligne}.` : "")
    );
  }
  for (const [motif, phrase] of TRADUCTIONS) {
    const m = motif.exec(erreur.brut);
    if (m) {
      return phrase(
        m,
        identifiants(code).filter((nom) => nom !== m[1]),
      );
    }
  }
  return erreur.brut;
}
