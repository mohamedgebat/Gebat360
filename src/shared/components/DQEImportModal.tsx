import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle,
  X, ArrowRight, ArrowLeft, RefreshCw, Check, Layers, Info, Filter, Search, Link2, Plus, CornerDownRight, ChevronRight
} from 'lucide-react';
import { DQEItem, WBSNode } from '../../types';

export interface ExtendedDQEItem extends DQEItem {
  matchedWbsId?: string;
  matchedWbsCode?: string;
  matchedWbsName?: string;
  matchedDsId?: string;
  matchedDsAmount?: number;
  matchingStatus: 'MATCHÉ' | 'À VÉRIFIER' | 'NON MATCHÉ' | 'DOUBLON';
  wbsAction?: 'LINK' | 'CREATE' | 'IGNORE';
  dsAction?: 'LINK' | 'LATER' | 'IGNORE';
  hasDiscrepancy?: boolean;
}

interface DQEImportModalProps {
  projectId: string;
  projectName: string;
  projectCode: string;
  existingWbsNodes?: WBSNode[];
  existingDsActivities?: any[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (
    dqeItems: ExtendedDQEItem[],
    mergedNodes: WBSNode[],
    summaryInfo: {
      totalMarketAmount: number;
      totalItems: number;
      matchedCount: number;
      toVerifyCount: number;
      unmatchedCount: number;
      duplicateCount: number;
    }
  ) => void;
}

interface ColumnMapping {
  priceNo: string;
  description: string;
  unit: string;
  quantity: string;
  marketUnitPrice: string;
  marketAmount: string;
  lotCode: string;
  subLotCode: string;
}

// Clean number parser for FCFA and Excel inputs (handles spaces, NBSP, commas, dots)
const parseCleanNumber = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let str = String(val).trim().replace(/[\s\u00a0\u202f]/g, '');
  if (!str) return 0;

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
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
};

// Check if a row is a summary / total row in Excel to prevent double counting
const isSummaryRow = (description: string, priceNo: string): boolean => {
  const normDesc = (description || '').toUpperCase();
  const normPrice = (priceNo || '').toUpperCase();
  if (/TOTAL|RÉCAPITULATIF|RECAPITULATIF|SOUS-TOTAL|MONTANT TOTAL|GENERAL TOTAL/i.test(normDesc)) return true;
  if (/TOTAL|RECAP|SUMMARY/i.test(normPrice)) return true;
  return false;
};

export const DQEImportModal: React.FC<DQEImportModalProps> = ({
  projectId,
  projectName,
  projectCode,
  existingWbsNodes = [],
  existingDsActivities = [],
  isOpen,
  onClose,
  onConfirmImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'confirm'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [sheetCount, setSheetCount] = useState<number>(1);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Re-import warning state (Section 24)
  const [isReimport, setIsReimport] = useState<boolean>(false);
  const [reimportOption, setReimportOption] = useState<'REPLACE' | 'NEW_VERSION' | 'CANCEL'>('REPLACE');

  // Column Mapping state
  const [mapping, setMapping] = useState<ColumnMapping>({
    priceNo: '',
    description: '',
    unit: '',
    quantity: '',
    marketUnitPrice: '',
    marketAmount: '',
    lotCode: '',
    subLotCode: ''
  });

  // Parsed and validated DQE Items
  const [parsedItems, setParsedItems] = useState<ExtendedDQEItem[]>([]);

  if (!isOpen) return null;

  // Flatten existing WBS nodes for matching
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

  // Check if project already has contractual DQE data
  const hasExistingDqe = flatExistingWbs.some(w => Number(w.contractAmount || 0) > 0 || (w.priceNo && w.priceNo.length > 0));

  // Step 1: File selection & parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSizeStr(`${(file.size / 1024).toFixed(1)} KB`);

    if (hasExistingDqe) {
      setIsReimport(true);
    }

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setSheetCount(wb.SheetNames.length);

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

        const fileHeaders = (data[headerIndex] || []).map((h: any) => String(h || '').trim()).filter((h: string) => h.length > 0);
        setHeaders(fileHeaders);

        const rowsData = data.slice(headerIndex + 1).filter((r: any) => Array.isArray(r) && r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== ''));
        setRawRows(rowsData);

        // Auto-detect columns
        const autoMap: ColumnMapping = {
          priceNo: '',
          description: '',
          unit: '',
          quantity: '',
          marketUnitPrice: '',
          marketAmount: '',
          lotCode: '',
          subLotCode: ''
        };

        fileHeaders.forEach((h: string) => {
          const norm = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (/n°|prix|ref|code|num/i.test(norm) && !autoMap.priceNo) autoMap.priceNo = h;
          else if (/designation|libelle|description|activite|travaux/i.test(norm) && !autoMap.description) autoMap.description = h;
          else if (/unite|u|m3|m2|ml|kg/i.test(norm) && !autoMap.unit) autoMap.unit = h;
          else if (/quantite|qte|qty/i.test(norm) && !autoMap.quantity) autoMap.quantity = h;
          else if (/pu|prix unitaire|pu marche/i.test(norm) && !autoMap.marketUnitPrice) autoMap.marketUnitPrice = h;
          else if (/montant|total|montant marche/i.test(norm) && !autoMap.marketAmount) autoMap.marketAmount = h;
          else if (/lot|code lot/i.test(norm) && !autoMap.lotCode) autoMap.lotCode = h;
          else if (/sous-lot|sous lot/i.test(norm) && !autoMap.subLotCode) autoMap.subLotCode = h;
        });

        setMapping(autoMap);
        setStep('mapping');
      } catch (err) {
        alert('Erreur lors de la lecture du fichier Excel/CSV.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Step 2: Validate and perform 3-way matching (DQE ↔ WBS ↔ DS) with exact total calculation
  const processPreview = () => {
    if (!mapping.description) {
      alert('Veuillez sélectionner au moins la colonne Désignation.');
      return;
    }

    const priceNoIdx = headers.indexOf(mapping.priceNo);
    const descIdx = headers.indexOf(mapping.description);
    const unitIdx = headers.indexOf(mapping.unit);
    const qtyIdx = headers.indexOf(mapping.quantity);
    const puIdx = headers.indexOf(mapping.marketUnitPrice);
    const amountIdx = headers.indexOf(mapping.marketAmount);
    const lotIdx = headers.indexOf(mapping.lotCode);

    const priceNoSeen = new Set<string>();
    const items: ExtendedDQEItem[] = [];

    rawRows.forEach((row: any[], index: number) => {
      let priceNo = priceNoIdx >= 0 ? String(row[priceNoIdx] || `DQE-${index + 1}`).trim() : `DQE-${index + 1}`;
      let description = descIdx >= 0 ? String(row[descIdx] || '').trim() : '';
      const unit = unitIdx >= 0 ? String(row[unitIdx] || 'U').trim() : 'U';

      // If description is numeric (e.g. Excel date serial 46405, 46235) or short code, extract real designation text
      if (description && !isNaN(Number(description)) && Number(description) > 1000) {
        const realTextCell = row.find((c: any) => typeof c === 'string' && c.trim().length > 3 && isNaN(Number(c.trim())));
        if (realTextCell) {
          description = String(realTextCell).trim();
        } else {
          description = `Ouvrage / Prix N°${priceNo}`;
        }
      }

      // Skip summary / total rows in Excel to prevent double counting
      if (isSummaryRow(description, priceNo)) return;

      const qty = parseCleanNumber(qtyIdx >= 0 ? row[qtyIdx] : 0);
      const pu = parseCleanNumber(puIdx >= 0 ? row[puIdx] : 0);
      let amount = parseCleanNumber(amountIdx >= 0 ? row[amountIdx] : 0);

      // Recalculate amount if missing or inaccurate
      const calculatedAmount = Math.round(qty * pu);
      let hasDiscrepancy = false;

      if (amount === 0 && qty > 0 && pu > 0) {
        amount = calculatedAmount;
      } else if (qty > 0 && pu > 0 && amount > 0 && Math.abs(calculatedAmount - amount) > Math.max(10, amount * 0.02)) {
        hasDiscrepancy = true;
      }

      const lotCode = lotIdx >= 0 ? String(row[lotIdx] || '01').trim() : '01';

      // 3-WAY MATCHING PIPELINE (Section 5 & 6 of Prompt)
      let matchedWbsNode = flatExistingWbs.find(w =>
        (w.priceNo && w.priceNo.trim().toUpperCase() === priceNo.toUpperCase()) ||
        w.code.trim().toUpperCase() === priceNo.toUpperCase()
      );

      if (!matchedWbsNode && description.length > 3) {
        matchedWbsNode = flatExistingWbs.find(w =>
          w.name.toLowerCase().includes(description.toLowerCase()) ||
          description.toLowerCase().includes(w.name.toLowerCase())
        );
      }

      let matchedDsAct = existingDsActivities.find(d =>
        (d.priceNo && d.priceNo.trim().toUpperCase() === priceNo.toUpperCase()) ||
        (d.wbsCode && d.wbsCode.trim().toUpperCase() === priceNo.toUpperCase()) ||
        (d.description && description.length > 3 && d.description.toLowerCase().includes(description.toLowerCase()))
      );

      let matchingStatus: 'MATCHÉ' | 'À VÉRIFIER' | 'NON MATCHÉ' | 'DOUBLON' = 'NON MATCHÉ';

      if (priceNoSeen.has(priceNo.toUpperCase())) {
        matchingStatus = 'DOUBLON';
      } else if (matchedWbsNode && matchedDsAct) {
        matchingStatus = 'MATCHÉ';
      } else if (matchedWbsNode || matchedDsAct) {
        matchingStatus = 'À VÉRIFIER';
      } else {
        matchingStatus = 'NON MATCHÉ';
      }

      if (priceNo) priceNoSeen.add(priceNo.toUpperCase());

      items.push({
        id: `dqe-${projectId}-${index + 1}`,
        projectId,
        priceNo,
        description: description || `Ligne DQE N°${index + 1}`,
        unit: unit || 'U',
        quantity: qty,
        marketUnitPrice: pu,
        marketAmount: amount,
        lotCode,
        status: matchingStatus === 'DOUBLON' ? 'Duplicata' : (!description || qty <= 0 ? 'Incomplet' : (hasDiscrepancy ? 'Écart Montant' : 'Conforme')),
        matchingStatus,
        matchedWbsId: matchedWbsNode?.id,
        matchedWbsCode: matchedWbsNode?.code,
        matchedWbsName: matchedWbsNode?.name,
        matchedDsId: matchedDsAct?.id,
        matchedDsAmount: matchedDsAct?.calculatedDsAmount || matchedDsAct?.importedDsAmount || matchedDsAct?.marketAmount,
        wbsAction: matchedWbsNode ? 'LINK' : 'CREATE',
        dsAction: matchedDsAct ? 'LINK' : 'LATER',
        hasDiscrepancy,
        importedAt: new Date().toISOString()
      });
    });

    setParsedItems(items);
    setStep('preview');
  };

  // Helper to recursively sum child nodes to ensure WBS LOT & Project root amounts are 100% accurate
  const recalculateWbsTotals = (nodes: WBSNode[]): WBSNode[] => {
    return nodes.map(node => {
      if (node.children && node.children.length > 0) {
        const updatedChildren = recalculateWbsTotals(node.children);
        const sumMarket = updatedChildren.reduce((s, c) => s + (c.contractAmount || 0), 0);
        const sumDs = updatedChildren.reduce((s, c) => s + (c.budgetDs || c.revisedBudget || 0), 0);
        return {
          ...node,
          contractAmount: sumMarket,
          budgetDs: sumDs > 0 ? sumDs : node.budgetDs,
          revisedBudget: sumDs > 0 ? sumDs : node.revisedBudget,
          children: updatedChildren
        };
      }
      return node;
    });
  };

  // Build / Merge nodes for final WBS update without overwriting existing DS
  const mergeWbsWithDqe = (items: ExtendedDQEItem[]): WBSNode[] => {
    if (existingWbsNodes && existingWbsNodes.length > 0) {
      const updatedNodes = JSON.parse(JSON.stringify(existingWbsNodes));

      items.forEach(item => {
        if (item.wbsAction === 'LINK' && item.matchedWbsCode) {
          const findAndUpdate = (nodes: WBSNode[]) => {
            nodes.forEach(n => {
              if (n.code === item.matchedWbsCode || n.id === item.matchedWbsId) {
                n.priceNo = item.priceNo;
                n.contractUnitPrice = item.marketUnitPrice;
                n.contractAmount = item.marketAmount;
                n.plannedQty = item.quantity;
                if (item.unit) n.unit = item.unit;
              }
              if (n.children) findAndUpdate(n.children);
            });
          };
          findAndUpdate(updatedNodes);
        }
      });

      return recalculateWbsTotals(updatedNodes);
    }

    // Generate new WBS hierarchy from DQE items if no existing WBS
    const lotMap: Record<string, ExtendedDQEItem[]> = {};
    items.forEach(item => {
      const lotKey = item.lotCode || '01';
      if (!lotMap[lotKey]) lotMap[lotKey] = [];
      lotMap[lotKey].push(item);
    });

    const generatedWbs: WBSNode[] = [];

    Object.keys(lotMap).forEach((lotKey) => {
      const lotItems = lotMap[lotKey];
      const lotAmount = lotItems.reduce((s, i) => s + (i.marketAmount || 0), 0);
      const lotCodeStr = `${projectCode} / ${lotKey.padStart(2, '0')}`;

      const lotNode: WBSNode = {
        id: `wbs-lot-${projectId}-${lotKey}`,
        projectId,
        code: lotCodeStr,
        name: `LOT ${lotKey} — TRAVAUX & OUVRAGES`,
        initialBudget: Math.round(lotAmount * 0.85),
        revisedBudget: Math.round(lotAmount * 0.85),
        contractAmount: lotAmount,
        contractUnitPrice: 0,
        plannedQty: 1,
        unit: 'ens',
        reserved: 0,
        committed: 0,
        received: 0,
        invoiced: 0,
        actualCost: 0,
        remainingToCommit: Math.round(lotAmount * 0.85),
        remainingToProduce: Math.round(lotAmount * 0.85),
        forecast: Math.round(lotAmount * 0.85),
        forecastCalculationMode: 'Hybride',
        eac: Math.round(lotAmount * 0.85),
        varianceAtCompletion: 0,
        initialMargin: Math.round(lotAmount * 0.15),
        eacMargin: Math.round(lotAmount * 0.15),
        progress: 0,
        nature: 'DIV',
        manager: 'Conducteur de Travaux',
        type: 'LOT',
        children: lotItems.map((item, idx) => {
          const actCode = `${lotCodeStr} / ${(idx + 1).toString().padStart(3, '0')}`;
          const budgetDs = Math.round(item.marketAmount * 0.85);
          return {
            id: `wbs-act-${projectId}-${item.priceNo}-${idx}`,
            projectId,
            code: actCode,
            priceNo: item.priceNo,
            name: item.description,
            description: item.description,
            unit: item.unit,
            plannedQty: item.quantity,
            contractUnitPrice: item.marketUnitPrice,
            contractAmount: item.marketAmount,
            costDsUnit: Math.round(item.marketUnitPrice * 0.85),
            budgetDs,
            initialBudget: budgetDs,
            revisedBudget: budgetDs,
            reserved: 0,
            committed: 0,
            received: 0,
            invoiced: 0,
            actualCost: 0,
            remainingToCommit: budgetDs,
            remainingToProduce: budgetDs,
            forecast: budgetDs,
            forecastCalculationMode: 'Hybride',
            eac: budgetDs,
            varianceAtCompletion: 0,
            initialMargin: item.marketAmount - budgetDs,
            eacMargin: item.marketAmount - budgetDs,
            progress: 0,
            nature: 'MAT',
            manager: 'Chef de Chantier',
            type: 'ACTIVITE'
          };
        })
      };

      generatedWbs.push(lotNode);
    });

    return generatedWbs;
  };

  const handleFinalConfirm = () => {
    // Exact summation of all valid DQE activity market amounts
    const totalMarketAmount = parsedItems.reduce((sum, item) => sum + (item.marketAmount || 0), 0);
    const matchedCount = parsedItems.filter(i => i.matchingStatus === 'MATCHÉ').length;
    const toVerifyCount = parsedItems.filter(i => i.matchingStatus === 'À VÉRIFIER').length;
    const unmatchedCount = parsedItems.filter(i => i.matchingStatus === 'NON MATCHÉ').length;
    const duplicateCount = parsedItems.filter(i => i.matchingStatus === 'DOUBLON').length;

    const mergedNodes = mergeWbsWithDqe(parsedItems);

    onConfirmImport(parsedItems, mergedNodes, {
      totalMarketAmount,
      totalItems: parsedItems.length,
      matchedCount,
      toVerifyCount,
      unmatchedCount,
      duplicateCount
    });

    onClose();
  };

  const filteredPreviewItems = parsedItems.filter(item => {
    const matchesStatus = filterStatus === 'ALL' || item.matchingStatus === filterStatus;
    const matchesSearch = !searchTerm ||
      item.priceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalAmountSum = parsedItems.reduce((s, i) => s + (i.marketAmount || 0), 0);
  const matchedCount = parsedItems.filter(i => i.matchingStatus === 'MATCHÉ').length;
  const toVerifyCount = parsedItems.filter(i => i.matchingStatus === 'À VÉRIFIER').length;
  const unmatchedCount = parsedItems.filter(i => i.matchingStatus === 'NON MATCHÉ').length;
  const duplicateCount = parsedItems.filter(i => i.matchingStatus === 'DOUBLON').length;
  const discrepancyCount = parsedItems.filter(i => i.hasDiscrepancy).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl text-blue-400 border border-blue-500/30">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                ASSISTANT D'IMPORT DQE / BPU — RÉFÉRENTIEL CONTRACTUEL
              </h2>
              <p className="text-slate-400 text-[11px]">
                Projet Existant : <strong className="text-white">{projectName}</strong> ({projectCode})
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* STEPPER PROGRES */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-[11px] font-extrabold">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Sélection du Fichier</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />

          <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Correspondance Colonnes</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />

          <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
            <span>Contrôles & Rapprochement WBS/DS</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />

          <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
            <span>Validation Finale</span>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* WARNING ON RE-IMPORT (Section 24) */}
          {isReimport && step === 'upload' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-[11.5px] text-amber-900">
              <div className="font-extrabold flex items-center gap-2 text-amber-800">
                <AlertTriangle size={16} /> Avertissement : Un DQE contractuel existe déjà pour ce projet
              </div>
              <p>
                Le projet <strong>{projectName}</strong> possède déjà des données contractuelles DQE. Pour éviter toute perte, choisissez l'action à réaliser :
              </p>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="reimportOpt"
                    checked={reimportOption === 'REPLACE'}
                    onChange={() => setReimportOption('REPLACE')}
                  />
                  <span>Remplacement contrôlé avec rapprochement</span>
                </label>
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="reimportOpt"
                    checked={reimportOption === 'NEW_VERSION'}
                    onChange={() => setReimportOption('NEW_VERSION')}
                  />
                  <span>Conserver l'historique (Nouvelle Version DQE V2)</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-10 bg-slate-50/50 hover:bg-blue-50/30 transition cursor-pointer space-y-3"
              >
                <Upload size={44} className="text-blue-600 mx-auto" />
                <h3 className="text-sm font-extrabold text-slate-800">Glissez-déposez le fichier DQE / BPU ou cliquez pour parcourir</h3>
                <p className="text-slate-500 text-[11px]">Formats acceptés : Excel (.xlsx, .xls) ou CSV (.csv)</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
              </div>

              {fileName && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    <span>{fileName}</span>
                    <span className="text-slate-400 font-normal">({fileSizeStr} • {sheetCount} feuille(s))</span>
                  </div>
                  <span className="text-emerald-700 font-extrabold">Fichier prêt</span>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left text-[11px] text-blue-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Info size={14} className="text-blue-600" /> Rôle du DQE dans GEBAT 360° (Section 2) :
                </div>
                <p className="text-blue-700">Le DQE représente le <strong>référentiel contractuel marché</strong>. Il répond à la question : <em>"Qu'est-ce que GEBAT doit réaliser pour le client et quelle est la valeur contractuelle correspondante ?"</em>.</p>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Correspondance des Colonnes GEBAT 360°</h3>
                  <p className="text-slate-500 text-[11px]">Fichier chargé : <strong>{fileName}</strong> ({rawRows.length} lignes détectées)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">N° Prix / Référence contractuelle</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Unité (m³, m², ml, ff, u, etc.)</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Quantité contractuelle</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    value={mapping.quantity}
                    onChange={e => setMapping({ ...mapping, quantity: e.target.value })}
                  >
                    <option value="">-- Sélectionner la colonne --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">PU Marché HT (Prix Unitaire)</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    value={mapping.marketUnitPrice}
                    onChange={e => setMapping({ ...mapping, marketUnitPrice: e.target.value })}
                  >
                    <option value="">-- Sélectionner la colonne --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Montant Marché HT (Total)</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    value={mapping.marketAmount}
                    onChange={e => setMapping({ ...mapping, marketAmount: e.target.value })}
                  >
                    <option value="">-- Sélectionner la colonne --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & 3-WAY MATCHING (DQE ↔ WBS ↔ DS) */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* SUMMARY COUNTERS WITH EXACT TOTAL MARKET CALCULATION (SECTION 8 & 26) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-slate-900 text-white p-3 rounded-xl">
                  <div className="text-slate-300 font-bold text-[10px]">TOTAL LIGNES DQE</div>
                  <div className="text-lg font-black">{parsedItems.length} articles</div>
                  <div className="text-[10px] text-blue-300 font-mono mt-0.5 font-bold">
                    Sum: {totalAmountSum.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-bold text-[10px]">MATCHÉES (WBS + DS)</div>
                  <div className="text-lg font-black text-emerald-700">{matchedCount}</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-bold text-[10px]">À VÉRIFIER</div>
                  <div className="text-lg font-black text-amber-700">{toVerifyCount}</div>
                </div>

                <div className="bg-slate-100 border border-slate-300 p-3 rounded-xl">
                  <div className="text-slate-500 font-bold text-[10px]">NON MATCHÉES</div>
                  <div className="text-lg font-black text-slate-700">{unmatchedCount}</div>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-bold text-[10px]">DOUBLONS / ÉCARTS</div>
                  <div className="text-lg font-black text-rose-700">{duplicateCount + discrepancyCount}</div>
                </div>
              </div>

              {discrepancyCount > 0 && (
                <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-amber-900 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span>Alerte Écart de Calcul (Section 26) : {discrepancyCount} ligne(s) présentent un écart entre Montant et (PU × Qté).</span>
                  </span>
                  <span className="text-[11px] text-amber-700 font-normal italic">Les montants exacts recalculés seront appliqués.</span>
                </div>
              )}

              {/* SEARCH & FILTER BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-700 text-[11px]">Filtrer statut rapprochement :</span>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg font-bold text-[11px]"
                  >
                    <option value="ALL">Tous les statuts ({parsedItems.length})</option>
                    <option value="MATCHÉ">MATCHÉ ({matchedCount})</option>
                    <option value="À VÉRIFIER">À VÉRIFIER ({toVerifyCount})</option>
                    <option value="NON MATCHÉ">NON MATCHÉ ({unmatchedCount})</option>
                    <option value="DOUBLON">DOUBLON ({duplicateCount})</option>
                  </select>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher désignation ou N° Prix..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] font-bold w-64"
                  />
                  <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                </div>
              </div>

              {/* PREVIEW TABLE WITH EXACT MONTANT MARCHE CALCULATION */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold text-[10.5px] uppercase sticky top-0 z-10">
                    <tr>
                      <th className="p-2 border-b">Statut</th>
                      <th className="p-2 border-b">N° Prix</th>
                      <th className="p-2 border-b">Désignation Contractuelle</th>
                      <th className="p-2 border-b text-center">Unité</th>
                      <th className="p-2 border-b text-right">Qté</th>
                      <th className="p-2 border-b text-right">PU Marché (FCFA)</th>
                      <th className="p-2 border-b text-right">Montant Marché (FCFA)</th>
                      <th className="p-2 border-b">WBS Référencé</th>
                      <th className="p-2 border-b">DS Référencé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                    {filteredPreviewItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black ${
                            item.matchingStatus === 'MATCHÉ'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.matchingStatus === 'À VÉRIFIER'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : item.matchingStatus === 'DOUBLON'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {item.matchingStatus}
                          </span>
                        </td>
                        <td className="p-2 font-mono font-bold text-slate-900">{item.priceNo}</td>
                        <td className="p-2 text-slate-800 font-bold max-w-xs truncate">{item.description}</td>
                        <td className="p-2 text-center font-bold">{item.unit}</td>
                        <td className="p-2 text-right font-mono font-bold">{item.quantity.toLocaleString('fr-FR')}</td>
                        <td className="p-2 text-right font-mono font-bold">{item.marketUnitPrice.toLocaleString('fr-FR')}</td>
                        <td className="p-2 text-right font-mono font-black text-blue-900">
                          {item.marketAmount.toLocaleString('fr-FR')}
                        </td>
                        <td className="p-2">
                          {item.matchedWbsCode ? (
                            <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {item.matchedWbsCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Génération WBS</span>
                          )}
                        </td>
                        <td className="p-2">
                          {item.matchedDsAmount ? (
                            <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {item.matchedDsAmount.toLocaleString('fr-FR')} FCFA
                            </span>
                          ) : (
                            <span className="text-amber-700 text-[10px] font-bold">DS non raccordé</span>
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
                <h3 className="text-lg font-extrabold text-slate-900">Confirmation de l'Importation DQE / BPU</h3>
                <p className="text-slate-500 text-[11.5px]">
                  Vous allez valider le DQE contractuel pour le projet <strong>{projectName}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Nombre de Prix DQE :</span>
                  <span className="font-extrabold text-slate-900">{parsedItems.length} articles</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Lignes Rapprochées (MATCHÉ) :</span>
                  <span className="font-bold text-emerald-700">{matchedCount} sur {parsedItems.length}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Montant Total Contractuel Exact (HT) :</span>
                  <span className="font-black text-blue-900 font-mono text-sm">{totalAmountSum.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Impact Déboursé Sec (DS) :</span>
                  <span className="font-bold text-slate-700">DS existant préservé à 100%</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-left text-[11px] text-blue-900 flex items-center gap-2">
                <Info size={16} className="text-blue-600 shrink-0" />
                <span>Le DQE devient le **référentiel contractuel officiel** du projet sans modifier les montants prévisionnels du DS.</span>
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Prévisualiser & Rapprocher</span>
              <ArrowRight size={14} />
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={() => setStep('confirm')}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Valider le Rapprochement ({totalAmountSum.toLocaleString('fr-FR')} FCFA)</span>
              <ArrowRight size={14} />
            </button>
          )}

          {step === 'confirm' && (
            <button
              onClick={handleFinalConfirm}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold transition flex items-center gap-2 shadow-lg text-xs cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>[ CONFIRMER L'IMPORTATION DEFINITIVE DQE ]</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
