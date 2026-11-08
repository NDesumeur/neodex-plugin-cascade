# Cascade

A falling-blocks game with one extra idea: besides full rows, groups of 9 blocks of the same colour break too, and whatever is left hanging falls down, which can set off chains. Three ways to play: Marathon, Zen and 24 three-star challenges.

*Version française : [README.md](README.md)*

## Controls

- **← →** or **Q D** (A D on a QWERTY keyboard): move the piece.
- **↑**, **X** or **W**: rotate clockwise; **Z** or **Ctrl**: the other way.
- **↓**: soft drop (1 point per cell).
- **Space**: hard drop (2 points per cell); a ghost shows where the piece will land.
- **C** or **Shift**: put the piece on hold, or take back the held one (once per piece).
- **P** or **Escape**: pause. **Space** or a click starts the game.

## The pieces

The well is 10 columns by 20 rows. Pieces have 3 to 5 blocks (bars, corners, squares, T, L, Z, U, cross…), small ones more often than big ones, and never the same one three times in a row. The Next panel shows the upcoming ones. A landed piece can still slide for a short moment, 10 times at most.

## What breaks

- **A full row** breaks, as usual.
- **A fusion**: any group of at least 9 touching blocks of the same colour breaks too, wherever it is.
- **Chains**: after a break, blocks no longer resting on anything fall one by one. If they form new rows or fusions, that is a chain, and each link multiplies the points.
- **Bombs**: one piece in 22 carries a bomb; when it breaks, it blows up the 3 × 3 square around it.
- **Crystals** (in some challenges) only break with a full row, not by fusion or bomb.

## Points

- Rows: 100, 300, 500 or 800 points for 1 to 4 rows at once (400 more per extra row), multiplied by the level.
- Fusion: about 60 points per group, more if the group is big; crystal: 150; bomb: 100.
- Chain: ×1.5 on the second link, ×2 on the third, and so on.

## Game modes

- **Marathon**: speed goes up one level every 8 rows. The game ends when a piece can no longer enter.
- **Zen**: the same without speeding up, with its own record.
- **24 challenges**: each has a goal (a number of rows, sometimes within a limited number of pieces; breaking crystals hidden in a starting heap; making fusions; achieving a chain of a given length; or reaching a score before time runs out). Some start faster or with a heap already in place. A completed challenge earns 1 to 3 stars (one for completing it, one for a good score, one for finishing fast or in few pieces) and unlocks the next one. Pick the mode in the list at the top.

## Statistics

The header shows the Marathon record, the Zen record, the stars earned out of 72 and your best chain.

## Data and sync

Your records, stars and total rows are stored by NeoDex, backed up and synced between your PCs when sync is on.

## Install

In NeoDex: **NeoStore → Discover → Cascade → Install**.

Building a plugin: see the [NeoDex SDK](https://github.com/NDesumeur/neodex-sdk).
