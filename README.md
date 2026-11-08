# Cascade

Un jeu de blocs qui tombent, avec une idée en plus : en plus des lignes pleines, les groupes de 9 blocs de la même couleur se cassent aussi, et ce qui reste suspendu retombe, ce qui peut déclencher des chaînes. Trois façons de jouer : Marathon, Zen et 24 défis à trois étoiles.

*English version: [README.en.md](README.en.md)*

## Commandes

- **← →** ou **Q D** : déplacer la pièce.
- **↑**, **X** ou **W** : tourner dans le sens des aiguilles d'une montre ; **Z** ou **Ctrl** : dans l'autre sens.
- **↓** : descendre vite (1 point par case).
- **Espace** : poser d'un coup (2 points par case) ; une ombre montre où la pièce va tomber.
- **C** ou **Maj** : mettre la pièce en réserve, ou reprendre celle qui y est (une fois par pièce).
- **P** ou **Échap** : pause. **Espace** ou un clic lance la partie.

## Les pièces

Le puits fait 10 colonnes sur 20 lignes. Les pièces font de 3 à 5 blocs (barres, coins, carrés, T, L, Z, U, croix…), les petites plus souvent que les grandes, et jamais trois fois la même de suite. Le panneau Suivant montre les prochaines. Une pièce posée peut encore glisser un court instant, 10 fois au plus.

## Ce qui se casse

- **Une ligne pleine** se casse, comme d'habitude.
- **Une fusion** : tout groupe d'au moins 9 blocs de la même couleur qui se touchent se casse aussi, où qu'il soit.
- **Les chaînes** : après une casse, les blocs qui ne reposent plus sur rien retombent un par un. S'ils forment de nouvelles lignes ou fusions, c'est une chaîne, et chaque maillon multiplie les points.
- **Les bombes** : une pièce sur 22 porte une bombe ; quand elle se casse, elle fait sauter le carré de 3 × 3 autour d'elle.
- **Les cristaux** (dans certains défis) ne se cassent qu'avec une ligne pleine, ni par fusion ni par bombe.

## Points

- Lignes : 100, 300, 500 ou 800 points pour 1 à 4 lignes d'un coup (400 de plus par ligne au-delà), multipliés par le niveau.
- Fusion : environ 60 points par groupe, plus si le groupe est grand ; cristal : 150 ; bombe : 100.
- Chaîne : ×1,5 au deuxième maillon, ×2 au troisième, et ainsi de suite.

## Modes de jeu

- **Marathon** : la vitesse augmente d'un niveau toutes les 8 lignes. La partie s'arrête quand une pièce ne peut plus entrer.
- **Zen** : la même chose sans accélération, avec son propre record.
- **24 défis** : chacun a un objectif (un nombre de lignes, parfois en un nombre limité de pièces ; casser des cristaux cachés dans un tas de départ ; faire des fusions ; réussir une chaîne d'une certaine longueur ; ou atteindre un score avant la fin du temps). Certains commencent plus vite ou avec un tas déjà en place. Un défi réussi rapporte de 1 à 3 étoiles (une pour la réussite, une pour un bon score, une pour l'avoir fini vite ou en peu de pièces) et débloque le suivant. Choisis le mode dans la liste en haut.

## Statistiques

L'en-tête montre le record Marathon, le record Zen, les étoiles gagnées sur 72 et ta meilleure chaîne.

## Données et synchronisation

Tes records, tes étoiles et ton total de lignes sont enregistrés par NeoDex, sauvegardés et synchronisés entre tes PC si la synchro est activée.

## Installer

Dans NeoDex : **NeoStore → À découvrir → Cascade → Installer**.

Développer un plugin : voir le [SDK NeoDex](https://github.com/NDesumeur/neodex-sdk).
