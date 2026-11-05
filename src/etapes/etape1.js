// Étape 1 : poser un bloc. Le défi vérifie une seule case, et dit où le bloc est allé à la place.
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
  titre: "Premier bloc",
  duree: "15 min",
  lore: `
    <p>Le serveur a planté. Quand tu te reconnectes, il ne reste <strong>rien</strong> : un ciel bleu,
    une grille au sol et trois flèches de couleur. Un message s'affiche : <em>« Monde introuvable.
    Mode architecte activé. »</em></p>
    <p>Ici, pas de pioche. Les blocs apparaissent quand tu <strong>écris du code</strong>.</p>`,
  outils: [
    {
      titre: "Appeler une fonction",
      texte: `<p>Une <strong>fonction</strong> est une action toute prête. On l'appelle en écrivant son nom,
        puis ses <strong>paramètres</strong> entre parenthèses, séparés par des virgules.</p>
        <p><code>set_block</code> pose un bloc. Ses quatre paramètres : x, y, z, puis le type de bloc.</p>`,
      code: "set_block(64, 10, 64, PIERRE)",
    },
    {
      titre: "Les coordonnées x, y, z",
      texte: `<p>Regarde les flèches dans le monde : <strong style="color:#e55">x</strong> et
        <strong style="color:#59f">z</strong> avancent sur le sol, <strong style="color:#4c4">y</strong>
        monte vers le ciel.</p>
        <p>Le monde va de <code>0</code> à <code>127</code> en x et en z, et de <code>0</code> à
        <code>63</code> en hauteur. Le coin des flèches, c'est (0, 0, 0).</p>`,
      code: `set_block(0, 0, 0, HERBE)  -- dans le coin, au sol
set_block(0, 5, 0, HERBE)  -- 5 blocs plus haut`,
    },
    {
      titre: "Voler et marcher dans le monde",
      texte: `<p><strong>Clique</strong> sur le monde pour prendre le contrôle, puis :</p>
        <ul>
          <li><kbd>Z</kbd> <kbd>Q</kbd> <kbd>S</kbd> <kbd>D</kbd> pour avancer et te décaler</li>
          <li>la <strong>souris</strong> pour regarder autour</li>
          <li><kbd>Espace</kbd> pour monter, <kbd>Maj</kbd> pour descendre, <kbd>R</kbd> pour aller vite</li>
          <li><kbd>F</kbd>, ou deux fois <kbd>Espace</kbd>, pour <strong>atterrir et marcher</strong> comme dans
            Minecraft (Espace saute), puis pour reprendre ton envol</li>
          <li><kbd>Échap</kbd> pour rendre la souris et revenir au code</li>
        </ul>`,
    },
    {
      titre: "Les types de bloc",
      texte: `<p>Le type de bloc s'écrit en <strong>MAJUSCULES</strong> :
        <code>PIERRE</code>, <code>TERRE</code>, <code>HERBE</code>, <code>SABLE</code>, <code>EAU</code>,
        <code>BOIS</code>, <code>FEUILLES</code>, <code>NEIGE</code>, <code>GLACE</code>, <code>GRAVIER</code>,
        <code>CHARBON</code>, <code>FER</code>, <code>DIAMANT</code>, <code>BEDROCK</code>, et <code>AIR</code>
        pour effacer.</p>`,
      code: "set_block(64, 11, 64, DIAMANT)",
    },
  ],
  pieges: [
    `<code>PIERRE</code> s'écrit en majuscules et <strong>sans guillemets</strong>. <code>"pierre"</code> ne marche pas.`,
    "Le monde ne change que quand tu cliques sur <strong>▶ Générer</strong> (ou <kbd>Ctrl</kbd> + <kbd>Entrée</kbd>).",
    "Tout ce qui suit <code>--</code> sur une ligne est un <strong>commentaire</strong> : Lua l'ignore. C'est pour les humains.",
  ],
  objectif:
    "Pose un bloc de <code>PIERRE</code> au centre du monde, à 10 blocs de hauteur : en (64, 10, 64).",
  indices: [
    "Les trois nombres sont toujours dans l'ordre x, y, z. La hauteur est le <strong>deuxième</strong>.",
    "Une seule ligne suffit : <code>set_block(64, 10, 64, PIERRE)</code>",
  ],
  bonus: "Construis une petite tour de 5 blocs de haut, puis pose un <code>DIAMANT</code> au sommet.",

  defis: [
    {
      nom: "Un bloc de pierre en (64, 10, 64)",
      verifier(monde, { horsMonde }) {
        const b = blocEn(monde, 64, 10, 64);
        if (b === B.PIERRE) return ok("Ton premier bloc est posé. Vole jusqu'à lui pour le voir de près !");
        if (b !== B.AIR)
          return rate(`Il y a bien un bloc en (64, 10, 64), mais c'est ${nomDuBloc(b)} et pas PIERRE.`);
        const premier = premierBloc(monde);
        if (!premier && horsMonde) {
          return rate(
            "Ton bloc est tombé hors du monde : x et z vont de 0 à 127, y de 0 à 63. Vérifie l'ordre x, y, z.",
          );
        }
        if (premier) {
          return rate(
            `Il y a un bloc en (${premier.x}, ${premier.y}, ${premier.z}), pas en (64, 10, 64). Vérifie l'ordre x, y, z.`,
          );
        }
        return rate("Le monde est vide. As-tu écrit un appel à set_block(...) puis cliqué sur ▶ Générer ?");
      },
    },
  ],
};
