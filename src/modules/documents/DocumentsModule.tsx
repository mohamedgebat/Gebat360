import React, { useState } from 'react';
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
  Folder
} from 'lucide-react';

interface DocumentsModuleProps {
  onBackToProject?: () => void;
}

export const DocumentsModule: React.FC<DocumentsModuleProps> = ({ onBackToProject }) => {
  const [selectedDocId, setSelectedDocId] = useState<number>(5); // 'Rapport d'avancement hebdo S20' sélectionné par défaut
  const [activeTab, setActiveTab] = useState<'apercu' | 'details' | 'versions' | 'workflow' | 'commentaires'>('apercu');

  // Documents conformes à la maquette
  const documentsList = [
    {
      id: 1,
      starred: false,
      iconType: 'word',
      name: 'Plan d’exécution général',
      category: 'Plans',
      categoryBg: 'bg-blue-50 text-blue-700',
      ref: 'PLN-EXE-GEN-001',
      version: 'V2.1',
      status: 'Validé',
      statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      author: 'B. Diatta',
      role: 'Chef Travaux',
      date: '20/05/2025 10:15',
    },
    {
      id: 2,
      starred: false,
      iconType: 'pdf',
      name: 'Cahier des charges techniques',
      category: 'Contrats',
      categoryBg: 'bg-blue-50 text-blue-700',
      ref: 'CCT-TECH-003',
      version: 'V1.0',
      status: 'Validé',
      statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      author: 'A. Fall',
      role: 'Directeur Projet',
      date: '18/05/2025 16:42',
    },
    {
      id: 3,
      starred: false,
      iconType: 'excel',
      name: 'Planning prévisionnel',
      category: 'Planning',
      categoryBg: 'bg-purple-50 text-purple-700',
      ref: 'PLN-GANTT-002',
      version: 'V3.4',
      status: 'Validé',
      statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      author: 'K. Ndour',
      role: 'Planificateur',
      date: '20/05/2025 09:30',
    },
    {
      id: 4,
      starred: false,
      iconType: 'pdf',
      name: 'Devis estimatif détaillé',
      category: 'Financier',
      categoryBg: 'bg-amber-50 text-amber-700',
      ref: 'DEV-EST-007',
      version: 'V1.2',
      status: 'En attente',
      statusBg: 'bg-amber-50 text-amber-700 border border-amber-200',
      author: 'M. Sy',
      role: 'Contrôleur Gestion',
      date: '19/05/2025 14:20',
    },
    {
      id: 5,
      starred: true,
      iconType: 'pdf',
      name: 'Rapport d’avancement hebdo S20',
      category: 'Rapports',
      categoryBg: 'bg-blue-50 text-blue-700',
      ref: 'RAP-HEBDO-020',
      version: 'V1.0',
      status: 'Validé',
      statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      author: 'B. Diatta',
      role: 'Chef Travaux',
      date: '20/05/2025 08:10',
    },
    {
      id: 6,
      starred: false,
      iconType: 'word',
      name: 'PV de réunion de chantier',
      category: 'PV / Réunions',
      categoryBg: 'bg-slate-100 text-slate-700',
      ref: 'PV-CHR-021',
      version: 'V1.0',
      status: 'Validé',
      statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      author: 'B. Diatta',
      role: 'Chef Travaux',
      date: '16/05/2025 11:05',
    },
    {
      id: 7,
      starred: false,
      iconType: 'pdf',
      name: 'Fiche HSE – Plan sécurité',
      category: 'HSE',
      categoryBg: 'bg-red-50 text-red-700',
      ref: 'HSE-PLN-004',
      version: 'V2.0',
      status: 'Validé',
      statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      author: 'S. Camara',
      role: 'Resp. HSE',
      date: '17/05/2025 09:50',
    },
    {
      id: 8,
      starred: false,
      iconType: 'cad',
      name: 'Plans d’architecture Lot 02',
      category: 'Plans',
      categoryBg: 'bg-blue-50 text-blue-700',
      ref: 'ARCH-L02-005',
      version: 'V1.1',
      status: 'En cours',
      statusBg: 'bg-blue-50 text-blue-700 border border-blue-200',
      author: 'O. Kane',
      role: 'Architecte',
      date: '20/05/2025 12:00',
    },
    {
      id: 9,
      starred: false,
      iconType: 'pdf',
      name: 'Attestation assurance décennale',
      category: 'Administratif',
      categoryBg: 'bg-slate-100 text-slate-700',
      ref: 'ADM-ASS-001',
      version: 'V1.0',
      status: 'Expiré',
      statusBg: 'bg-red-50 text-red-700 border border-red-200',
      author: 'Fatou Ba',
      role: 'Admin',
      date: '01/05/2025 09:00',
    },
    {
      id: 10,
      starred: false,
      iconType: 'excel',
      name: 'Suivi des matériaux',
      category: 'Logistique',
      categoryBg: 'bg-emerald-50 text-emerald-700',
      ref: 'MAT-SUIV-010',
      version: 'V2.3',
      status: 'Validé',
      statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      author: 'I. Gueye',
      role: 'Magasinier',
      date: '20/05/2025 07:45',
    },
  ];

  const selectedDoc = documentsList.find(d => d.id === selectedDocId) || documentsList[4];

  return (
    <div className="space-y-6 text-slate-800 font-sans max-w-7xl mx-auto">
      {/* 1. TOP HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {onBackToProject && (
            <button
              onClick={onBackToProject}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1"
            >
              <ArrowLeft size={14} /> Retour à la vue projet 360°
            </button>
          )}
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">GESTION DOCUMENTAIRE</h1>
          <p className="text-xs text-slate-500 font-medium">Centralisez, organisez et suivez tous les documents du projet</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow">
            <Zap size={14} className="text-amber-400" /> Actions rapides <span className="text-[10px]">▼</span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm">
            <Plus size={16} /> Nouveau document
          </button>
          <button className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Download size={14} /> Exporter
          </button>
        </div>
      </div>

      {/* 2. CARTE RÉPERTOIRE PROJET */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-base shadow">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-sm">P-003</span>
              <span className="font-bold text-slate-900 text-sm">Construction du Lycée Technique de Kolda</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mt-0.5">
              <span>Client : <strong>Ministère de l’Éducation Nationale</strong></span>
              <span>Pays : 🇸🇳 <strong>Sénégal</strong></span>
              <span>Directeur Projet : <strong>M. Mamadou Diop</strong></span>
              <span>Date de démarrage : <strong>02/06/2025</strong></span>
              <span>Fin contractuelle : <strong>01/12/2026</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LIGNE DES 5 CARTES KPI DOCS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: TOTAL DOCUMENTS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">TOTAL DOCUMENTS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">1 248</span>
            <span className="text-[10px] text-emerald-600 font-bold">+ 32 ce mois</span>
          </div>
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <FileText size={20} />
          </div>
        </div>

        {/* KPI 2: DOCUMENTS VALIDÉS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">DOCUMENTS VALIDÉS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">892</span>
            <span className="text-[10px] text-emerald-600 font-bold">71,5% <span className="text-slate-400 font-normal">du total</span></span>
          </div>
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* KPI 3: EN ATTENTE DE VALIDATION */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">EN ATTENTE DE VALIDATION</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">186</span>
            <span className="text-[10px] text-amber-600 font-bold">14,9% <span className="text-slate-400 font-normal">du total</span></span>
          </div>
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
            <Clock size={20} />
          </div>
        </div>

        {/* KPI 4: VERSION EN COURS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">VERSION EN COURS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">78</span>
            <span className="text-[10px] text-purple-600 font-bold">6,3% <span className="text-slate-400 font-normal">du total</span></span>
          </div>
          <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
            <Edit size={20} />
          </div>
        </div>

        {/* KPI 5: DOCUMENTS EXPIRÉS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">DOCUMENTS EXPIRÉS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">12</span>
            <span className="text-[10px] text-red-600 font-bold">1,0% <span className="text-slate-400 font-normal">du total</span></span>
          </div>
          <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-red-500/20">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* 4. DEUXIÈME LIGNE : TABLEAU DES DOCUMENTS (7/12) + APERÇU DOCUMENT (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Côté Gauche: Barre de recherche & Tableau Documents (7/12) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Toolbar Recherche & Filtres */}
          <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un document, mot clé, référence..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Filter size={14} /> Filtres <span className="text-[10px]">▼</span>
            </button>
            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-lg">
              Catégories <span className="text-[10px]">▼</span>
            </button>
            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-lg">
              Statut <span className="text-[10px]">▼</span>
            </button>
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
                  <th className="p-3">Modifié le</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {documentsList.map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`cursor-pointer transition ${
                      selectedDocId === doc.id ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Star */}
                    <td className="p-3 text-center">
                      <Star size={14} className={doc.starred ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                    </td>

                    {/* Nom du document */}
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-black text-[9px] ${
                          doc.iconType === 'pdf' ? 'bg-red-100 text-red-700' : doc.iconType === 'excel' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {doc.iconType.toUpperCase()}
                        </span>
                        <span>{doc.name}</span>
                      </div>
                    </td>

                    {/* Catégorie */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.categoryBg}`}>
                        {doc.category}
                      </span>
                    </td>

                    {/* Référence */}
                    <td className="p-3 font-mono text-slate-600">{doc.ref}</td>

                    {/* Version */}
                    <td className="p-3 font-mono font-bold text-slate-800">{doc.version}</td>

                    {/* Statut */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${doc.statusBg}`}>
                        {doc.status}
                      </span>
                    </td>

                    {/* Propriétaire */}
                    <td className="p-3 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center">
                          {doc.author.charAt(0)}
                        </div>
                        <div>
                          <span className="block font-bold text-[10px]">{doc.author}</span>
                          <span className="block text-[9px] text-slate-400">{doc.role}</span>
                        </div>
                      </div>
                    </td>

                    {/* Modifié le */}
                    <td className="p-3 font-mono text-[10px] text-slate-500">{doc.date}</td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400">
                        <button className="hover:text-slate-700"><Download size={14} /></button>
                        <button className="hover:text-slate-700"><MoreHorizontal size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Bas de Tableau */}
            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Affichage :</span>
                <select className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-800">
                  <option>10 par page</option>
                </select>
              </div>

              <div className="flex items-center gap-1 font-bold">
                <span className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center">1</span>
                <span className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center cursor-pointer">2</span>
                <span className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center cursor-pointer">3</span>
                <span className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center cursor-pointer">4</span>
                <span className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center cursor-pointer">5</span>
                <span>...</span>
                <span className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center cursor-pointer">125</span>
              </div>

              <span>1-10 sur 1 248 documents</span>
            </div>
          </div>
        </div>

        {/* Côté Droit: Panneau de Prévisualisation du Document (5/12) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 text-xs">
          {/* Header Panneau Prévisualisation */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 font-black text-xs flex items-center justify-center shadow-sm">
                PDF
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{selectedDoc.name}.pdf</h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                  <span>{selectedDoc.category}</span>
                  <span>·</span>
                  <span>{selectedDoc.ref}</span>
                  <span>·</span>
                  <span>{selectedDoc.version}</span>
                </div>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Validé
            </span>
          </div>

          {/* Onglets du Panneau (Aperçu, Détails, Versions, Workflow, Commentaires) */}
          <div className="flex space-x-4 border-b border-slate-100 text-xs font-bold">
            {['apercu', 'details', 'versions', 'workflow', 'commentaires'].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`pb-2 border-b-2 capitalize transition ${
                  activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {t === 'apercu' ? 'Aperçu' : t === 'details' ? 'Détails' : t === 'versions' ? 'Versions (3)' : t === 'workflow' ? 'Workflow' : 'Commentaires (2)'}
              </button>
            ))}
          </div>

          {/* Aperçu du Document PDF (Visuel Conforme à la maquette) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-inner">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow space-y-4 text-slate-800">
              {/* Header Document PDF */}
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
                    G
                  </div>
                  <span className="font-black text-slate-900 text-xs">GEBAT</span>
                </div>
                <div className="text-right">
                  <h4 className="font-black text-slate-900 text-xs tracking-tight">RAPPORT D'AVANCEMENT HEBDOMADAIRE 520</h4>
                  <span className="text-[9px] text-slate-400 block">Projet : Lycée Technique de Kolda</span>
                </div>
              </div>

              {/* Bloc 1: Synthèse Générale */}
              <div className="space-y-2">
                <h5 className="font-extrabold text-slate-900 text-[11px] uppercase">1. SYNTHÈSE GÉNÉRALE</h5>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="bg-slate-50 p-2 rounded border">
                    <span className="text-slate-400 block text-[9px]">AVANCEMENT PHYSIQUE</span>
                    <span className="font-black text-slate-900 text-xs">62,5%</span>
                    <span className="text-slate-400 block text-[8px]">Objectif : 58,0%</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border">
                    <span className="text-slate-400 block text-[9px]">BUDGET CONSOMMÉ</span>
                    <span className="font-black text-slate-900 text-xs">8,74 Md FCFA</span>
                    <span className="text-slate-400 block text-[8px]">47,9% du budget</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border">
                    <span className="text-slate-400 block text-[9px]">EFFECTIF MOYEN</span>
                    <span className="font-black text-slate-900 text-xs">124</span>
                    <span className="text-slate-400 block text-[8px]">Ouvriers</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border">
                    <span className="text-slate-400 block text-[9px]">JOURS SANS ACCIDENT</span>
                    <span className="font-black text-slate-900 text-xs">28</span>
                    <span className="text-slate-400 block text-[8px]">Objectif : 30 jours</span>
                  </div>
                </div>
              </div>

              {/* Bloc 2: Avancement par lot */}
              <div className="space-y-1.5">
                <h5 className="font-extrabold text-slate-900 text-[11px] uppercase">2. AVANCEMENT PAR LOT</h5>
                <table className="w-full text-left text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b text-slate-600">
                      <th className="p-1">Lot</th>
                      <th className="p-1">Description</th>
                      <th className="p-1 text-center">Avancement (%)</th>
                      <th className="p-1 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="p-1 font-bold">01</td><td className="p-1">Terrassements</td><td className="p-1 text-center">70,2%</td><td className="p-1 text-right text-emerald-600 font-bold">En avance</td></tr>
                    <tr><td className="p-1 font-bold">02</td><td className="p-1">Fondations</td><td className="p-1 text-center">65,0%</td><td className="p-1 text-right text-emerald-600 font-bold">En avance</td></tr>
                    <tr><td className="p-1 font-bold">03</td><td className="p-1">Gros œuvre</td><td className="p-1 text-center">58,8%</td><td className="p-1 text-right text-emerald-600 font-bold">Conforme</td></tr>
                    <tr><td className="p-1 font-bold">04</td><td className="p-1">Charpente & Couverture</td><td className="p-1 text-center">35,4%</td><td className="p-1 text-right text-red-600 font-bold">En retard</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Bloc 3: Commentaires */}
              <div className="space-y-1 text-[9px] text-slate-600">
                <h5 className="font-extrabold text-slate-900 text-[11px] uppercase">3. COMMENTAIRES</h5>
                <p>• Bonne progression des terrassements et fondations.</p>
                <p>• Des retards observés sur la charpente & couverture et les menuiseries liés aux délais de livraison.</p>
              </div>
            </div>
          </div>

          {/* Boutons d'Action bas de panneau (Télécharger, Partager) */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs shadow-sm flex items-center gap-1.5">
              <Download size={14} /> Télécharger
            </button>

            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs shadow-sm flex items-center gap-1.5">
              <Share2 size={14} /> Partager
            </button>

            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 p-2 rounded-lg text-xs shadow-sm">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* 5. TROISIÈME LIGNE : ESPACE DE STOCKAGE UTILISÉ */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-bold">
        <span className="text-slate-700 uppercase tracking-wider text-[11px]">ESPACE DE STOCKAGE UTILISÉ</span>
        <div className="flex-1 max-w-xl flex items-center gap-3">
          <span className="text-slate-900 font-mono text-xs whitespace-nowrap">128,6 Go / 250 Go (51,4%)</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '51.4%' }}></div>
          </div>
        </div>
        <button className="text-blue-600 hover:underline text-xs font-extrabold flex items-center gap-1">
          Gérer le stockage ➔
        </button>
      </div>

    </div>
  );
};
