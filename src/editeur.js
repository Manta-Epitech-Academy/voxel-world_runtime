// L'éditeur de code : Monaco, en Lua, réglé pour un débutant.
//
// Rien n'apparaît que l'élève n'ait tapé (le réglage « débutant » du runtime
// Pac-Man) : pas de fermeture automatique des parenthèses, pas de liste de
// suggestions qui s'ouvre pendant la frappe, pas de reformatage. Ce qui ne
// fait qu'afficher reste : coloration, numéros de ligne, repli, et la bulle
// de documentation au survol d'une fonction. La complétion existe toujours,
// sur demande (Ctrl + Espace).
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/lua/lua.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { FONCTIONS, CONSTANTES } from "./api.js";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

monaco.editor.defineTheme("architecte", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "7f9f7f", fontStyle: "italic" },
    { token: "keyword", foreground: "ffb86b" },
    { token: "number", foreground: "a5e075" },
    { token: "string", foreground: "f1d585" },
  ],
  colors: { "editor.background": "#1b1d23", "editorLineNumber.foreground": "#4d5260" },
});

const DOCUMENTATION = new Map([...FONCTIONS, ...CONSTANTES].map((d) => [d.nom, d]));

monaco.languages.registerCompletionItemProvider("lua", {
  provideCompletionItems(modele, position) {
    const mot = modele.getWordUntilPosition(position);
    const range = new monaco.Range(position.lineNumber, mot.startColumn, position.lineNumber, mot.endColumn);
    const Kind = monaco.languages.CompletionItemKind;
    return {
      suggestions: [
        ...FONCTIONS.map((f) => ({
          label: f.nom,
          kind: Kind.Function,
          detail: f.signature,
          documentation: f.doc,
          insertText: f.snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
        ...CONSTANTES.map((c) => ({
          label: c.nom,
          kind: Kind.Constant,
          documentation: c.doc,
          insertText: c.nom,
          range,
        })),
      ],
    };
  },
});

monaco.languages.registerHoverProvider("lua", {
  provideHover(modele, position) {
    const mot = modele.getWordAtPosition(position);
    const doc = mot && DOCUMENTATION.get(mot.word);
    return doc ? { contents: [{ value: `**${doc.signature ?? doc.nom}**` }, { value: doc.doc }] } : null;
  },
});

export class Editeur {
  /** `onExecuter` : Ctrl + Entrée dans l'éditeur ; `onChange(code)` : à chaque frappe. */
  constructor(conteneur, { code, onExecuter, onChange }) {
    this.editor = monaco.editor.create(conteneur, {
      value: code,
      language: "lua",
      theme: "architecte",
      fontSize: 15,
      tabSize: 2,
      insertSpaces: true,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      wrappingIndent: "indent",
      renderLineHighlight: "all",
      fixedOverflowWidgets: true,
      folding: true,

      // Fermeture des paires : « set_block(64 » devenait « set_block(64) », puis une
      // parenthèse de trop dès que l'élève tapait la sienne.
      autoClosingBrackets: "never",
      autoClosingQuotes: "never",
      autoClosingComments: "never",
      autoClosingDelete: "never",
      autoClosingOvertype: "never",
      autoSurround: "never",

      // Suggestions : la liste s'ouvrait pendant la frappe, et Entrée validait
      // la suggestion au lieu d'aller à la ligne.
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: "off",
      acceptSuggestionOnCommitCharacter: false,
      wordBasedSuggestions: "off",
      snippetSuggestions: "none",
      tabCompletion: "off",
      inlineSuggest: { enabled: false },
      parameterHints: { enabled: false },

      // Actions proposées et reformatage : ils réécrivent du code déjà tapé.
      codeLens: false,
      lightbulb: { enabled: "off" },
      formatOnType: false,
      formatOnPaste: false,

      // L'indentation suit la ligne précédente, sans réaligner un `end` tout seul.
      autoIndent: "keep",

      // Déplacer du code en le glissant se fait sans s'en apercevoir.
      dragAndDrop: false,
    });
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onExecuter);
    this.editor.onDidChangeModelContent(() => onChange(this.valeur));
  }

  get valeur() {
    return this.editor.getValue();
  }

  set valeur(code) {
    this.editor.setValue(code);
  }

  /** Insère un extrait à la ligne du curseur (sur la ligne même si elle est vide, sinon après). */
  inserer(texte) {
    const selection = this.editor.getSelection();
    const modele = this.editor.getModel();
    const ligne = selection.positionLineNumber;
    const fin = modele.getLineMaxColumn(ligne);
    const vide = modele.getLineContent(ligne).trim() === "";
    const contenu = (vide ? "" : "\n") + texte + "\n";
    const debut = vide ? 1 : fin;
    this.editor.executeEdits("outil", [
      { range: new monaco.Range(ligne, debut, ligne, fin), text: contenu, forceMoveMarkers: true },
    ]);
    this.editor.focus();
  }

  montrerErreur(ligne, message) {
    const modele = this.editor.getModel();
    const n = Math.min(Math.max(1, ligne), modele.getLineCount());
    monaco.editor.setModelMarkers(modele, "lua", [
      {
        startLineNumber: n,
        endLineNumber: n,
        startColumn: 1,
        endColumn: modele.getLineMaxColumn(n),
        message,
        severity: monaco.MarkerSeverity.Error,
      },
    ]);
    this.editor.revealLineInCenterIfOutsideViewport(n);
  }

  effacerErreurs() {
    monaco.editor.setModelMarkers(this.editor.getModel(), "lua", []);
  }

  focus() {
    this.editor.focus();
  }
}
