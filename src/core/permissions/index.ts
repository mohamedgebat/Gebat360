import { User, Role, PermissionAction, ModulePermission } from '../types';
import { isProjectMatch } from '../../utils/projectMatcher';

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    name: 'Yacouba Mohamed',
    email: 'y.mohamed@gebat-sa.com',
    role: 'Super Admin',
    avatar: 'YM',
    employeeCode: 'EMP-2026-001',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
  {
    id: 'USR-002',
    name: 'Kouassi Kouadio',
    email: 'k.kouadio@gebat-sa.com',
    role: 'Direction Générale',
    avatar: 'KK',
    employeeCode: 'EMP-2026-002',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
  {
    id: 'USR-003',
    name: 'Amina Diallo',
    email: 'a.diallo@gebat-sa.com',
    role: 'DAF',
    avatar: 'AD',
    employeeCode: 'EMP-2026-003',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
  {
    id: 'USR-004',
    name: 'Jean-Marc Traoré',
    email: 'jm.traore@gebat-sa.com',
    role: 'Directeur Technique',
    avatar: 'JT',
    employeeCode: 'EMP-2026-004',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
  {
    id: 'USR-005',
    name: 'SEA Alphonse',
    email: 'sea.alphonse@gebat-sa.com',
    role: 'Directeur Projet',
    avatar: 'SA',
    employeeCode: 'EMP-2026-005',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
  {
    id: 'USR-006',
    name: 'Yao N’Guessan',
    email: 'y.nguessan@gebat-sa.com',
    role: 'Conducteur de Travaux',
    avatar: 'YN',
    employeeCode: 'EMP-2026-006',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
  {
    id: 'USR-007',
    name: 'Bakary Koné',
    email: 'b.kone@gebat-sa.com',
    role: 'Chef de Chantier',
    avatar: 'BK',
    employeeCode: 'EMP-2026-007',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
  {
    id: 'USR-008',
    name: 'Claire Bamba',
    email: 'c.bamba@gebat-sa.com',
    role: 'Cost Controller',
    avatar: 'CB',
    employeeCode: 'EMP-2026-008',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
  {
    id: 'USR-009',
    name: 'Ibrahim Diarra',
    email: 'i.diarra@gebat-sa.com',
    role: 'Achats',
    avatar: 'ID',
    employeeCode: 'EMP-2026-009',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
  {
    id: 'USR-010',
    name: 'Moussa Ouattara',
    email: 'm.ouattara@gebat-sa.com',
    role: 'Magasinier',
    avatar: 'MO',
    employeeCode: 'EMP-2026-010',
    company: 'GEBAT SA',
    status: 'ACTIF',
  },
];

// MATRICE DES ACTIONS PAR MODULE & PAR RÔLE (13 Actions Métier)
export const MODULE_ACTIONS_MATRIX: Record<string, Record<string, ModulePermission>> = {
  // 1. Portefeuille & Dashboard Général
  'dashboard-portfolio': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'DAF': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Directeur Technique': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Directeur Projet': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: false, administrer: false },
    'Conducteur de Travaux': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Responsable Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },

  // 2. Alertes Métier
  'dashboard-alerts': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Direction Générale': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'DAF': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Directeur Technique': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Directeur Projet': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Conducteur de Travaux': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Responsable Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },

  // 3. Nouveau Projet
  'projects-new': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Direction Générale': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Directeur Technique': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: false, administrer: false },
    'Directeur Projet': { voir: true, creer: true, modifier: true, soumettre: true, valider: false, refuser: false, administrer: false },
    'Conducteur de Travaux': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Responsable Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },

  // 4. Production Terrain & Rapports
  'btp-production': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Direction Générale': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Directeur Technique': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Directeur Projet': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Conducteur de Travaux': { voir: true, creer: true, modifier: true, soumettre: true, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: true, creer: true, modifier: true, soumettre: true, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Responsable Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },

  // 5. WBS & Structure
  'btp-wbs': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: false, administrer: false },
    'Direction Générale': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: false, administrer: false },
    'Directeur Technique': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Directeur Projet': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: false, administrer: false },
    'Conducteur de Travaux': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: true, creer: false, modifier: true, soumettre: false, valider: false, refuser: false, administrer: false },
    'Responsable Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },

  // 6. Déboursé Sec & Budget DQE
  'btp-debourse': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Direction Générale': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'DAF': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Directeur Technique': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Directeur Projet': { voir: true, creer: true, modifier: true, soumettre: true, valider: false, refuser: false, administrer: false },
    'Conducteur de Travaux': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Responsable Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },

  // 7. Cost Control & Marges (EVM)
  'btp-cost-control': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: false, modifier: true, soumettre: false, valider: true, refuser: true, administrer: false },
    'Direction Générale': { voir: true, creer: false, modifier: true, soumettre: false, valider: true, refuser: true, administrer: false },
    'DAF': { voir: true, creer: false, modifier: true, soumettre: false, valider: true, refuser: true, administrer: false },
    'Directeur Technique': { voir: true, creer: false, modifier: true, soumettre: false, valider: true, refuser: true, administrer: false },
    'Directeur Projet': { voir: true, creer: false, modifier: true, soumettre: true, valider: false, refuser: false, administrer: false },
    'Conducteur de Travaux': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Responsable Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },

  // 8. CEO Command Center (EXCLUSIF DIRECTION GÉNÉRALE & COST CONTROLLER & ADMIN)
  'ceo-command-center': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Cost Controller': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Directeur Projet': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Conducteur de Travaux': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Responsable Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },

  // 9. Demandes d'Achat (Procurement DA)
  'procurement-da': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Direction Générale': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Directeur Technique': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Directeur Projet': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Conducteur de Travaux': { voir: true, creer: true, modifier: true, soumettre: true, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: true, creer: true, modifier: true, soumettre: true, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Responsable Achats': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Achats': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: false },
    'Magasinier Chantier': { voir: true, creer: true, modifier: false, soumettre: true, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: true, creer: true, modifier: false, soumettre: true, valider: false, refuser: false, administrer: false },
  },

  // 10. Centre de Validation
  'procurement-validation': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Direction Générale': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Directeur Technique': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Directeur Projet': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Cost Controller': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Responsable Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Achats': { voir: true, creer: false, modifier: false, soumettre: false, valider: true, refuser: true, administrer: false },
    'Conducteur de Travaux': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },

  // 11. Stock Magasin & Mouvements WBS
  'stock-list': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Direction Générale': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Directeur Projet': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Conducteur de Travaux': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: true, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Responsable Achats': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: false, administrer: false },
    'Achats': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Magasinier': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
  },

  // 12. Administration Utilisateurs & Rôles (STRICTEMENT RÉSERVÉ À L'ADMINISTRATEUR)
  'admin-users': {
    'Super Administrateur': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Super Admin': { voir: true, creer: true, modifier: true, soumettre: true, valider: true, refuser: true, administrer: true },
    'Direction Générale / CEO': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Direction Générale': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Directeur Projet': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Conducteur de Travaux': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Chef de Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Cost Controller': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Responsable Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Achats': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier Chantier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
    'Magasinier': { voir: false, creer: false, modifier: false, soumettre: false, valider: false, refuser: false, administrer: false },
  },
};

// HELPER RBAC : Normalisation universelle des rôles et de leurs alias
export function normalizeRole(role: string | undefined | null): Role {
  if (!role) return 'Conducteur de Travaux';
  const r = role.trim();
  if (r === 'Super Admin' || r === 'Super Administrateur') return 'Super Administrateur';
  if (r === 'Direction Générale' || r === 'Direction Générale / CEO' || r === 'CEO') return 'Direction Générale / CEO';
  if (r === 'Achats' || r === 'Responsable Achats') return 'Responsable Achats';
  if (r === 'Magasinier' || r === 'Magasinier Chantier') return 'Magasinier Chantier';
  return r as Role;
}

// HELPER RBAC : Vérifier si l'utilisateur possède une permission précise sur un module (13 Actions FR/EN)
export function hasPermission(
  user: User | null | undefined,
  moduleKey: string,
  action: PermissionAction = 'VOIR'
): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);

  // Super Administrateur dispose d'un privilège total
  if (role === 'Super Administrateur' || user.role === 'Super Admin') return true;

  // Surcharges personnalisées sur la fiche utilisateur
  if (user.customPermissions && user.customPermissions[moduleKey]) {
    const customAct = user.customPermissions[moduleKey][action];
    if (typeof customAct === 'boolean') return customAct;
  }

  // Matrice par défaut par rôle
  const modulePerms = MODULE_ACTIONS_MATRIX[moduleKey];
  if (!modulePerms) return true; // modules ouverts par défaut si non restreints

  const rolePerm = modulePerms[role] || modulePerms[user.role as Role];
  if (!rolePerm) return true;

  const normAction = action.toUpperCase();
  switch (normAction) {
    case 'VOIR': case 'VIEW': return rolePerm.voir;
    case 'CRÉER': case 'CREATE': return rolePerm.creer;
    case 'MODIFIER': case 'EDIT': return rolePerm.modifier;
    case 'SUPPRIMER': case 'DELETE': return rolePerm.supprimer ?? (rolePerm.modifier && rolePerm.administrer);
    case 'SOUMETTRE': case 'SUBMIT': return rolePerm.soumettre;
    case 'VALIDER': case 'VALIDATE': return rolePerm.valider;
    case 'REFUSER': case 'REJECT': return rolePerm.refuser;
    case 'RETOURNER': case 'RETURN': return rolePerm.retourner ?? rolePerm.refuser;
    case 'COMMENTER': case 'COMMENT': return rolePerm.commenter ?? rolePerm.voir;
    case 'EXPORTER': case 'EXPORT': return rolePerm.exporter ?? rolePerm.voir;
    case 'IMPORTER': case 'IMPORT': return rolePerm.importer ?? rolePerm.creer;
    case 'APPROUVER': case 'APPROVE': return rolePerm.approuver ?? rolePerm.valider;
    case 'ADMINISTRER': case 'ADMIN': return rolePerm.administrer;
    default: return rolePerm.voir;
  }
}

// HELPER RBAC : Vérifier si l'utilisateur est habilité sur un projet donné (Niveau 2)
export function hasProjectAccess(user: User | null | undefined, projectId: string): boolean {
  if (!user) return true;
  return true; // Harmonisation totale : Accès global et données identiques pour tous les profils du groupe
}

// HELPER RBAC : Vérifier si l'utilisateur est habilité sur une société (Niveau 1)
export function hasCompanyAccess(user: User | null | undefined, companyName: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'Super Administrateur' || role === 'Direction Générale / CEO' || user.role === 'Super Admin' || user.role === 'Direction Générale') return true;
  if (!user.company) return true;
  return user.company.toUpperCase() === companyName.toUpperCase() || user.company === 'GEBAT SA';
}

// HELPER RBAC : Vérifier si l'utilisateur est habilité sur un nœud WBS (Niveau 3)
export function hasWbsAccess(user: User | null | undefined, wbsCode: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'Super Administrateur' || role === 'Direction Générale / CEO' || user.role === 'Super Admin' || user.role === 'Direction Générale' || user.role === 'Directeur Technique' || user.role === 'Directeur Projet') {
    return true;
  }
  if (!user.wbsCodes || user.wbsCodes.length === 0) return true;
  return user.wbsCodes.some(code => wbsCode.startsWith(code));
}

// Rétro-compatibilité avec l'ancienne matrice simple (Boolean Flags)
export const PERMISSIONS_MATRIX: Record<Role, {
  canCreateProject: boolean;
  canEditBudget: boolean;
  canApproveBudget: boolean;
  canCreateDA: boolean;
  canApproveDA: boolean;
  canIssuePO: boolean;
  canReceiveGoods: boolean;
  canIssueStock: boolean;
  canCreateDailyReport: boolean;
  canValidateDailyReport: boolean;
  canViewAllProjects: boolean;
}> = {
  'Super Admin': { canCreateProject: true, canEditBudget: true, canApproveBudget: true, canCreateDA: true, canApproveDA: true, canIssuePO: true, canReceiveGoods: true, canIssueStock: true, canCreateDailyReport: true, canValidateDailyReport: true, canViewAllProjects: true },
  'Direction Générale': { canCreateProject: true, canEditBudget: false, canApproveBudget: true, canCreateDA: false, canApproveDA: true, canIssuePO: false, canReceiveGoods: false, canIssueStock: false, canCreateDailyReport: false, canValidateDailyReport: true, canViewAllProjects: true },
  'DAF': { canCreateProject: false, canEditBudget: false, canApproveBudget: true, canCreateDA: false, canApproveDA: true, canIssuePO: true, canReceiveGoods: false, canIssueStock: false, canCreateDailyReport: false, canValidateDailyReport: false, canViewAllProjects: true },
  'Directeur Technique': { canCreateProject: true, canEditBudget: true, canApproveBudget: true, canCreateDA: true, canApproveDA: true, canIssuePO: false, canReceiveGoods: false, canIssueStock: false, canCreateDailyReport: false, canValidateDailyReport: true, canViewAllProjects: true },
  'Directeur Projet': { canCreateProject: true, canEditBudget: true, canApproveBudget: false, canCreateDA: true, canApproveDA: true, canIssuePO: false, canReceiveGoods: false, canIssueStock: false, canCreateDailyReport: false, canValidateDailyReport: true, canViewAllProjects: true },
  'Conducteur de Travaux': { canCreateProject: false, canEditBudget: true, canApproveBudget: false, canCreateDA: true, canApproveDA: true, canIssuePO: false, canReceiveGoods: true, canIssueStock: false, canCreateDailyReport: true, canValidateDailyReport: true, canViewAllProjects: false },
  'Chef de Chantier': { canCreateProject: false, canEditBudget: false, canApproveBudget: false, canCreateDA: true, canApproveDA: false, canIssuePO: false, canReceiveGoods: false, canIssueStock: false, canCreateDailyReport: true, canValidateDailyReport: false, canViewAllProjects: false },
  'Cost Controller': { canCreateProject: false, canEditBudget: true, canApproveBudget: false, canCreateDA: false, canApproveDA: true, canIssuePO: false, canReceiveGoods: false, canIssueStock: false, canCreateDailyReport: false, canValidateDailyReport: false, canViewAllProjects: true },
  'Achats': { canCreateProject: false, canEditBudget: false, canApproveBudget: false, canCreateDA: true, canApproveDA: false, canIssuePO: true, canReceiveGoods: false, canIssueStock: false, canCreateDailyReport: false, canValidateDailyReport: false, canViewAllProjects: true },
  'Magasinier': { canCreateProject: false, canEditBudget: false, canApproveBudget: false, canCreateDA: true, canApproveDA: false, canIssuePO: false, canReceiveGoods: true, canIssueStock: true, canCreateDailyReport: false, canValidateDailyReport: false, canViewAllProjects: false },
};
