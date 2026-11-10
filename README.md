# Exercices Pédagogiques

Une collection d'exercices interactifs pour l'apprentissage du français et des mathématiques, conçus pour les élèves de primaire (CE1, CE2, CM1, CM2).

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