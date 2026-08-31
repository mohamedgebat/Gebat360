import React, { useState } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import {
  Briefcase,
  Coins,
  TrendingUp,
  PieChart,
  Percent,
  AlertOctagon,
  Search,
  Filter,
  Download,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

interface PortfolioDashboardProps {
  onSelectProject: (projectId: string) => void;
  onNewProjectClick: () => void;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ onSelectProject, onNewProjectClick }) => {
  const { projects } = useAppState();
  const [selectedRegion, setSelectedRegion] = useState('Tous');

  // Format de devise FCFA en chiffres exacts sans abréviation ni arrondi
  const formatFCFA = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0 FCFA';
    return `${Math.round(val).toLocaleString('fr-FR')} FCFA`;
  };

  // Calculs financiers stratégiques
  const totalMarket = projects.reduce((acc, p) => acc + p.contractAmount, 0) + 75000000000;
  const totalBudgetDS = projects.reduce((acc, p) => acc + p.revisedBudget, 0) + 55000000000;
  const totalEacMargin = totalMarket - totalBudgetDS;

  return (
    <div className="space-y-6 text-slate-800 font-sans max-w-7xl mx-auto">
      {/* 1. TOP HEADER BANNER (PORTEFEUILLE STRATÉGIQUE) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              PORTEFEUILLE STRATÉGIQUE DES PROJETS (CÔTE D'IVOIRE)
            </h1>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Vue Direction Générale
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Analyse consolidée de la performance financière, de l'exposition aux risques et du déploiement régional</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewProjectClick}
            className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow"
          >
            + Nouveau Projet
          </button>
          <button className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Download size={14} /> Rapport Consolidé PDF
          </button>
        </div>
      </div>

      {/* 2. SYNTHÈSE FINANCIÈRE DE HAUT NIVEAU (4 GRANDES CARTES CONSOLIDÉES) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider block">VALEUR DU PORTEFEUILLE</span>
            <span className="text-2xl font-black mt-1 block font-mono">{formatFCFA(totalMarket)}</span>
            <span className="text-[10px] text-slate-300">24 Projets en Côte d'Ivoire</span>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[10px] text-emerald-400 font-bold flex items-center justify-between">
            <span>Volume contractuel</span>
            <span>🇨🇮 100% CI</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">BUDGET DÉBOURSÉ RÉVISÉ</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">{formatFCFA(totalBudgetDS)}</span>
            <span className="text-[10px] text-slate-500 font-semibold">Taux d'engagement : 68,4%</span>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex justify-between">
            <span>Coût direct chantier</span>
            <span className="font-bold text-slate-800">71,8 Mds FCFA réalisés</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">MARGE PRÉVISIONNELLE (EAC)</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">{formatFCFA(totalEacMargin)}</span>
            <span className="text-[10px] text-emerald-600 font-bold">15,2% du Chiffre d'Affaires</span>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex justify-between">
            <span>Rentabilité globale</span>
            <span className="font-bold text-emerald-600">+1,4 pt vs V0</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">EXPOSITION AUX RISQUES</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">3 Projets Critiques</span>
            <span className="text-[10px] text-red-600 font-bold">4,28 Mds FCFA à risque</span>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex justify-between">
            <span>Projets à surveiller</span>
            <span className="font-bold text-amber-600">Bouaké & Yamoussoukro</span>
          </div>
        </div>
      </div>

      {/* 3. REPARTITION GÉOGRAPHIQUE & PAR CATEGORIE (ANALYSE DE PORTEFEUILLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Ventilation par Région (7/12) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              RÉPARTITION DU PORTEFEUILLE PAR DISTRICT EN CÔTE D'IVOIRE
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Total : 24 Chantiers</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* District 1: Abidjan */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-900">📍 District Autonome d'Abidjan (Plateau, Cocody, Songon, Bingerville)</span>
                <span className="font-mono text-blue-600">54,5 Mds FCFA (42,3%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '42.3%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>10 Projets actifs</span>
                <span>Avancement moyen : 72%</span>
              </div>
            </div>

            {/* District 2: Bouaké */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-900">📍 Region du Gbêkê (Bouaké & Alentours)</span>
                <span className="font-mono text-purple-600">32,8 Mds FCFA (25,5%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '25.5%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>6 Projets actifs</span>
                <span>Avancement moyen : 58%</span>
              </div>
            </div>

            {/* District 3: Yamoussoukro */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-900">📍 District de Yamoussoukro & Tiassalé</span>
                <span className="font-mono text-emerald-600">28,9 Mds FCFA (22,4%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: '22.4%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>5 Projets actifs</span>
                <span>Avancement moyen : 45%</span>
              </div>
            </div>

            {/* District 4: San Pédro & Korhogo */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-900">📍 Korhogo & San-Pédro</span>
                <span className="font-mono text-amber-600">12,4 Mds FCFA (9,8%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '9.8%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>3 Projets actifs</span>
                <span>Avancement moyen : 80%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Répartition par Type d'Ouvrage (5/12) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              STRUCTURE PAR SECTEUR D'ACTIVITÉ
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 block">🏫 Bâtiments Scolaires & Hospitaliers</span>
                <span className="text-[10px] text-slate-500">8 Projets (ex: Lycée Technique Bouaké)</span>
              </div>
              <span className="font-mono font-extrabold text-blue-600 text-sm">42,5 Mds</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 block">🏢 Bâtiments Tertiaires & Bureaux</span>
                <span className="text-[10px] text-slate-500">6 Projets (ex: Tours Plateau Abidjan)</span>
              </div>
              <span className="font-mono font-extrabold text-purple-600 text-sm">48,2 Mds</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 block">🛣️ Infrastructures Routières & Ouvrages</span>
                <span className="text-[10px] text-slate-500">5 Projets (ex: Express Yamoussoukro)</span>
              </div>
              <span className="font-mono font-extrabold text-emerald-600 text-sm">28,9 Mds</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 block">🚰 Hydraulique & Génie Civil</span>
                <span className="text-[10px] text-slate-500">5 Projets (ex: Station Bingerville)</span>
              </div>
              <span className="font-mono font-extrabold text-amber-600 text-sm">9,0 Mds</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. TOP 5 DES PROJETS MAJEURS DU PORTEFEUILLE */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              FOCUS SUR LES PROJETS MAJEURS DU PORTEFEUILLE
            </h3>
            <p className="text-[11px] text-slate-500">Vue synthétique d'avancement et de marge pour la Direction</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className="bg-slate-50 hover:bg-blue-50/50 p-4 rounded-xl border border-slate-200 transition cursor-pointer space-y-3"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono font-black text-blue-600 text-xs">{p.code}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  🇨🇮 {p.location}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{p.name}</h4>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Client : {p.client}</span>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <div className="flex justify-between"><span className="text-slate-500">Montant du Marché :</span><span className="font-mono font-bold text-slate-900">{formatFCFA(p.contractAmount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Budget Révisé (DS) :</span><span className="font-mono font-semibold text-slate-700">{formatFCFA(p.revisedBudget)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Directeur de projet :</span><span className="font-bold text-slate-800">👤 {p.manager}</span></div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Avancement physique :</span>
                  <span className="font-black text-blue-600">{p.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${p.progress}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
