import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle,
  X, ArrowRight, ArrowLeft, RefreshCw, Check, Layers, Info, Filter, Search, Calculator, ChevronRight, Download
} from 'lucide-react';
import { WBSNode, CostNature } from '../../types';

interface DSImportModalProps {
  projectId: string;
  projectName: string;
  projectCode: string;
  isOpen: boolean;
  onClose: () => void;
  existingWbsNodes?: WBSNode[];
  onOpenDqeImport?: () => void;
  onConfirmImport: (
    dsActivities: ParsedDSActivity[],
    summary: {
      totalMarket: number;
      totalDs: number;
      theoreticalMargin: number;
      marginRate: number;
      matchedDqeCount: number;
      discrepancyCount: number;
      useDsMarketAmount: boolean;
    }
  ) => void;
}

export interface ParsedDSActivity {
  id: string;
  priceNo: string;
  description: string;
  unit: string;
  quantity: number;
  marketUnitPrice: number;
  dqeMarketAmount: number;
  dsMarketAmount: number;
  marketAmount: number; // Official market amount (from DQE master)
  dsUnitPrice: number;
  dsAmount: number;
  theoreticalMargin: number;
  marginRate: number;
  fileType: 'SYNTHESE' | 'DETALLE';
  matchStatus: 'MATCH' | 'ÉCART' | 'DQE' | 'SANS_DQE';
  discrepancyAmount?: number;
  discrepancyPct?: number;
  status: 'Conforme' | 'Incomplet' | 'Duplicata';
}

interface ColumnMapping {
  priceNo: string;
  description: string;
  unit: string;
  quantity: string;
  marketUnitPrice: string;
  marketAmount: string;
  dsUnitPrice: string;
  dsAmount: string;
}

// Clean number parser for FCFA (handles spaces, NBSP, commas, dots, currency symbols) -> Rounds to whole integers
const parseCleanNumber = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  
  let str = String(val).trim();
  if (!str) return 0;

  // Replace non-breaking spaces and all unicode space variants
  str = str.replace(/[\s\u00a0\u202f\u1680\u2000-\u200a\u205f\u3000]/g, '');

  // Strip currency words and symbols
  str = str.replace(/FCFA|FCF|EUR|USD|\$|€|F/gi, '');

  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = parts[0] + '.' + parts[1];
    } else {
      str = str.replace(/,/g, '');
    }
  }

  const cleanStr = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : Math.round(parsed);
};

// Check if a row is a summary / total row in Excel to prevent double counting
const isSummaryRow = (description: string, priceNo: string): boolean => {
  const normDesc = (description || '').toUpperCase().trim();
  const normPrice = (priceNo || '').toUpperCase().trim();
  if (/^SECTION|^SOUS-TOTAL|^SOUS TOTAL|^RECAPITULATIF|^TOTAL|^MONTANT TOTAL|^GENERAL TOTAL|^RECAPITULATION/i.test(normDesc)) return true;
  if (/^SECTION|^SOUS-TOTAL|^SOUS TOTAL|^TOTAL|^RECAP|^SUMMARY/i.test(normPrice)) return true;
  return false;
};

export const DSImportModal: React.FC<DSImportModalProps> = ({
  projectId,
  projectName,
  projectCode,
  isOpen,
  onClose,
  existingWbsNodes = [],
  onOpenDqeImport,
  onConfirmImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'confirm'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileTypeDetected, setFileTypeDetected] = useState<'SYNTHESE' | 'DETALLE'>('SYNTHESE');

  // Option activée/désactivée pour le contrôle de la colonne Montant Marché HT du DS (Section 4 & 5)
  // Default: false = DQE est la source officielle (MASTER)
  const [useDsMarketAmount, setUseDsMarketAmount] = useState<boolean>(false);

  const [mapping, setMapping] = useState<ColumnMapping>({
    priceNo: '',
    description: '',
    unit: '',
    quantity: '',
    marketUnitPrice: '',
    marketAmount: '',
    dsUnitPrice: '',
    dsAmount: ''
  });

  const [parsedDsActivities, setParsedDsActivities] = useState<ParsedDSActivity[]>([]);

  if (!isOpen) return null;

  // Flatten existing WBS nodes (DQE) for matching
  const flatExistingWbs = (() => {
    const list: WBSNode[] = [];
    const flatten = (nodes: WBSNode[]) => {
      nodes.forEach(n => {
        list.push(n);
        if (n.children && n.children.length > 0) flatten(n.children);
      });
    };
    flatten(existingWbsNodes);
    return list;
  })();

  // Check if project has contractual DQE data
  const hasExistingDqe = flatExistingWbs.some(w => Number(w.contractAmount || 0) > 0 || (w.contractUnitPrice && w.contractUnitPrice > 0));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (!data || data.length === 0) {
          alert('Le fichier sélectionné est vide.');
          return;
        }

        let headerIndex = 0;
        for (let i = 0; i < Math.min(data.length, 10); i++) {
          if (Array.isArray(data[i]) && data[i].some((cell: any) => typeof cell === 'string' && String(cell).trim().length > 0)) {
            headerIndex = i;
            break;
          }
        }

        const fileHeaders = (data[headerIndex] || []).map((h: any, colIdx: number) => {
          const str = String(h || '').trim();
          return str.length > 0 ? str : `[Colonne ${colIdx + 1}]`;
        });
        setHeaders(fileHeaders);

        const rowsData = data.slice(headerIndex + 1).filter((r: any) => Array.isArray(r) && r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== ''));
        setRawRows(rowsData);

        // Robust auto-detection of column headers
        const autoMap: ColumnMapping = {
          priceNo: '',
          description: '',
          unit: '',
          quantity: '',
          marketUnitPrice: '',
          marketAmount: '',
          dsUnitPrice: '',
          dsAmount: ''
        };

        fileHeaders.forEach((h: string) => {
          const norm = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (/designation|libelle|description|intitule|activite|travaux|ouvrage/i.test(norm) && !autoMap.description) {
            autoMap.description = h;
          }
          else if (/n°|prix|ref|code|wbs|num|art/i.test(norm) && !autoMap.priceNo && !/designation|libelle|description/i.test(norm)) {
            autoMap.priceNo = h;
          }
          else if (/unite|^u$|u\.m\./i.test(norm) && !autoMap.unit) {
            autoMap.unit = h;
          }
          else if (/quantite|qte|qty|volume|nombre/i.test(norm) && !autoMap.quantity) {
            autoMap.quantity = h;
          }
          else if (/pu marche|pu client|pu contractuel|pu vente/i.test(norm) && !autoMap.marketUnitPrice) {
            autoMap.marketUnitPrice = h;
          }
          else if (/montant marche|montant client|montant contractuel|marche ht/i.test(norm) && !autoMap.marketAmount) {
            autoMap.marketAmount = h;
          }
          else if (/pu ds|pu debourse|cout unitaire/i.test(norm) && !autoMap.dsUnitPrice) {
            autoMap.dsUnitPrice = h;
          }
          else if (/montant ds|debourse sec|cout total|montant debourse|debourse ht|debourse|total ds|ds ht|montant/i.test(norm) && !autoMap.dsAmount && !/marche|client|contractuel/i.test(norm)) {
            autoMap.dsAmount = h;
          }
        });

        const hasResourceCol = fileHeaders.some(h => /nature|ressource|categorie|mo|mat|mtl/i.test(h));
        setFileTypeDetected(hasResourceCol ? 'DETALLE' : 'SYNTHESE');

        setMapping(autoMap);
        setStep('mapping');
      } catch (err) {
        alert('Erreur lors de la lecture du fichier Excel / DS.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const processPreview = () => {
    if (!mapping.description) {
      alert('Veuillez sélectionner au moins la colonne Désignation.');
      return;
    }

    const priceNoIdx = headers.indexOf(mapping.priceNo);
    const descIdx = headers.indexOf(mapping.description);
    const unitIdx = headers.indexOf(mapping.unit);
    const qtyIdx = headers.indexOf(mapping.quantity);
    const puMktIdx = headers.indexOf(mapping.marketUnitPrice);
    const amtMktIdx = headers.indexOf(mapping.marketAmount);
    const puDsIdx = headers.indexOf(mapping.dsUnitPrice);
    const amtDsIdx = headers.indexOf(mapping.dsAmount);

    const itemsMap: ParsedDSActivity[] = [];
    let currentParent: ParsedDSActivity | null = null;

    rawRows.forEach((row: any[], index: number) => {
      let rawPriceNo = priceNoIdx >= 0 ? String(row[priceNoIdx] || '').trim() : '';
      let description = descIdx >= 0 ? String(row[descIdx] || '').trim() : '';
      const unit = unitIdx >= 0 ? String(row[unitIdx] || 'U').trim() : 'U';

      // Ignore section headers and subtotal / summary rows
      if (isSummaryRow(description, rawPriceNo)) return;
      if (!rawPriceNo && !description) return; // Skip blank summary rows in Excel

      const qty = parseCleanNumber(qtyIdx >= 0 ? row[qtyIdx] : 0);
      const puMkt = parseCleanNumber(puMktIdx >= 0 ? row[puMktIdx] : 0);
      let dsMarketAmount = amtMktIdx >= 0 ? parseCleanNumber(row[amtMktIdx]) : 0;
      if (dsMarketAmount === 0 && qty > 0 && puMkt > 0) dsMarketAmount = Math.round(qty * puMkt);

      // Extract ONLY DS amounts from the DS file!
      let amtDs = parseCleanNumber(amtDsIdx >= 0 ? row[amtDsIdx] : 0);
      let puDs = parseCleanNumber(puDsIdx >= 0 ? row[puDsIdx] : 0);
      if (amtDs === 0 && puDs > 0 && qty > 0) amtDs = Math.round(qty * puDs);

      // Search matching DQE node to get OFFICIAL MARKET AMOUNT
      const matchedDqeNode = flatExistingWbs.find(w =>
        (w.priceNo && w.priceNo.trim().toUpperCase() === rawPriceNo.toUpperCase()) ||
        w.code.trim().toUpperCase() === rawPriceNo.toUpperCase() ||
        (w.name && description && description.length > 3 && w.name.toLowerCase().includes(description.toLowerCase()))
      );

      const dqeMarketAmount = matchedDqeNode && Number(matchedDqeNode.contractAmount || 0) > 0
        ? Math.round(Number(matchedDqeNode.contractAmount || (matchedDqeNode.contractUnitPrice * matchedDqeNode.contractQty) || 0))
        : (dsMarketAmount > 0 ? dsMarketAmount : 0);

      const isParentRow = Boolean(rawPriceNo && (dqeMarketAmount > 0 || /^\d+(\.\d+)*/.test(rawPriceNo)));

      if (isParentRow) {
        currentParent = {
          id: `ds-act-${itemsMap.length + 1}`,
          priceNo: rawPriceNo,
          description: description || `Activité N°${rawPriceNo}`,
          unit: unit || 'U',
          quantity: qty || 1,
          marketUnitPrice: matchedDqeNode?.contractUnitPrice || puMkt || (qty > 0 ? Math.round(dqeMarketAmount / qty) : 0),
          dqeMarketAmount,
          dsMarketAmount,
          marketAmount: dqeMarketAmount,
          dsUnitPrice: puDs,
          dsAmount: amtDs, // Extracted from DS file (will accumulate from sub-resources if 0)
          theoreticalMargin: 0,
          marginRate: 0,
          fileType: fileTypeDetected,
          matchStatus: hasExistingDqe ? 'DQE' : 'SANS_DQE',
          status: 'Conforme'
        };

        itemsMap.push(currentParent);
      } else if (currentParent && (amtDs > 0 || description)) {
        // Sub-resource row under currentParent -> Add its DS cost to currentParent
        currentParent.dsAmount += amtDs;
        if (currentParent.quantity > 0) {
          currentParent.dsUnitPrice = Math.round(currentParent.dsAmount / currentParent.quantity);
        }
      } else if (!currentParent) {
        // Standalone DS activity row
        const priceNo = rawPriceNo || `PX-${itemsMap.length + 1}`;
        const item: ParsedDSActivity = {
          id: `ds-act-${itemsMap.length + 1}`,
          priceNo,
          description: description || `Prix N°${priceNo}`,
          unit: unit || 'U',
          quantity: qty || 1,
          marketUnitPrice: puMkt,
          dqeMarketAmount: dsMarketAmount,
          dsMarketAmount,
          marketAmount: dsMarketAmount,
          dsUnitPrice: puDs,
          dsAmount: amtDs,
          theoreticalMargin: 0,
          marginRate: 0,
          fileType: fileTypeDetected,
          matchStatus: 'SANS_DQE',
          status: 'Conforme'
        };
        itemsMap.push(item);
      }
    });

    // Re-calculate margins and match statuses
    itemsMap.forEach(item => {
      item.theoreticalMargin = Math.round(item.marketAmount - item.dsAmount);
      item.marginRate = item.marketAmount > 0 ? parseFloat(((item.theoreticalMargin / item.marketAmount) * 100).toFixed(1)) : 0;
    });

    setParsedDsActivities(itemsMap);
    setStep('preview');
  };

  // Exact whole integer calculations
  const totalDsSum = Math.round(parsedDsActivities.reduce((s, a) => s + (a.dsAmount || 0), 0));

  const officialDqeMasterTotal = Math.round(
    flatExistingWbs.filter(w => Number(w.contractAmount || 0) > 0).reduce((s, w) => s + Number(w.contractAmount || 0), 0)
  );

  const sumParsedMarket = Math.round(parsedDsActivities.reduce((s, a) => s + (a.marketAmount || 0), 0));
  
  const totalMarketSum = officialDqeMasterTotal > 1_000_000_000
    ? officialDqeMasterTotal
    : (sumParsedMarket > 0 ? sumParsedMarket : (officialDqeMasterTotal > 0 ? officialDqeMasterTotal : totalDsSum));

  const totalMarginSum = Math.round(totalMarketSum - totalDsSum);
  const globalMarginRate = totalMarketSum > 0 ? ((totalMarginSum / totalMarketSum) * 100).toFixed(1) : '0';

  const discrepancyItems = parsedDsActivities.filter(a => a.matchStatus === 'ÉCART');

  const handleFinalConfirm = () => {
    const matchedDqeCount = parsedDsActivities.filter(a => a.matchStatus === 'MATCH' || a.matchStatus === 'DQE').length;
    const discrepancyCount = discrepancyItems.length;

    onConfirmImport(parsedDsActivities, {
      totalMarket: totalMarketSum,
      totalDs: totalDsSum,
      theoreticalMargin: totalMarginSum,
      marginRate: parseFloat(globalMarginRate),
      matchedDqeCount,
      discrepancyCount,
      useDsMarketAmount
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/30 rounded-xl text-emerald-400 border border-emerald-500/30">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                IMPORTER DÉBOURSÉ SEC (DS) — COÛT PRÉVISIONNEL
              </h2>
              <p className="text-slate-400 text-[11px]">
                Projet : <strong className="text-white">{projectName}</strong> ({projectCode})
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* STEPPER */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-[11px] font-extrabold">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Sélection du Fichier DS</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />

          <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Mappage Synthèse & Options</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />

          <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
            <span>Prévisualisation & Rapprochement DQE</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />

          <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
            <span>Validation Budget DS</span>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="text-center py-12 space-y-4 max-w-lg mx-auto">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-10 bg-slate-50/50 hover:bg-emerald-50/30 transition cursor-pointer space-y-3"
              >
                <Upload size={44} className="text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold text-slate-800">Glissez-déposez le fichier Déboursé Sec (DS) ou cliquez pour parcourir</h3>
                <p className="text-slate-500 text-[11px]">Formats acceptés : Excel (.xlsx, .xls) ou CSV (.csv)</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left text-[11px] text-blue-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5 text-blue-900">
                  <Info size={15} className="text-blue-600 shrink-0" /> DQE = Source Officielle des Données Marché (Section 1) :
                </div>
                <p className="text-blue-800 leading-relaxed">
                  Le DQE est le référentiel officiel du marché. Lors de l'import du DS, la colonne <strong>"Montant Marché HT"</strong> est facultative. Si un DQE existe déjà pour ce projet, ses montants marché sont automatiquement associés aux prix du DS.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING & OPTIONS (SECTION 3 & 4) */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Correspondance des Colonnes DS</h3>
                  <p className="text-slate-500 text-[11px]">
                    Fichier : <strong>{fileName}</strong> | Type Détecté : <strong className="text-emerald-700">{fileTypeDetected === 'SYNTHESE' ? 'Fichier Synthèse Marché + DS' : 'Fichier DS Détaillé par Ressources'}</strong>
                  </p>
                </div>
              </div>

              {/* BANDEAU INFORMATIF COLONNE FACULTATIVE */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-[11.5px] text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    <strong>Le Montant Marché HT est facultatif.</strong> Lorsqu'un DQE est déjà associé au projet, cette information est automatiquement récupérée depuis le DQE.
                  </span>
                </div>
              </div>

              {/* COLONNES OBLIGATOIRES */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider border-b pb-1">
                  COLONNES OBLIGATOIRES
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">N° Prix / Code Activité WBS <span className="text-rose-600">*</span></label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                      value={mapping.priceNo}
                      onChange={e => setMapping({ ...mapping, priceNo: e.target.value })}
                    >
                      <option value="">-- Sélectionner la colonne --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Désignation / Intitulé Activité <span className="text-rose-600">*</span></label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                      value={mapping.description}
                      onChange={e => setMapping({ ...mapping, description: e.target.value })}
                    >
                      <option value="">-- Sélectionner la colonne --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unité</label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                      value={mapping.unit}
                      onChange={e => setMapping({ ...mapping, unit: e.target.value })}
                    >
                      <option value="">-- Sélectionner la colonne --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantité <span className="text-rose-600">*</span></label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                      value={mapping.quantity}
                      onChange={e => setMapping({ ...mapping, quantity: e.target.value })}
                    >
                      <option value="">-- Sélectionner la colonne --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Montant DS (Déboursé Sec Prévisionnel) <span className="text-rose-600">*</span></label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                      value={mapping.dsAmount}
                      onChange={e => setMapping({ ...mapping, dsAmount: e.target.value })}
                    >
                      <option value="">-- Sélectionner la colonne --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* COLONNES OPTIONNELLES */}
              <div className="space-y-2 pt-2">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider border-b pb-1 flex items-center justify-between">
                  <span>COLONNES OPTIONNELLES (FACULTATIVES)</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">Facultatif</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">PU DS / Coût Unitaire DS (Optionnel)</label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                      value={mapping.dsUnitPrice}
                      onChange={e => setMapping({ ...mapping, dsUnitPrice: e.target.value })}
                    >
                      <option value="">-- Aucun (Calculé auto via Montant / Qté) --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Montant Marché HT (Fichier DS)</label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                      value={mapping.marketAmount}
                      onChange={e => setMapping({ ...mapping, marketAmount: e.target.value })}
                    >
                      <option value="">-- Aucun (Récupération 100% depuis le DQE) --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* OPTION COMPORTEMENT MARCHÉ DS (SECTION 4 DU CAHIER DES CHARGES) */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">
                  DONNÉES MARCHÉ DU FICHIER DS
                </h4>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={useDsMarketAmount}
                    onChange={e => setUseDsMarketAmount(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <strong className="text-slate-900 block font-bold">
                      Utiliser la colonne "Montant Marché HT" du fichier DS si elle existe (Pour contrôle / rapprochement uniquement)
                    </strong>
                    <span className="text-slate-500 text-[11px] leading-relaxed block mt-0.5">
                      {useDsMarketAmount
                        ? "• Le système lira la colonne pour comparaison. Les écarts DQE vs DS seront signalés. La valeur DQE restera la référence officielle."
                        : "• Le système ignorera cette colonne et récupérera 100% du Montant Marché HT depuis le DQE associé au projet."
                      }
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & MARGIN CHECK WITH DQE RECONCILIATION */}
          {step === 'preview' && (
            <div className="space-y-4">

              {/* BANDEAU ATTENTION SANS DQE (SECTION 7) */}
              {!hasExistingDqe && (
                <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <div>
                      <strong>Attention : Aucun DQE n'est associé à ce projet.</strong>
                      <p className="text-[11px] text-amber-800">Les données Marché ne pourront pas être automatiquement récupérées depuis le DQE.</p>
                    </div>
                  </div>
                  {onOpenDqeImport && (
                    <button
                      onClick={onOpenDqeImport}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg shadow-sm whitespace-nowrap cursor-pointer transition flex items-center gap-1 text-[11px]"
                    >
                      <Upload size={13} />
                      <span>[ Importer le DQE maintenant ]</span>
                    </button>
                  )}
                </div>
              )}

              {/* BANDEAU ÉCART DQE VS DS (SECTION 2 SCÉNARIO A & SECTION 12) */}
              {discrepancyItems.length > 0 && (
                <div className="bg-rose-50 border border-rose-300 p-3.5 rounded-xl text-xs text-rose-900 space-y-1.5">
                  <div className="font-extrabold flex items-center gap-2 text-rose-800">
                    <AlertCircle size={18} className="text-rose-600 shrink-0" />
                    <span>Écart(s) détecté(s) entre le Montant Marché HT du DS et le Montant Marché HT du DQE ({discrepancyItems.length} lignes)</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    Les valeurs du fichier DS diffèrent du référentiel DQE. Conformément aux règles métier, <strong>la valeur DQE reste la référence officielle</strong> et n'est pas remplacée.
                  </p>
                </div>
              )}

              {/* SUMMARY CARDS WITH CLEAN INTEGER FORMATTING */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-slate-900 text-white p-3 rounded-xl">
                  <div className="text-slate-300 font-bold text-[10px]">MONTANT MARCHÉ (DQE MASTER)</div>
                  <div className="text-lg font-black">{totalMarketSum.toLocaleString('fr-FR')} FCFA</div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-bold text-[10px]">BUDGET DS INITIAL TOTAL (EXACT)</div>
                  <div className="text-lg font-black text-blue-900">{totalDsSum.toLocaleString('fr-FR')} FCFA</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-bold text-[10px]">MARGE THÉORIQUE INITIALE</div>
                  <div className="text-lg font-black text-emerald-700">{totalMarginSum.toLocaleString('fr-FR')} FCFA</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-bold text-[10px]">TAUX DE MARGE INITIAL</div>
                  <div className="text-lg font-black text-amber-800">{globalMarginRate}%</div>
                </div>
              </div>

              {/* TABLE PREVIEW COMPLÈTE (SECTION 8) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold text-[10.5px] uppercase sticky top-0">
                    <tr>
                      <th className="p-2 border-b">N° Prix</th>
                      <th className="p-2 border-b">Désignation</th>
                      <th className="p-2 border-b text-center">Unité</th>
                      <th className="p-2 border-b text-right">Qté</th>
                      <th className="p-2 border-b text-right text-blue-900">Montant DS</th>
                      <th className="p-2 border-b text-right text-emerald-800">Montant Marché DQE</th>
                      <th className="p-2 border-b text-right text-slate-500">Montant Marché DS</th>
                      <th className="p-2 border-b text-center">Statut Rapprochement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedDsActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold text-slate-900">{act.priceNo}</td>
                        <td className="p-2 text-slate-800 font-bold max-w-xs truncate" title={act.description}>{act.description}</td>
                        <td className="p-2 text-center font-mono text-slate-500">{act.unit}</td>
                        <td className="p-2 text-right font-mono font-semibold">{act.quantity.toLocaleString('fr-FR')}</td>
                        <td className="p-2 text-right font-mono font-black text-blue-900">{act.dsAmount.toLocaleString('fr-FR')} FCFA</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-800">
                          {hasExistingDqe ? (act.dqeMarketAmount > 0 ? `${act.dqeMarketAmount.toLocaleString('fr-FR')} FCFA` : '-') : 'N/A (Sans DQE)'}
                        </td>
                        <td className="p-2 text-right font-mono text-slate-500">
                          {act.dsMarketAmount > 0 ? `${act.dsMarketAmount.toLocaleString('fr-FR')} FCFA` : 'N/A'}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          {act.matchStatus === 'ÉCART' ? (
                            <span className="px-2 py-0.5 bg-rose-100 border border-rose-300 text-rose-800 font-bold rounded-md text-[10px]" title={`Écart: ${act.discrepancyAmount?.toLocaleString('fr-FR')} FCFA (${act.discrepancyPct}%)`}>
                              ÉCART ({act.discrepancyPct}%)
                            </span>
                          ) : act.matchStatus === 'MATCH' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold rounded-md text-[10px]">
                              MATCH
                            </span>
                          ) : act.matchStatus === 'DQE' ? (
                            <span className="px-2 py-0.5 bg-blue-100 border border-blue-300 text-blue-800 font-bold rounded-md text-[10px]">
                              {hasExistingDqe && act.dqeMarketAmount > 0 ? 'DQE MASTER' : 'COÛT DS'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-600 font-bold rounded-md text-[10px]">
                              SANS DQE
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {step === 'confirm' && (
            <div className="space-y-6 text-center max-w-xl mx-auto py-6">
              <CheckCircle2 size={56} className="text-emerald-500 mx-auto" />
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Validation du Déboursé Sec Initial</h3>
                <p className="text-slate-500 text-[11.5px]">
                  Validation de <strong>{parsedDsActivities.length} lignes de Déboursé Sec</strong> pour le projet <strong>{projectName}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Valeur Contractuelle (Marché DQE Master) :</span>
                  <span className="font-bold text-slate-900 font-mono">{totalMarketSum.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Budget DS Initial Total (Coût Prévisionnel Exact) :</span>
                  <span className="font-black text-blue-900 font-mono text-sm">{totalDsSum.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Marge Théorique Initiale :</span>
                  <span className="font-black text-emerald-700 font-mono">{totalMarginSum.toLocaleString('fr-FR')} FCFA ({globalMarginRate}%)</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 'mapping') setStep('upload');
              else if (step === 'preview') setStep('mapping');
              else if (step === 'confirm') setStep('preview');
              else onClose();
            }}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl font-extrabold text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={14} /> {step === 'upload' ? 'Annuler' : 'Retour'}
          </button>

          {step === 'mapping' && (
            <button
              onClick={processPreview}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Prévisualiser & Rapprocher avec DQE</span>
              <ArrowRight size={14} />
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={() => setStep('confirm')}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Valider le Budget DS ({totalDsSum.toLocaleString('fr-FR')} FCFA)</span>
              <ArrowRight size={14} />
            </button>
          )}

          {step === 'confirm' && (
            <button
              onClick={handleFinalConfirm}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold transition flex items-center gap-2 shadow-lg text-xs cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>[ CONFIRMER LE BUDGET DS DEFINITIF ]</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
