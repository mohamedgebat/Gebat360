// Composant Panneau Latéral (Drawer) DataInsight — 3 Niveaux de Transparence et Traçabilité
import React from 'react';
import { DataInsightMetricConfig } from './types';
import {
  X, Info, Calculator, Database, ShieldCheck, Clock, Layers, ArrowRight,
  CheckCircle2, AlertTriangle, FileText, Activity, ExternalLink, Calendar, GitCommit
} from 'lucide-react';

interface DataInsightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: DataInsightMetricConfig;
  context?: any;
  onNavigate?: (view: string) => void;
}

export const DataInsightDrawer: React.FC<DataInsightDrawerProps> = ({
  isOpen,
  onClose,
  config,
  context,
  onNavigate
}) => {
  if (!isOpen) return null;

  const calculationResult = config.calculateValues ? config.calculateValues(context) : null;
  const scope = config.getScope ? config.getScope(context) : null;
  const lineage = config.getLineage ? config.getLineage(context) : config.sources;
  const lastUpdated = config.getLastUpdated ? config.getLastUpdated(context) : '24/08/2026 10:32';
  const transactionCount = config.getTransactionCount ? config.getTransactionCount(context) : undefined;
  const drillDownActions = config.getDrillDownActions ? config.getDrillDownActions(context) : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn font-sans text-slate-800">
      {/* Overlay sombre de fond avec effet flou léger */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">

          {/* EN-TÊTE PANNEAU LATÉRAL */}
          <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Info size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                  DATA INSIGHT & TRAÇABILITÉ
                </span>
                <h2 className="text-sm font-extrabold text-white tracking-tight line-clamp-1">
                  {config.title}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Fermer le panneau"
            >
              <X size={20} />
            </button>
          </div>

          {/* VALEUR ACTUELLE EN VEDETTE */}
          <div className="p-5 bg-gradient-to-br from-blue-900 to-slate-900 text-white border-b border-blue-800/40 space-y-1">
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">
              Valeur Calculée en Temps Réel
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-black font-mono tracking-tight text-white">
                {calculationResult?.currentValue || context?.value || 'Donnée active'}
              </strong>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 size={10} /> Donnée Réelle
              </span>
            </div>
          </div>

          {/* CORPS DE CONTENU : LES 3 NIVEAUX */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs divide-y divide-slate-100">

            {/* ================================================== */}
            {/* NIVEAU 1 — DÉFINITION MÉTIER */}
            {/* ================================================== */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold uppercase text-[11px]">
                <FileText size={14} className="text-blue-600" />
                <span>Niveau 1 — Définition Métier</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                {config.definition}
              </p>
            </div>

            {/* ================================================== */}
            {/* NIVEAU 2 — FORMULE & CALCUL DÉTAILLÉ */}
            {/* ================================================== */}
            <div className="space-y-3 pt-5">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold uppercase text-[11px]">
                <Calculator size={14} className="text-purple-600" />
                <span>Niveau 2 — Formule & Calcul</span>
              </div>

              {calculationResult && !calculationResult.isAvailable ? (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <span>Calcul non disponible : données insuffisantes</span>
                  </div>
                  <p className="text-[11px] text-amber-700 italic">
                    {calculationResult.missingReason || 'Certaines variables requises ne sont pas encore saisies.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {config.formulaDescription && (
                    <div className="bg-purple-50/70 border border-purple-200/80 p-3 rounded-xl font-mono text-[11px] text-purple-950 font-semibold leading-relaxed">
                      {config.formulaDescription}
                    </div>
                  )}

                  {calculationResult && calculationResult.breakdown && calculationResult.breakdown.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200/70 text-xs">
                      <div className="px-3 py-2 bg-slate-100 font-extrabold text-[10px] text-slate-500 uppercase">
                        Valeurs numériques utilisées dans la décomposition
                      </div>
                      {calculationResult.breakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 px-3 flex items-center justify-between ${
                            item.isResult ? 'bg-blue-50/80 font-bold text-blue-950 border-t border-blue-200' : 'text-slate-700'
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          <strong className="font-mono text-slate-900 font-bold">{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ================================================== */}
            {/* NIVEAU 3 — PERIMETRE, SOURCES & TRAÇABILITÉ */}
            {/* ================================================== */}
            <div className="space-y-4 pt-5">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold uppercase text-[11px]">
                <Database size={14} className="text-emerald-600" />
                <span>Niveau 3 — Périmètre & Traçabilité (Lineage)</span>
              </div>

              {/* Périmètre WBS / Projet */}
              {scope && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-200/60 pb-1">
                    PÉRIMÈTRE D’APPLICATION
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    {scope.projectName && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Projet :</span>
                        <strong className="text-slate-900 font-semibold">{scope.projectName}</strong>
                      </div>
                    )}
                    {scope.wbsCode && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Nœud WBS :</span>
                        <strong className="font-mono text-purple-700 font-bold">{scope.wbsCode}</strong>
                      </div>
                    )}
                    {scope.period && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">Période de calcul :</span>
                        <strong className="text-slate-800">{scope.period}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sources de données certifiées */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  SOURCES DE DONNÉES UTILISÉES
                </span>
                <div className="space-y-1">
                  {config.sources.map((src, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200 text-[11px] font-semibold">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>{src}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arbre de Lineage */}
              {lineage && lineage.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    ARBRE DE REMONTÉE TRAÇABILITÉ (DATA LINEAGE)
                  </span>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[10px] space-y-2">
                    {lineage.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <GitCommit size={12} className="text-blue-400 shrink-0" />
                        <span className={idx === lineage.length - 1 ? 'text-emerald-400 font-bold' : ''}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Horodatage & Synchronisation */}
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock size={13} className="text-slate-400" />
                  <span>Dernière synchro :</span>
                </div>
                <strong className="text-slate-900 font-bold">{lastUpdated}</strong>
              </div>

              {transactionCount !== undefined && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between text-[11px] font-mono text-blue-950">
                  <div className="flex items-center gap-1.5">
                    <Activity size={13} className="text-blue-600" />
                    <span>Transactions sources :</span>
                  </div>
                  <strong className="font-bold text-blue-900">{transactionCount} enregistrements</strong>
                </div>
              )}
            </div>

          </div>

          {/* PIED DE PAGE : BOUTONS D'ACTION DRILL-DOWN */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            {drillDownActions.length > 0 ? (
              drillDownActions.map((act, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate(act.targetView);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition shadow-sm"
                >
                  <span>{act.label}</span>
                  <ArrowRight size={14} />
                </button>
              ))
            ) : (
              <button
                onClick={onClose}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-xl text-xs transition"
              >
                Fermer le panneau
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
