// Le worker qui exécute le code de l'élève : Lua 5.4 compilé en WebAssembly
// (wasmoon), dans un thread à part pour que la page reste vivante pendant
// une boucle infinie — et pour que le code de l'élève ne voie jamais la
// page : `injectObjects` et `enableProxy` sont coupés, il n'a que le prélude.
//
// Protocole : { type: "executer", id, code, graine, limite } exécute le code
// de l'élève ; { type: "evaluer", id, code, graine, limite } évalue une ligne
// tapée dans la console, dans l'état Lua laissé par la dernière exécution
// (ou dans un état neuf s'il n'y en a pas eu). Les deux répondent
// { type: "resultat", id, resultat } ou { type: "plantage", id, message }.
import { LuaFactory } from "wasmoon";
import wasmUrl from "wasmoon/dist/glue.wasm?url";
import PRELUDE from "./prelude.lua?raw";
import { BLOCS, TAILLE, HAUTEUR, NB_CASES } from "../blocs.js";

/** Au-delà, la console n'affiche plus les messages, elle dit qu'elle en a coupé. */
const MAX_SORTIES = 300;
/** Ajouté à chaque type de bloc dans la chaîne exportée (voir __exporter). */
const DECALAGE = 33;

const ENTETE = [
  `TAILLE, HAUTEUR = ${TAILLE}, ${HAUTEUR}`,
  ...BLOCS.map((b) => `${b.nom} = ${b.id}`),
  `__NB_BLOCS = ${BLOCS.length}`,
  `__DECALAGE = ${DECALAGE}`,
  "",
].join("\n");

let fabrique = null;
function laFabrique() {
  return (fabrique ||= new LuaFactory(wasmUrl));
}

/** Le numéro de ligne du code de l'élève dans un message d'erreur ou une trace. */
function ligneDe(message, trace) {
  const m = /^code:(\d+):/.exec(message) || /code:(\d+):/.exec(trace);
  return m ? Number(m[1]) : null;
}

/** L'état Lua en cours : le moteur, et ce que `afficher` y a écrit depuis la dernière lecture. */
let moteur = null;

/** Ferme l'état en cours et en ouvre un neuf, avec le prélude et le code de l'élève chargés. */
async function preparer(code, graine, limite) {
  if (moteur) moteur.lua.global.close();
  moteur = null;
  const lua = await laFabrique().createEngine({ enableProxy: false, injectObjects: false });
  const etat = { lua, sorties: [], tronque: false };
  lua.global.set("GRAINE", graine);
  lua.global.set("__code", code);
  lua.global.set("__limite", limite);
  lua.global.set("__afficher", (texte) => {
    if (etat.sorties.length < MAX_SORTIES) etat.sorties.push(String(texte));
    else etat.tronque = true;
  });
  await lua.doString(ENTETE + PRELUDE);
  moteur = etat;
  return etat;
}

/** Ce que `afficher` a écrit depuis le dernier appel, puis on repart de zéro. */
function sortiesDe(etat) {
  const { sorties, tronque } = etat;
  etat.sorties = [];
  etat.tronque = false;
  return { sorties, tronque };
}

function erreurDe(statut, message, trace = "") {
  return {
    type: message.includes("__TEMPS_DEPASSE__") ? "temps" : statut,
    brut: message.replace(/^(?:code|console):\d+:\s*/, ""),
    ligne: ligneDe(message, trace),
  };
}

async function exporterMonde(lua) {
  const chaine = await lua.doString("return __exporter()");
  const monde = new Uint8Array(NB_CASES);
  for (let i = 0; i < NB_CASES; i++) monde[i] = chaine.charCodeAt(i) - DECALAGE;
  return monde;
}

async function executer(code, { graine = 1, limite = 5 } = {}) {
  const debut = performance.now();
  const etat = await preparer(code, graine, limite);
  const { lua } = etat;
  await lua.doString("__statut, __message, __trace = __lancer()");
  const statut = lua.global.get("__statut");
  const erreur =
    statut === "ok" ? null : erreurDe(statut, lua.global.get("__message"), lua.global.get("__trace"));
  return {
    monde: await exporterMonde(lua),
    ...sortiesDe(etat),
    erreur,
    horsMonde: lua.global.get("__hors_monde"),
    appels: {
      bruit: lua.global.get("__n_bruit"),
      bruitEntier: lua.global.get("__n_bruit_entier"),
      bruit3d: lua.global.get("__n_bruit3d"),
    },
    duree: performance.now() - debut,
  };
}

/** Une ligne de la console. `monde` n'est renvoyé que si la ligne a posé des blocs. */
async function evaluer(src, { graine = 1, limite = 5 } = {}) {
  const etat = moteur || (await preparer("", graine, limite));
  const { lua } = etat;
  lua.global.set("__limite", limite);
  lua.global.set("__src", src);
  const avant = lua.global.get("__modifs");
  await lua.doString("__statut, __message = __evaluer(__src)");
  const statut = lua.global.get("__statut");
  const message = lua.global.get("__message");
  const resultat = { ...sortiesDe(etat), valeur: null, erreur: null, incomplet: false, monde: null };
  if (statut === "incomplet") resultat.incomplet = true;
  else if (statut === "ok") resultat.valeur = message ?? null;
  else resultat.erreur = erreurDe(statut, message);
  if (lua.global.get("__modifs") !== avant) resultat.monde = await exporterMonde(lua);
  return resultat;
}

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    laFabrique();
    return;
  }
  if (data.type !== "executer" && data.type !== "evaluer") return;
  try {
    const options = { graine: data.graine, limite: data.limite };
    const resultat =
      data.type === "executer" ? await executer(data.code, options) : await evaluer(data.code, options);
    self.postMessage(
      { type: "resultat", id: data.id, resultat },
      resultat.monde ? [resultat.monde.buffer] : [],
    );
  } catch (e) {
    self.postMessage({ type: "plantage", id: data.id, message: String(e?.message ?? e) });
  }
};
