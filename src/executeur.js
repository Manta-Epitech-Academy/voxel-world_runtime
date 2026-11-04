// Le côté page de l'exécution : un worker (lua/worker.js), relancé à chaque
// dépassement de temps ou plantage, et un chien de garde au cas où le hook
// de Lua lui-même ne reprendrait pas la main (une boucle dans une fonction
// native, par exemple).

/** Les secondes accordées au code de l'élève, sauf si l'adresse en donne d'autres (`?limite=600`). */
export const LIMITE_SECONDES = lireLimite();

function lireLimite() {
  try {
    const n = Number(new URLSearchParams(location.search).get("limite"));
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    // pas d'adresse lisible : la valeur par défaut
  }
  return 5;
}

/** Le chien de garde laisse quatre secondes de plus que le hook de Lua. */
const MARGE_MS = 4000;

let worker = null;
let compteur = 0;

function relancer() {
  worker?.terminate();
  worker = new Worker(new URL("./lua/worker.js", import.meta.url), { type: "module" });
  worker.postMessage({ type: "init" });
}

function resultatVide(erreur) {
  return { monde: null, sorties: [], horsMonde: 0, appels: {}, erreur };
}

/**
 * Exécute le code et renvoie le résultat du worker :
 * { monde, sorties, tronque, erreur, horsMonde, appels, duree }.
 * Ne rejette jamais : un plantage ou un arrêt forcé est une `erreur` du résultat.
 */
export function executer(code, graine, limite = LIMITE_SECONDES) {
  if (!worker) relancer();
  const id = ++compteur;
  return new Promise((resoudre) => {
    const garde = setTimeout(
      () => {
        relancer();
        resoudre(resultatVide({ type: "temps", brut: "arrêt forcé", ligne: null }));
      },
      limite * 1000 + MARGE_MS,
    );
    const recevoir = ({ data }) => {
      if (data.id !== id) return;
      clearTimeout(garde);
      worker.removeEventListener("message", recevoir);
      if (data.type === "resultat") {
        resoudre(data.resultat);
      } else {
        relancer();
        resoudre(resultatVide({ type: "plantage", brut: data.message, ligne: null }));
      }
    };
    worker.addEventListener("message", recevoir);
    worker.postMessage({ type: "executer", id, code, graine, limite });
  });
}
