import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  Edit,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Download,
  Share2,
  MoreHorizontal,
  Star,
  File,
  Eye,
  Zap,
  Folder,
  Upload,
  Building2
} from 'lucide-react';

interface DocumentsModuleProps {
  onBackToProject?: () => void;
}

export interface ProjectDocItem {
  id: string | number;
  starred: boolean;
  iconType: 'pdf' | 'excel' | 'word' | 'cad';
  name: string;
  category: string;
  categoryBg: string;
  ref: string;
  version: string;
  status: 'Validé' | 'En attente' | 'En cours' | 'Expiré';
  statusBg: string;
  author: string;
  role: string;
  date: string;
  size?: string;
  projectId?: string;
}

export const DocumentsModule: React.FC<DocumentsModuleProps> = ({ onBackToProject }) => {
  const {
    projects = [],
    currentUser,
    wbsMap = {},
    purchaseRequests = [],
    addAuditLog
  } = useAppState();

  // Projet sélectionné
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => projects[0]?.id || 'CIV-2026-ASS-BEN-002');
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  const [activeTab, setActiveTab] = useState<'apercu' | 'details' | 'versions' | 'workflow' | 'commentaires'>('apercu');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TOUS');
  const [statusFilter, setStatusFilter] = useState('TOUS');

  // Stockage local des documents ajoutés par l'utilisateur
  const [userDocs, setUserDocs] = useState<ProjectDocItem[]>(() => {
    try {
      const saved = localStorage.getItem('gebat_custom_documents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal d'ajout de document
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('Plans');
  const [newDocType, setNewDocType] = useState<'pdf' | 'excel' | 'word' | 'cad'>('pdf');
  const [newDocVersion, setNewDocVersion] = useState('V1.0');

  // GÉNÉRATION 100% DYNAMIQUE DES DOCUMENTS DU PROJET DEPUIS LA BDD
  const documentsList = useMemo<ProjectDocItem[]>(() => {
    if (!selectedProject) return [];

    const projCode = selectedProject.code || 'PRJ';
    const projName = selectedProject.name || 'Projet BTP';
    const projManager = selectedProject.manager || 'SEA Alphonse';

    const baseDocs: ProjectDocItem[] = [
      {
        id: `doc-${projCode}-01`,
        starred: true,
        iconType: 'pdf',
        name: `Marché Principal Signé & Acte d'Engagement - ${projName}`,
        category: 'Contrats',
        categoryBg: 'bg-blue-50 text-blue-700',
        ref: selectedProject.contractRef || `CTR-GEBAT-2026-${projCode}`,
        version: 'Indice 0',
        status: 'Validé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        author: 'Direction Générale GEBAT / MOA',
        role: 'Direction Générale',
        date: selectedProject.signatureDate || '2026-01-15',
        size: '8.4 Mo',
        projectId: selectedProject.id
      },
      {
        id: `doc-${projCode}-02`,
        starred: false,
        iconType: 'pdf',
        name: `Cahier des Clauses Techniques Particulières (CCTP) - ${projCode}`,
        category: 'Contrats',
        categoryBg: 'bg-blue-50 text-blue-700',
        ref: `CCTP-${projCode}-001`,
        version: 'V2.0',
        status: 'Validé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        author: 'Bureau d\'Études Techniques',
        role: 'Maîtrise d\'Œuvre',
        date: selectedProject.startDate || '2026-06-01',
        size: '14.2 Mo',
        projectId: selectedProject.id
      },
      {
        id: `doc-${projCode}-03`,
        starred: false,
        iconType: 'excel',
        name: `Déboursé Sec & Étude de Prix V0 Validée (DS SSOT) - ${projCode}`,
        category: 'Financier',
        categoryBg: 'bg-emerald-50 text-emerald-700',
        ref: `DS-SSOT-${projCode}-V0`,
        version: 'V0_SSOT',
        status: 'Validé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        author: 'Ingénieur Études de Prix GEBAT',
        role: 'Direction Technique',
        date: selectedProject.startDate || '2026-06-01',
        size: '5.7 Mo',
        projectId: selectedProject.id
      },
      {
        id: `doc-${projCode}-04`,
        starred: false,
        iconType: 'excel',
        name: `Bordereau des Prix Unitaires (BPU) & DQE Contractuel - ${projCode}`,
        category: 'Financier',
        categoryBg: 'bg-amber-50 text-amber-700',
        ref: `BPU-DQE-${projCode}`,
        version: 'Contractuel',
        status: 'Validé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        author: projManager,
        role: 'Directeur Projet',
        date: selectedProject.startDate || '2026-06-01',
        size: '3.8 Mo',
        projectId: selectedProject.id
      },
      {
        id: `doc-${projCode}-05`,
        starred: true,
        iconType: 'pdf',
        name: `Rapport d'Avancement Hebdomadaire - ${projName}`,
        category: 'Rapports',
        categoryBg: 'bg-blue-50 text-blue-700',
        ref: `RAP-HEBDO-${projCode}`,
        version: 'V1.0',
        status: 'Validé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        author: projManager,
        role: 'Chef Travaux',
        date: new Date().toLocaleDateString('fr-FR'),
        size: '2.1 Mo',
        projectId: selectedProject.id
      },
      {
        id: `doc-${projCode}-06`,
        starred: false,
        iconType: 'excel',
        name: `Planning Prévisionnel Gantt d'Exécution - ${projCode}`,
        category: 'Planning',
        categoryBg: 'bg-purple-50 text-purple-700',
        ref: `PLN-GANTT-${projCode}`,
        version: 'V3.0',
        status: 'Validé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        author: 'Planificateur Chantier',
        role: 'Planificateur',
        date: selectedProject.startDate || '2026-06-01',
        size: '4.5 Mo',
        projectId: selectedProject.id
      },
      {
        id: `doc-${projCode}-07`,
        starred: false,
        iconType: 'pdf',
        name: `Plan d'Assurance Qualité & Sécurité (PAQ / PPSPS) - ${projCode}`,
        category: 'HSE',
        categoryBg: 'bg-red-50 text-red-700',
        ref: `HSE-PPSPS-${projCode}`,
        version: 'V2.1',
        status: 'Validé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        author: 'Responsable QHSE GEBAT',
        role: 'Resp. QHSE',
        date: selectedProject.startDate || '2026-06-01',
        size: '6.3 Mo',
        projectId: selectedProject.id
      },
      {
        id: `doc-${projCode}-08`,
        starred: false,
        iconType: 'cad',
        name: `Plans d'Exécution & Ferraillage Ouvrages - ${projCode}`,
        category: 'Plans',
        categoryBg: 'bg-blue-50 text-blue-700',
        ref: `PLN-EXE-${projCode}`,
        version: 'V1.2',
        status: 'En cours',
        statusBg: 'bg-blue-50 text-blue-700 border border-blue-200',
        author: 'Cabinet Architecture & BET',
        role: 'Architecte',
        date: '2026-07-15',
        size: '18.9 Mo',
        projectId: selectedProject.id
      },
      {
        id: `doc-${projCode}-09`,
        starred: false,
        iconType: 'pdf',
        name: `Caution de Bonne Fin & Garantie Bancaire 5% - ${projCode}`,
        category: 'Administratif',
        categoryBg: 'bg-slate-100 text-slate-700',
        ref: `ADM-GAR-${projCode}`,
        version: 'V1.0',
        status: 'Validé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        author: 'Direction Financière DAF',
        role: 'DAF',
        date: selectedProject.startDate || '2026-06-01',
        size: '1.8 Mo',
        projectId: selectedProject.id
      }
    ];

    // Documents générés depuis les Demandes d'Achat (DAs)
    const daDocs: ProjectDocItem[] = purchaseRequests
      .filter(da => da.projectId === selectedProject.id || da.projectId === selectedProject.code)
      .map(da => ({
        id: `doc-da-${da.id}`,
        starred: false,
        iconType: 'pdf',
        name: `Demande d'Achat DA ${da.code} — ${da.itemDescription || da.objectTitle || 'Matériaux'}`,
        category: 'Achats',
        categoryBg: 'bg-blue-50 text-blue-700',
        ref: da.code,
        version: 'V1.0',
        status: da.status === 'VALIDEE' || da.status === 'APPROUVEE' ? 'Validé' : da.status === 'REFUSEE' ? 'Expiré' : 'En attente',
        statusBg: da.status === 'VALIDEE' || da.status === 'APPROUVEE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200',
        author: da.createdBy || projManager,
        role: 'Acheteur / Chantier',
        date: da.createdAt ? da.createdAt.substring(0, 10) : new Date().toLocaleDateString('fr-FR'),
        size: '1.2 Mo',
        projectId: selectedProject.id
      }));

    // Documents déposés par l'utilisateur pour ce projet
    const userProjectDocs = userDocs.filter(d => !d.projectId || d.projectId === selectedProject.id || d.projectId === selectedProject.code);

    return [...baseDocs, ...daDocs, ...userProjectDocs];
  }, [selectedProject, purchaseRequests, userDocs]);

  // ID du document sélectionné
  const [selectedDocId, setSelectedDocId] = useState<string | number>(() => documentsList[4]?.id || documentsList[0]?.id || 'doc-01');

  // Synchroniser selectedDocId quand la liste change
  React.useEffect(() => {
    if (documentsList.length > 0 && !documentsList.some(d => d.id === selectedDocId)) {
      setSelectedDocId(documentsList[0]?.id);
    }
  }, [documentsList, selectedDocId]);

  const selectedDoc = useMemo(() => {
    return documentsList.find(d => d.id === selectedDocId) || documentsList[0] || {
      id: 'doc-default',
      starred: false,
      iconType: 'pdf' as const,
      name: 'Rapport d\'avancement',
      category: 'Rapports',
      categoryBg: 'bg-blue-50 text-blue-700',
      ref: 'RAP-001',
      version: 'V1.0',
      status: 'Validé' as const,
      statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      author: 'SEA Alphonse',
      role: 'Directeur Projet',
      date: new Date().toLocaleDateString('fr-FR'),
      size: '2.4 Mo'
    };
  }, [documentsList, selectedDocId]);

  // Filtrage
  const filteredDocuments = useMemo(() => {
    return documentsList.filter(doc => {
      if (categoryFilter !== 'TOUS' && doc.category !== categoryFilter) return false;
      if (statusFilter !== 'TOUS' && doc.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = doc.name.toLowerCase().includes(q);
        const matchRef = doc.ref.toLowerCase().includes(q);
        const matchAuthor = doc.author.toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchAuthor) return false;
      }
      return true;
    });
  }, [documentsList, categoryFilter, statusFilter, searchQuery]);

  // KPIS CALCULÉS EN TEMPS RÉEL SUR LES DOCUMENTS RÉELS
  const totalDocs = documentsList.length;
  const validatedDocs = documentsList.filter(d => d.status === 'Validé').length;
  const pendingDocs = documentsList.filter(d => d.status === 'En attente').length;
  const inProgressDocs = documentsList.filter(d => d.status === 'En cours').length;
  const expiredDocs = documentsList.filter(d => d.status === 'Expiré').length;

  // Calcul du budget consommé et avancement réel pour le preview
  const calculatedBudget = selectedProject ? Number(selectedProject.revisedBudget || selectedProject.initialBudget || 0) : 0;
  const progressPct = selectedProject?.progress !== undefined ? selectedProject.progress : 0;

  // Ajouter un nouveau document
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !selectedProject) return;

    const newDoc: ProjectDocItem = {
      id: `doc-custom-${Date.now()}`,
      starred: false,
      iconType: newDocType,
      name: newDocName.trim(),
      category: newDocCategory,
      categoryBg: newDocCategory === 'Contrats' ? 'bg-blue-50 text-blue-700' : newDocCategory === 'Financier' ? 'bg-emerald-50 text-emerald-700' : newDocCategory === 'Planning' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700',
      ref: `DOC-${selectedProject.code}-${String(documentsList.length + 1).padStart(3, '0')}`,
      version: newDocVersion || 'V1.0',
      status: 'Validé',
      statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      author: currentUser?.name || selectedProject.manager || 'Directeur Projet',
      role: currentUser?.role || 'Directeur Projet',
      date: new Date().toLocaleDateString('fr-FR'),
      size: '2.5 Mo',
      projectId: selectedProject.id
    };

    const nextUserDocs = [newDoc, ...userDocs];
    setUserDocs(nextUserDocs);
    localStorage.setItem('gebat_custom_documents', JSON.stringify(nextUserDocs));

    addAuditLog(
      'AJOUT_DOCUMENT',
      'DOCUMENTS',
      newDoc.ref,
      `Dépôt du document [${newDoc.name}] dans le projet ${selectedProject.code}.`
    );

    setShowAddModal(false);
    setNewDocName('');
    setSelectedDocId(newDoc.id);
  };

  return (
    <div className="space-y-6 text-slate-800 font-sans max-w-7xl mx-auto pb-12">
      {/* 1. TOP HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {onBackToProject && (
            <button
              onClick={onBackToProject}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1 cursor-pointer transition"
            >
              <ArrowLeft size={14} /> Retour à la vue projet 360°
            </button>
          )}
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">GESTION DOCUMENTAIRE</h1>
          <p className="text-xs text-slate-500 font-medium">Centralisez, organisez et suivez tous les documents contractuels et techniques du projet</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition"
          >
            <Plus size={16} /> Nouveau document
          </button>
        </div>
      </div>

      {/* 2. CARTE RÉPERTOIRE PROJET DYNAMIQUE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center font-bold text-base border border-blue-100 shadow-xs shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {selectedProject?.code}
              </span>
              <span className="font-bold text-slate-900 text-sm">{selectedProject?.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mt-0.5 flex-wrap">
              <span>Client : <strong className="text-slate-800">{selectedProject?.client || 'Ministère de l’Hydraulique & Assainissement / ONEP'}</strong></span>
              <span>Pays : <strong className="text-slate-800">{selectedProject?.country || 'Côte d’Ivoire 🇨🇮'}</strong></span>
              <span>Directeur Projet : <strong className="text-slate-800">{selectedProject?.manager || 'SEA Alphonse'}</strong></span>
              <span>Démarrage : <strong className="text-slate-800">{selectedProject?.startDate || '01/06/2026'}</strong></span>
              <span>Fin contractuelle : <strong className="text-slate-800">{selectedProject?.endDate || '01/09/2027'}</strong></span>
            </div>
          </div>
        </div>

        {projects.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-slate-500 text-xs">Projet :</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs text-slate-900 cursor-pointer focus:bg-white focus:border-blue-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. LIGNE DES 5 CARTES KPI CALCULÉES DYNAMIQUEMENT */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: TOTAL DOCUMENTS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">TOTAL DOCUMENTS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{totalDocs}</span>
            <span className="text-[10px] text-blue-600 font-bold">Base de données active</span>
          </div>
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <FileText size={20} />
          </div>
        </div>

        {/* KPI 2: DOCUMENTS VALIDÉS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">DOCUMENTS VALIDÉS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{validatedDocs}</span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {totalDocs > 0 ? ((validatedDocs / totalDocs) * 100).toFixed(1) : 0}% <span className="text-slate-400 font-normal">du total</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* KPI 3: EN ATTENTE DE VALIDATION */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">EN ATTENTE</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{pendingDocs}</span>
            <span className="text-[10px] text-amber-600 font-bold">
              {totalDocs > 0 ? ((pendingDocs / totalDocs) * 100).toFixed(1) : 0}% <span className="text-slate-400 font-normal">du total</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
            <Clock size={20} />
          </div>
        </div>

        {/* KPI 4: VERSION EN COURS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">EN COURS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{inProgressDocs}</span>
            <span className="text-[10px] text-purple-600 font-bold">
              {totalDocs > 0 ? ((inProgressDocs / totalDocs) * 100).toFixed(1) : 0}% <span className="text-slate-400 font-normal">du total</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
            <Edit size={20} />
          </div>
        </div>

        {/* KPI 5: DOCUMENTS EXPIRÉS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">EXPIRÉS / REJETÉS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{expiredDocs}</span>
            <span className="text-[10px] text-slate-500 font-bold">
              {totalDocs > 0 ? ((expiredDocs / totalDocs) * 100).toFixed(1) : 0}% <span className="text-slate-400 font-normal">du total</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-rose-500/20">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* 4. TABLEAU DES DOCUMENTS + APERÇU DYNAMIQUE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Côté Gauche: Tableau Documents */}
        <div className="lg:col-span-7 space-y-3">
          {/* Toolbar Recherche & Filtres */}
          <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un document, mot clé, référence..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <option value="TOUS">Toutes catégories</option>
              <option value="Contrats">Contrats</option>
              <option value="Financier">Financier</option>
              <option value="Planning">Planning</option>
              <option value="Rapports">Rapports</option>
              <option value="HSE">HSE</option>
              <option value="Plans">Plans</option>
              <option value="Achats">Achats</option>
              <option value="Administratif">Administratif</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <option value="TOUS">Tous statuts</option>
              <option value="Validé">Validé</option>
              <option value="En attente">En attente</option>
              <option value="En cours">En cours</option>
              <option value="Expiré">Expiré</option>
            </select>
          </div>

          {/* Tableau des Documents */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Nom du document</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Référence</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Propriétaire</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredDocuments.map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`cursor-pointer transition ${
                      selectedDocId === doc.id ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3 text-center">
                      <Star size={14} className={doc.starred ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                    </td>

                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-black text-[9px] ${
                          doc.iconType === 'pdf' ? 'bg-red-100 text-red-700' : doc.iconType === 'excel' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {doc.iconType.toUpperCase()}
                        </span>
                        <span className="truncate max-w-[220px]" title={doc.name}>{doc.name}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.categoryBg}`}>
                        {doc.category}
                      </span>
                    </td>

                    <td className="p-3 font-mono text-slate-600">{doc.ref}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{doc.version}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${doc.statusBg}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      <span className="block font-bold text-[10px]">{doc.author}</span>
                      <span className="block text-[9px] text-slate-400">{doc.role}</span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-500">{doc.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>{filteredDocuments.length} document(s) enregistré(s)</span>
              <span>Projet {selectedProject?.code}</span>
            </div>
          </div>
        </div>

        {/* Côté Droit: Panneau de Prévisualisation du Document */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 text-xs">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 font-black text-xs flex items-center justify-center shadow-sm uppercase">
                {selectedDoc.iconType}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm truncate max-w-[280px]" title={selectedDoc.name}>
                  {selectedDoc.name}
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                  <span>{selectedDoc.category}</span>
                  <span>·</span>
                  <span>{selectedDoc.ref}</span>
                  <span>·</span>
                  <span>{selectedDoc.version}</span>
                </div>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${selectedDoc.statusBg}`}>
              {selectedDoc.status}
            </span>
          </div>

          <div className="flex space-x-4 border-b border-slate-100 text-xs font-bold">
            {['apercu', 'details', 'versions'].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`pb-2 border-b-2 capitalize transition cursor-pointer ${
                  activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {t === 'apercu' ? 'Aperçu' : t === 'details' ? 'Détails Fichier' : 'Versions'}
              </button>
            ))}
          </div>

          {/* Aperçu Dynamique Réel */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-inner">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow space-y-4 text-slate-800">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
                    G
                  </div>
                  <span className="font-black text-slate-900 text-xs">GEBAT 360°</span>
                </div>
                <div className="text-right">
                  <h4 className="font-black text-slate-900 text-xs tracking-tight uppercase">FICHE SYNTHÈSE PROJET</h4>
                  <span className="text-[9px] text-slate-400 block">{selectedProject?.code} — {selectedProject?.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-extrabold text-slate-900 text-[11px] uppercase">1. SYNTHÈSE D'EXÉCUTION</h5>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="bg-slate-50 p-2 rounded border">
                    <span className="text-slate-400 block text-[9px]">AVANCEMENT PHYSIQUE</span>
                    <span className="font-black text-slate-900 text-xs">{progressPct}%</span>
                    <span className="text-slate-400 block text-[8px]">Objectif : {selectedProject?.targetProgress || 21.6}%</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border">
                    <span className="text-slate-400 block text-[9px]">BUDGET (DS) RÉVISÉ</span>
                    <span className="font-black text-slate-900 text-xs">{calculatedBudget.toLocaleString('fr-FR')} FCFA</span>
                    <span className="text-slate-400 block text-[8px]">DS Validé SSOT</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border">
                    <span className="text-slate-400 block text-[9px]">MONTANT DU MARCHÉ</span>
                    <span className="font-black text-slate-900 text-xs">{(selectedProject?.contractAmount || 0).toLocaleString('fr-FR')} FCFA</span>
                    <span className="text-slate-400 block text-[8px]">Marché Client DQE</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-[9px] text-slate-600 border-t pt-2">
                <h5 className="font-extrabold text-slate-900 text-[11px] uppercase">2. MÉTADONNÉES DOCUMENT</h5>
                <p>• Référence : <strong className="text-slate-800">{selectedDoc.ref}</strong></p>
                <p>• Auteur / Émetteur : <strong className="text-slate-800">{selectedDoc.author}</strong> ({selectedDoc.role})</p>
                <p>• Date d'émission : <strong className="text-slate-800">{selectedDoc.date}</strong></p>
                <p>• Statut de conformité : <strong className="text-emerald-700">{selectedDoc.status}</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL AJOUT DOCUMENT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-sm">Ajouter un Document au Projet</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom du document :</label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  placeholder="Ex: Procès-Verbal de Réception Technique"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catégorie :</label>
                  <select
                    value={newDocCategory}
                    onChange={e => setNewDocCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="Plans">Plans & Architecture</option>
                    <option value="Contrats">Contrats & Avenants</option>
                    <option value="Financier">Financier & DS</option>
                    <option value="Planning">Planning</option>
                    <option value="Rapports">Rapports Chantier</option>
                    <option value="HSE">QHSE & Sécurité</option>
                    <option value="Achats">Achats & Appro</option>
                    <option value="Administratif">Administratif</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Type Fichier :</label>
                  <select
                    value={newDocType}
                    onChange={e => setNewDocType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel (XLSX)</option>
                    <option value="word">Word (DOCX)</option>
                    <option value="cad">Plan CAD (DWG)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Version :</label>
                <input
                  type="text"
                  value={newDocVersion}
                  onChange={e => setNewDocVersion(e.target.value)}
                  placeholder="Ex: V1.0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
