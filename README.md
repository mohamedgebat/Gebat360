# GEBAT 360° — Systèmes d'Exploration & Cockpit ERP BTP / Cost Control

![GEBAT 360° Banner](https://img.shields.io/badge/GEBAT_360-ERP_BTP_%26_Cost_Control-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.2-purple?style=flat-square&logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)

**GEBAT 360°** est une plateforme ERP haut de gamme conçue spécifiquement pour le **Pilotage de Chantiers BTP, le Cost Control analytique et le Management de Projets de Construction**. Elle constitue la colonne vertébrale opérationnelle et financière des entreprises du secteur du bâtiment et des travaux publics (BTP).

---

## 🚀 Fonctionnalités Clés & Architecture Métier

### 1. 🎛️ Cockpit WBS (Work Breakdown Structure)
Le module WBS est le centre névralgique de pilotage de GEBAT 360°. Il remplace les simples listes d'activités par une **structure hiérarchique dynamique en 4 niveaux** :

```
PROJET (📁 Ex: CVI-2026-HYD-001 — Station de Traitement Bingerville)
   │
   ├── LOT (📂 Ex: 03 — Génie Civil)
   │     │
   │     ├── SOUS-LOT (📂 Ex: 02 — Ouvrages béton)
   │     │      │
   │     │      └── ACTIVITÉ (📄 Ex: 004 — Béton armé)
```

- **Format de Code complet auto-généré** : `CODE_PROJET / LOT / SOUS_LOT / ACTIVITÉ` (Ex: `CVI-2026-HYD-001 / 03 / 02 / 004`).
- **Consolidation Bottom-Up automatique** : La sélection d'un Lot ou d'un Projet agrège instantanément les montants Marché, Budgets DS, Engagements, Coûts Réels et EAC de tous ses sous-éléments sans double saisie.
- **Indicateur de Santé discret (KPI Health)** :
  - 🟢 **Conforme / Maîtrisé** : EAC $\le$ Budget DS & Avancement conforme au planning.
  - 🟠 **Vigilance** : EAC légèrement supérieur au Budget DS ou retard planning modéré.
  - 🔴 **Critique** : Dépassement prévisionnel important ou retard critique.

---

### 2. 🧙‍♂️ Assistant d'Importation DS (Déboursé Sec) en 4 Étapes
Un assistant visuel complet permet l'intégration en quelques clics des fichiers d'études Excel (`.xlsx`, `.xls`) et CSV :

1. **Étape 1 : Sélection & Téléversement du Fichier** (avec téléchargement du modèle CSV d'exemple `Modele_Import_DS_GEBAT.csv`).
2. **Étape 2 : Mapping Interactif des Colonnes** (N° Prix, Désignation, Unité, Quantité Contractuelle, PU Marché, Budget DS).
3. **Étape 3 : Prévisualisation & Contrôle de Cohérence** (Vérification des totaux parsés et des formats).
4. **Étape 4 : Validation & Intégration WBS** (Création automatique de l'arborescence WBS et enregistrement dans l'Audit Trail).

---

### 3. 🏷️ Taxonomie Paramétrable des Natures de Coûts
Chaque budget d'activité DS est ventilé par **Nature de Coût** analytique :
- `MAT` — Matériaux
- `MO` — Main-d'œuvre
- `MTL` — Matériel
- `ST` — Sous-traitance
- `TRS` — Transport
- `FGC` — Frais généraux chantier
- `DIV` — Divers

> **Administration** : La taxonomie des natures de coûts n'est pas codée en dur. Elle est intégralement paramétrable via **`Administration → Paramètres → Natures de coûts`** (`SettingsCostNaturesModule.tsx`), permettant aux administrateurs de créer, modifier ou désactiver des natures de coûts.

---

### 4. 📊 Fiche Détaillée 360° en 8 Onglets Spécialisés

| Onglet | Description & Indicateurs Clés |
| :--- | :--- |
| **`VUE 360°`** | Résumé exécutif complet avec Identité WBS, KPIs contractuels, budgétaires, économiques et calcul de la **Marge Prévisionnelle Net** ($\text{Montant Marché} - \text{EAC}$). |
| **`CONTRACTUEL`** | Détail des données issues du DQE / Marché ($PU \times Qte = \text{Montant Marché}$) avec traçabilité et date d'importation. |
| **`BUDGET & COÛTS`** | Tableau de pilotage financier (Budget Initial/Révisé, Engagé, Coût Réel, Forecast, EAC) avec décomposition par Natures et **Drill-down analytique** vers les transactions. |
| **`PRODUCTION`** | Suivi physique (Avancement %, Quantité réalisée vs restant à produire, productivité journalière et liens avec les rapports de chantier). |
| **`ACHATS & ENGAGEMENTS`** | Demandes d'Achat (DA), Commandes (PO), Réceptions & Factures Fournisseurs imputées directement sur le Code WBS. |
| **`STOCK & CONSOMMATIONS`** | Consommations réelles de matériaux vs théoriques avec calcul des écarts physiques et financiers. |
| **`PLANNING`** | Échéancier (Dates début/fin prévues et réelles, durée consommée, avancement physique vs planning). |
| **`HISTORIQUE`** | Timeline d'Audit Trail retraçant l'ensemble des opérations, ajustements de forecast et validations workflow. |

---

## 🧮 Formules Économiques & Directives Métier

- **Montant Marché Vente** :
  $$\text{Montant Marché} = \text{PU Marché} \times \text{Quantité Contractuelle}$$
- **Estimate at Completion (EAC)** :
  $$\text{EAC} = \text{Coût Réel à date} + \text{Forecast (Reste à faire)}$$
- **Écart EAC** :
  $$\text{Écart EAC} = \text{EAC} - \text{Budget DS Révisé}$$
- **Marge Prévisionnelle Net** :
  $$\text{Marge Prévisionnelle} = \text{Montant Marché Vente} - \text{EAC}$$

---

## 🛠️ Stack Technique

- **Frontend** : React 18, TypeScript, TailwindCSS
- **Build Tool** : Vite 8.2
- **Icônes** : Lucide React
- **Traitement Excel / CSV** : XLSX (SheetJS)
- **Persistance** : State Context réactif synchronisé avec `localStorage` & Base de données ERP

---

## 🔧 Installation & Démarrage

### Prérequis
- Node.js (v18+ recommandé)
- npm ou yarn

### 1. Cloner et installer les dépendances
```bash
cd Gebat_360
npm install
```

### 2. Lancer le serveur de développement
```bash
npm run dev
```
Accédez à l'application sur `http://localhost:5173`.

### 3. Compiler pour la production
```bash
npm run build
```
Les fichiers compilés et optimisés seront générés dans le dossier `dist/`.

---

## 📜 Licence & Propriété
**GEBAT SA** — Tous droits réservés. Système propriétaire de digitalisation BTP.
"# Gebat360" 
"# Gebat360" 
