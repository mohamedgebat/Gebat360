import React, { useState } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
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
  Shield
} from 'lucide-react';

interface RisksModuleProps {
  onBackToProject?: () => void;
}

export const RisksModule: React.FC<RisksModuleProps> = ({ onBackToProject }) => {
  const [periode] = useState('Mai 2025');

  // Top 6 Risques Critiques et Élevés (Fidèles à la maquette)
  const topRisks = [
    {
      id: 'R-005',
      name: 'Retard livraison matériaux (acier, ciment)',
      category: 'Approvisionnement',
      categoryBg: 'bg-blue-50 text-blue-700',
      prob: 'Élevée',
      impact: 'Majeur',
      level: 'Critique',
      levelBg: 'bg-red-100 text-red-800 font-extrabold',
      status: 'Ouvert',
      statusBg: 'bg-red-50 text-red-700 border border-red-200',
      owner: 'S. Camara',
      role: 'Resp. Achats',
      date: '28/05/2025',
      dateColor: 'text-red-600 font-bold',
    },
    {
      id: 'R-011',
      name: 'Dépassement budget lot 03 – Gros œuvre',
      category: 'Financier',
      categoryBg: 'bg-emerald-50 text-emerald-700',
      prob: 'Moyenne',
      impact: 'Majeur',
      level: 'Élevé',
      levelBg: 'bg-amber-100 text-amber-800 font-bold',
      status: 'Ouvert',
      statusBg: 'bg-red-50 text-red-700 border border-red-200',
      owner: 'M. Sy',
      role: 'Contrôleur Gestion',
      date: '05/05/2025',
      dateColor: 'text-amber-600 font-bold',
    },
    {
      id: 'R-003',
      name: 'Pluies exceptionnelles retard chantier',
      category: 'Externe / Climat',
      categoryBg: 'bg-purple-50 text-purple-700',
      prob: 'Élevée',
      impact: 'Important',
      level: 'Élevé',
      levelBg: 'bg-amber-100 text-amber-800 font-bold',
      status: 'Ouvert',
      statusBg: 'bg-red-50 text-red-700 border border-red-200',
      owner: 'B. Diatta',
      role: 'Chef Travaux',
      date: '15/06/2025',
      dateColor: 'text-slate-600',
    },
    {
      id: 'R-014',
      name: 'Non conformité béton (résistance)',
      category: 'Qualité',
      categoryBg: 'bg-teal-50 text-teal-700',
      prob: 'Moyenne',
      impact: 'Important',
      level: 'Moyen',
      levelBg: 'bg-amber-50 text-amber-700 border border-amber-200 font-bold',
      status: 'Ouvert',
      statusBg: 'bg-red-50 text-red-700 border border-red-200',
      owner: 'K. Ndour',
      role: 'Resp. Qualité',
      date: '30/06/2025',
      dateColor: 'text-slate-600',
    },
    {
      id: 'R-007',
      name: 'Indisponibilité main-d’œuvre qualifiée',
      category: 'Ressources Humaines',
      categoryBg: 'bg-blue-50 text-blue-700',
      prob: 'Moyenne',
      impact: 'Modéré',
      level: 'Moyen',
      levelBg: 'bg-amber-50 text-amber-700 border border-amber-200 font-bold',
      status: 'En cours',
      statusBg: 'bg-blue-50 text-blue-700 border border-blue-200',
      owner: 'A. Fall',
      role: 'Directeur Projet',
      date: '10/06/2025',
      dateColor: 'text-slate-600',
    },
    {
      id: 'R-018',
      name: 'Panne engins principaux',
      category: 'Matériel',
      categoryBg: 'bg-amber-50 text-amber-700',
      prob: 'Faible',
      impact: 'Important',
      level: 'Moyen',
      levelBg: 'bg-amber-50 text-amber-700 border border-amber-200 font-bold',
      status: 'En cours',
      statusBg: 'bg-blue-50 text-blue-700 border border-blue-200',
      owner: 'O. Kane',
      role: 'Chef Logistique',
      date: '20/06/2025',
      dateColor: 'text-slate-600',
    },
  ];

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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              GESTION DES RISQUES PROJET
            </h1>
            <Shield size={16} className="text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Identifiez, évaluez et maîtrisez les risques pour sécuriser la performance du projet</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sélecteur Période */}
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm text-xs">
            <span className="text-slate-500 font-semibold">Période :</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span>{periode}</span>
              <Calendar size={14} className="text-slate-400" />
            </div>
          </div>

          <button className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow">
            <Zap size={14} className="text-amber-400" /> Actions rapides <span className="text-[10px]">▼</span>
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

      {/* 3. PREMIÈRE LIGNE : 6 CARTES KPI DE RISQUES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: RISQUES TOTAUX */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RISQUES TOTAUX</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">24</span>
            <span className="text-[10px] text-blue-600 font-bold">+4 ce mois</span>
          </div>
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* KPI 2: RISQUES OUVERTS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RISQUES OUVERTS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">18</span>
            <span className="text-[10px] text-emerald-600 font-bold">75% <span className="text-slate-400 font-normal">du total</span></span>
          </div>
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* KPI 3: RISQUES CRITIQUES */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RISQUES CRITIQUES</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">3</span>
            <span className="text-[10px] text-red-600 font-bold">+1 ce mois</span>
          </div>
          <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-red-500/20">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* KPI 4: RISQUES ÉLEVÉS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RISQUES ÉLEVÉS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">5</span>
            <span className="text-[10px] text-amber-600 font-bold">20,8% <span className="text-slate-400 font-normal">du total</span></span>
          </div>
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* KPI 5: TAUX DE MAÎTRISE */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">TAUX DE MAÎTRISE</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">72%</span>
            <span className="text-[10px] text-purple-600 font-bold">+5 pts ce mois</span>
          </div>
          <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
            <Target size={20} />
          </div>
        </div>

        {/* KPI 6: PLANS D'ACTIONS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">PLANS D'ACTIONS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">16</span>
            <span className="text-[10px] text-slate-400 font-medium">8 en cours, 2 en retard</span>
          </div>
          <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-teal-500/20">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* 4. DEUXIÈME LIGNE : RÉPARTITION, MATRICE PROBABILITÉ/IMPACT ET ÉVOLUTION DANS LE TEMPS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Répartition des risques par niveau (4/12) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">RÉPARTITION DES RISQUES PAR NIVEAU</h3>

          <div className="flex items-center gap-4 my-2">
            <div className="w-28 h-28 rounded-full border-[12px] border-red-600 border-t-amber-500 border-r-amber-400 border-b-emerald-500 flex items-center justify-center">
              <div className="text-center">
                <span className="block text-xl font-black text-slate-900">24</span>
                <span className="block text-[8px] font-bold text-slate-500">Risques</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs flex-1">
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-red-600"></span>Critiques</span><span className="font-bold font-mono">3 (12,5%)</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Élevés</span><span className="font-bold font-mono">5 (20,8%)</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-amber-300"></span>Moyens</span><span className="font-bold font-mono">8 (33,3%)</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Faibles</span><span className="font-bold font-mono">8 (33,3%)</span></div>
            </div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir le détail</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Matrice Probabilité / Impact (5x5 Grid) (5/12) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">MATRICE PROBABILITÉ / IMPACT</h3>

          {/* Grille Matrice 5x5 */}
          <div className="overflow-x-auto my-2 text-[9px]">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="text-slate-400 font-bold">
                  <th></th>
                  <th colSpan={5} className="pb-1 uppercase">Impact</th>
                </tr>
                <tr className="text-slate-500 font-bold border-b text-[8px]">
                  <th></th>
                  <th>1 Faible</th>
                  <th>2 Modéré</th>
                  <th>3 Important</th>
                  <th>4 Majeur</th>
                  <th>5 Catastrophique</th>
                </tr>
              </thead>
              <tbody className="font-bold">
                <tr><td className="p-1 text-slate-400 text-left">5 Très élevée</td><td className="p-2 bg-emerald-100 border">0</td><td className="p-2 bg-amber-100 border">1</td><td className="p-2 bg-amber-300 border">2</td><td className="p-2 bg-red-400 border text-white">2</td><td className="p-2 bg-red-600 border text-white">1</td></tr>
                <tr><td className="p-1 text-slate-400 text-left">4 Élevée</td><td className="p-2 bg-emerald-100 border">0</td><td className="p-2 bg-amber-100 border">1</td><td className="p-2 bg-amber-300 border">2</td><td className="p-2 bg-red-400 border text-white">1</td><td className="p-2 bg-red-400 border text-white">0</td></tr>
                <tr><td className="p-1 text-slate-400 text-left">3 Moyenne</td><td className="p-2 bg-emerald-200 border">1</td><td className="p-2 bg-amber-100 border">2</td><td className="p-2 bg-amber-200 border">2</td><td className="p-2 bg-amber-300 border">1</td><td className="p-2 bg-red-400 border text-white">0</td></tr>
                <tr><td className="p-1 text-slate-400 text-left">2 Faible</td><td className="p-2 bg-emerald-200 border">2</td><td className="p-2 bg-amber-100 border">1</td><td className="p-2 bg-emerald-200 border">0</td><td className="p-2 bg-emerald-200 border">0</td><td className="p-2 bg-emerald-200 border">0</td></tr>
                <tr><td className="p-1 text-slate-400 text-left">1 Très faible</td><td className="p-2 bg-emerald-200 border">1</td><td className="p-2 bg-emerald-200 border">0</td><td className="p-2 bg-emerald-200 border">0</td><td className="p-2 bg-emerald-200 border">0</td><td className="p-2 bg-emerald-200 border">0</td></tr>
              </tbody>
            </table>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir la matrice détaillée</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Évolution des risques dans le temps (3/12) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ÉVOLUTION DES RISQUES DANS LE TEMPS</h3>
            <div className="flex items-center gap-2 text-[8px] font-bold">
              <span className="text-blue-600">━ Total</span>
              <span className="text-emerald-600">━ Ouverts</span>
              <span className="text-red-600">━ Critiques</span>
            </div>
          </div>

          {/* Représentation graphique d'évolution */}
          <div className="relative h-44 my-2 flex items-end justify-between px-2 text-[9px] text-slate-400 border-b border-l border-slate-200">
            {['Déc. 2024', 'Janv. 2025', 'Févr. 2025', 'Mars 2025', 'Avr. 2025', 'Mai 2025'].map((m, i) => (
              <div key={m} className="flex flex-col items-center gap-1">
                <div className="w-1 bg-blue-600 rounded-t" style={{ height: `${(i + 1) * 8}px` }}></div>
                <span>{m}</span>
              </div>
            ))}
            <div className="absolute top-4 right-2 bg-blue-600 text-white font-bold text-[8px] px-1 rounded">24</div>
            <div className="absolute top-12 right-2 bg-emerald-600 text-white font-bold text-[8px] px-1 rounded">18</div>
            <div className="absolute top-28 right-2 bg-red-600 text-white font-bold text-[8px] px-1 rounded">3</div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir l'historique complet</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>

      {/* 5. TROISIÈME LIGNE : TOP 6 RISQUES CRITIQUES, STATUT PLANS D'ACTIONS & RISQUES PAR CATÉGORIE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Top 6 Risques Critiques et Élevés (7/12) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">TOP 6 RISQUES CRITIQUES ET ÉLEVÉS</h3>

          <div className="overflow-x-auto my-2 text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                  <th className="pb-1.5 w-10">ID</th>
                  <th className="pb-1.5">Risque</th>
                  <th className="pb-1.5">Catégorie</th>
                  <th className="pb-1.5">Probabilité</th>
                  <th className="pb-1.5">Impact</th>
                  <th className="pb-1.5">Niveau</th>
                  <th className="pb-1.5">Statut</th>
                  <th className="pb-1.5">Propriétaire</th>
                  <th className="pb-1.5">Échéance</th>
                  <th className="pb-1.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {topRisks.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 font-mono font-bold text-slate-400">{r.id}</td>
                    <td className="font-bold text-slate-900">{r.name}</td>
                    <td><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.categoryBg}`}>{r.category}</span></td>
                    <td className="font-medium">{r.prob}</td>
                    <td className="font-medium">{r.impact}</td>
                    <td><span className={`px-1.5 py-0.5 rounded text-[9px] ${r.levelBg}`}>{r.level}</span></td>
                    <td><span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${r.statusBg}`}>{r.status}</span></td>
                    <td>
                      <span className="font-bold block text-[10px]">{r.owner}</span>
                      <span className="text-[9px] text-slate-400 block">{r.role}</span>
                    </td>
                    <td className={`font-mono text-[10px] ${r.dateColor}`}>{r.date}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400">
                        <button className="hover:text-slate-700"><Eye size={13} /></button>
                        <button className="hover:text-slate-700"><MoreHorizontal size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir tous les risques</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Côté Droit (5/12) : Statut des plans d'actions + Risques par catégorie */}
        <div className="lg:col-span-5 space-y-6">
          {/* Statut des plans d'actions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">STATUT DES PLANS D'ACTIONS</h3>

            <div className="flex items-center gap-4 my-2 text-xs">
              <div className="w-24 h-24 rounded-full border-[10px] border-blue-600 border-t-emerald-500 border-r-red-500 flex items-center justify-center">
                <div className="text-center">
                  <span className="block text-sm font-black text-slate-900">16</span>
                  <span className="block text-[8px] font-bold text-slate-500">Plans</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs flex-1">
                <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Terminés</span><span className="font-bold font-mono">6 (37,5%)</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-blue-600"></span>En cours</span><span className="font-bold font-mono">8 (50,0%)</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-red-600"></span>En retard</span><span className="font-bold font-mono">2 (12,5%)</span></div>
              </div>
            </div>

            <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
              <span>Voir tous les plans d'actions</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Risques par catégorie */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">RISQUES PAR CATÉGORIE</h3>

            <div className="space-y-1.5 my-2 text-xs">
              <div className="flex items-center gap-2"><span className="w-32 truncate text-slate-700">Approvisionnement</span><div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div></div><span className="font-bold font-mono">6</span></div>
              <div className="flex items-center gap-2"><span className="w-32 truncate text-slate-700">Financier</span><div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-600 h-2 rounded-full" style={{ width: '62%' }}></div></div><span className="font-bold font-mono">5</span></div>
              <div className="flex items-center gap-2"><span className="w-32 truncate text-slate-700">Externe / Climat</span><div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div></div><span className="font-bold font-mono">4</span></div>
              <div className="flex items-center gap-2"><span className="w-32 truncate text-slate-700">Qualité</span><div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-600 h-2 rounded-full" style={{ width: '37%' }}></div></div><span className="font-bold font-mono">3</span></div>
              <div className="flex items-center gap-2"><span className="w-32 truncate text-slate-700">Ressources Humaines</span><div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-600 h-2 rounded-full" style={{ width: '37%' }}></div></div><span className="font-bold font-mono">3</span></div>
            </div>

            <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
              <span>Voir le détail par catégorie</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* 6. QUATRIÈME LIGNE : RISQUES RÉCEMMENT AJOUTÉS, RECOMMANDATIONS ET DOCUMENTS & RESSOURCES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Risques récemment ajoutés (4/12) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">RISQUES RÉCEMMENT AJOUTÉS</h3>

          <div className="space-y-2.5 my-2 text-xs">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-[11px]">R-023 Augmentation prix carburant</span>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-1.5 rounded">Moyen</span>
              <span className="text-[10px] text-slate-400 font-mono">20/05/2025</span>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-[11px]">R-024 Conflit avec riverains – accès chantier</span>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-1.5 rounded">Moyen</span>
              <span className="text-[10px] text-slate-400 font-mono">18/05/2025</span>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-[11px]">R-025 Retard approbation plans d’exécution</span>
              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 rounded">Élevé</span>
              <span className="text-[10px] text-slate-400 font-mono">17/05/2025</span>
            </div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir tous les risques récents</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Recommandations prioritaires (5/12) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">RECOMMANDATIONS PRIORITAIRES</h3>

          <div className="space-y-2 my-2 text-xs text-slate-800 font-medium">
            <div className="flex items-start gap-2"><CheckCircle2 size={14} className="text-blue-600 mt-0.5" /><span>Traiter en priorité les 3 risques critiques identifiés.</span></div>
            <div className="flex items-start gap-2"><CheckCircle2 size={14} className="text-blue-600 mt-0.5" /><span>Mettre en place un stock de sécurité pour les matériaux critiques.</span></div>
            <div className="flex items-start gap-2"><CheckCircle2 size={14} className="text-blue-600 mt-0.5" /><span>Renforcer le suivi météo et adapter le planning en conséquence.</span></div>
            <div className="flex items-start gap-2"><CheckCircle2 size={14} className="text-blue-600 mt-0.5" /><span>Revoir le budget du lot 03 et optimiser les ressources.</span></div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir toutes les recommandations</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Documents & Ressources (3/12) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">DOCUMENTS & RESSOURCES</h3>

          <div className="space-y-2 my-2 text-xs">
            <div className="flex justify-between items-center"><span className="font-bold text-slate-900 flex items-center gap-1.5"><FileText size={14} className="text-red-600" />Plan de gestion des risques – V2.1.pdf</span><span className="text-[10px] text-slate-400 font-mono">1,2 Mo</span></div>
            <div className="flex justify-between items-center"><span className="font-bold text-slate-900 flex items-center gap-1.5"><FileText size={14} className="text-emerald-600" />Registre des risques – Mai 2025.xlsx</span><span className="text-[10px] text-slate-400 font-mono">456 Ko</span></div>
            <div className="flex justify-between items-center"><span className="font-bold text-slate-900 flex items-center gap-1.5"><FileText size={14} className="text-red-600" />Matrice probabilité impact.pdf</span><span className="text-[10px] text-slate-400 font-mono">780 Ko</span></div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir tous les documents</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>

    </div>
  );
};
