import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { CostNatureConfig } from '../../types';
import {
  Settings, Plus, Tag, Edit3, CheckCircle2, XCircle, Search, Save, X,
  ShieldAlert, Download, FileSpreadsheet, PieChart, Layers, DollarSign,
  TrendingUp, BarChart3, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const SettingsCostNaturesModule: React.FC = () => {
  const {
    costNatures,
    addCostNature,
    updateCostNature,
    toggleCostNatureStatus,
    wbsMap,
    addAuditLog,
    currentUser
  } = useAppState();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNature, setEditingNature] = useState<CostNatureConfig | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  // CALCULS DYNAMIQUES D'UTILISATION DANS LE WBS & COST CONTROL
  const allWbsNodes = useMemo(() => Object.values(wbsMap).flat(), [wbsMap]);

  const natureUsageStats = useMemo(() => {
    const usage: Record<string, { count: number; totalBudget: number; totalCommitted: number; totalActual: number }> = {};

    costNatures.forEach(n => {
      usage[n.code] = { count: 0, totalBudget: 0, totalCommitted: 0, totalActual: 0 };
    });

    allWbsNodes.forEach(node => {
      const codeKey = (node.nature || 'MAT').toUpperCase();
      if (!usage[codeKey]) {
        usage[codeKey] = { count: 0, totalBudget: 0, totalCommitted: 0, totalActual: 0 };
      }
      usage[codeKey].count += 1;
      usage[codeKey].totalBudget += Number(node.revisedBudget || node.initialBudget || 0);
      usage[codeKey].totalCommitted += Number(node.committed || 0);
      usage[codeKey].totalActual += Number(node.actualCost || 0);
    });

    return usage;
  }, [costNatures, allWbsNodes]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !label) return;

    const newNature: CostNatureConfig = {
      code: code.trim().toUpperCase(),
      label: label.trim(),
      description: description.trim(),
      status: 'Actif',
    };

    addCostNature(newNature);
    addAuditLog(
      'CREATION_NATURE_COUT',
      'PARAMETRAGE_FINANCIER',
      newNature.code,
      `Création de la nature de coût ${newNature.code} — ${newNature.label} par ${currentUser?.name || 'Administrateur'}.`
    );

    setCode('');
    setLabel('');
    setDescription('');
    setShowAddModal(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNature || !code || !label) return;

    const updated: CostNatureConfig = {
      ...editingNature,
      code: code.trim().toUpperCase(),
      label: label.trim(),
      description: description.trim(),
    };

    updateCostNature(updated);
    addAuditLog(
      'MODIFICATION_NATURE_COUT',
      'PARAMETRAGE_FINANCIER',
      updated.code,
      `Mise à jour de la nature de coût ${updated.code} — ${updated.label}.`
    );

    setEditingNature(null);
  };

  const handleToggleStatus = (id: string, natCode: string, currentStatus: string) => {
    toggleCostNatureStatus(id);
    addAuditLog(
      currentStatus === 'Actif' ? 'DESACTIVATION_NATURE_COUT' : 'ACTIVATION_NATURE_COUT',
      'PARAMETRAGE_FINANCIER',
      natCode,
      `Statut de la nature ${natCode} basculé vers ${currentStatus === 'Actif' ? 'Inactif' : 'Actif'}.`
    );
  };

  const filteredNatures = useMemo(() => {
    return costNatures.filter(n =>
      n.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [costNatures, searchTerm]);

  // Export Excel .xlsx
  const handleExportXLSX = () => {
    const exportData = filteredNatures.map(n => {
      const stats = natureUsageStats[n.code] || { count: 0, totalBudget: 0, totalCommitted: 0, totalActual: 0 };
      return {
        'Code Nature': n.code,
        'Libellé Nature': n.label,
        'Description': n.description || '-',
        'Statut': n.status,
        'Nb Activités WBS': stats.count,
        'Budget Total (FCFA)': stats.totalBudget,
        'Engagé (FCFA)': stats.totalCommitted,
        'Coût Réel (FCFA)': stats.totalActual
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Natures_Couts');

    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 12 },
      { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 20 }
    ];

    XLSX.writeFile(workbook, `GEBAT_Natures_Couts_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export CSV .csv
  const handleExportCSV = () => {
    const headers = ['Code Nature', 'Libellé Nature', 'Description', 'Statut', 'Nb Activités WBS', 'Budget Total FCFA'];
    const rows = filteredNatures.map(n => {
      const stats = natureUsageStats[n.code] || { count: 0, totalBudget: 0 };
      return [
        n.code,
        `"${n.label.replace(/"/g, '""')}"`,
        `"${(n.description || '').replace(/"/g, '""')}"`,
        n.status,
        stats.count,
        stats.totalBudget
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GEBAT_Natures_Couts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800 font-sans max-w-7xl mx-auto pb-10 animate-in fade-in duration-200">

      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Paramétrage — Natures de Coûts Analytiques</h1>
            <span className="bg-purple-100 text-purple-800 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full border border-purple-200">
              GEBAT 360° TAXONOMIE V2
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Gérez la taxonomie des natures de dépenses associées aux activités WBS pour le pilotage financier et le Cost Control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
            title="Exporter en CSV"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={handleExportXLSX}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Exporter en Excel .xlsx"
          >
            <FileSpreadsheet size={15} /> Excel (.xlsx)
          </button>
          <button
            onClick={() => {
              setCode('');
              setLabel('');
              setDescription('');
              setShowAddModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus size={16} /> Ajouter une Nature
          </button>
        </div>
      </div>

      {/* CARTES RÉSUMÉES PAR NATURE MAJEURE */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        {costNatures.slice(0, 6).map(n => {
          const stats = natureUsageStats[n.code] || { count: 0, totalBudget: 0 };
          return (
            <div key={n.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="bg-purple-50 text-purple-800 font-black px-2 py-0.5 rounded text-[10px] border border-purple-200">
                  {n.code}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-bold">{stats.count} WBS</span>
              </div>
              <strong className="text-xs font-black text-slate-900 block truncate font-sans">{n.label}</strong>
              <span className="text-[11px] font-black text-blue-900 block">{stats.totalBudget.toLocaleString()} FCFA</span>
            </div>
          );
        })}
      </div>

      {/* RECHERCHE ET TABLEAU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par code (MAT, MO...) ou libellé..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
            />
          </div>

          <span className="text-xs text-slate-500 font-bold font-mono">
            {filteredNatures.length} Nature(s) configurée(s)
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase text-[10px]">
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Libellé Nature de Coût</th>
                <th className="p-3.5">Description & Périmètre</th>
                <th className="p-3.5 text-center">Postes WBS Liés</th>
                <th className="p-3.5 text-right">Budget Total Alloué</th>
                <th className="p-3.5 text-center">Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
              {filteredNatures.map(n => {
                const stats = natureUsageStats[n.code] || { count: 0, totalBudget: 0, totalCommitted: 0, totalActual: 0 };
                return (
                  <tr key={n.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-mono font-black text-purple-700 text-sm">
                      <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{n.code}</span>
                    </td>
                    <td className="p-3.5 font-extrabold text-slate-900">{n.label}</td>
                    <td className="p-3.5 text-slate-500 text-xs max-w-[250px] truncate">{n.description || '—'}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">{stats.count} ligne(s)</span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-blue-900">
                      {stats.totalBudget.toLocaleString()} FCFA
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        n.status === 'Actif'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}>
                        {n.status === 'Actif' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {n.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingNature(n);
                          setCode(n.code);
                          setLabel(n.label);
                          setDescription(n.description || '');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleToggleStatus(n.id, n.code, n.status)}
                        className={`font-bold hover:underline cursor-pointer ${
                          n.status === 'Actif' ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'
                        }`}
                      >
                        {n.status === 'Actif' ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AJOUT / ÉDITION */}
      {(showAddModal || editingNature) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Tag size={18} className="text-purple-600" />
                {editingNature ? `Modifier la Nature : ${editingNature.code}` : 'Nouvelle Nature de Coût'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingNature(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={editingNature ? handleUpdate : handleCreate} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 mb-1">Code Nature (ex: MAT, MO, MTL, STT, DEP...)</label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="ex: MAT"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-purple-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Libellé complet</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="ex: Matériaux et Fournitures"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Description / Champ d'application</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Précisez les types de dépenses couvertes par cette nature..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:border-blue-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingNature(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-extrabold hover:bg-blue-700 shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={15} /> {editingNature ? 'Enregistrer les modifications' : 'Créer la Nature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsCostNaturesModule;
