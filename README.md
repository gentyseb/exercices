# Exercices Pédagogiques

Une collection d'exercices interactifs pour l'apprentissage du français et des mathématiques, conçus pour les élèves de primaire (CE1, CE2, CM1, CM2).

**🌐 Site en ligne :** [https://gentyseb.github.io/exercices/index.html](https://gentyseb.github.io/exercices/index.html)

## 📚 Fonctionnalités

### Mathématiques
- **Problèmes mathématiques dynamiques** : Génération aléatoire de problèmes avec différents niveaux de difficulté
- Additions, soustractions, multiplications, divisions
- Plusieurs thèmes : vie quotidienne, école, achats, mesures, géométrie, temps
- Score et statistiques sauvegardés automatiquement

### Français
- **Conjugaison** : Exercices sur tous les temps (présent, futur, imparfait, passé simple, subjonctif)
- Verbes réguliers (1er groupe) et irréguliers (être, avoir, aller, faire, venir, prendre, voir, dire, pouvoir, vouloir)
- **Grammaire** : Exercices variés
- **Orthographe** : Dictées et exercices

### Autres
- **Défi du jour** : Un défi quotidien pour motiver les élèves
- **Système de badges** : Récompenses pour les progrès
- **Progression** : Suivi des performances

## 🚀 Utilisation

### Localement
1. Ouvrir le fichier `index.html` dans un navigateur web
2. Naviguer vers l'exercice souhaité

### Serveur de développement
Pour éviter les problèmes CORS avec le chargement des fichiers JSON :

**Serveur Node.js dédié (recommandé) :**
```bash
# Utilise le serveur intégré au projet (port 4200)
node server.js
```

**Autres options :**
```bash
# Avec npx (port par défaut 8080)
npx http-server

# Avec npx sur le port 4200
npx http-server -p 4200

# Avec Python 3
python -m http.server 8000

# Avec PHP
php -S localhost:8000
```
Puis ouvrir `http://localhost:8000` dans votre navigateur.

## 📁 Structure du projet

```
exercices/
├── Math/                    # Exercices de mathématiques
│   ├── exercices-*.html     # Fichiers HTML des exercices
│   └── ...
├── French/                  # Exercices de français
│   ├── conjugaison.html
│   └── ...
├── data/                    # Données JSON
│   ├── conjugaison.json
│   └── ...
├── core/                    # Fichiers CSS et JS communs
│   └── style.css
├── badges.html              # Système de badges
├── defi-du-jour.html        # Défi quotidien
├── generator.js             # Générateur d'exercices
├── index.html               # Page d'accueil
├── progression.html         # Suivi de progression
└── README.md                # Ce fichier
```

## 🔧 Configuration

Les paramètres de chaque exercice peuvent être modifiés directement dans l'interface :
- Niveau (CE1, CE2, CM1, CM2)
- Type de problème
- Opération
- Thème

Les préférences sont sauvegardées dans le `localStorage` du navigateur.

## 📱 Application mobile

Le projet utilise Capacitor pour embarquer les exercices dans une application Android et iOS. Les pages et données sont incluses dans l'application ; la progression reste enregistrée sur l'appareil. Les exercices reçoivent un lien « Retour » en haut de la page pour revenir à l'accueil.

```bash
npm install
npm run cap:sync
npx cap open android
```

La génération et la compilation Android nécessitent Android Studio, le JDK et le SDK Android. La génération et la compilation iOS nécessitent macOS et Xcode ; elles ne peuvent pas être effectuées sur Windows.

Le nom et l'identifiant d'application sont définis dans `capacitor.config.json`. L'identifiant `fr.gentyseb.exercices.scolaires` doit rester stable après la première publication. La publication sur les stores demandera également les comptes développeur, une icône et des captures d'écran, ainsi que les formulaires de confidentialité et les informations de fiche store.

### Compilation en ligne avec GitHub Actions

Le workflow `Mobile builds` s'exécute sur les pushes et les pull requests vers `main`, ou manuellement depuis l'onglet **Actions** de GitHub. Il produit un APK Android de débogage et une application iOS pour simulateur, disponibles dans les artefacts du workflow pendant 14 jours.

Ces builds servent aux tests et ne sont pas signés pour les stores. La publication nécessitera des builds de production signés, les certificats et profils Apple pour iOS, une clé de signature Android, ainsi que les comptes développeur correspondants. Ne placez jamais ces clés ou mots de passe dans le dépôt.

## 💡 Contribution

1. Forker le projet
2. Créer une branche (`git checkout -b feature/nouvel-exercice`)
3. Faire vos modifications
4. Commiter (`git commit -m 'Ajout d'un nouvel exercice'`)
5. Pousser (`git push origin feature/nouvel-exercice`)
6. Ouvrir une Pull Request

## 📜 Licence

Ce projet est sous licence MIT. Libre d'utilisation pour un usage personnel ou éducatif.

---

Créé avec ❤️ pour l'apprentissage des enfants.