// Le worker qui exécute le code de l'élève : Lua 5.4 compilé en WebAssembly
// (wasmoon), dans un thread à part pour que la page reste vivante pendant
// une boucle infinie — et pour que le code de l'élève ne voie jamais la
// page : `injectObjects` et `enableProxy` sont coupés, il n'a que le prélude.
//
// Protocole : { type: "executer", id, code, graine, limite } →
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

async function executer(code, { graine = 1, limite = 5 } = {}) {
  const lua = await laFabrique().createEngine({ enableProxy: false, injectObjects: false });
  const sorties = [];
  let tronque = false;
  const debut = performance.now();
  try {
    lua.global.set("GRAINE", graine);
    lua.global.set("__code", code);
    lua.global.set("__limite", limite);
    lua.global.set("__afficher", (texte) => {
      if (sorties.length < MAX_SORTIES) sorties.push(String(texte));
      else tronque = true;
    });
    await lua.doString(ENTETE + PRELUDE);
    await lua.doString("__statut, __message, __trace = __lancer()");
    const statut = lua.global.get("__statut");
    const message = lua.global.get("__message");
    const trace = lua.global.get("__trace");
    let erreur = null;
    if (statut !== "ok") {
      erreur = {
        type: message.includes("__TEMPS_DEPASSE__") ? "temps" : statut,
        brut: message.replace(/^code:\d+:\s*/, ""),
        ligne: ligneDe(message, trace),
      };
    }
    const chaine = await lua.doString("return __exporter()");
    const monde = new Uint8Array(NB_CASES);
    for (let i = 0; i < NB_CASES; i++) monde[i] = chaine.charCodeAt(i) - DECALAGE;
    return {
      monde,
      sorties,
      tronque,
      erreur,
      horsMonde: lua.global.get("__hors_monde"),
      appels: {
        bruit: lua.global.get("__n_bruit"),
        bruitEntier: lua.global.get("__n_bruit_entier"),
        bruit3d: lua.global.get("__n_bruit3d"),
      },
      duree: performance.now() - debut,
    };
  } finally {
    lua.global.close();
  }
}

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    laFabrique();
    return;
  }
  if (data.type !== "executer") return;
  try {
    const resultat = await executer(data.code, { graine: data.graine, limite: data.limite });
    self.postMessage({ type: "resultat", id: data.id, resultat }, [resultat.monde.buffer]);
  } catch (e) {
    self.postMessage({ type: "plantage", id: data.id, message: String(e?.message ?? e) });
  }
};
