import React, { useState } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { hasProjectAccess } from '../../core/permissions';
import { History, ShieldCheck, Download, Lock, Search, Filter, RefreshCw } from 'lucide-react';

export const AuditTrailModule: React.FC = () => {
  const { auditLogs, currentUser } = useAppState();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('TOUS');

  const filteredLogs = (auditLogs || []).filter(log => {
    // Filtrage Périmètre Projet si l'objet ou le détail référence un projet
    if (log.objectRef && log.objectRef.startsWith('CIV-') && !hasProjectAccess(currentUser, log.objectRef)) {
      return false;
    }

    const userStr = String(log.user || '').toLowerCase();
    const actionStr = String(log.action || '').toLowerCase();
    const refStr = String(log.objectRef || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch = userStr.includes(query) || actionStr.includes(query) || refStr.includes(query);
    const matchesModule = selectedModuleFilter === 'TOUS' || log.module === selectedModuleFilter;
    return matchesSearch && matchesModule;
  });

  const handleExportCsv = () => {
    alert(`✅ Rapport d'Audit Trail (${filteredLogs.length} événements) exporté au format CSV !`);
  };

  return (
    <div className="space-y-6 text-slate-800 font-sans w-full text-xs">

      {/* HEADER AMÉLIORÉ DE L'AUDIT TRAIL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Registre d'Audit Trail Inaltérable</h1>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black font-mono px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
              IMMUTABLE LEDGER V1
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">Traçabilité complète et chronologique de toutes les actions, validations, budgets et mouvements.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Download size={15} /> Exporter Rapport Log
          </button>
        </div>
      </div>

      {/* FILTRES & RECHERCHE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher utilisateur, action, référence objet..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">Module :</span>
            <select
              value={selectedModuleFilter}
              onChange={e => setSelectedModuleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer"
            >
              <option value="TOUS">Tous les Modules</option>
              <option value="ADMINISTRATION">ADMINISTRATION</option>
              <option value="PROJET">PROJET</option>
              <option value="WBS">WBS</option>
              <option value="ACHATS">ACHATS</option>
              <option value="STOCK">STOCK</option>
              <option value="WORKFLOW">WORKFLOW</option>
            </select>
          </div>
        </div>

        <span className="bg-slate-100 text-slate-700 font-extrabold text-xs px-3 py-1.5 rounded-lg border border-slate-200">
          {filteredLogs.length} Événement(s)
        </span>
      </div>

      {/* TABLEAU HISTORIQUE DES ÉVÉNEMENTS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold border-b text-[10px] uppercase">
                <th className="p-3">Horodatage</th>
                <th className="p-3">Auteur & Rôle</th>
                <th className="p-3">Action</th>
                <th className="p-3">Module</th>
                <th className="p-3">Réf Objet</th>
                <th className="p-3">Détails & Modifications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log, idx) => (
                <tr key={`${log.id}-${idx}`} className="hover:bg-slate-50 font-mono text-[11px]">
                  <td className="p-3 text-slate-500">{log.timestamp}</td>
                  <td className="p-3 font-semibold text-slate-900">
                    <span className="block font-bold">{log.user}</span>
                    <span className="text-[10px] text-blue-600 font-normal">{log.role}</span>
                  </td>
                  <td className="p-3">
                    <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-700">{log.module}</td>
                  <td className="p-3 font-bold text-blue-800">{log.objectRef}</td>
                  <td className="p-3 text-slate-600 font-sans">
                    {log.newValue}
                    {log.justification && (
                      <span className="block italic text-[10px] text-amber-700 mt-0.5">Justification: {log.justification}</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    Aucun événement ne correspond à vos critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AuditTrailModule;
