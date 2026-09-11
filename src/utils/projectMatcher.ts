import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../core/database/realSongonDsData';

export const isProjectMatch = (idOrCode1?: string, idOrCode2?: string): boolean => {
  if (!idOrCode1 || !idOrCode2) return false;
  const s1 = String(idOrCode1).trim().toUpperCase();
  const s2 = String(idOrCode2).trim().toUpperCase();

  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // Songon aliases: CIV-2026-ASS-SON-001, CIV-2026-ST-SONG-002, SONGON-ST, SONGON, ABIDJAN OUEST, SON
  const isSongon1 = s1.includes('SONG') || s1.includes('SON-001') || s1.includes('SON') || s1.includes('ABIDJAN OUEST');
  const isSongon2 = s2.includes('SONG') || s2.includes('SON-001') || s2.includes('SON') || s2.includes('ABIDJAN OUEST');
  if (isSongon1 && isSongon2) return true;

  // Bingerville aliases: CIV-2026-ASS-BEN-002, BINGERVILLE, ABIDJAN EST, BEN, BEN-002, BING
  const isBing1 = s1.includes('BING') || s1.includes('BEN') || s1.includes('BEN-002') || s1.includes('ABIDJAN EST');
  const isBing2 = s2.includes('BING') || s2.includes('BEN') || s2.includes('BEN-002') || s2.includes('ABIDJAN EST');
  if (isBing1 && isBing2) return true;

  return false;
};

export const isReportForProject = (report: any, project: any): boolean => {
  if (!report) return false;
  if (!project) return true;

  const targetId = typeof project === 'string' ? project : (project.id || project.code || '');
  const targetCode = typeof project === 'object' ? (project.code || project.id || '') : project;
  const targetName = typeof project === 'object' ? (project.name || '') : '';

  const rProjId = report.projectId || report.project_id || '';
  const rWbs = report.wbsCode || report.wbsId || '';
  const rName = report.projectName || report.project_name || '';

  if (rProjId && (isProjectMatch(rProjId, targetId) || isProjectMatch(rProjId, targetCode))) return true;
  if (rWbs && (isProjectMatch(rWbs, targetId) || isProjectMatch(rWbs, targetCode))) return true;
  if (targetName && rName && (isProjectMatch(rName, targetName) || rName.toUpperCase().includes(targetName.toUpperCase()) || targetName.toUpperCase().includes(rName.toUpperCase()))) return true;

  // Check alias for Songon & Bingerville
  const pStr = `${targetId} ${targetCode} ${targetName}`.toUpperCase();
  const rStr = `${rProjId} ${rWbs} ${rName}`.toUpperCase();

  const isSongonProject = pStr.includes('SON') || pStr.includes('SONGON') || pStr.includes('ABIDJAN OUEST');
  const isReportSongon = rStr.includes('SON') || rStr.includes('SONGON') || rStr.includes('ABIDJAN OUEST');
  if (isSongonProject && isReportSongon) return true;

  const isBingervilleProject = pStr.includes('BEN') || pStr.includes('BINGERVILLE') || pStr.includes('ABIDJAN EST');
  const isReportBingerville = rStr.includes('BEN') || rStr.includes('BINGERVILLE') || rStr.includes('ABIDJAN EST');
  if (isBingervilleProject && isReportBingerville) return true;

  if (isSongonProject && isReportBingerville) return false;
  if (isBingervilleProject && isReportSongon) return false;

  if (rProjId) {
    return (
      (targetId !== '' && (rProjId.toUpperCase().includes(targetId.toUpperCase()) || targetId.toUpperCase().includes(rProjId.toUpperCase()))) ||
      (targetCode !== '' && (rProjId.toUpperCase().includes(targetCode.toUpperCase()) || targetCode.toUpperCase().includes(rProjId.toUpperCase())))
    );
  }

  return true;
};

/**
 * Récupère les nœuds WBS aplatis d'un projet.
 * Cherche d'abord dans wbsMap, puis fait un fallback sur les données SSOT de référence.
 * Garantit que le moteur SSOT reçoit toujours des nœuds WBS, peu importe la clé d'indexation.
 */
export const getProjectWbsNodes = (project: any, wbsMap: Record<string, any[]> = {}): any[] => {
  if (!project) return [];

  const pCode = String(project.code || '').toUpperCase();
  const pId = String(project.id || '').toUpperCase();
  const pName = String(project.name || '').toUpperCase();

  const isBingerville = pCode.includes('BEN') || pId.includes('BEN') || pName.includes('BINGERVILLE') || pId === 'CIV-2026-ASS-BEN-002';
  const isSongon = pCode.includes('SON') || pId.includes('SON') || pName.includes('SONGON') || pId === 'CIV-2026-ASS-SON-001';

  // 1. Chercher dans wbsMap par id ou code direct
  let rawList = (wbsMap && (wbsMap[project.id] || wbsMap[project.code])) || [];

  // 2. Si non trouvé, chercher par correspondance fuzzy
  if (!rawList || rawList.length === 0) {
    const matchedKey = Object.keys(wbsMap || {}).find(key =>
      isProjectMatch(key, project.id) || isProjectMatch(key, project.code)
    );
    rawList = matchedKey ? wbsMap[matchedKey] : [];
  }

  // 3. Fallback déterministe sur les données de référence SSOT (Songon vs Bingerville)
  if (!rawList || rawList.length === 0) {
    if (isBingerville) rawList = REAL_DS_BINGERVILLE_ACTIVITIES;
    else if (isSongon) rawList = REAL_DS_SONGON_ACTIVITIES;
    else rawList = REAL_DS_BINGERVILLE_ACTIVITIES;
  }

  // 4. Aplatir l'arborescence si présence d'enfants
  const flat: any[] = [];
  const walk = (nodes: any[]) => {
    (nodes || []).forEach(item => {
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      } else {
        flat.push(item);
      }
    });
  };
  if (Array.isArray(rawList)) {
    walk(rawList);
  }

  return flat;
};
