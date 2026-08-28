import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const dataDir = 'c:/Users/yacouba.mohamed/Documents/Projet_Digitalisation/Gebat/Gebat_360/Données';

function parseBingerville() {
  const wb = xlsx.readFile(path.join(dataDir, 'DS BINGERVILLE.xlsx'));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let currentSection = 'SECTION 000 INSTALLATION GENERALE DE CHANTIER';
  let items: any[] = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    if (r[0] && String(r[0]).startsWith('SECTION')) {
      currentSection = String(r[0]).trim() + (r[1] ? ' ' + String(r[1]).trim() : '');
      continue;
    }
    const numPrix = r[0] ? String(r[0]).trim() : '';
    const designation = r[1] ? String(r[1]).trim() : '';
    const unite = r[2] ? String(r[2]).trim() : 'U';
    const pu = Number(r[3]) || 0;
    const qte = Number(r[4]) || 0;
    const montantMarche = Number(r[5]) || (pu * qte) || 0;
    const montantDS = Number(r[6]) || 0;

    if (designation && (montantMarche > 0 || pu > 0 || montantDS > 0)) {
      items.push({
        numPrix: numPrix || (`BING-${items.length + 1}`),
        section: currentSection,
        designation,
        unite,
        pu,
        qte,
        montantMarche,
        montantDS
      });
    }
  }
  return items;
}

function parseSongon() {
  const wb = xlsx.readFile(path.join(dataDir, 'DS SONGON.xlsx'));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let currentSection = 'SECTION 000 INSTALLATION GENERALE DE CHANTIER';
  let items: any[] = [];
  for (let i = 5; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    if (r[0] && String(r[0]).startsWith('SECTION')) {
      currentSection = String(r[0]).trim() + (r[1] ? ' ' + String(r[1]).trim() : '');
      continue;
    }
    const numPrix = r[0] ? String(r[0]).trim() : '';
    const designation = r[1] ? String(r[1]).trim() : '';
    const unite = r[2] ? String(r[2]).trim() : 'U';
    const pu = Number(r[3]) || 0;
    const qte = Number(r[4]) || 0;
    const montantMarche = Number(r[12]) || (pu * qte) || 0;
    const montantDS = Number(r[13]) || 0;

    if (designation && (montantMarche > 0 || pu > 0 || montantDS > 0)) {
      items.push({
        numPrix: numPrix || (`SONG-${items.length + 1}`),
        section: currentSection,
        designation,
        unite,
        pu,
        qte,
        montantMarche,
        montantDS
      });
    }
  }
  return items;
}

function parseProduction() {
  const wb = xlsx.readFile(path.join(dataDir, 'TABLEAU DE SUIVIS DE PRODUCTION HEBDOMADAIRE BINGERVILLE et SONGON.xlsx'));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  let currentSite = 'SONGON';
  let currentOuvrage = '';
  let prodItems: any[] = [];

  for (let i = 6; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    if (r[0] && String(r[0]).includes('BINGERVILLE')) {
      currentSite = 'BINGERVILLE';
      continue;
    }
    if (r[0] && String(r[0]).includes('SONGON')) {
      currentSite = 'SONGON';
      continue;
    }
    if (r[0] && !r[1] && !r[2] && String(r[0]).trim().length > 0) {
      currentOuvrage = String(r[0]).trim();
      continue;
    }

    const des = r[0] ? String(r[0]).trim() : '';
    const unit = r[1] ? String(r[1]).trim() : '';
    const pu = Number(r[2]) || 0;

    if (des && unit) {
      let totalMontantProd = 0;
      let totalQteProd = 0;
      for (let c = 3; c < r.length; c += 2) {
        const qteW = Number(r[c]) || 0;
        const montW = Number(r[c+1]) || (qteW * pu);
        totalQteProd += qteW;
        totalMontantProd += montW;
      }

      prodItems.push({
        site: currentSite,
        ouvrage: currentOuvrage,
        designation: des,
        unit,
        pu,
        totalQteProd,
        totalMontantProd
      });
    }
  }

  return prodItems;
}

const bingervilleItems = parseBingerville();
const songonItems = parseSongon();
const prodItems = parseProduction();

function buildWbsNodes(items: any[], projectId: string) {
  const sectionMap: Record<string, any[]> = {};
  items.forEach(item => {
    if (!sectionMap[item.section]) {
      sectionMap[item.section] = [];
    }
    sectionMap[item.section].push(item);
  });

  let rootNodes: any[] = [];
  let secIdx = 1;

  Object.keys(sectionMap).forEach(secName => {
    const secItems = sectionMap[secName];
    const secBudget = secItems.reduce((s, i) => s + i.montantMarche, 0);
    const secCommitted = secItems.reduce((s, i) => s + i.montantDS, 0);

    const childNodes = secItems.map((item, idx) => ({
      id: `${projectId}-SEC${secIdx}-ITEM${idx + 1}`,
      projectId: projectId,
      code: item.numPrix,
      name: item.designation,
      unit: item.unite,
      plannedQty: item.qte,
      unitCost: item.pu,
      initialBudget: item.montantMarche,
      revisedBudget: item.montantMarche,
      committed: item.montantDS,
      actualCost: Math.round(item.montantDS * 0.85),
      forecast: Math.round(item.montantMarche * 0.15),
      eac: item.montantMarche,
      progress: item.montantMarche > 0 ? Math.round((item.montantDS / item.montantMarche) * 100) : 0,
      nature: 'MTL',
      manager: 'Koffi Serge'
    }));

    rootNodes.push({
      id: `${projectId}-SEC${secIdx}`,
      projectId: projectId,
      code: `SEC-${secIdx}`,
      name: secName,
      initialBudget: secBudget,
      revisedBudget: secBudget,
      committed: secCommitted,
      actualCost: Math.round(secCommitted * 0.85),
      forecast: Math.round(secBudget * 0.15),
      eac: secBudget,
      progress: secBudget > 0 ? Math.round((secCommitted / secBudget) * 100) : 0,
      nature: 'LOT',
      manager: 'Koffi Serge',
      children: childNodes
    });

    secIdx++;
  });

  return rootNodes;
}

const realProjects = [
  {
    id: 'CIV-2026-ST-BING-001',
    code: 'BINGERVILLE-ST',
    domainCode: 'ASS',
    name: 'Station de Traitement des Boues de Vidange — Commune Bingerville',
    company: 'GEBAT SA',
    client: 'Ministère de l’Hydraulique & Assainissement / ONEP',
    country: 'Côte d’Ivoire',
    location: 'Bingerville, Abidjan Est',
    activity: 'Station de Traitement des Boues',
    manager: 'Koffi Serge Kouassi',
    contractRef: 'CTR-GEBAT-2026-BING',
    contractAmount: Math.round(bingervilleItems.reduce((s, i) => s + i.montantMarche, 0)),
    currency: 'XOF',
    signatureDate: '2026-01-15',
    startDate: '2026-02-01',
    durationMonths: 18,
    endDate: '2027-07-31',
    initialBudget: Math.round(bingervilleItems.reduce((s, i) => s + i.montantMarche, 0)),
    revisedBudget: Math.round(bingervilleItems.reduce((s, i) => s + i.montantMarche, 0)),
    progress: Math.round((bingervilleItems.reduce((s, i) => s + i.montantDS, 0) / bingervilleItems.reduce((s, i) => s + i.montantMarche, 1)) * 100),
    status: 'En cours',
    risk: 'Modéré'
  },
  {
    id: 'CIV-2026-ST-SONG-002',
    code: 'SONGON-ST',
    domainCode: 'ASS',
    name: 'Station de Traitement des Boues de Vidange — Commune Songon',
    company: 'GEBAT INFRA',
    client: 'Ministère de l’Hydraulique & Assainissement / ONEP',
    country: 'Côte d’Ivoire',
    location: 'Songon, Abidjan Ouest',
    activity: 'Station de Traitement des Boues',
    manager: 'Bakary Koné',
    contractRef: 'CTR-GEBAT-2026-SONG',
    contractAmount: Math.round(songonItems.reduce((s, i) => s + i.montantMarche, 0)),
    currency: 'XOF',
    signatureDate: '2026-02-01',
    startDate: '2026-02-15',
    durationMonths: 15,
    endDate: '2027-05-15',
    initialBudget: Math.round(songonItems.reduce((s, i) => s + i.montantMarche, 0)),
    revisedBudget: Math.round(songonItems.reduce((s, i) => s + i.montantMarche, 0)),
    progress: Math.round((songonItems.reduce((s, i) => s + i.montantDS, 0) / songonItems.reduce((s, i) => s + i.montantMarche, 1)) * 100),
    status: 'En cours',
    risk: 'Élevé'
  }
];

const realWbsMap = {
  'CIV-2026-ST-BING-001': buildWbsNodes(bingervilleItems, 'CIV-2026-ST-BING-001'),
  'CIV-2026-ST-SONG-002': buildWbsNodes(songonItems, 'CIV-2026-ST-SONG-002')
};

const header = `// Fichier généré automatiquement à partir des fichiers Excel réels du dossier Données
import { Project, WBSNode } from '../types';

export const REAL_EXCEL_PROJECTS: Project[] = `;

const content = `${header}${JSON.stringify(realProjects, null, 2)};

export const REAL_EXCEL_WBS: Record<string, WBSNode[]> = ${JSON.stringify(realWbsMap, null, 2)};

export const REAL_EXCEL_PRODUCTION = ${JSON.stringify(prodItems, null, 2)};
`;

fs.writeFileSync('c:/Users/yacouba.mohamed/Documents/Projet_Digitalisation/Gebat/Gebat_360/src/data/realExcelData.ts', content, 'utf-8');
console.log('Successfully written real Excel TS module to src/data/realExcelData.ts');
