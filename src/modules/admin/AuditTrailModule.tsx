import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { hasProjectAccess } from '../../core/permissions';
import {
  History, ShieldCheck, Download, Lock, Search, Filter, RefreshCw,
  FileSpreadsheet, Calendar, User, Layers, ShieldAlert, Eye, X, CheckCircle2,
  Clock, Hash, Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AuditLog } from '../../types';

export const AuditTrailModule: React.FC = () => {
  const { auditLogs, currentUser } = useAppState();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('TOUS');
  const [selectedPeriod, setSelectedPeriod] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<AuditLog | null>(null);

  // Filtrage et sécurisation RBAC
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    return (auditLogs || []).filter(log => {
      // Filtrage Périmètre Projet si l'objet ou le détail référence un projet
      if (log.objectRef && log.objectRef.startsWith('CIV-') && !hasProjectAccess(currentUser, log.objectRef)) {
        return false;
      }

      // Filtre Période
      if (selectedPeriod === 'TODAY' && !log.timestamp.startsWith(todayStr)) {
        return false;
      }
      if (selectedPeriod === 'WEEK') {
        const logDate = new Date(log.timestamp);
        if (isNaN(logDate.getTime()) || logDate < oneWeekAgo) return false;
      }
      if (selectedPeriod === 'MONTH') {
        const logDate = new Date(log.timestamp);
        if (isNaN(logDate.getTime()) || logDate < oneMonthAgo) return false;
      }

      const userStr = String(log.user || '').toLowerCase();
      const roleStr = String(log.role || '').toLowerCase();
      const actionStr = String(log.action || '').toLowerCase();
      const refStr = String(log.objectRef || '').toLowerCase();
      const detailStr = String(log.newValue || log.oldValue || log.justification || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        userStr.includes(query) ||
        roleStr.includes(query) ||
        actionStr.includes(query) ||
        refStr.includes(query) ||
        detailStr.includes(query);

      const matchesModule = selectedModuleFilter === 'TOUS' || log.module === selectedModuleFilter;

      return matchesSearch && matchesModule;
    });
  }, [auditLogs, currentUser, searchTerm, selectedModuleFilter, selectedPeriod]);

  // KPIs Statistiques Audit Trail
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const uniqueUsers = new Set(auditLogs.map(l => l.user)).size;
    const sensitiveActions = auditLogs.filter(l =>
      l.action.includes('SUPPRESSION') ||
      l.action.includes('VALIDATION') ||
      l.action.includes('REJET') ||
      l.action.includes('ARBITRAGE') ||
      l.action.includes('MODIFICATION_BUDGET')
    ).length;
    const modulesCount = new Set(auditLogs.map(l => l.module)).size;

    return { total, uniqueUsers, sensitiveActions, modulesCount };
  }, [auditLogs]);

  // Export Excel .xlsx
  const handleExportXLSX = () => {
    const exportData = filteredLogs.map(l => ({
      'ID Événement': l.id,
      'Date & Heure': l.timestamp,
      'Auteur / Utilisateur': l.user,
      'Rôle Métier': l.role,
      'Action Exécutée': l.action,
      'Module ERP': l.module,
      'Référence Objet': l.objectRef || '-',
      'Ancienne Valeur': l.oldValue || '-',
      'Nouvelle Valeur / Détails': l.newValue || '-',
      'Justification / Contexte': l.justification || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit_Trail');

    worksheet['!cols'] = [
      { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 22 },
      { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
      { wch: 35 }, { wch: 30 }
    ];

    XLSX.writeFile(workbook, `GEBAT_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export CSV .csv
  const handleExportCSV = () => {
    const headers = [
      'ID Événement', 'Horodatage', 'Auteur', 'Rôle', 'Action', 'Module', 'Réf Objet', 'Ancienne Valeur', 'Nouvelle Valeur', 'Justification'
    ];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.timestamp}"`,
      `"${(l.user || '').replace(/"/g, '""')}"`,
      `"${(l.role || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.module || '').replace(/"/g, '""')}"`,
      `"${(l.objectRef || '').replace(/"/g, '""')}"`,
      `"${(l.oldValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      `"${(l.justification || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GEBAT_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800 font-sans w-full text-xs animate-in fade-in duration-200">

      {/* HEADER AMÉLIORÉ DE L'AUDIT TRAIL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Registre d'Audit Trail Inaltérable</h1>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
              IMMUTABLE LEDGER V2
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Journalisation conforme ISO 27001 & RGPD de toutes les opérations, signatures électroniques, mouvements et arbitrages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
            title="Exporter en fichier CSV"
          >
            <Download size={14} /> Exporter CSV
          </button>
          <button
            onClick={handleExportXLSX}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Exporter en fichier Excel .xlsx"
          >
            <FileSpreadsheet size={15} /> Exporter Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* KPIS STATISTIQUES AUDIT */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="font-sans text-[10px] text-slate-400 font-extrabold uppercase flex items-center gap-1">
            <Database size={13} className="text-blue-600" /> Événements Totaux
          </span>
          <div className="text-xl font-black text-slate-900">{stats.total} logs</div>
          <span className="font-sans text-[10px] text-slate-500 block">Horodatage sécurisé</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="font-sans text-[10px] text-purple-600 font-extrabold uppercase flex items-center gap-1">
            <ShieldAlert size={13} className="text-purple-600" /> Actions Sensibles
          </span>
          <div className="text-xl font-black text-purple-900">{stats.sensitiveActions}</div>
          <span className="font-sans text-[10px] text-slate-500 block">Validations, rejets, budgets</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="font-sans text-[10px] text-emerald-600 font-extrabold uppercase flex items-center gap-1">
            <User size={13} className="text-emerald-600" /> Utilisateurs Actifs
          </span>
          <div className="text-xl font-black text-emerald-900">{stats.uniqueUsers}</div>
          <span className="font-sans text-[10px] text-slate-500 block">Opérateurs identifiés</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="font-sans text-[10px] text-amber-600 font-extrabold uppercase flex items-center gap-1">
            <Layers size={13} className="text-amber-600" /> Modules Audités
          </span>
          <div className="text-xl font-black text-amber-900">{stats.modulesCount}</div>
          <span className="font-sans text-[10px] text-slate-500 block">Périmètre 360° couvert</span>
        </div>
      </div>

      {/* BARRE DE FILTRES & RECHERCHE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par utilisateur, action, référence, détails..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">Module :</span>
            <select
              value={selectedModuleFilter}
              onChange={e => setSelectedModuleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none"
            >
              <option value="TOUS">Tous les Modules</option>
              <option value="ACHATS">ACHATS / DA / BC</option>
              <option value="STOCK">STOCK & MAGASIN</option>
              <option value="BTP_PRODUCTION">PRODUCTION CHANTIER</option>
              <option value="COST_CONTROL">COST CONTROL & EAC</option>
              <option value="ADMINISTRATION">ADMINISTRATION</option>
              <option value="RBAC">UTILISATEURS & RBAC</option>
              <option value="WORKFLOW">WORKFLOWS & VALIDATIONS</option>
              <option value="CEO_COMMAND_CENTER">CEO COMMAND CENTER</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">Période :</span>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none"
            >
              <option value="ALL">Tout l'historique</option>
              <option value="TODAY">Aujourd'hui</option>
              <option value="WEEK">7 derniers jours</option>
              <option value="MONTH">30 derniers jours</option>
            </select>
          </div>
        </div>

        <span className="bg-slate-100 text-slate-700 font-extrabold text-xs px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 font-mono">
          {filteredLogs.length} Événement(s)
        </span>
      </div>

      {/* TABLEAU HISTORIQUE DES ÉVÉNEMENTS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold border-b text-[10px] uppercase">
                <th className="p-3.5">Horodatage</th>
                <th className="p-3.5">Auteur & Rôle</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Module</th>
                <th className="p-3.5">Réf Objet</th>
                <th className="p-3.5">Détails & Modifications</th>
                <th className="p-3.5 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log, idx) => (
                <tr key={`${log.id}-${idx}`} className="hover:bg-slate-50 font-mono text-[11px] transition">
                  <td className="p-3.5 text-slate-500 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {log.timestamp}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-900">
                    <span className="block font-bold">{log.user}</span>
                    <span className="text-[10px] text-blue-600 font-normal">{log.role}</span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      log.action.includes('SUPPRESSION') || log.action.includes('REJET')
                        ? 'bg-rose-100 text-rose-800'
                        : log.action.includes('VALIDATION') || log.action.includes('APPROBATION')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-700">{log.module}</td>
                  <td className="p-3.5 font-bold text-blue-800">{log.objectRef || '—'}</td>
                  <td className="p-3.5 text-slate-600 font-sans max-w-[320px] truncate">
                    {log.newValue || log.oldValue || '—'}
                    {log.justification && (
                      <span className="block italic text-[10px] text-amber-700 mt-0.5 truncate">
                        Justification: {log.justification}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right font-sans">
                    <button
                      onClick={() => setSelectedLogForDetail(log)}
                      className="text-blue-600 hover:text-blue-800 font-extrabold text-[11px] hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <Eye size={13} /> Inspecter
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold font-sans">
                    Aucun événement ne correspond à vos critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INSPECTION DÉTAILLÉE D'UN LOG */}
      {selectedLogForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-600" />
                Détail de l'Événement Audit : {selectedLogForDetail.id}
              </h3>
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Horodatage :</span>
                <strong className="text-slate-900">{selectedLogForDetail.timestamp}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Auteur & Rôle :</span>
                <strong className="text-blue-800">{selectedLogForDetail.user} ({selectedLogForDetail.role})</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Action Exécutée :</span>
                <strong className="text-purple-800">{selectedLogForDetail.action}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Module ERP & Réf :</span>
                <strong className="text-slate-900">{selectedLogForDetail.module} / {selectedLogForDetail.objectRef || 'Général'}</strong>
              </div>
            </div>

            {selectedLogForDetail.oldValue && (
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-slate-600">Valeur Antérieure :</span>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 font-mono text-xs">
                  {selectedLogForDetail.oldValue}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[11px] font-extrabold text-slate-600">Nouvelle Valeur & Données Transmises :</span>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 font-mono text-xs">
                {selectedLogForDetail.newValue || 'Aucune donnée additionnelle'}
              </div>
            </div>

            {selectedLogForDetail.justification && (
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-amber-800">Justification Opérationnelle :</span>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-xs italic">
                  {selectedLogForDetail.justification}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuditTrailModule;
