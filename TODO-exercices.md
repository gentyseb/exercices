# 📋 Liste des exercices à ajouter

> **Dépôt** : [gentyseb/exercices](https://github.com/gentyseb/exercices)
> **Dossier cible** : `Découvertes/` (pour les nouveaux exercices)
> **Statut** : ✅ = Fait | ⏳ = À faire | 🚧 = En cours

---

## 🏛️ HISTOIRE

| **Exercice** | **Niveau** | **Description** | **Fichiers à créer** | **Statut** |
|--------------|------------|----------------|---------------------|------------|
| **Dates clés de l’Histoire de France** | CM1-CM2 | Associer un événement à sa date (ex: 1789 → Révolution française). | `exercices-histoire-dates-cles.html` + `data/histoire-dates-cles.json` | ⏳ |
| **Personnages historiques** | CM1-CM2 | Retrouver le rôle d’un personnage (ex: Vercingétorix → Chef gaulois). | `exercices-histoire-personnages.html` + `data/histoire-personnages.json` | ⏳ |
| **Frise chronologique à compléter** | CM2 | Placer des événements dans l’ordre sur une frise. | `exercices-histoire-frise-chronologique.html` + `data/histoire-frise-chronologique.json` | ⏳ |

---

## 🔬 SCIENCES

| **Exercice** | **Niveau** | **Description** | **Fichiers à créer** | **Statut** |
|--------------|------------|----------------|---------------------|------------|
| **Système solaire** | CE2-CM2 | Classer les planètes par ordre de distance au Soleil. | `exercices-sciences-systeme-solaire.html` + `data/sciences-systeme-solaire.json` | ⏳ |
| **Cycle de l’eau** | CE2-CM1 | Remettre dans l’ordre les étapes du cycle (évaporation, condensation, etc.). | `exercices-sciences-cycle-eau.html` + `data/sciences-cycle-eau.json` | ⏳ |
| **Animaux et habitats** | CE2-CM1 | Associer un animal à son habitat (ex: Lion → Savane). | `exercices-sciences-animaux-habitats.html` + `data/sciences-animaux-habitats.json` | ⏳ |
| **Corps humain (organes)** | CM1-CM2 | Retrouver la fonction d’un organe (ex: Cœur → Pomper le sang). | `exercices-sciences-corps-humain.html` + `data/sciences-corps-humain.json` | ⏳ |

---

## 🎨 CULTURE GÉNÉRALE / ARTS

| **Exercice** | **Niveau** | **Description** | **Fichiers à créer** | **Statut** |
|--------------|------------|----------------|---------------------|------------|
| **Œuvres d’art et artistes** | CM1-CM2 | Associer une œuvre à son auteur (ex: La Joconde → Léonard de Vinci). | `exercices-culture-oeuvres-art.html` + `data/culture-oeuvres-art.json` | ⏳ |
| **Instruments de musique** | CE2-CM2 | Classer les instruments par famille (cordes, vents, percussions). | `exercices-culture-instruments-musique.html` + `data/culture-instruments-musique.json` | ⏳ |

---

---

## 📌 Modèles de données (JSON)

### Exemple pour **Dates clés de l’Histoire de France**
```json
{
  "titre": "Dates clés de l’Histoire de France",
  "niveau": "CM1-CM2",
  "questions": [
    {
      "type": "association",
      "enonce": "En quelle année a eu lieu la Révolution française ?",
      "reponse": "1789",
      "options": ["1492", "1789", "1815", "1914"]
    },
    {
      "type": "association",
      "enonce": "En quelle année a eu lieu la chute du mur de Berlin ?",
      "reponse": "1989",
      "options": ["1945", "1969", "1989", "2001"]
    }
  ]
}
```

### Exemple pour **Système solaire**
```json
{
  "titre": "Système solaire",
  "niveau": "CE2-CM2",
  "planetes": [
    "Mercure",
    "Vénus",
    "Terre",
    "Mars",
    "Jupiter",
    "Saturne",
    "Uranus",
    "Neptune"
  ]
}
```

### Exemple pour **Animaux et habitats**
```json
{
  "titre": "Animaux et habitats",
  "niveau": "CE2-CM1",
  "animaux": [
    {"nom": "Lion", "habitat": "Savane"},
    {"nom": "Pingouin", "habitat": "Antarctique"},
    {"nom": "Kangourou", "habitat": "Australie"},
    {"nom": "Ours polaire", "habitat": "Arctique"}
  ]
}
```

---

## 🛠️ Structure des fichiers HTML

### Template de base (à adapter)
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Exercices : [Titre]</title>
    <link rel="stylesheet" href="../core/style.css" />
  </head>
  <body>
    <main class="card">
      <h1>[Titre]</h1>
      <p class="subtitle">[Description courte].</p>
      
      <div class="task" id="task"></div>
      <div class="word" id="word"></div>
      <div class="feedback" id="feedback"></div>
      <div class="choices" id="choices"></div>
      
      <div class="score">
        <div class="label">Score</div>
        <div class="numbers"><span id="good">0</span> / <span id="total">0</span></div>
        <div class="pct" id="pct">— %</div>
      </div>
      
      <button id="reset">Réinitialiser le score</button>
    </main>
    
    <script>
      // Logique JavaScript ici (chargement des données JSON + gestion des questions)
    </script>
  </body>
</html>
```

---

## 📂 Arbre des fichiers à créer

```
📁 /workspace/github__gentyseb__exercices/
├── 📁 Découvertes/
│   ├── 📄 exercices-histoire-dates-cles.html
│   ├── 📄 exercices-histoire-personnages.html
│   ├── 📄 exercices-histoire-frise-chronologique.html
│   ├── 📄 exercices-sciences-systeme-solaire.html
│   ├── 📄 exercices-sciences-cycle-eau.html
│   ├── 📄 exercices-sciences-animaux-habitats.html
│   ├── 📄 exercices-sciences-corps-humain.html
│   ├── 📄 exercices-culture-oeuvres-art.html
│   └── 📄 exercices-culture-instruments-musique.html
│
└── 📁 data/
    ├── 📄 histoire-dates-cles.json
    ├── 📄 histoire-personnages.json
    ├── 📄 histoire-frise-chronologique.json
    ├── 📄 sciences-systeme-solaire.json
    ├── 📄 sciences-cycle-eau.json
    ├── 📄 sciences-animaux-habitats.json
    ├── 📄 sciences-corps-humain.json
    ├── 📄 culture-oeuvres-art.json
    └── 📄 culture-instruments-musique.json
```

---

## 🎯 Priorités

1. **Haute priorité** (faciles à implémenter) :
   - [ ] Dates clés de l’Histoire de France
   - [ ] Système solaire
   - [ ] Animaux et habitats

2. **Moyenne priorité** :
   - [ ] Personnages historiques
   - [ ] Œuvres d’art et artistes
   - [ ] Instruments de musique

3. **Basse priorité** (plus complexes) :
   - [ ] Frise chronologique à compléter
   - [ ] Cycle de l’eau (ordre à compléter)
   - [ ] Corps humain (organes)

---

## 📝 Notes

- **Style** : Utiliser le fichier `core/style.css` existant pour une cohérence visuelle.
- **Fonctionnalités communes** :
  - Score sauvegardé dans `localStorage`.
  - Feedback visuel (✅ Bravo / ❌ Faux).
  - Questions aléatoires à chaque rafraîchissement.
- **Compatibilité** : Fonctionne sur mobile et desktop.

---

> **Dernière mise à jour** : 2024-10-11
> **Prochaine étape** : Implémenter les exercices de **haute priorité** (voir ci-dessus).
