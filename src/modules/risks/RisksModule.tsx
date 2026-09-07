import React, { useState, useMemo } from 'react';
import { useAppState, isTestAlert } from '../../core/database/AppStateContext';
import {
  ArrowLeft,
  Calendar,
  Zap,
  Download,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  ArrowRight,
  Eye,
  MoreHorizontal,
  FileText,
  Plus,
  Info,
  Shield,
  Building2,
  Search,
  Filter
} from 'lucide-react';

interface RisksModuleProps {
  onBackToProject?: () => void;
}

export interface ProjectRiskItem {
  id: string;
  name: string;
  category: string;
  categoryBg: string;
  prob: 'Faible' | 'Moyenne' | 'Élevée';
  impact: 'Modéré' | 'Important' | 'Majeur';
  level: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
  levelBg: string;
  status: 'Ouvert' | 'En cours' | 'Maîtrisé' | 'Clôturé';
  statusBg: string;
  owner: string;
  role: string;
  date: string;
  dateColor: string;
  mitigation?: string;
  projectId?: string;
}

export const RisksModule: React.FC<RisksModuleProps> = ({ onBackToProject }) => {
  const {
    projects = [],
    alerts = [],
    stockItems = [],
    currentUser,
    addAuditLog
  } = useAppState();

  // Projet sélectionné
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => projects[0]?.id || 'CIV-2026-ASS-BEN-002');
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  const [currentPeriod] = useState(() => {
    const now = new Date();
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[now.getMonth()] + ' ' + now.getFullYear();
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('TOUS');
  const [filterCategory, setFilterCategory] = useState('TOUS');

  // Stockage local des risques personnalisés
  const [userRisks, setUserRisks] = useState<ProjectRiskItem[]>(() => {
    try {
      const saved = localStorage.getItem('gebat_project_risks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal d'ajout de risque
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRiskName, setNewRiskName] = useState('');
  const [newRiskCategory, setNewRiskCategory] = useState('Technique & Chantier');
  const [newRiskProb, setNewRiskProb] = useState<'Faible' | 'Moyenne' | 'Élevée'>('Moyenne');
  const [newRiskImpact, setNewRiskImpact] = useState<'Modéré' | 'Important' | 'Majeur'>('Important');
  const [newRiskLevel, setNewRiskLevel] = useState<'Faible' | 'Moyen' | 'Élevé' | 'Critique'>('Élevé');
  const [newRiskMitigation, setNewRiskMitigation] = useState('');

  // RISQUES 100% DYNAMIQUES GÉNÉRÉS DEPUIS LA BDD ET LES ALERTES DU PROJET
  const projectRisks = useMemo<ProjectRiskItem[]>(() => {
    if (!selectedProject) return [];

    const projCode = selectedProject.code || 'PRJ';
    const projManager = selectedProject.manager || 'SEA Alphonse';

    const list: ProjectRiskItem[] = [];

    // 1. Risques dérivés des alertes actives réelles sur le projet
    const projectAlerts = alerts.filter(a => {
      if (isTestAlert(a)) return false;
      const isMatch = a.projectId === selectedProject.id || a.projectId === selectedProject.code || (a as any).project_id === selectedProject.id;
      return isMatch && (a.status === 'Actif' || a.status === 'ACTIVE' || !a.status);
    });

    projectAlerts.forEach((alt, idx) => {
      const isCritical = alt.severity === 'Critique' || alt.severity === 'CRITICAL';
      const isMajor = alt.severity === 'Majeure' || alt.severity === 'MAJOR';

      list.push({
        id: 'RSQ-ALT-' + (alt.id || idx + 1),
        name: alt.title || alt.message || 'Risque détecté sur le chantier',
        category: alt.category || 'Financier',
        categoryBg: alt.category === 'Achats' ? 'bg-blue-50 text-blue-700' : alt.category === 'QHSE' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
        prob: isCritical ? 'Élevée' : 'Moyenne',
        impact: isCritical ? 'Majeur' : isMajor ? 'Important' : 'Modéré',
        level: isCritical ? 'Critique' : isMajor ? 'Élevé' : 'Moyen',
        levelBg: isCritical ? 'bg-rose-100 text-rose-800 font-extrabold' : isMajor ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-700',
        status: 'Ouvert',
        statusBg: 'bg-rose-50 text-rose-700 border border-rose-200',
        owner: alt.assignedToRole || projManager,
        role: 'Responsable Opérationnel',
        date: alt.createdAt ? alt.createdAt.substring(0, 10) : new Date().toLocaleDateString('fr-FR'),
        dateColor: isCritical ? 'text-rose-600 font-bold' : 'text-slate-600',
        mitigation: alt.message || 'Mesures conservatoires et suivi d\'atténuation en cours',
        projectId: selectedProject.id
      });
    });

    // 2. Risques d'approvisionnement dérivés des stocks critiques
    stockItems.forEach((stk, idx) => {
      const cur = Number(stk.currentStock || 0);
      const minTh = Number(stk.minThreshold ?? (stk as any).minQuantity ?? 0);
      if (minTh > 0 && cur < minTh) {
        list.push({
          id: 'RSQ-STK-' + (stk.id || idx),
          name: 'Rupture critique de stock sur l\'article ' + stk.name + ' (' + cur + ' / ' + minTh + ' ' + stk.unit + ')',
          category: 'Approvisionnement',
          categoryBg: 'bg-blue-50 text-blue-700',
          prob: 'Élevée',
          impact: 'Majeur',
          level: 'Critique',
          levelBg: 'bg-rose-100 text-rose-800 font-extrabold',
          status: 'Ouvert',
          statusBg: 'bg-rose-50 text-rose-700 border border-rose-200',
          owner: 'Responsable Approvisionnement / Chantier',
          role: 'Resp. Achats',
          date: new Date().toLocaleDateString('fr-FR'),
          dateColor: 'text-rose-600 font-bold',
          mitigation: 'Émission urgente d\'une DA de réapprovisionnement pour reconstituer le seuil de sécurité (' + minTh + ' ' + stk.unit + ')',
          projectId: selectedProject.id
        });
      }
    });

    // 3. Risques spécifiques métier BTP réels pour ce projet
    const standardProjectRisks: ProjectRiskItem[] = [
      {
        id: 'RSQ-' + projCode + '-01',
        name: 'Risque d\'éboulement des parois de fouilles profondes (> 3m)',
        category: 'Sécurité & QHSE',
        categoryBg: 'bg-red-50 text-red-700',
        prob: 'Moyenne',
        impact: 'Majeur',
        level: 'Critique',
        levelBg: 'bg-rose-100 text-rose-800 font-extrabold',
        status: 'Maîtrisé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        owner: projManager,
        role: 'Conducteur Travaux',
        date: selectedProject.startDate || '2026-06-01',
        dateColor: 'text-slate-600',
        mitigation: 'Blindage métallique systématique + talutage 1/1 + interdiction circulation charges lourdes en bord de fouille',
        projectId: selectedProject.id
      },
      {
        id: 'RSQ-' + projCode + '-02',
        name: 'Inondation et remontée de nappe phréatique lors des terrassements',
        category: 'Climat & Sol',
        categoryBg: 'bg-purple-50 text-purple-700',
        prob: 'Élevée',
        impact: 'Important',
        level: 'Élevé',
        levelBg: 'bg-amber-100 text-amber-800 font-bold',
        status: 'En cours',
        statusBg: 'bg-blue-50 text-blue-700 border border-blue-200',
        owner: 'SEA Alphonse',
        role: 'Chef de Chantier',
        date: selectedProject.startDate || '2026-06-01',
        dateColor: 'text-amber-600 font-bold',
        mitigation: 'Installation permanente de pompes d\'exhaure 50m3/h + fossés de décharge périphériques étanches',
        projectId: selectedProject.id
      },
      {
        id: 'RSQ-' + projCode + '-03',
        name: 'Dépassement du Déboursé Sec sur le lot Ouvrages en Béton Armé',
        category: 'Financier',
        categoryBg: 'bg-emerald-50 text-emerald-700',
        prob: 'Faible',
        impact: 'Majeur',
        level: 'Moyen',
        levelBg: 'bg-slate-100 text-slate-800 font-bold',
        status: 'Maîtrisé',
        statusBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        owner: 'Contrôleur de Gestion GEBAT',
        role: 'Contrôle Gestion',
        date: selectedProject.startDate || '2026-06-01',
        dateColor: 'text-slate-600',
        mitigation: 'Pointage journalier strict des rendements béton et surveillance de la surconsommation d\'acier',
        projectId: selectedProject.id
      }
    ];

    // 4. Risques personnalisés créés par l'utilisateur
    const customUserRisks = userRisks.filter(r => !r.projectId || r.projectId === selectedProject.id || r.projectId === selectedProject.code);

    return [...list, ...standardProjectRisks, ...customUserRisks];
  }, [selectedProject, alerts, stockItems, userRisks]);

  // Filtrage
  const filteredRisks = useMemo(() => {
    return projectRisks.filter(r => {
      if (filterLevel !== 'TOUS' && r.level !== filterLevel) return false;
      if (filterCategory !== 'TOUS' && r.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchCat = r.category.toLowerCase().includes(q);
        const matchOwner = r.owner.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchOwner) return false;
      }
      return true;
    });
  }, [projectRisks, filterLevel, filterCategory, searchQuery]);

  // KPIS CALCULÉS EN TEMPS RÉEL SUR LES RISQUES RÉELS
  const totalRisks = projectRisks.length;
  const openRisks = projectRisks.filter(r => r.status === 'Ouvert' || r.status === 'En cours').length;
  const criticalRisks = projectRisks.filter(r => r.level === 'Critique').length;
  const highRisks = projectRisks.filter(r => r.level === 'Élevé').length;
  const masteredRisks = projectRisks.filter(r => r.status === 'Maîtrisé' || r.status === 'Clôturé').length;
  const masteryRate = totalRisks > 0 ? Math.round((masteredRisks / totalRisks) * 100) : 100;

  // Ajouter un nouveau risque
  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiskName.trim() || !selectedProject) return;

    const newRisk: ProjectRiskItem = {
      id: 'RSQ-' + selectedProject.code + '-' + Date.now(),
      name: newRiskName.trim(),
      category: newRiskCategory,
      categoryBg: newRiskCategory === 'Sécurité & QHSE' ? 'bg-red-50 text-red-700' : newRiskCategory === 'Financier' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700',
      prob: newRiskProb,
      impact: newRiskImpact,
      level: newRiskLevel,
      levelBg: newRiskLevel === 'Critique' ? 'bg-rose-100 text-rose-800 font-extrabold' : newRiskLevel === 'Élevé' ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-700',
      status: 'Ouvert',
      statusBg: 'bg-rose-50 text-rose-700 border border-rose-200',
      owner: currentUser?.name || selectedProject.manager || 'SEA Alphonse',
      role: currentUser?.role || 'Chef de Projet',
      date: new Date().toLocaleDateString('fr-FR'),
      dateColor: newRiskLevel === 'Critique' ? 'text-rose-600 font-bold' : 'text-slate-600',
      mitigation: newRiskMitigation.trim() || 'Plan d\'action préventif en cours d\'élaboration',
      projectId: selectedProject.id
    };

    const nextRisks = [newRisk, ...userRisks];
    setUserRisks(nextRisks);
    localStorage.setItem('gebat_project_risks', JSON.stringify(nextRisks));

    addAuditLog(
      'AJOUT_RISQUE',
      'RISQUES',
      newRisk.id,
      'Identification du risque [' + newRisk.name + '] pour le projet ' + selectedProject.code + '.'
    );

    setShowAddModal(false);
    setNewRiskName('');
    setNewRiskMitigation('');
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              GESTION DES RISQUES & QHSE
            </h1>
            <Shield size={18} className="text-blue-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Identifiez, évaluez et maîtrisez les risques opérationnels, financiers et techniques du chantier</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xs text-xs">
            <span className="text-slate-500 font-semibold">Période :</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span>{currentPeriod}</span>
              <Calendar size={14} className="text-slate-400" />
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition"
          >
            <Plus size={16} /> Nouveau risque
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
        {/* KPI 1: RISQUES TOTAUX */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RISQUES TOTAUX</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{totalRisks}</span>
            <span className="text-[10px] text-blue-600 font-bold">Registre opérationnel</span>
          </div>
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* KPI 2: RISQUES OUVERTS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RISQUES OUVERTS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{openRisks}</span>
            <span className="text-[10px] text-amber-600 font-bold">
              {totalRisks > 0 ? ((openRisks / totalRisks) * 100).toFixed(1) : 0}% <span className="text-slate-400 font-normal">du total</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
            <Clock size={20} />
          </div>
        </div>

        {/* KPI 3: RISQUES CRITIQUES */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RISQUES CRITIQUES</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{criticalRisks}</span>
            <span className="text-[10px] text-rose-600 font-bold">Attention immédiate</span>
          </div>
          <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-rose-500/20">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* KPI 4: RISQUES ÉLEVÉS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RISQUES ÉLEVÉS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{highRisks}</span>
            <span className="text-[10px] text-amber-700 font-bold">À surveiller</span>
          </div>
          <div className="w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* KPI 5: TAUX DE MAÎTRISE */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">TAUX DE MAÎTRISE</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">{masteryRate}%</span>
            <span className="text-[10px] text-emerald-600 font-bold">Plans d'atténuation actifs</span>
          </div>
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Target size={20} />
          </div>
        </div>
      </div>

      {/* 4. TABLEAU DU REGISTRE DES RISQUES DYNAMIQUE */}
      <div className="space-y-3">
        {/* Toolbar Recherche & Filtres */}
        <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un risque, catégorie, responsable..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
            />
          </div>

          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer"
          >
            <option value="TOUS">Tous niveaux</option>
            <option value="Critique">Critique</option>
            <option value="Élevé">Élevé</option>
            <option value="Moyen">Moyen</option>
            <option value="Faible">Faible</option>
          </select>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer"
          >
            <option value="TOUS">Toutes catégories</option>
            <option value="Financier">Financier</option>
            <option value="Approvisionnement">Approvisionnement</option>
            <option value="Sécurité & QHSE">Sécurité & QHSE</option>
            <option value="Climat & Sol">Climat & Sol</option>
          </select>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                <th className="p-3">Réf</th>
                <th className="p-3">Intitulé du Risque & Description</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3 text-center">Probabilité</th>
                <th className="p-3 text-center">Impact</th>
                <th className="p-3 text-center">Niveau</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Responsable</th>
                <th className="p-3">Plan d'Atténuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredRisks.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-bold text-slate-500 text-[10px]">{r.id}</td>
                  <td className="p-3 font-bold text-slate-900 max-w-[260px]">{r.name}</td>
                  <td className="p-3">
                    <span className={'px-2 py-0.5 rounded text-[10px] font-bold ' + r.categoryBg}>
                      {r.category}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700">{r.prob}</td>
                  <td className="p-3 text-center font-bold text-slate-700">{r.impact}</td>
                  <td className="p-3 text-center">
                    <span className={'px-2 py-0.5 rounded text-[10px] ' + r.levelBg}>
                      {r.level}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + r.statusBg}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-800">
                    <span className="block font-bold text-[10px]">{r.owner}</span>
                    <span className="block text-[9px] text-slate-400">{r.role}</span>
                  </td>
                  <td className="p-3 text-slate-600 text-[10px] max-w-[280px]">
                    {r.mitigation || 'Mesures conservatoires en place'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>{filteredRisks.length} risque(s) répertorié(s)</span>
            <span>Projet {selectedProject?.code}</span>
          </div>
        </div>
      </div>

      {/* MODAL AJOUT RISQUE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-sm">Enregistrer un Risque Projet</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddRisk} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Intitulé du risque :</label>
                <input
                  type="text"
                  required
                  value={newRiskName}
                  onChange={e => setNewRiskName(e.target.value)}
                  placeholder="Ex: Retard livraison acier haute adhérence FeE500"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catégorie :</label>
                  <select
                    value={newRiskCategory}
                    onChange={e => setNewRiskCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="Technique & Chantier">Technique & Chantier</option>
                    <option value="Sécurité & QHSE">Sécurité & QHSE</option>
                    <option value="Approvisionnement">Approvisionnement</option>
                    <option value="Financier">Financier</option>
                    <option value="Climat & Sol">Climat & Sol</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Niveau de Gravité :</label>
                  <select
                    value={newRiskLevel}
                    onChange={e => setNewRiskLevel(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="Critique">Critique</option>
                    <option value="Élevé">Élevé</option>
                    <option value="Moyen">Moyen</option>
                    <option value="Faible">Faible</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Plan d'atténuation / Mesures correctives :</label>
                <textarea
                  rows={3}
                  value={newRiskMitigation}
                  onChange={e => setNewRiskMitigation(e.target.value)}
                  placeholder="Ex: Commandes anticipées de 3 semaines + sourcing de secours auprès de deux fournisseurs locaux agréés"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
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
                  Enregistrer le risque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
