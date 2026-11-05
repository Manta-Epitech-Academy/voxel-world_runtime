// Étape 3 : les couches. Bedrock, pierre, trois terre, herbe, dans chaque colonne.
import {
  B,
  TAILLE,
  HAUTEUR,
  index,
  blocEn,
  nomDuBloc,
  ok,
  rate,
  compter,
  premierBloc,
  hauteurs,
  plusGrandeMarche,
  verifierCouches,
} from "../verifications.js";

export default {
  titre: "Les couches",
  duree: "20 min",
  lore: `
    <p>Creuse dans Minecraft : sous l'herbe il y a de la terre, puis de la pierre, et tout au fond
    la <strong>bedrock</strong> que rien ne peut casser.</p>
    <p>Ton monde, lui, n'a qu'une pellicule d'un bloc d'épaisseur. Un coup de pelle et on tombe dans le vide.</p>`,
  outils: [
    {
      titre: "Les variables",
      texte: `<p>Une <strong>variable</strong> est une boîte avec un nom. Change la valeur de
        <code>SOL</code> une seule fois, et tout le code qui l'utilise suit.</p>`,
      code: `local SOL = 20
set_block(64, SOL, 64, HERBE)
set_block(64, SOL - 1, 64, TERRE)`,
    },
    {
      titre: "Une boucle vers le haut",
      texte: "<p>La même boucle <code>for</code>, mais sur y : une colonne de pierre de y = 1 à y = 16.</p>",
      code: `for y = 1, 16 do
  set_block(64, y, 64, PIERRE)
end`,
    },
    {
      titre: "Calculer avec les variables",
      texte:
        "<p>On peut faire des calculs partout où on attend un nombre : <code>+</code>, <code>-</code>, <code>*</code> (fois), <code>/</code> (divisé).</p>",
      code: `local SOL = 20
print(SOL - 4, SOL - 3, SOL - 1)`,
    },
  ],
  pieges: [
    "Si la pierre va jusqu'à <code>SOL - 4</code>, la terre commence à <code>SOL - 3</code>. Un chiffre de travers et les couches se chevauchent.",
    "Si tu poses deux blocs au même endroit, c'est <strong>le dernier</strong> qui gagne.",
  ],
  objectif:
    "Dans chaque colonne, de bas en haut : <code>BEDROCK</code> à y = 0, de la <code>PIERRE</code>, exactement 3 blocs de <code>TERRE</code>, puis l'<code>HERBE</code> au sommet.",
  indices: [
    "Avec <code>SOL = 20</code> : bedrock à 0, pierre de 1 à 16, terre de 17 à 19, herbe à 20.",
    "Tu as déjà les deux boucles x et z de l'étape 2. C'est <strong>à l'intérieur</strong> que tu empiles la colonne.",
    "Il te faut une boucle sur y pour la pierre, et une autre pour la terre.",
  ],
  bonus: "Vole sous ton monde (<kbd>Maj</kbd>) et regarde la tranche : on voit les couches sur les bords.",

  defis: [{ nom: "Bedrock, pierre, 3 terre, herbe", verifier: (monde) => verifierCouches(monde) }],
};
