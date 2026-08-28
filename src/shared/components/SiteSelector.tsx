import React from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { Building2, FolderKanban } from 'lucide-react';

interface SiteSelectorProps {
  className?: string;
  compact?: boolean;
}

export const SiteSelector: React.FC<SiteSelectorProps> = ({ className = '', compact = false }) => {
  const { currentUser, sites = [], projects = [], activeSiteId, setActiveSiteId } = useAppState();

  const isGlobalRole = (role: string) => {
    const norm = (role || '').toUpperCase().replace(/\s+/g, '_');
    return ['SUPER_ADMIN', 'SUPER_ADMINISTRATEUR', 'ADMIN', 'DIRECTION', 'DIRECTION_GENERALE', 'DIRECTEUR_PROJET', 'CONDUCTEUR_DE_TRAVAUX', 'DAF', 'COMPTABLE', 'ACHATS', 'ACHETEUR'].includes(norm);
  };

  // Si 0 projet n'est enregistré dans la BDD MySQL
  if (projects.length === 0) {
    return (
      <div className={`flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs ${className}`}>
        <FolderKanban size={15} className="text-slate-400 shrink-0" />
        <span className="text-slate-500 font-semibold hidden sm:inline">Projet :</span>
        <span className="font-extrabold text-slate-700 dark:text-slate-200">Aucun projet enregistré</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 bg-blue-50/90 dark:bg-slate-800/90 border border-blue-200/80 dark:border-slate-700/80 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs transition-all hover:border-blue-300 dark:hover:border-slate-600 ${className}`}>
      <FolderKanban size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
      <span className="text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">Projet & Site :</span>
      <select
        value={String(activeSiteId)}
        onChange={e => {
          const val = e.target.value;
          setActiveSiteId(val);
        }}
        className="bg-transparent font-extrabold text-blue-950 dark:text-blue-200 focus:outline-none cursor-pointer pr-1 py-0.5 max-w-[280px] sm:max-w-xs truncate"
      >
        {isGlobalRole(currentUser?.role || '') && (
          <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
            🏢 Tous les projets ({projects.length} projets — Vue Globale)
          </option>
        )}
        {projects.map(p => {
          const matchedSite = sites.find(s => String(s.id) === String(p.siteId || (p as any).site_id));
          const siteName = matchedSite ? matchedSite.name : 'Chantier';
          const siteVal = p.id || p.code;

          return (
            <option key={p.id} value={siteVal} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
              📁 {p.name} ({p.code})
            </option>
          );
        })}
      </select>
    </div>
  );
};
