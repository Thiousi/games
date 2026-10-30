// Quick guides shown at the top of each game's settings page.
import { isFrench } from './i18n.js';

const EN = {
  sudoku: [
    'Fill the grid so every row, column and 3×3 box has 1 to 9 exactly once.',
    'Pick a digit on the keypad, then tap cells to place it. The small number shows how many are left to place.',
    'The pencil switches to notes. X erases. Hint and auto-notes can be turned on below.',
  ],
  klondike: [
    'Build each foundation at the top from ace to king, in one suit.',
    'In the columns, stack cards downward in alternating colors. Only a king can fill an empty column.',
    'Tap the deck to draw. Tap a card to send it to its best move, or drag it.',
  ],
  spider: [
    'Build runs from king to ace in one suit. A complete run leaves the table. Clear all 8 to win.',
    'Any card can sit on one rank higher, but only same-suit runs move together.',
    'Tap the deck to deal one card to every column. No column can be empty when you deal.',
  ],
  freecell: [
    'Build each foundation at the top right from ace to king, in one suit.',
    'In the columns, stack cards downward in alternating colors. Any card can fill an empty column.',
    'The four cells at the top left hold one card each. Free cells and empty columns let you move longer stacks.',
  ],
  tripeaks: [
    'Clear all three peaks. Tap a face-up card that is one rank above or below the card beside the deck.',
    'Suit does not matter. Removing cards turns over the ones they were covering.',
    'Tap the deck for a new card when nothing fits. Long chains save the deck.',
  ],
  hearts: [
    'Avoid points: each heart is 1 and the queen of spades is 13. When someone reaches the target score, the lowest score wins.',
    'Pass 3 cards, except every fourth hand. The 2 of clubs leads. Follow suit if you can.',
    'Hearts cannot lead until one has been played. Take all 26 points to shoot the moon: everyone else gets 26 instead.',
  ],
};

const FR = {
  sudoku: [
    'Remplissez la grille : chaque ligne, colonne et carré de 3×3 contient une seule fois les chiffres de 1 à 9.',
    'Choisissez un chiffre sur le pavé, puis touchez les cases pour le placer. Le petit nombre indique combien il en reste à placer.',
    'Le crayon passe en mode notes. X efface. L’indice et les notes automatiques s’activent ci-dessous.',
  ],
  klondike: [
    'Montez chaque pile du haut de l’as au roi, dans une même couleur.',
    'Dans les colonnes, empilez en descendant et en alternant rouge et noir. Seul un roi peut occuper une colonne vide.',
    'Touchez le talon pour tirer. Touchez une carte pour lui faire jouer son meilleur coup, ou faites-la glisser.',
  ],
  spider: [
    'Formez des suites du roi à l’as dans une même couleur. Une suite complète quitte la table. Retirez les 8 pour gagner.',
    'Une carte peut se poser sur le rang juste au-dessus, mais seules les suites de même couleur se déplacent ensemble.',
    'Touchez le talon pour donner une carte à chaque colonne. Aucune colonne ne doit être vide au moment de distribuer.',
  ],
  freecell: [
    'Montez chaque pile en haut à droite de l’as au roi, dans une même couleur.',
    'Dans les colonnes, empilez en descendant et en alternant rouge et noir. N’importe quelle carte peut occuper une colonne vide.',
    'Les quatre cases en haut à gauche gardent une carte chacune. Cases libres et colonnes vides permettent de déplacer de plus longues suites.',
  ],
  tripeaks: [
    'Dégagez les trois sommets. Touchez une carte visible d’un rang au-dessus ou en dessous de celle posée à côté du talon.',
    'La couleur ne compte pas. Retirer des cartes retourne celles qu’elles couvraient.',
    'Touchez le talon pour une nouvelle carte quand rien ne convient. Les longues séries économisent le talon.',
  ],
  hearts: [
    'Évitez les points : chaque cœur vaut 1 et la dame de pique 13. Quand un joueur atteint le score final, le plus petit score gagne.',
    'Passez 3 cartes, sauf une manche sur quatre. Le 2 de trèfle commence. Fournissez à la couleur si vous pouvez.',
    'On ne peut entamer à cœur qu’une fois un cœur joué. Prenez les 26 points pour faire le grand chelem : les autres reçoivent 26 à votre place.',
  ],
};

export const GUIDES = isFrench ? FR : EN;
