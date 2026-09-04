import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { StockMovementType, StockItem } from '../../types';
import { isProjectMatch } from '../../utils/projectMatcher';
import { hasPermission, hasProjectAccess } from '../../core/permissions';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import * as XLSX from 'xlsx';
import {
  ArrowRightLeft, Plus, Calculator, Search, Filter, Warehouse as WarehouseIcon,
  CheckCircle2, FileText, Calendar, Building2, Layers, AlertTriangle, ShieldCheck,
  RefreshCw, X, FileSpreadsheet, Download, Package, TrendingUp, DollarSign
} from 'lucide-react';

const formatFrenchDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  if (str.includes('T')) {
    const parts = str.split('T');
    const dPart = parts[0];
    const tPart = parts[1]?.replace('Z', '').split('.')[0];

    const dSplit = dPart.split('-');
    if (dSplit.length === 3) {
      const formattedDate = `${dSplit[2]}/${dSplit[1]}/${dSplit[0]}`;
      if (tPart && tPart !== '00:00:00' && tPart !== '00:00') {
        return `${formattedDate} à ${tPart.substring(0, 5)}`;
      }
      return formattedDate;
    }
  }

  const dSplit = str.split('-');
  if (dSplit.length === 3) {
    return `${dSplit[2]}/${dSplit[1]}/${dSplit[0]}`;
  }

  return str;
};

export const MouvementWbsModule: React.FC = () => {
  const {
    projects = [],
    wbsMap = {},
    stockItems = [],
    warehouses = [],
    stockMovements = [],
    createStockMovement,
    processGoodsReceipt,
    purchaseOrders = [],
    addAuditLog,
    currentUser
  } = useAppState();

  const authorizedProjects = useMemo(() => {
    return projects.filter(p => hasProjectAccess(currentUser, p.id) || hasProjectAccess(currentUser, p.code));
  }, [projects, currentUser]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(authorizedProjects[0]?.id || authorizedProjects[0]?.code || '');
  const selectedProject = authorizedProjects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || authorizedProjects[0] || projects[0];

  // Nœuds WBS rattachés au chantier sélectionné
  const projectWbsNodes = useMemo(() => {
    if (!selectedProject) return [];
    const nodes = wbsMap[selectedProject.id] || wbsMap[selectedProject.code] || [];
    const flatten = (arr: any[]): any[] => {
      let res: any[] = [];
      arr.forEach(n => {
        res.push(n);
        if (n.children && n.children.length > 0) res = res.concat(flatten(n.children));
      });
      return res;
    };
    return flatten(nodes);
  }, [wbsMap, selectedProject]);

  // Filtres de recherche du tableau des mouvements
  const [typeFilter, setTypeFilter] = useState<string>('TOUS');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('TOUS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modales
  const [showMovementModal, setShowMovementModal] = useState<boolean>(false);
  const [showAutoReceiptModal, setShowAutoReceiptModal] = useState<boolean>(false);
  const [selectedPOId, setSelectedPOId] = useState<string>(purchaseOrders[0]?.id || '');
  const [receiptDocNumber, setReceiptDocNumber] = useState<string>(`PVR-2026-${Math.floor(1000 + Math.random() * 9000)}`);

  // Formulaire de saisie d'un Mouvement / Imputation WBS
  const [movementType, setMovementType] = useState<StockMovementType>('Sortie');
  const [selectedItemId, setSelectedItemId] = useState<string>(stockItems[0]?.id || '');
  const [movementUnitPrice, setMovementUnitPrice] = useState<number>(stockItems[0]?.averageUnitPrice || 0);
  const [movementWarehouse, setMovementWarehouse] = useState<string>('Magasin Bingerville (Chantier)');
  const [destinationWarehouse, setDestinationWarehouse] = useState<string>('Magasin Songon (Chantier)');
  const [quantity, setQuantity] = useState<number>(10);
  const [wbsCode, setWbsCode] = useState<string>(projectWbsNodes[0]?.code || '03.02.004');
  const [activityName, setActivityName] = useState<string>(projectWbsNodes[0]?.name || 'Béton armé pour Voiles & Radiers');
  const [sourceDoc, setSourceDoc] = useState<string>('BL-2026-089-SOCIMAC');
  const [notes, setNotes] = useState<string>('Sortie magasin pour imputation directe travaux');

  // Magasins associés au projet sélectionné
  const availableWarehousesForProject = useMemo(() => {
    if (!selectedProject) return warehouses;
    const projWh = warehouses.filter(w => {
      if (w.projectId && isProjectMatch(w.projectId, selectedProject.id)) return true;
      const nameLower = w.name.toLowerCase();
      const projCodeLower = selectedProject.code.toLowerCase();
      return nameLower.includes(projCodeLower) ||
             (selectedProject.name.toLowerCase().includes('bingerville') && nameLower.includes('bingerville')) ||
             (selectedProject.name.toLowerCase().includes('songon') && nameLower.includes('songon')) ||
             w.siteId === 'ALL';
    });
    return projWh.length > 0 ? projWh : warehouses;
  }, [warehouses, selectedProject]);

  React.useEffect(() => {
    if (availableWarehousesForProject.length > 0) {
      const siteWh = availableWarehousesForProject.find(w => w.projectId && isProjectMatch(w.projectId, selectedProjectId)) || availableWarehousesForProject[0];
      if (siteWh && siteWh.name !== movementWarehouse) {
        setMovementWarehouse(siteWh.name);
      }
    }
  }, [selectedProjectId, availableWarehousesForProject]);

  // CORRESPONDANCE INTELLIGENTE ENTRE LE WBS ET LES ARTICLES DE STOCK
  const { recommendedStockItems, allOrderedStockItems, defaultQty } = useMemo(() => {
    if (stockItems.length === 0) return { recommendedStockItems: [], allOrderedStockItems: [], defaultQty: 10 };

    const node = projectWbsNodes.find(n => n.code === wbsCode);
    const codeStr = (wbsCode || '').toLowerCase();
    const nameStr = (node?.name || '').toLowerCase();
    const search = `${codeStr} ${nameStr}`;

    const matches = stockItems.filter(item => {
      const iName = item.name.toLowerCase();
      const iCat = item.category.toLowerCase();

      if ((search.includes('coffrage') || search.includes('moule') || codeStr.includes('01.01')) &&
          (iName.includes('pointe') || iName.includes('coffrage') || iCat.includes('quincaillerie'))) {
        return true;
      }
      if ((search.includes('béton') || search.includes('coulage') || search.includes('radier') || codeStr.includes('02.02')) &&
          (iName.includes('ciment') || iName.includes('gravier') || iName.includes('sable') || iCat.includes('liant'))) {
        return true;
      }
      if ((search.includes('fer') || search.includes('armature') || search.includes('acier')) &&
          (iName.includes('fer') || iName.includes('attache') || iCat.includes('acier'))) {
        return true;
      }
      if ((search.includes('terrassement') || search.includes('engin')) &&
          (iName.includes('gasoil') || iName.includes('carburant'))) {
        return true;
      }
      return false;
    });

    const recommended = matches.length > 0 ? matches : [stockItems[0]];
    const otherItems = stockItems.filter(i => !recommended.some(r => r.id === i.id));
    const allOrdered = [...recommended, ...otherItems];
    const plannedQty = Math.round(node?.plannedQty || 10);

    return {
      recommendedStockItems: recommended,
      allOrderedStockItems: allOrdered,
      defaultQty: plannedQty > 0 ? plannedQty : 10,
    };
  }, [wbsCode, stockItems, projectWbsNodes]);

  const wbsSelectOptions: SelectOption[] = useMemo(() => {
    return projectWbsNodes.map(n => ({
      value: n.code,
      label: n.name,
      badge: n.code,
      sublabel: `Code WBS: ${n.code} — ${n.name}`,
    }));
  }, [projectWbsNodes]);

  const articleSelectOptions: SelectOption[] = useMemo(() => {
    return allOrderedStockItems.map(item => {
      const isRec = recommendedStockItems.some(r => r.id === item.id);
      return {
        value: item.id,
        label: item.name,
        badge: isRec ? '⭐ WBS' : item.code,
        sublabel: `Code: ${item.code} | Stock disponible: ${item.currentStock - (item.reservedStock || 0)} ${item.unit} | Magasin: ${item.warehouse}`,
      };
    });
  }, [allOrderedStockItems, recommendedStockItems]);

  const handleWbsCodeSelect = (targetWbsCode: string) => {
    setWbsCode(targetWbsCode);
    const node = projectWbsNodes.find(n => n.code === targetWbsCode);
    if (node) setActivityName(node.name);
  };

  React.useEffect(() => {
    if (recommendedStockItems.length > 0) {
      setSelectedItemId(recommendedStockItems[0].id);
      setMovementUnitPrice(recommendedStockItems[0].averageUnitPrice || 0);
      setQuantity(defaultQty);
    } else if (stockItems.length > 0) {
      setSelectedItemId(stockItems[0].id);
      setMovementUnitPrice(stockItems[0].averageUnitPrice || 0);
      setQuantity(10);
    }
  }, [wbsCode, recommendedStockItems, defaultQty, stockItems]);

  const selectedItem = allOrderedStockItems.find(i => i.id === selectedItemId) || stockItems.find(i => i.id === selectedItemId) || stockItems[0];

  // SOUMISSION MOUVEMENT MANUEL
  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (movementType === 'Transfert' && movementWarehouse === destinationWarehouse) {
      alert('Le magasin d’origine et le magasin de destination doivent être différents !');
      return;
    }

    if (movementType === 'Sortie' && selectedItem.currentStock < quantity) {
      alert(`Stock insuffisant en magasin (${selectedItem.currentStock} ${selectedItem.unit} disponibles).`);
      return;
    }

    const unitP = Number(movementUnitPrice) > 0 ? Number(movementUnitPrice) : selectedItem.averageUnitPrice;

    createStockMovement({
      code: `MVT-${Date.now().toString().slice(-6)}`,
      type: movementType,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: Number(quantity),
      unit: selectedItem.unit,
      unitPrice: unitP,
      totalCost: Math.round(Number(quantity) * unitP),
      warehouse: movementWarehouse,
      destinationWarehouse: movementType === 'Transfert' ? destinationWarehouse : undefined,
      projectId: selectedProjectId,
      projectName: selectedProject?.name,
      wbsCode: wbsCode,
      activityName: activityName,
      sourceDoc: sourceDoc,
      user: currentUser ? currentUser.name : 'Conducteur de Travaux',
      date: new Date().toISOString().split('T')[0],
      notes: notes,
    });

    addAuditLog(
      `Mouvement de Stock & WBS [${movementType}] — ${selectedItem.name} (${quantity} ${selectedItem.unit})`,
      'Mouvements & WBS',
      wbsCode,
      `Chantier: ${selectedProject?.code} | Coût Imputé: ${(Math.round(Number(quantity) * unitP)).toLocaleString('fr-FR')} FCFA`
    );

    alert(`Mouvement [${movementType}] de ${quantity} ${selectedItem.unit} imputé au WBS ${wbsCode} avec succès !`);
    setShowMovementModal(false);
  };

  // INTÉGRATION AUTOMATIQUE RÉCEPTION ➔ STOCK SANS DOUBLE SAISIE
  const handleExecuteAutoReceiptIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    const po = purchaseOrders.find(p => p.id === selectedPOId);
    if (!po) return;

    processGoodsReceipt(po.id, po.items[0]?.quantity || 100, currentUser ? currentUser.name : 'Magasinier Chantier');

    addAuditLog(
      `INTÉGRATION_RÉCEPTION_STOCK_AUTOMATIQUE`,
      'STOCK_INTEGRATION',
      receiptDocNumber,
      `Entrée en stock générée automatiquement depuis BC ${po.code} sans double saisie.`
    );

    alert(`Réception ${receiptDocNumber} intégrée au Stock avec mise à jour du Bon de Commande ${po.code} et vérification Three-Way Match !`);
    setShowAutoReceiptModal(false);
  };

  // LISTE FILTRÉE DES MOUVEMENTS DE STOCK
  const filteredMovements = useMemo(() => {
    return stockMovements.filter(m => {
      const matchProject = !selectedProjectId || selectedProjectId === 'TOUS' || !m.projectId || isProjectMatch(m.projectId, selectedProjectId);
      const matchType = typeFilter === 'TOUS' || m.type === typeFilter;
      const matchWarehouse = warehouseFilter === 'TOUS' || m.warehouse === warehouseFilter || m.destinationWarehouse === warehouseFilter;
      const matchSearch = searchTerm === '' ||
        m.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.wbsCode && m.wbsCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.sourceDoc && m.sourceDoc.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchProject && matchType && matchWarehouse && matchSearch;
    });
  }, [stockMovements, selectedProjectId, typeFilter, warehouseFilter, searchTerm]);

  // CUMULS FINANCIERS ET KPIS
  const totalCostFiltered = useMemo(() => {
    return filteredMovements.reduce((sum, m) => sum + (m.totalCost || 0), 0);
  }, [filteredMovements]);

  const totalSortiesCount = useMemo(() => {
    return stockMovements.filter(m => m.type === 'Sortie').length;
  }, [stockMovements]);

  const totalEntreesCount = useMemo(() => {
    return stockMovements.filter(m => m.type === 'Entrée').length;
  }, [stockMovements]);

  const totalWbsImputedAmount = useMemo(() => {
    return stockMovements
      .filter(m => m.type === 'Sortie' && (m.wbsCode || m.wbsId))
      .reduce((sum, m) => sum + (m.totalCost || 0), 0);
  }, [stockMovements]);

  // EXPORTS EXCEL & CSV
  const exportMovementsToExcel = () => {
    const data = filteredMovements.map(m => ({
      'Code Mouvement': m.code,
      'Date': formatFrenchDate(m.date),
      'Type': m.type,
      'Article': m.itemName,
      'Quantité': m.quantity,
      'Unité': m.unit,
      'PUMP Unitaire (FCFA)': m.unitPrice,
      'Impact Coût (FCFA)': m.totalCost,
      'Magasin Source': m.warehouse,
      'Magasin Destination': m.destinationWarehouse || '—',
      'Projet Imputé': m.projectName || m.projectId || '—',
      'Code WBS': m.wbsCode || '—',
      'Activité Chantier': m.activityName || '—',
      'Doc Source': m.sourceDoc || '—',
      'Opérateur': m.user,
      'Observations': m.notes || '—'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mouvements_WBS');
    XLSX.writeFile(workbook, `GEBAT_Mouvements_Stock_WBS_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportMovementsToCSV = () => {
    const headers = ['Code Mouvement', 'Date', 'Type', 'Article', 'Quantité', 'Unité', 'PUMP FCFA', 'Coût Total FCFA', 'Magasin Source', 'Destination', 'Projet', 'WBS', 'Doc Source', 'Opérateur'];
    const rows = filteredMovements.map(m => [
      `"${m.code}"`,
      `"${formatFrenchDate(m.date)}"`,
      `"${m.type}"`,
      `"${m.itemName.replace(/"/g, '""')}"`,
      m.quantity,
      `"${m.unit}"`,
      m.unitPrice || 0,
      m.totalCost || 0,
      `"${m.warehouse}"`,
      `"${m.destinationWarehouse || '—'}"`,
      `"${m.projectName || m.projectId || '—'}"`,
      `"${m.wbsCode || '—'}"`,
      `"${m.sourceDoc || '—'}"`,
      `"${m.user}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GEBAT_Mouvements_Stock_WBS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* HEADER MOUVEMENTS DE STOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowRightLeft size={24} className="text-blue-600" /> Mouvements de Stock & Consommation Chantier
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Traçabilité complète des flux physiques et imputation automatique des coûts réels sur les nœuds WBS</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowMovementModal(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus size={14} /> Saisir Mouvement & WBS
          </button>
          <button
            onClick={() => setShowAutoReceiptModal(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <RefreshCw size={14} /> Réception Auto ➔ Entrée Stock
          </button>
        </div>
      </div>

      {/* KPIS SYNTHÈSE DES MOUVEMENTS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-slate-400 font-sans font-extrabold uppercase block">Mouvements Enregistrés</span>
          <span className="text-base font-black text-slate-900">{stockMovements.length} Mvt</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-blue-600 font-sans font-extrabold uppercase block">Coût Réel Total Imputé WBS</span>
          <span className="text-base font-black text-blue-900">{totalWbsImputedAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-purple-600 font-sans font-extrabold uppercase block">Sorties Consommées Chantier</span>
          <span className="text-base font-black text-purple-800">{totalSortiesCount} Sorties</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-emerald-600 font-sans font-extrabold uppercase block">Entrées & Réceptions</span>
          <span className="text-base font-black text-emerald-700">{totalEntreesCount} Entrées</span>
        </div>
      </div>

      {/* FILTRES COMPACTS DES MOUVEMENTS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Chantier :</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
            >
              <option value="TOUS">Tous les chantiers autorisés</option>
              {authorizedProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Type Flux :</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
            >
              <option value="TOUS">Tous les types</option>
              <option value="Entrée">Entrée Stock</option>
              <option value="Sortie">Sortie Chantier</option>
              <option value="Transfert">Transfert Inter-Magasins</option>
              <option value="Retour">Retour Chantier</option>
              <option value="Ajustement +">Ajustement Positif</option>
              <option value="Ajustement -">Ajustement Négatif</option>
              <option value="Réservation">Réservation</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Magasin :</span>
            <select
              value={warehouseFilter}
              onChange={e => setWarehouseFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
            >
              <option value="TOUS">Tous les magasins</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.name}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher code, doc, article..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-52 focus:outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={exportMovementsToExcel}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-xl border border-emerald-200 text-xs flex items-center gap-1.5 transition"
            title="Exporter en fichier Excel .xlsx"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={exportMovementsToCSV}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl border border-slate-200 text-xs flex items-center gap-1.5 transition"
            title="Exporter en fichier CSV .csv"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* TABLEAU HISTORIQUE DES MOUVEMENTS DE STOCK */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                <th className="p-3">N° Mouvement</th>
                <th className="p-3">Date</th>
                <th className="p-3">Type Flux</th>
                <th className="p-3">Article Consommé</th>
                <th className="p-3 text-right">Quantité</th>
                <th className="p-3 text-right">PUMP Unitaire</th>
                <th className="p-3 text-right">Impact Coût</th>
                <th className="p-3">Magasin Source</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Imputation Chantier & WBS</th>
                <th className="p-3">Doc Source</th>
                <th className="p-3">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMovements.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-blue-700">{m.code}</td>
                  <td className="p-3 font-mono text-slate-500">{formatFrenchDate(m.date)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      m.type === 'Entrée' ? 'bg-emerald-100 text-emerald-800' :
                      m.type === 'Sortie' ? 'bg-blue-100 text-blue-800' :
                      m.type === 'Transfert' ? 'bg-purple-100 text-purple-800' :
                      m.type === 'Réservation' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="p-3 font-extrabold text-slate-900">{m.itemName}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{m.quantity} {m.unit}</td>
                  <td className="p-3 text-right font-mono text-slate-600">{m.unitPrice ? `${m.unitPrice.toLocaleString('fr-FR')} F` : '—'}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900">{m.totalCost ? `${m.totalCost.toLocaleString('fr-FR')} FCFA` : '—'}</td>
                  <td className="p-3 text-slate-600 truncate max-w-[120px]">{m.warehouse}</td>
                  <td className="p-3 text-slate-600 truncate max-w-[120px]">{m.destinationWarehouse || '—'}</td>
                  <td className="p-3">
                    <strong className="text-slate-800 block truncate max-w-[130px]">{m.projectName || '—'}</strong>
                    <span className="text-[10px] font-mono text-purple-700 block font-bold">{m.wbsCode || '—'}</span>
                  </td>
                  <td className="p-3 font-mono text-slate-500">{m.sourceDoc || '—'}</td>
                  <td className="p-3 text-slate-600">{m.user}</td>
                </tr>
              ))}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                    Aucun mouvement trouvé pour les critères sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOUVEAU MOUVEMENT & IMPUTATION WBS */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Plus size={18} className="text-blue-600" /> Saisir un Mouvement & Imputation WBS
              </h3>
              <button onClick={() => setShowMovementModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMovementSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Type de Mouvement *</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    value={movementType}
                    onChange={e => setMovementType(e.target.value as any)}
                  >
                    <option value="Sortie">Sortie Chantier</option>
                    <option value="Entrée">Entrée Stock</option>
                    <option value="Transfert">Transfert Inter-Magasins</option>
                    <option value="Retour">Retour Chantier ➔ Stock</option>
                    <option value="Ajustement +">Ajustement Positif</option>
                    <option value="Ajustement -">Ajustement Négatif</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Magasin Source *</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    value={movementWarehouse}
                    onChange={e => setMovementWarehouse(e.target.value)}
                  >
                    {availableWarehousesForProject.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">N° Document (BL/BS) *</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs"
                    value={sourceDoc}
                    onChange={e => setSourceDoc(e.target.value)}
                    placeholder="BL-2026-089-SOCIMAC"
                  />
                </div>
              </div>

              {/* IMPUTATION CHANTIER PROJET + WBS */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-extrabold text-slate-900 text-[11px] flex items-center gap-1.5">
                  <Layers size={14} className="text-purple-600" /> Imputation Chantier (Projet ➔ WBS ➔ Activité) :
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold text-[10px] mb-0.5">Chantier / Projet :</label>
                    <select
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                    >
                      {authorizedProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <SearchableSelect
                      label="Nœud WBS Imputé"
                      options={wbsSelectOptions}
                      value={wbsCode}
                      onChange={handleWbsCodeSelect}
                      placeholder="Code WBS ou N° Prix..."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ARTICLE ET QUANTITÉ */}
              <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 space-y-2">
                <span className="font-extrabold text-blue-900 text-[11px] flex items-center gap-1.5">
                  <Package size={14} className="text-blue-600" /> Article & Quantité Liés au Nœud WBS :
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <SearchableSelect
                      label="Article (Matériau composant du WBS)"
                      options={articleSelectOptions}
                      value={selectedItemId || allOrderedStockItems[0]?.id || stockItems[0]?.id || ''}
                      onChange={val => {
                        setSelectedItemId(val);
                        const it = stockItems.find(i => i.id === val);
                        if (it) setMovementUnitPrice(it.averageUnitPrice || 0);
                      }}
                      placeholder="Rechercher un article..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-[10px]">Quantité *</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2 bg-white border border-blue-300 focus:border-blue-500 rounded-xl font-black font-mono text-xs text-blue-900 shadow-xs"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-600 font-bold text-[10px] mb-0.5">Prix Unitaire (FCFA) :</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                      value={movementUnitPrice}
                      onChange={e => setMovementUnitPrice(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold text-[10px] mb-0.5">Description / Justification :</label>
                    <input
                      type="text"
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ex: Coulage radier et voiles..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition"
                >
                  Valider le Mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INTÉGRATION RÉCEPTION AUTO SANS DOUBLE SAISIE */}
      {showAutoReceiptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <RefreshCw size={18} className="text-emerald-600 animate-spin-slow" /> Intégration Réception ➔ Stock (Anti-double Saisie)
              </h3>
              <button onClick={() => setShowAutoReceiptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteAutoReceiptIntegration} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Sélectionner le Bon de Commande (BC) Validé *</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  value={selectedPOId}
                  onChange={e => setSelectedPOId(e.target.value)}
                >
                  {purchaseOrders.map(po => (
                    <option key={po.id} value={po.id}>{po.code} — {po.supplier} ({po.totalAmount.toLocaleString('fr-FR')} FCFA)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">N° Procès-Verbal de Réception / BL Chantier *</label>
                <input
                  type="text"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold"
                  value={receiptDocNumber}
                  onChange={e => setReceiptDocNumber(e.target.value)}
                  required
                />
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-emerald-900 text-[11px] space-y-1 font-medium">
                <span className="font-extrabold block">Impact de la Réception sur GEBAT 360° :</span>
                <p>1. Mise à jour automatique du statut du Bon de Commande sur "Livré".</p>
                <p>2. Création automatique de l'entrée en stock sans ressaisie.</p>
                <p>3. Mise à jour de l'engagement WBS et mise à disposition pour le Three-Way Match.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAutoReceiptModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition"
                >
                  Valider l'Intégration Automatique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MouvementWbsModule;
