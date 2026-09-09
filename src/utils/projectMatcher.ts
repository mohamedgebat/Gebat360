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

  const isSongonProject = pStr.includes('SON') || pStr.includes('OUEST');
  const isReportSongon = rStr.includes('SON') || rStr.includes('OUEST');
  if (isSongonProject && isReportSongon) return true;

  const isBingervilleProject = pStr.includes('BEN') || pStr.includes('BING') || pStr.includes('EST');
  const isReportBingerville = rStr.includes('BEN') || rStr.includes('BING') || rStr.includes('EST');
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
