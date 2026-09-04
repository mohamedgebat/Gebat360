import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { CostNature } from '../../types';
import {
  DollarSign, History, Layers, Plus, CheckCircle2, AlertTriangle, ShieldCheck,
  TrendingUp, ArrowRight, ArrowLeft, UserCheck, Calendar, FileText, Calculator, RefreshCw, X, Eye
} from 'lucide-react';

// Structure d'une ressource élémentaire du Déboursé Sec (1 m³ béton = Matériaux + MO + Matériel + Transport + Pertes)
interface ResourceComponent {
  id: string;
  nature: CostNature;
  designation: string;
  unit: string;
  theoreticalQty: number; // Quantité théorique pour 1 unité d'ouvrage
  unitPrice: number; // Prix unitaire ressource FCFA
  yieldRate: number; // Rendement (ex: 1.05 pour +5% de pertes)
  theoreticalCost: number; // Coût théorique calculé = Qty * Price * Yield
  actualCost: number; // Coût réel comptabilisé
  priceSource: string; // Source du prix (Fournisseur, Mercuriale, Contrat)
  lastUpdated: string;
}

// Structure d'une version budgétaire non-écrasable (V0, V1, V2...)
interface BudgetVersionItem {
  version: string; // V0, V1, V2...
  createdAt: string;
  createdBy: string;
  approver: string;
  justification: string;
  totalInitial: number;
  totalRevised: number;
  forecast: number;
  diffFromPrevious: number; // Écart par rapport à la version précédente
  status: 'Approuvé' | 'En attente' | 'Historisé';
}

export interface BudgetModuleProps {
  onBackToProject?: () => void;
  initialProjectId?: string;
}

export const BudgetModule: React.FC<BudgetModuleProps> = ({
  onBackToProject,
  initialProjectId
}) => {
  const { projects, updateProject, addAuditLog, currentUser } = useAppState();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return initialProjectId || projects[0]?.id || 'CIV-2026-ASS-001';
  });

  useEffect(() => {
    if (initialProjectId && initialProjectId !== selectedProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || projects[0];

  const [activeTab, setActiveTab] = useState<'versions' | 'debourse'>('versions');

  // HISTORIQUE PAR DÉFAUT DES VERSIONS BUDGÉTAIRES (V0 -> V1)
  const defaultBudgetVersions = useMemo<BudgetVersionItem[]>(() => {
    if (!selectedProject) return [];
    
    const initialContract = Number(selectedProject.contractAmount || 0);
    const currentRevisedBudget = Number(selectedProject.revisedBudget || selectedProject.initialBudget || initialContract);
    const initialEstimateV0 = Math.round(initialContract * 0.88); // Déboursé sec initial estimé à 88% du marché

    return [
      {
        version: 'V0',
        createdAt: selectedProject.startDate || '2026-01-15',
        createdBy: 'SEA Alphonse (Directeur Projet)',
        approver: 'Direction Générale GEBAT',
        justification: 'Budget initial de démarrage validé au Comité de Validation Gate 6',
        totalInitial: initialEstimateV0,
        totalRevised: initialEstimateV0,
        forecast: initialEstimateV0,
        diffFromPrevious: 0,
        status: 'Historisé',
      },
      {
        version: 'V1',
        createdAt: '2026-04-15',
        createdBy: 'N’Guessan Amenan (Cost Controller)',
        approver: 'Direction Technique & DG',
        justification: 'Version 1 Réelle — Intégration du Décompte Subi (DS) révisé selon métrés réels terrain',
        totalInitial: initialEstimateV0,
        totalRevised: currentRevisedBudget,
        forecast: Math.round(currentRevisedBudget * 1.01),
        diffFromPrevious: currentRevisedBudget - initialEstimateV0,
        status: 'Approuvé',
      }
    ];
  }, [selectedProject]);

  // État persistant des versions budgétaires
  const [customVersionsMap, setCustomVersionsMap] = useState<Record<string, BudgetVersionItem[]>>(() => {
    try {
      const saved = localStorage.getItem('gebat_custom_budget_versions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const budgetVersions = useMemo<BudgetVersionItem[]>(() => {
    if (!selectedProject) return [];
    const custom = customVersionsMap[selectedProject.id] || customVersionsMap[selectedProject.code];
    if (custom && custom.length > 0) return custom;
    return defaultBudgetVersions;
  }, [selectedProject, customVersionsMap, defaultBudgetVersions]);

  // Formulaire de création d'une nouvelle version budgétaire (V2...)
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionJustification, setNewVersionJustification] = useState('');
  const [newVersionAmount, setNewVersionAmount] = useState(() => {
    return selectedProject ? Math.round(Number(selectedProject.revisedBudget || selectedProject.initialBudget || 490000000) * 1.05) : 490000000;
  });
  const [newVersionAuthor, setNewVersionAuthor] = useState(() => currentUser?.name || 'N’Guessan Amenan');
  const [newVersionApprover, setNewVersionApprover] = useState('Direction Technique & DG');

  // MOTEUR DE DÉBOURSÉ SEC — BASE PAR DÉFAUT (Composition du coût 1 m³ Béton B25)
  const defaultResources: ResourceComponent[] = [
    {
      id: 'res-1',
      nature: 'MAT',
      designation: 'Ciment CEM II 42.5 CPA (Sacs 50kg)',
      unit: 'kg',
      theoreticalQty: 350,
      unitPrice: 110, // 110 FCFA/kg (5500 FCFA le sac)
      yieldRate: 1.03, // 3% de pertes
      theoreticalCost: 39655,
      actualCost: 40200,
      priceSource: 'Fournisseur SOCIMAC (Contrat Cadre)',
      lastUpdated: '2026-04-10',
    },
    {
      id: 'res-2',
      nature: 'MAT',
      designation: 'Sable de Lagune Tamisé 0/4',
      unit: 'm3',
      theoreticalQty: 0.45,
      unitPrice: 12000,
      yieldRate: 1.05, // 5% de perte au sol
      theoreticalCost: 5670,
      actualCost: 5800,
      priceSource: 'Carrière San Pedro / Abidjan',
      lastUpdated: '2026-04-05',
    },
    {
      id: 'res-3',
      nature: 'MAT',
      designation: 'Gravier Concassé 5/15',
      unit: 'm3',
      theoreticalQty: 0.80,
      unitPrice: 18000,
      yieldRate: 1.04,
      theoreticalCost: 14976,
      actualCost: 15100,
      priceSource: 'Mercuriale Nationale BTP',
      lastUpdated: '2026-03-28',
    },
    {
      id: 'res-4',
      nature: 'MO',
      designation: "Main-d'œuvre Équipe Coulage (Maçons & Manœuvres)",
      unit: 'h/m3',
      theoreticalQty: 2.5,
      unitPrice: 2500, // 2500 FCFA/h
      yieldRate: 1.00,
      theoreticalCost: 6250,
      actualCost: 6500,
      priceSource: 'Barème Salarial GEBAT',
      lastUpdated: '2026-04-01',
    },
    {
      id: 'res-5',
      nature: 'MTL',
      designation: 'Bétonnière 500L & Vibreur à Béton (Amortissement)',
      unit: 'h/m3',
      theoreticalQty: 0.5,
      unitPrice: 8000,
      yieldRate: 1.00,
      theoreticalCost: 4000,
      actualCost: 4100,
      priceSource: 'Tarif Amortissement Matériel Interne',
      lastUpdated: '2026-02-15',
    },
    {
      id: 'res-6',
      nature: 'TRS',
      designation: 'Transport & Toupie Toupie Béton (Base-vie vers ouvrage)',
      unit: 'm3',
      theoreticalQty: 1.0,
      unitPrice: 4500,
      yieldRate: 1.00,
      theoreticalCost: 4500,
      actualCost: 4500,
      priceSource: 'Prestataire Transporteur Logistique',
      lastUpdated: '2026-04-12',
    }
  ];

  // État persistant des ressources de déboursé
  const [resourcesMap, setResourcesMap] = useState<Record<string, ResourceComponent[]>>(() => {
    try {
      const saved = localStorage.getItem('gebat_debourse_resources');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const resources = useMemo<ResourceComponent[]>(() => {
    if (!selectedProject) return defaultResources;
    const projectRes = resourcesMap[selectedProject.id] || resourcesMap[selectedProject.code];
    return projectRes && projectRes.length > 0 ? projectRes : defaultResources;
  }, [selectedProject, resourcesMap]);

  // Formulaire d'ajout de ressource au déboursé sec
  const [newResDesignation, setNewResDesignation] = useState('');
  const [newResNature, setNewResNature] = useState<CostNature>('MAT');
  const [newResUnit, setNewResUnit] = useState('kg');
  const [newResQty, setNewResQty] = useState(1);
  const [newResPrice, setNewResPrice] = useState(1000);
  const [newResYield, setNewResYield] = useState(1.03);
  const [newResSource, setNewResSource] = useState('Bordereau Prix Cadre');

  const addResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResDesignation || !selectedProject) return;

    const calcCost = Math.round(Number(newResQty) * Number(newResPrice) * Number(newResYield));
    const newRes: ResourceComponent = {
      id: `res-${Date.now()}`,
      nature: newResNature,
      designation: newResDesignation,
      unit: newResUnit,
      theoreticalQty: Number(newResQty),
      unitPrice: Number(newResPrice),
      yieldRate: Number(newResYield),
      theoreticalCost: calcCost,
      actualCost: calcCost,
      priceSource: newResSource,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    const updated = [...resources, newRes];
    const newMap = {
      ...resourcesMap,
      [selectedProject.id]: updated,
      [selectedProject.code]: updated
    };
    setResourcesMap(newMap);
    try {
      localStorage.setItem('gebat_debourse_resources', JSON.stringify(newMap));
    } catch (err) {
      console.error(err);
    }
    setNewResDesignation('');
  };

  // Calculs Moteur Déboursé
  const totalTheoreticalCostPerUnit = useMemo(() => resources.reduce((s, r) => s + r.theoreticalCost, 0), [resources]);
  const totalActualCostPerUnit = useMemo(() => resources.reduce((s, r) => s + r.actualCost, 0), [resources]);
  const ecartDeboursePerUnit = totalTheoreticalCostPerUnit - totalActualCostPerUnit;

  // Soumission d'une nouvelle version (V2, V3...) sans écrasement avec persistance et mise à jour réactive
  const handleCreateNewVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionJustification || !selectedProject) return;

    const previousVersion = budgetVersions[budgetVersions.length - 1];
    const prevAmount = previousVersion ? previousVersion.totalRevised : Number(selectedProject.revisedBudget || 0);
    const diff = Number(newVersionAmount) - Number(prevAmount);

    const updatedPrevious = budgetVersions.map(v => ({ ...v, status: 'Historisé' as const }));
    const newVer: BudgetVersionItem = {
      version: `V${budgetVersions.length}`,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: newVersionAuthor || currentUser?.name || 'Cost Controller',
      approver: newVersionApprover || 'Direction Technique & DG',
      justification: newVersionJustification,
      totalInitial: budgetVersions[0]?.totalInitial || Number(newVersionAmount),
      totalRevised: Number(newVersionAmount),
      forecast: Math.round(Number(newVersionAmount) * 1.01),
      diffFromPrevious: diff,
      status: 'Approuvé',
    };

    const newVersionsList = [...updatedPrevious, newVer];
    const newMap = {
      ...customVersionsMap,
      [selectedProject.id]: newVersionsList,
      [selectedProject.code]: newVersionsList
    };

    setCustomVersionsMap(newMap);
    try {
      localStorage.setItem('gebat_custom_budget_versions', JSON.stringify(newMap));
    } catch (err) {
      console.error(err);
    }

    updateProject(selectedProject.id, {
      revisedBudget: Number(newVersionAmount),
    });

    addAuditLog(
      `CREATION_VERSION_BUDGET_${newVer.version}`,
      'BUDGET',
      selectedProject.code,
      `Nouvelle version ${newVer.version} créée avec un budget révisé de ${Number(newVersionAmount).toLocaleString('fr-FR')} FCFA (${diff >= 0 ? '+' : ''}${diff.toLocaleString('fr-FR')} FCFA). Justification: ${newVersionJustification}`
    );

    setShowNewVersionModal(false);
    setNewVersionJustification('');
    alert(`✅ Version ${newVer.version} révisée (${Number(newVersionAmount).toLocaleString('fr-FR')} FCFA) créée et rattachée avec succès au budget de ${selectedProject.code} !`);
  };

  const currentActiveBudget = budgetVersions[budgetVersions.length - 1];

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Header Module Budget / Déboursé */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          {onBackToProject && (
            <button
              onClick={onBackToProject}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1.5 cursor-pointer transition"
            >
              <ArrowLeft size={13} /> Retour à la vue projet 360°
            </button>
          )}
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Gestion Budgétaire & Moteur de Déboursé Sec</h1>
          <p className="text-slate-500 text-xs mt-0.5">Historisation stricte des versions (V0 → V1 → V2) & Calcul théorique vs réel par ressource</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-600 text-xs">Projet :</span>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* SYNTHÈSE DES TROIS INDICATEURS CLÉS (BUDGET V0 / RÉVISÉ / FORECAST) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* BUDGET V0 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Budget V0 (Initial Validé)</span>
            <ShieldCheck size={18} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono pt-1">
            {budgetVersions[0].totalInitial.toLocaleString()} FCFA
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Invariable — Validé au Gate 6 de démarrage</div>
        </div>

        {/* BUDGET RÉVISÉ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Budget Révisé Courant ({currentActiveBudget.version})</span>
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono pt-1">
            {currentActiveBudget.totalRevised.toLocaleString()} FCFA
          </div>
          <div className="text-[10px] text-emerald-700 font-bold">
            Écart / V0 : {(currentActiveBudget.totalRevised - budgetVersions[0].totalInitial > 0 ? '+' : '') + (currentActiveBudget.totalRevised - budgetVersions[0].totalInitial).toLocaleString()} FCFA
          </div>
        </div>

        {/* FORECAST */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Forecast (Prévision Économique)</span>
            <TrendingUp size={18} className="text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-900 font-mono pt-1">
            {currentActiveBudget.forecast.toLocaleString()} FCFA
          </div>
          <div className="text-[10px] text-purple-700 font-medium">Basé sur le coût réel à la date + engagement WBS</div>
        </div>
      </div>

      {/* BOUTONS D'ONGLETS PRINCIPAUX */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('versions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition ${
            activeTab === 'versions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History size={16} />
          <span>Historique & Versions de Budget (V0 → V1 → V2)</span>
        </button>

        <button
          onClick={() => setActiveTab('debourse')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition ${
            activeTab === 'debourse'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calculator size={16} />
          <span>Moteur Déboursé Sec (Ressources & Coût Théorique vs Réel)</span>
        </button>
      </div>

      {/* SECTION 1 : HISTORIQUE ET VERSIONS DE BUDGET (SANS ÉCRASEMENT SILENCIEUX) */}
      {activeTab === 'versions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <History size={18} className="text-blue-600" /> Traçabilité Stricte des Versions Budgétaires
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Le budget ne peut jamais être écrasé silencieusement. Toute modification génère une nouvelle version révisée.</p>
            </div>

            <button
              onClick={() => setShowNewVersionModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-sm text-xs"
            >
              <Plus size={16} /> Créer une Nouvelle Version (V{budgetVersions.length})
            </button>
          </div>

          {/* Tableau de l'Historique des Versions */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3">Version</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Auteur</th>
                  <th className="p-3">Approbateur</th>
                  <th className="p-3">Justification / Motif de la Révision</th>
                  <th className="p-3 text-right">Budget Révisé Total</th>
                  <th className="p-3 text-right">Écart / Version Précédente</th>
                  <th className="p-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {budgetVersions.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-black text-blue-600 text-sm">{v.version}</td>
                    <td className="p-3 font-mono text-slate-500">{v.createdAt}</td>
                    <td className="p-3 font-bold text-slate-800">{v.createdBy}</td>
                    <td className="p-3 text-slate-700 font-semibold">{v.approver}</td>
                    <td className="p-3 font-semibold text-slate-800 max-w-xs">{v.justification}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-900">{v.totalRevised.toLocaleString()} FCFA</td>
                    <td className={`p-3 text-right font-mono font-bold ${v.diffFromPrevious > 0 ? 'text-rose-600' : v.diffFromPrevious < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {v.diffFromPrevious === 0 ? '—' : (v.diffFromPrevious > 0 ? '+' : '') + v.diffFromPrevious.toLocaleString() + ' FCFA'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${v.status === 'Approuvé' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2 : MOTEUR DE DÉBOURSÉ SEC (DÉCOMPOSITION 1 M³ BÉTON) */}
      {activeTab === 'debourse' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Calculator size={18} className="text-emerald-600" /> Moteur de Déboursé Sec — Décomposition d'Ouvrage
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Exemple d'Ouvrage Élementaire : <strong>1 m³ de Béton B25</strong> (Calculé à partir des ressources)</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-right">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Coût Théorique Total / m³ :</span>
              <span className="text-base font-black text-emerald-700 font-mono">{totalTheoreticalCostPerUnit.toLocaleString()} FCFA / m³</span>
            </div>
          </div>

          {/* Formulaire d'ajout de ressource au déboursé */}
          <form onSubmit={addResource} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs">Ajouter une ressource composante au déboursé :</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Désignation Ressource *</label>
                <input
                  type="text"
                  placeholder="ex: Adjuvant Plastifiant"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  value={newResDesignation}
                  onChange={e => setNewResDesignation(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Nature de Coût</label>
                <select
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  value={newResNature}
                  onChange={e => setNewResNature(e.target.value as CostNature)}
                >
                  <option value="MAT">MAT — Matériaux</option>
                  <option value="MO">MO — Main-d'œuvre</option>
                  <option value="MTL">MTL — Matériel</option>
                  <option value="TRS">TRS — Transport</option>
                  <option value="ST">ST — Sous-traitance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Quantité Théorique & Unité</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    value={newResQty}
                    onChange={e => setNewResQty(Number(e.target.value))}
                  />
                  <input
                    type="text"
                    className="w-16 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center"
                    value={newResUnit}
                    onChange={e => setNewResUnit(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Prix Unitaire FCFA</label>
                <input
                  type="number"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  value={newResPrice}
                  onChange={e => setNewResPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold mr-1">Rendement / Perte :</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 p-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold"
                    value={newResYield}
                    onChange={e => setNewResYield(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-slate-400 ml-1">(ex: 1.05 = +5% pertes)</span>
                </div>
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-1"
              >
                <Plus size={14} /> Ajouter la Ressource au Moteur
              </button>
            </div>
          </form>

          {/* Tableau Détaillé du Déboursé Sec (Ressources & Coût Théorique vs Réel) */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3">Nature</th>
                  <th className="p-3">Désignation de la Ressource</th>
                  <th className="p-3 text-right">Qté Théorique</th>
                  <th className="p-3 text-right">Prix Unitaire</th>
                  <th className="p-3 text-center">Rendement</th>
                  <th className="p-3 text-right">Coût Théorique</th>
                  <th className="p-3 text-right">Coût Réel Suivi</th>
                  <th className="p-3">Source du Prix</th>
                  <th className="p-3 text-center">Dernière MAJ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {resources.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono ${
                        r.nature === 'MAT' ? 'bg-blue-100 text-blue-800' :
                        r.nature === 'MO' ? 'bg-emerald-100 text-emerald-800' :
                        r.nature === 'MTL' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {r.nature}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{r.designation}</td>
                    <td className="p-3 text-right font-mono">{r.theoreticalQty} {r.unit}</td>
                    <td className="p-3 text-right font-mono font-semibold">{r.unitPrice.toLocaleString()} FCFA</td>
                    <td className="p-3 text-center font-mono text-slate-600">x{r.yieldRate}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-900">{r.theoreticalCost.toLocaleString()} FCFA</td>
                    <td className={`p-3 text-right font-mono font-extrabold ${r.actualCost > r.theoreticalCost ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {r.actualCost.toLocaleString()} FCFA
                    </td>
                    <td className="p-3 font-semibold text-slate-600">{r.priceSource}</td>
                    <td className="p-3 text-center font-mono text-[10px] text-slate-400">{r.lastUpdated}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 text-slate-900 font-extrabold border-t-2 border-slate-300">
                  <td colSpan={5} className="p-3 uppercase text-xs">Total Déboursé Sec pour 1 m³ Béton B25</td>
                  <td className="p-3 text-right font-mono text-emerald-700 text-sm font-black">{totalTheoreticalCostPerUnit.toLocaleString()} FCFA</td>
                  <td className="p-3 text-right font-mono text-rose-600 text-sm font-black">{totalActualCostPerUnit.toLocaleString()} FCFA</td>
                  <td colSpan={2} className="p-3 text-center text-slate-600 text-xs">
                    Écart Déboursé : <strong className={ecartDeboursePerUnit >= 0 ? 'text-emerald-700 font-black' : 'text-rose-600 font-black'}>{ecartDeboursePerUnit.toLocaleString()} FCFA / m³</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CRÉATION D'UNE NOUVELLE VERSION BUDGÉTAIRE */}
      {showNewVersionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Révision Budgétaire (Version V{budgetVersions.length})</h3>
              <button onClick={() => setShowNewVersionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewVersion} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Nouveau Montant Budget Révisé FCFA *</label>
                <input
                  type="number"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs"
                  value={newVersionAmount}
                  onChange={e => setNewVersionAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Justification Obligatoire de la Révision *</label>
                <textarea
                  rows={3}
                  placeholder="ex: Avenant n°2 relatif à l'augmentation du linéaire d'assainissement..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs"
                  value={newVersionJustification}
                  onChange={e => setNewVersionJustification(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Auteur</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    value={newVersionAuthor}
                    onChange={e => setNewVersionAuthor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Approbateur</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    value={newVersionApprover}
                    onChange={e => setNewVersionApprover(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewVersionModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-sm"
                >
                  Enregistrer la Version V{budgetVersions.length}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
