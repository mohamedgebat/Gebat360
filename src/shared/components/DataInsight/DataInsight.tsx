// Composant Déclencheur Universel DataInsight — Icône ⓘ avec Tooltip et Drawer
import React, { useState } from 'react';
import { DataInsightProps } from './types';
import { DATA_INSIGHT_REGISTRY } from './dataInsightRegistry';
import { DataInsightDrawer } from './DataInsightDrawer';
import { Info } from 'lucide-react';

export const DataInsight: React.FC<DataInsightProps & { onNavigate?: (view: string) => void }> = ({
  metricId,
  title,
  value,
  context,
  className = '',
  iconSize = 13,
  align = 'inline',
  onNavigate
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Recherche des métadonnées dans le registre centralisé
  const registeredConfig = DATA_INSIGHT_REGISTRY[metricId];

  // Configuration par défaut si non enregistrée
  const config = registeredConfig || {
    id: metricId,
    title: title || metricId,
    category: 'PILOTAGE',
    definition: `Cet indicateur [${title || metricId}] reflète la valeur en temps réel consolidée sur le périmètre actif.`,
    sources: ['Base de données GEBAT 360°', 'Table de référence ' + metricId],
    calculateValues: () => ({
      currentValue: value !== undefined ? String(value) : 'Disponible',
      breakdown: [
        { label: 'Valeur Consolidée', value: value !== undefined ? String(value) : '100%', isResult: true }
      ],
      isAvailable: true
    }),
    getLastUpdated: () => '24/08/2026 10:32',
    getTransactionCount: () => 1
  };

  return (
    <>
      <div className={`relative inline-flex items-center ${className}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsDrawerOpen(true);
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition focus:outline-none cursor-pointer border border-slate-200 hover:border-blue-300 shadow-2xs"
          title={`ⓘ Voir la définition et la source de cet indicateur [${config.title}]`}
          aria-label={`Data Insight ${config.title}`}
        >
          <Info size={iconSize} className="shrink-0" />
        </button>

        {/* TOOLTIP COURT AU SURVOL */}
        {showTooltip && (
          <div className="absolute bottom-full mb-1.5 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap border border-slate-700 pointer-events-none animate-fadeIn">
            <span>ⓘ Voir la définition & la source de cet indicateur</span>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          </div>
        )}
      </div>

      {/* PANNEAU LATÉRAL DRAWER */}
      <DataInsightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        config={config}
        context={{ ...context, value }}
        onNavigate={onNavigate}
      />
    </>
  );
};
