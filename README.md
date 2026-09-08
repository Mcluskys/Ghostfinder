# Chasse aux Fantômes 👻

Version web responsive du jeu Pygame d'origine, prête à être publiée avec **GitHub Pages**.

Le gameplay et l'identité visuelle sont conservés : écran de sélection de 1 à 5 joueurs, 4 fantômes par joueur, lampe circulaire, apparition/jump-scare, compteur, bande-son et image de victoire.

## Compatibilité

- Ordinateur : souris + clic.
- Tablette : tactile.
- Smartphone : tactile ; le mode paysage est recommandé pour garder le cadrage 3:2 du jeu original.
- Navigateurs modernes : Chrome, Edge, Firefox, Safari.

Sur mobile, glissez le doigt pour déplacer la lampe et touchez pour attraper un fantôme. Les zones tactiles des boutons sont volontairement un peu plus larges que leur dessin afin d'améliorer le confort sans changer le style.

## Lancer localement

Ouvrez le dossier avec un petit serveur HTTP. Par exemple avec Python :

```bash
python -m http.server 8000
```

Puis ouvrez `http://localhost:8000`.

> Évitez d'ouvrir `index.html` directement en `file://`, certains navigateurs restreignent alors les médias et les polices.

## Publier sur GitHub Pages

1. Créez un nouveau dépôt GitHub.
2. Envoyez tous les fichiers et dossiers de ce projet à la racine du dépôt.
3. Dans **Settings → Pages**, choisissez **Deploy from a branch**.
4. Sélectionnez la branche `main` et le dossier `/ (root)`.
5. Enregistrez. GitHub affichera ensuite l'adresse publique du jeu.

## Optimisations effectuées

- Portage Pygame → Canvas/JavaScript pour fonctionner directement dans un navigateur et sur GitHub Pages.
- Mise à l'échelle responsive tout en conservant le format logique 900×600.
- Prise en charge Pointer Events : souris, stylet et tactile avec le même code.
- Résolution HiDPI limitée à 2× pour garder une image nette sans surcharger les smartphones.
- Images converties en WebP en conservant leurs dimensions et transparences.
- Effet sonore WAV réencodé en MP3 pour réduire fortement le poids sans changer le contenu audible.
- Musique réencodée à 160 kb/s et lecture en boucle.
- Préchargement des ressources principales et chargement de la police locale.
- Démarrage audio au premier geste utilisateur, nécessaire à cause des règles d'autoplay des navigateurs mobiles.

## Structure

```text
.
├── index.html
├── style.css
├── game.js
├── README.md
└── assets
    ├── audio
    │   ├── BandeSonFantome.mp3
    │   └── ghost.mp3
    ├── fonts
    │   └── crow.ttf
    └── images
        ├── fond.webp
        ├── ghost.webp
        ├── lampe.webp
        └── FantomePokemon.webp
```

## Compatibilité mobile / tablette / PC
- Souris sur ordinateur : déplacement de la lampe + clic pour attraper un fantôme.
- Tactile sur smartphone/tablette : glisser pour déplacer la lampe, toucher pour attraper.
- La lampe est légèrement décalée au-dessus du doigt afin de garder le faisceau visible.
- Les zones tactiles de l'accueil sont agrandies sans modifier le visuel des boutons.
- Le canvas conserve le ratio 900×600 et s'adapte automatiquement à l'écran et aux zones sûres (encoche / barre système).
- En portrait le jeu fonctionne, avec recommandation du paysage. Après START, le navigateur tente le plein écran/paysage quand l'appareil l'autorise.
- Les sons utilisent un petit pool audio pour réduire la latence sur mobile.

## Commandes tactiles
Sur smartphone et tablette, maintenez le doigt sur la zone de jeu et faites-le glisser : la lampe suit le doigt en continu. Un tap court permet d'attraper un fantôme éclairé. La souris reste inchangée sur PC.
