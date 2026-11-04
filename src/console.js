// La console sous l'éditeur : les lignes affichées par le code, les
// avertissements, les erreurs. Chaque ligne est [texte, classe].
export function afficherConsole(lignes) {
  const console = document.getElementById("console");
  console.replaceChildren(
    ...lignes.map(([texte, classe]) => {
      const div = document.createElement("div");
      if (classe) div.className = classe;
      div.textContent = texte;
      return div;
    }),
  );
  console.scrollTop = console.scrollHeight;
}
