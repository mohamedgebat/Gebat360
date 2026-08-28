// Fichier généré automatiquement à partir de Données/planning actualisé des travaux bingerville et songon.xlsx

export interface PlanningTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  duration: number;
  durationUnit: string;
  isCategory: boolean;
  progress: number;
}

export const REAL_PLANNING_DATA: Record<string, PlanningTask[]> = {
  "BINGERVILLE": [
    {
      "id": "bingerville-10",
      "name": "INSTALLATION GENERALE",
      "startDate": "2026-06-01",
      "endDate": "2026-08-31",
      "duration": 3,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-11",
      "name": "DÉBROUSSEMENT MECANIQUE ET MISE EN DECHARGE",
      "startDate": "2026-06-01",
      "endDate": "2027-02-01",
      "duration": 9,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-12",
      "name": "DÉMOLITION CONSTRUCTION ET BÉTON",
      "startDate": "2026-06-01",
      "endDate": "2027-03-01",
      "duration": 10,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-13",
      "name": "AIRE DE DÉPOTAGE, OUVRAGE DE RÉCEPTION",
      "startDate": "2027-04-01",
      "endDate": "2027-07-01",
      "duration": 4,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-14",
      "name": "BASSIN DE SEDIMENTATION",
      "startDate": "2026-09-01",
      "endDate": "2027-04-01",
      "duration": 8,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-15",
      "name": "LITS DE SÉCHAGES",
      "startDate": "2026-06-01",
      "endDate": "2027-01-01",
      "duration": 8,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-16",
      "name": "BASSIN DE LAGUNAGE",
      "startDate": "2027-02-01",
      "endDate": "2027-09-01",
      "duration": 8,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-17",
      "name": "AIRE DE SÉCHAGE",
      "startDate": "2027-04-01",
      "endDate": "2027-06-01",
      "duration": 3,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-18",
      "name": "HANGAR DE STOCKAGE",
      "startDate": "2027-02-01",
      "endDate": "2027-09-01",
      "duration": 8,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-19",
      "name": "LOCAL TECHNIQUE, CLOTURE ET TRAVAUX DIVERS",
      "startDate": "2026-11-01",
      "endDate": "2027-06-01",
      "duration": 8,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-20",
      "name": "VOIE D'ACCES",
      "startDate": "2027-04-01",
      "endDate": "2027-08-01",
      "duration": 5,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-21",
      "name": "VOIE D'EXPLOITATION",
      "startDate": "2027-01-01",
      "endDate": "2027-06-01",
      "duration": 6,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-22",
      "name": "ALIMENTATION ÉLECTRIQUE ET EAU POTABLE",
      "startDate": "2027-09-01",
      "endDate": "2027-09-01",
      "duration": 13,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    },
    {
      "id": "bingerville-23",
      "name": "RÉCEPTION PROVISOIRE ET REPLI",
      "startDate": "2027-09-01",
      "endDate": "2027-09-01",
      "duration": 1,
      "durationUnit": "Mois",
      "isCategory": true,
      "progress": 35
    }
  ],
  "SONGON": [
    {
      "id": "songon-10",
      "name": "INSTALLATION GENERALE",
      "startDate": "2027-01-18",
      "endDate": "2027-01-31",
      "duration": 2,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-11",
      "name": "Démobilisation de matériels et entretien du site",
      "startDate": "2027-01-18",
      "endDate": "2027-01-31",
      "duration": 2,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-12",
      "name": "AIRE DE DÉPOTAGE, OUVRAGE DE RÉCEPTION",
      "startDate": "2026-08-01",
      "endDate": "2027-01-24",
      "duration": 23,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-13",
      "name": "Aire de depotage",
      "startDate": "2026-09-01",
      "endDate": "2026-12-31",
      "duration": 16,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-14",
      "name": "Ouvrage de réception",
      "startDate": "2026-08-01",
      "endDate": "2026-11-30",
      "duration": 16,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-15",
      "name": "Équipements",
      "startDate": "2026-10-01",
      "endDate": "2027-01-24",
      "duration": 15,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-16",
      "name": "BASSIN DE SEDIMENTATION",
      "startDate": "2026-10-01",
      "endDate": "2027-01-24",
      "duration": 15,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-17",
      "name": "Équipements",
      "startDate": "2026-10-01",
      "endDate": "2027-01-24",
      "duration": 15,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-18",
      "name": "LITS DE SÉCHAGES",
      "startDate": "2026-09-01",
      "endDate": "2027-01-24",
      "duration": 19,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-19",
      "name": "Regards hauteur comprise entre 1.5 et 2.00",
      "startDate": "2026-09-01",
      "endDate": "2026-12-31",
      "duration": 16,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-20",
      "name": "Canalisation pour alimentation des lits",
      "startDate": "2026-09-14",
      "endDate": "2027-01-24",
      "duration": 17,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-21",
      "name": "Couverture en bâche",
      "startDate": "2026-09-14",
      "endDate": "2027-01-24",
      "duration": 17,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-22",
      "name": "BASSIN DE LAGUNAGE",
      "startDate": "2026-07-01",
      "endDate": "2026-07-31",
      "duration": 4,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-23",
      "name": "Bassin facultatif 1.1",
      "startDate": "2026-07-01",
      "endDate": "2026-07-31",
      "duration": 4,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-24",
      "name": "AIRE DE SÉCHAGE",
      "startDate": "2026-10-01",
      "endDate": "2027-01-24",
      "duration": 15,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-25",
      "name": "Couverture en bâche",
      "startDate": "2026-10-01",
      "endDate": "2027-01-24",
      "duration": 15,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-26",
      "name": "HANGAR DE STOCKAGE",
      "startDate": "2026-08-01",
      "endDate": "2027-01-24",
      "duration": 23,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-27",
      "name": "Terrassement",
      "startDate": "2026-08-01",
      "endDate": "2026-09-13",
      "duration": 6,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-28",
      "name": "Génie civil de l'infrastructure",
      "startDate": "2026-08-17",
      "endDate": "2026-10-18",
      "duration": 8,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-29",
      "name": "Charpente métallique et couverture",
      "startDate": "2026-10-18",
      "endDate": "2027-01-24",
      "duration": 13,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-30",
      "name": "LOCAL TECHNIQUE, CLOTURE ET TRAVAUX DIVERS",
      "startDate": "2026-08-01",
      "endDate": "2026-10-31",
      "duration": 20,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-31",
      "name": "Guérite",
      "startDate": "2026-11-01",
      "endDate": "2026-12-31",
      "duration": 8,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-32",
      "name": "Bâtiment d'exploitation",
      "startDate": "2026-08-01",
      "endDate": "2026-11-30",
      "duration": 16,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-33",
      "name": "Parking",
      "startDate": "2026-11-01",
      "endDate": "2026-12-31",
      "duration": 8,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-34",
      "name": "Abris de repos",
      "startDate": "2026-11-01",
      "endDate": "2026-12-31",
      "duration": 8,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-35",
      "name": "Abris du groupe électrogène",
      "startDate": "2026-10-01",
      "endDate": "2026-11-30",
      "duration": 8,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-36",
      "name": "barbélé de sécurité et tyrolienne de la clôture",
      "startDate": "2026-08-01",
      "endDate": "2026-12-31",
      "duration": 20,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-37",
      "name": "VOIE D'EXPLOITATION",
      "startDate": "2026-09-14",
      "endDate": "2027-01-24",
      "duration": 17,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-38",
      "name": "Bétonnage des voies",
      "startDate": "2026-10-01",
      "endDate": "2027-01-24",
      "duration": 15,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-39",
      "name": "Fourniture et pose de caniveau",
      "startDate": "2026-09-14",
      "endDate": "2026-12-31",
      "duration": 14,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-40",
      "name": "Fourniture et pose de dalot",
      "startDate": "2026-10-01",
      "endDate": "2026-12-31",
      "duration": 12,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-41",
      "name": "Protection des talus en perréé maçonné",
      "startDate": "2026-11-01",
      "endDate": "2027-01-24",
      "duration": 11,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-42",
      "name": "Engazonnement",
      "startDate": "2026-11-01",
      "endDate": "2027-01-24",
      "duration": 11,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-43",
      "name": "ALIMENTATION ÉLECTRIQUE ET EAU POTABLE",
      "startDate": "2026-10-01",
      "endDate": "2027-01-24",
      "duration": 15,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-44",
      "name": "Construction d'un poste transformateur HTA/BT",
      "startDate": "2026-10-01",
      "endDate": "2026-12-31",
      "duration": 12,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-45",
      "name": "Fourniture et pose des lampadaires solaire",
      "startDate": "2026-10-01",
      "endDate": "2027-01-24",
      "duration": 15,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-46",
      "name": "TGBT alimentant les pompes de réfoulement",
      "startDate": "2026-10-01",
      "endDate": "2026-12-31",
      "duration": 12,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-47",
      "name": "EQUIPEMENTS ANNEXES",
      "startDate": "2026-11-01",
      "endDate": "2027-01-24",
      "duration": 11,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    },
    {
      "id": "songon-48",
      "name": "petits matériels d'exploitation",
      "startDate": "2026-11-01",
      "endDate": "2027-01-24",
      "duration": 11,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-49",
      "name": "Equipement de laboratoire",
      "startDate": "2026-11-01",
      "endDate": "2027-01-24",
      "duration": 11,
      "durationUnit": "Semaines",
      "isCategory": false,
      "progress": 25
    },
    {
      "id": "songon-50",
      "name": "RÉCEPTION PROVISOIRE ET REPLI",
      "startDate": "2027-01-25",
      "endDate": "2027-01-31",
      "duration": 1,
      "durationUnit": "Semaines",
      "isCategory": true,
      "progress": 25
    }
  ]
};
