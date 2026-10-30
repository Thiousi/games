// French when the device is in French, English otherwise. English text is the key.
const FR = {
  // Names
  'Games': 'Jeux', 'Easy': 'Facile', 'Medium': 'Moyen', 'Hard': 'Difficile', 'Expert': 'Expert',
  'Klondike': 'Klondike', 'Spider': 'Spider', 'FreeCell': 'FreeCell', 'TriPeaks': 'TriPeaks', 'Hearts': 'Dame de pique', 'Sudoku': 'Sudoku',
  'Moss': 'Mousse', 'Ink': 'Encre', 'Ember': 'Braise', 'Plum': 'Prune', 'Paper': 'Papier', 'Sky': 'Ciel',
  'You': 'Vous', 'West': 'Ouest', 'North': 'Nord', 'East': 'Est',
  // Controls
  'Back': 'Retour', 'Settings': 'Réglages', 'Scores': 'Scores', 'Erase': 'Effacer', 'Restart': 'Recommencer',
  'Hint': 'Indice', 'Notes': 'Notes', 'Fill in all notes': 'Remplir toutes les notes', 'Undo': 'Annuler', 'New': 'Nouvelle',
  'Continue': 'Continuer', 'In progress': 'En cours', 'Best {0}': 'Record {0}',
  // Settings
  'Colors': 'Couleurs', 'Themes': 'Thèmes', 'Custom colors': 'Couleurs personnalisées', 'Background': 'Fond',
  'Given cells': 'Cases données', 'Accent': 'Accent', 'Text': 'Texte', 'How to play': 'Comment jouer', 'Appearance': 'Apparence',
  'Show mistakes right away': 'Montrer les erreurs tout de suite', 'Show hint button': 'Afficher le bouton indice',
  'Show auto-notes button': 'Afficher le bouton notes automatiques',
  'These apply from your next new game.': 'Ces réglages s’appliquent à votre prochaine partie.',
  'Abandon this match': 'Abandonner cette partie', 'Abandon this match?': 'Abandonner cette partie ?',
  'Cards drawn each time': 'Cartes tirées à chaque fois', 'Suits': 'Couleurs de cartes',
  'Move safe cards up automatically': 'Monter automatiquement les cartes sûres', 'Ace and king connect': 'L’as et le roi se suivent',
  'Match ends at': 'Fin de partie à',
  // Scores
  'Sudoku points · {0} solved': 'Points de Sudoku · résolus : {0}', 'Solved': 'Résolus', 'Best time': 'Temps', 'Best score': 'Score',
  'Cards': 'Cartes', 'Won': 'Gagnées', 'Best streak': 'Série', 'Recent Sudoku': 'Sudoku récents', 'Reset scores': 'Effacer les scores',
  'Erase all scores?': 'Effacer tous les scores ?', '{0} hint': '{0} indice', '{0} hints': '{0} indices', '{0} mistake': '{0} erreur', '{0} mistakes': '{0} erreurs',
  // Sudoku
  'The grid is full, but something is wrong.': 'La grille est pleine, mais il y a une erreur.',
  'This cell is wrong. Fix it first.': 'Cette case est fausse. Corrigez-la d’abord.',
  '{0} is the only digit that fits this cell.': 'Seul le {0} peut aller dans cette case.',
  '{0} has only this spot in its {1}.': 'Le {0} n’a que cette place dans {1}.',
  'row': 'sa ligne', 'column': 'sa colonne', 'box': 'son carré',
  'Using {0}: ': 'Avec {0} : ', 'No simple logic here, so this one is a gift: {0}.': 'Pas de logique simple ici, alors c’est cadeau : {0}.',
  'Pointing pair': 'Paire pointante', 'Box-line reduction': 'Réduction carré-ligne', 'Naked pair': 'Paire nue', 'Naked triple': 'Triplet nu',
  'Hidden pair': 'Paire cachée', 'X-wing': 'X-wing', 'Y-wing': 'Y-wing', 'Swordfish': 'Swordfish',
  'Restart this puzzle? The timer keeps running.': 'Recommencer cette grille ? Le chrono continue.',
  'Replace your Sudoku game in progress?': 'Remplacer votre Sudoku en cours ?',
  '{0} solved in {1}': '{0} résolu en {1}', 'New best score and time': 'Nouveaux records de score et de temps', 'New best score': 'Nouveau record de score',
  'New best time': 'Nouveau record de temps', 'Level': 'Niveau', 'Speed bonus': 'Bonus de vitesse', 'Next {0} puzzle': 'Grille suivante : {0}', 'Change level': 'Changer de niveau',
  // Card games
  '{0} move': '{0} coup', '{0} moves': '{0} coups', '{0} solved': '{0} réussi', 'Moves': 'Coups', 'Win streak': 'Série de victoires', 'Play again': 'Rejouer',
  'Fill every column before dealing.': 'Remplissez chaque colonne avant de distribuer.',
  'Start a new game? This one counts as abandoned.': 'Commencer une nouvelle partie ? Celle-ci comptera comme abandonnée.',
  'Pass 3 cards left': 'Passez 3 cartes à gauche', 'Pass 3 cards right': 'Passez 3 cartes à droite', 'Pass 3 cards across': 'Passez 3 cartes en face',
  'Pass left': 'Passer à gauche', 'Pass right': 'Passer à droite', 'Pass across': 'Passer en face', 'Select {0} more': 'Encore {0} à choisir',
  'Hand {0}': 'Manche {0}', 'no passing': 'sans passe', 'to {0}': 'jusqu’à {0}',
  '{0} shot the moon': '{0} : grand chelem', 'You won the match': 'Vous avez gagné la partie', 'Match over': 'Partie terminée', 'Hand {0} done': 'Manche {0} terminée',
  'New match': 'Nouvelle partie', 'Next hand': 'Manche suivante', 'The 2 of clubs leads.': 'Le 2 de trèfle commence.',
  'Hearts are not broken yet.': 'Vous ne pouvez pas encore entamer à cœur.', 'Follow suit.': 'Fournissez à la couleur demandée.',
  'No points on the first trick.': 'Pas de points au premier pli.', 'You received {0}': 'Vous avez reçu {0}',
};

export const isFrench = /^fr\b/i.test(globalThis.navigator?.language || '');

export function tr(text, ...args) {
  const s = (isFrench && FR[text]) || text;
  return s.replace(/\{(\d)\}/g, (_, i) => args[i]);
}

export const RANKS = isFrench
  ? ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R']
  : ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const FR_TEXT = FR;
