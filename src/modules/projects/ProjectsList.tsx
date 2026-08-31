import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { Project, RiskLevel, ProjectStatus } from '../../types';
import { Building2, Search, Plus, Filter, ArrowRight, Eye, CheckCircle2, AlertTriangle, MapPin, UserCheck, ShieldAlert, Calendar, DollarSign, RefreshCw } from 'lucide-react';

interface ProjectsListProps {
  onSelectProject: (projectId: string) => void;
  onNewProjectClick: () => void;
}

function fmt(n: number): string {
  if (n === undefined || n === null || isNaN(n)) return '0 FCFA';
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
}

function fmtPct(n: number): string { return n.toFixed(1) + '%'; }

export const ProjectsList: React.FC<ProjectsListProps> = ({ onSelectProject, onNewProjectClick }) => {
  const { projects, wbsMap } = useAppState();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('TOUS');
  const [filterCountry, setFilterCountry] = useState<string>('TOUS');
  const [filterManager, setFilterManager] = useState<string>('TOUS');
  const [filterStatus, setFilterStatus] = useState<string>('TOUS');
  const [filterClient, setFilterClient] = useState<string>('TOUS');
  const [filterRisk, setFilterRisk] = useState<string>('TOUS');

  const companies = useMemo(() => Array.from(new Set(projects.map(p => p.company).filter(Boolean))), [projects]);
  const countries = useMemo(() => Array.from(new Set(projects.map(p => p.country || "Côte d'Ivoire").filter(Boolean))), [projects]);
  const managers = useMemo(() => Array.from(new Set(projects.map(p => p.manager).filter(Boolean))), [projects]);
  const statuses = useMemo(() => Array.from(new Set(projects.map(p => p.status).filter(Boolean))), [projects]);
  const clients = useMemo(() => Array.from(new Set(projects.map(p => p.client).filter(Boolean))), [projects]);
  const risks = useMemo(() => ['Faible', 'Modéré', 'Élevé', 'Critique'], []);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCompany = filterCompany === 'TOUS' || p.company === filterCompany;
      const matchCountry = filterCountry === 'TOUS' || (p.country || "Côte d'Ivoire") === filterCountry;
      const matchManager = filterManager === 'TOUS' || p.manager === filterManager;
      const matchStatus = filterStatus === 'TOUS' || p.status === filterStatus;
      const matchClient = filterClient === 'TOUS' || p.client === filterClient;
      const matchRisk = filterRisk === 'TOUS' || p.risk === filterRisk;

      return matchSearch && matchCompany && matchCountry && matchManager && matchStatus && matchClient && matchRisk;
    });
  }, [projects, searchTerm, filterCompany, filterCountry, filterManager, filterStatus, filterClient, filterRisk]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterCompany('TOUS');
    setFilterCountry('TOUS');
    setFilterManager('TOUS');
    setFilterStatus('TOUS');
    setFilterClient('TOUS');
    setFilterRisk('TOUS');
  };

  return (
    <div className="space-y-6 text-xs text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Liste et Portefeuille des Projets</h1>
          <p className="text-slate-500 text-xs mt-0.5">Suivi opérationnel, contractuel et financier des chantiers</p>
        </div>

        <button
          onClick={onNewProjectClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition text-xs"
        >
          <Plus size={16} /> Nouveau Projet
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-blue-600" />
            <span className="font-extrabold text-slate-900 text-sm">Filtres Multicritères</span>
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition"
          >
            <RefreshCw size={12} /> Réinitialiser les filtres
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, code, client..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Société:</span>
            <select
              className="bg-transparent text-xs font-semibold text-slate-800 w-full focus:outline-none cursor-pointer"
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
            >
              <option value="TOUS">Toutes</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Pays:</span>
            <select
              className="bg-transparent text-xs font-semibold text-slate-800 w-full focus:outline-none cursor-pointer"
              value={filterCountry}
              onChange={e => setFilterCountry(e.target.value)}
            >
              <option value="TOUS">Tous</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Directeur:</span>
            <select
              className="bg-transparent text-xs font-semibold text-slate-800 w-full focus:outline-none cursor-pointer"
              value={filterManager}
              onChange={e => setFilterManager(e.target.value)}
            >
              <option value="TOUS">Tous</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Statut:</span>
            <select
              className="bg-transparent text-xs font-semibold text-slate-800 w-full focus:outline-none cursor-pointer"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="TOUS">Tous</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Client:</span>
            <select
              className="bg-transparent text-xs font-semibold text-slate-800 w-full focus:outline-none cursor-pointer"
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
            >
              <option value="TOUS">Tous</option>
              {clients.map(cl => <option key={cl} value={cl}>{cl}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Risque:</span>
            <select
              className="bg-transparent text-xs font-semibold text-slate-800 w-full focus:outline-none cursor-pointer"
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
            >
              <option value="TOUS">Tous</option>
              {risks.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-slate-700" />
            <h2 className="font-extrabold text-slate-900 text-sm">Chantiers ({filteredProjects.length})</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Affichage complet des indicateurs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                <th className="p-3 pl-4">Code</th>
                <th className="p-3">Nom du Projet</th>
                <th className="p-3">Client</th>
                <th className="p-3">Pays / Localisation</th>
                <th className="p-3">Directeur Projet</th>
                <th className="p-3 text-right">Montant Contrat</th>
                <th className="p-3 text-right">Budget Révisé</th>
                <th className="p-3 text-right text-amber-700">Engagé DS</th>
                <th className="p-3 min-w-[110px]">Avancement</th>
                <th className="p-3">Planning</th>
                <th className="p-3 text-right">Marge EAC</th>
                <th className="p-3 text-center">Risque</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    Aucun projet ne correspond aux critères de recherche définis
                  </td>
                </tr>
              ) : (
                filteredProjects.map(p => {
                  const wbs = wbsMap[p.id] || [];
                  const flattenWBS = (nodes: any[]): any[] => {
                    let list: any[] = [];
                    nodes.forEach(n => {
                      list.push(n);
                      if (n.children && n.children.length > 0) list = list.concat(flattenWBS(n.children));
                    });
                    return list;
                  };
                  const allWbsNodes = flattenWBS(wbs);
                  
                  const realCommittedDS = allWbsNodes.reduce((sum, n) => sum + (n.committed || 0), 0);
                  const contractAmt = Number(p.contractAmount || 0);
                  const revisedBudget = Number(p.revisedBudget || p.initialBudget || 0);
                  const eacMargin = Math.max(0, contractAmt - revisedBudget);
                  const calculatedMarginPct = contractAmt > 0 ? Number(((eacMargin / contractAmt) * 100).toFixed(1)) : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 pl-4 font-mono font-bold text-blue-600">
                        <div>{p.code}</div>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono font-bold">{p.company}</span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        <div>{p.name}</div>
                        <span className="text-[10px] text-slate-500 font-mono font-normal">Activité: {p.activity || 'BTP / Génie Civil'}</span>
                      </td>
                      <td className="p-3 text-slate-600 font-semibold">{p.client}</td>
                      <td className="p-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{p.country || "Côte d'Ivoire"} — {p.location}</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        <div className="flex items-center gap-1">
                          <UserCheck size={12} className="text-slate-400" />
                          <span>{p.manager}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{fmt(p.contractAmount)}</td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-semibold">{fmt(p.revisedBudget)}</td>
                      <td className="p-3 text-right font-mono text-amber-700 font-semibold">{fmt(realCommittedDS)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${p.progress >= 75 ? 'bg-emerald-500' : p.progress >= 40 ? 'bg-amber-500' : 'bg-blue-500'}`}
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 w-8 text-right">{fmtPct(p.progress)}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{p.durationMonths} mois ({p.endDate})</span>
                        </div>
                      </td>
                      <td className={`p-3 text-right font-extrabold ${calculatedMarginPct >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmtPct(calculatedMarginPct)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          p.risk === 'Faible' ? 'bg-emerald-100 text-emerald-800' :
                          p.risk === 'Modéré' ? 'bg-amber-100 text-amber-800' :
                          p.risk === 'Élevé' ? 'bg-orange-100 text-orange-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {p.risk}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onSelectProject(p.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition shadow-sm cursor-pointer"
                        >
                          Fiche 360° &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
