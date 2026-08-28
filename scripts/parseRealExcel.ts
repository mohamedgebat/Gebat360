import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const dataDir = 'c:/Users/yacouba.mohamed/Documents/Projet_Digitalisation/Gebat/Gebat_360/Données';

// 1. Parse DS Bingerville
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

// 2. Parse DS Songon
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

// 3. Parse Production Suivi
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

const output = {
  bingervilleItems,
  songonItems,
  prodItems,
  stats: {
    bingervilleTotalMarche: bingervilleItems.reduce((s, i) => s + i.montantMarche, 0),
    bingervilleTotalDS: bingervilleItems.reduce((s, i) => s + i.montantDS, 0),
    songonTotalMarche: songonItems.reduce((s, i) => s + i.montantMarche, 0),
    songonTotalDS: songonItems.reduce((s, i) => s + i.montantDS, 0),
    productionTotal: prodItems.reduce((s, i) => s + i.totalMontantProd, 0)
  }
};

const targetPath = 'c:/Users/yacouba.mohamed/Documents/Projet_Digitalisation/Gebat/Gebat_360/src/data/parsedRealExcelData.json';
fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), 'utf-8');
console.log('Successfully written real parsed Excel data to:', targetPath);
