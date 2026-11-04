// Le code et la progression de l'élève restent dans le navigateur du poste,
// sous des clés `mwg.*` (la plateforme d'atelier les connaît : elle les
// sauvegarde côté serveur et les remet en place, voir embed/plateforme.js).
const PREFIXE = "mwg.";

export const stockage = {
  lire(cle, defaut) {
    try {
      const brut = localStorage.getItem(PREFIXE + cle);
      return brut === null ? defaut : JSON.parse(brut);
    } catch {
      return defaut;
    }
  },
  ecrire(cle, valeur) {
    try {
      localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
    } catch {
      // stockage plein ou interdit : on continue sans sauvegarder
    }
  },
};
