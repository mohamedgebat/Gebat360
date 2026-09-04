import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { StockItem, StockMovementType, Warehouse } from '../../types';
import { isProjectMatch } from '../../utils/projectMatcher';
import { hasPermission, hasProjectAccess } from '../../core/permissions';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import * as XLSX from 'xlsx';
import {
  Package, ArrowRightLeft, AlertCircle, Plus, CheckCircle2, RefreshCw,
  Search, Filter, Calculator, ShieldCheck, DollarSign, ArrowRight, FileText,
  Warehouse as WarehouseIcon, RotateCcw, ClipboardList, Lock, Unlock, Layers, Download,
  Eye, X, ChevronRight, Edit3, Trash2, FileSpreadsheet, Check, AlertTriangle
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

export const StockModule: React.FC = () => {
  const {
    stockItems = [],
    warehouses = [],
    stockMovements = [],
    projects = [],
    wbsMap = {},
    createStockMovement,
    addStockItem,
    updateStockItem,
    deleteStockItem,
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

  // 4 Onglets Métier : Stock Physique, Mouvements & Traçabilité, Inventaire Physique, Réservations
  const [activeTab, setActiveTab] = useState<'items' | 'movements' | 'inventory' | 'reservation'>('items');

  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('TOUS');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TOUS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TOUS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // SÉLECTION D'UN ARTICLE POUR LA FICHE ARTICLE (INSPECTOR MODAL)
  const [selectedArticle, setSelectedArticle] = useState<StockItem | null>(null);

  // MODALES ET FORMULAIRES
  const [showAddArticleModal, setShowAddArticleModal] = useState<boolean>(false);
  const [editingArticle, setEditingArticle] = useState<StockItem | null>(null);
  const [showMovementModal, setShowMovementModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showReservationModal, setShowReservationModal] = useState<boolean>(false);

  // ÉTAT FORMULAIRE ARTICLE
  const [articleForm, setArticleForm] = useState({
    code: '',
    name: '',
    category: 'Matériaux Liants',
    unit: 'sacs',
    warehouse: 'Magasin Bingerville (Chantier)',
    minThreshold: 50,
    currentStock: 100,
    averageUnitPrice: 4800,
  });

  // ÉTATS DE SAISIE DE MOUVEMENT
  const [movementType, setMovementType] = useState<StockMovementType>('Entrée');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [movementWarehouse, setMovementWarehouse] = useState<string>('Magasin Bingerville (Chantier)');
  const [destinationWarehouse, setDestinationWarehouse] = useState<string>('Magasin Songon (Chantier)');
  const [movementQty, setMovementQty] = useState<number>(50);
  const [movementUnitPrice, setMovementUnitPrice] = useState<number>(0);
  const [wbsCode, setWbsCode] = useState<string>('');
  const [activityName, setActivityName] = useState<string>('Béton armé pour Voiles & Radiers bassins');
  const [sourceDoc, setSourceDoc] = useState<string>('BL-2026-089-SOCIMAC');
  const [notes, setNotes] = useState<string>('Livraison conforme avec vérification bon de livraison');

  // ÉTATS DE SAISIE INVENTAIRE PHYSIQUE
  const [inventoryWarehouse, setInventoryWarehouse] = useState<string>('TOUS');
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, number>>({});
  const [inventoryJustification, setInventoryJustification] = useState<string>('Ajustement suite au comptage physique périodique');

  // ÉTATS DE SAISIE RÉSERVATION
  const [reservedQty, setReservedQty] = useState<number>(20);
  const [reservedForProject, setReservedForProject] = useState<string>(selectedProject?.id || '');
  const [reservationWbs, setReservationWbs] = useState<string>('');
  const [reservationNotes, setReservationNotes] = useState<string>('Réservation pour coulage béton prévu sous 48h');

  // Auto-initialisation des sélections par défaut quand les articles et projets sont chargés
  React.useEffect(() => {
    if (stockItems.length > 0 && (!selectedItemId || !stockItems.some(i => i.id === selectedItemId))) {
      setSelectedItemId(stockItems[0].id);
      setMovementUnitPrice(stockItems[0].averageUnitPrice || 0);
    }
  }, [stockItems, selectedItemId]);

  // NŒUDS WBS ET ACTIVITÉS DISPONIBLES POUR LE CHANTIER SÉLECTIONNÉ
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

  // CORRESPONDANCE INTELLIGENTE ENTRE LE NŒUD WBS SÉLECTIONNÉ ET TOUS LES ARTICLES DE STOCK
  const { recommendedStockItems, allOrderedStockItems, defaultQty } = useMemo(() => {
    if (stockItems.length === 0) return { recommendedStockItems: [], allOrderedStockItems: [], defaultQty: 50 };

    const node = projectWbsNodes.find(n => n.code === wbsCode);
    const codeStr = (wbsCode || '').toLowerCase();
    const nameStr = (node?.name || '').toLowerCase();
    const search = `${codeStr} ${nameStr}`;

    // Détecter les articles de stock correspondant aux activités de BTP / WBS
    const matches = stockItems.filter(item => {
      const iName = item.name.toLowerCase();
      const iCat = item.category.toLowerCase();

      // Coffrage / Moule / Panneau
      if ((search.includes('coffrage') || search.includes('moule') || search.includes('panneau') || codeStr.includes('01.01')) &&
          (iName.includes('pointe') || iName.includes('coffrage') || iCat.includes('quincaillerie') || iName.includes('fil'))) {
        return true;
      }

      // Béton / Coulage / Radier / Voile / Propreté
      if ((search.includes('béton') || search.includes('coulage') || search.includes('radier') || search.includes('voile') || search.includes('propreté') || codeStr.includes('02.02') || codeStr.includes('03.01')) &&
          (iName.includes('ciment') || iName.includes('gravier') || iName.includes('sable') || iCat.includes('liant') || iCat.includes('agrégat'))) {
        return true;
      }

      // Ferraillage / Armatures
      if ((search.includes('fer') || search.includes('armature') || search.includes('ferraillage') || search.includes('acier')) &&
          (iName.includes('fer') || iName.includes('attache') || iCat.includes('acier'))) {
        return true;
      }

      // Terrassement / Fouilles / Engins
      if ((search.includes('terrassement') || search.includes('fouille') || search.includes('décapage') || search.includes('engin') || codeStr.includes('000.1')) &&
          (iName.includes('gasoil') || iName.includes('carburant') || iCat.includes('combustible'))) {
        return true;
      }

      // Maçonnerie / Cloisons
      if ((search.includes('maçonnerie') || search.includes('agglo') || search.includes('brique') || search.includes('cloison')) &&
          (iName.includes('agglo') || iName.includes('brique') || iName.includes('ciment'))) {
        return true;
      }

      return false;
    });

    const recommended = matches.length > 0 ? matches : [stockItems[0]];
    const otherItems = stockItems.filter(i => !recommended.some(r => r.id === i.id));
    const allOrdered = [...recommended, ...otherItems];

    const plannedQty = Math.round(node?.plannedQty || 50);

    return {
      recommendedStockItems: recommended,
      allOrderedStockItems: allOrdered,
      defaultQty: plannedQty > 0 ? plannedQty : 50,
    };
  }, [wbsCode, stockItems, projectWbsNodes]);

  // OPTIONS POUR LE COMPOSANT SEARCHABLE SELECT
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
      setMovementQty(defaultQty);
    } else if (stockItems.length > 0) {
      setSelectedItemId(stockItems[0].id);
      setMovementUnitPrice(stockItems[0].averageUnitPrice || 0);
      setMovementQty(50);
    }
  }, [wbsCode, recommendedStockItems, defaultQty, stockItems]);

  React.useEffect(() => {
    if (projectWbsNodes.length > 0) {
      const nodeWithCode = projectWbsNodes.find(n => n.code) || projectWbsNodes[0];
      if (nodeWithCode && (!wbsCode || !projectWbsNodes.some(n => n.code === wbsCode))) {
        handleWbsCodeSelect(nodeWithCode.code);
      }
    }
  }, [projectWbsNodes]);

  const availableWarehousesForProject = useMemo(() => {
    if (!selectedProject) return warehouses;
    const projWh = warehouses.filter(w => {
      if (w.projectId && isProjectMatch(w.projectId, selectedProject.id)) return true;
      const nameLower = w.name.toLowerCase();
      const projNameLower = selectedProject.name.toLowerCase();
      const projCodeLower = selectedProject.code.toLowerCase();
      return nameLower.includes(projCodeLower) ||
             (projNameLower.includes('bingerville') && nameLower.includes('bingerville')) ||
             (projNameLower.includes('songon') && nameLower.includes('songon')) ||
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

  // CALCULS GLOBAUX INDICATEURS
  const totalStockValue = useMemo(() => {
    return stockItems.reduce((sum, item) => sum + (item.totalValue || item.currentStock * item.averageUnitPrice), 0);
  }, [stockItems]);

  const lowStockCount = useMemo(() => {
    return stockItems.filter(item => {
      const available = item.currentStock - (item.reservedStock || 0);
      return available <= item.minThreshold;
    }).length;
  }, [stockItems]);

  const activeReservationsCount = useMemo(() => {
    return stockItems.reduce((sum, item) => sum + (item.reservedStock || 0), 0);
  }, [stockItems]);

  const outOfStockCount = useMemo(() => {
    return stockItems.filter(item => (item.currentStock - (item.reservedStock || 0)) <= 0).length;
  }, [stockItems]);

  // ARTICLES FILTRÉS
  const filteredStockItems = useMemo(() => {
    return stockItems.filter(item => {
      if (selectedWarehouseFilter !== 'TOUS') {
        const w = selectedWarehouseFilter.toLowerCase();
        const iw = (item.warehouse || '').toLowerCase();
        const matchWh = iw === w ||
                        (w.includes('bingerville') && iw.includes('bingerville')) ||
                        (w.includes('songon') && iw.includes('songon')) ||
                        (w.includes('abidjan') && (iw.includes('abidjan') || iw.includes('central')));
        if (!matchWh) return false;
      }

      if (selectedCategoryFilter !== 'TOUS') {
        const c = selectedCategoryFilter.toLowerCase();
        const ic = (item.category || '').toLowerCase();
        const matchCat = ic.includes(c) ||
                         (c.includes('ciment') && (ic.includes('liant') || ic.includes('ciment'))) ||
                         (c.includes('acier') && (ic.includes('acier') || ic.includes('armature') || ic.includes('fer'))) ||
                         (c.includes('agglo') && (ic.includes('agglo') || ic.includes('brique'))) ||
                         (c.includes('engin') && (ic.includes('engin') || ic.includes('matériel') || ic.includes('combustible'))) ||
                         (c.includes('fourniture') && (ic.includes('quincaillerie') || ic.includes('tuyau') || ic.includes('plomberie')));
        if (!matchCat) return false;
      }

      const available = item.currentStock - (item.reservedStock || 0);
      if (selectedStatusFilter === 'DISPONIBLE' && available <= item.minThreshold) return false;
      if (selectedStatusFilter === 'SOUS_SEUIL' && (available > item.minThreshold || available <= 0)) return false;
      if (selectedStatusFilter === 'RUPTURE' && available > 0) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchCat) return false;
      }

      return true;
    });
  }, [stockItems, selectedWarehouseFilter, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // MOUVEMENTS FILTRÉS
  const filteredStockMovements = useMemo(() => {
    return stockMovements.filter(m => {
      if (selectedWarehouseFilter !== 'TOUS') {
        const w = selectedWarehouseFilter.toLowerCase();
        const mw = (m.warehouse || '').toLowerCase();
        const mdw = (m.destinationWarehouse || '').toLowerCase();
        if (!mw.includes(w) && !mdw.includes(w)) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCode = m.code.toLowerCase().includes(q);
        const matchItem = m.itemName.toLowerCase().includes(q);
        const matchDoc = (m.sourceDoc || '').toLowerCase().includes(q);
        const matchUser = (m.user || '').toLowerCase().includes(q);
        const matchWbs = (m.wbsCode || '').toLowerCase().includes(q);
        if (!matchCode && !matchItem && !matchDoc && !matchUser && !matchWbs) return false;
      }

      return true;
    });
  }, [stockMovements, selectedWarehouseFilter, searchQuery]);

  // STATUS BADGE
  const getItemStatusBadge = (item: StockItem) => {
    const reserved = item.reservedStock || 0;
    const available = item.currentStock - reserved;

    if (available <= 0) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">● Rupture</span>;
    }
    if (available <= item.minThreshold) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">⚠ Sous Seuil</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">✓ Disponible</span>;
  };

  // EXPORT EXCEL ARTICLES
  const exportStockToExcel = () => {
    const data = filteredStockItems.map(item => {
      const reserved = item.reservedStock || 0;
      const available = item.currentStock - reserved;
      return {
        'Code Article': item.code,
        'Désignation': item.name,
        'Catégorie': item.category,
        'Unité': item.unit,
        'Stock Physique': item.currentStock,
        'Stock Réservé': reserved,
        'Stock Disponible': available,
        'Seuil Alerte Min': item.minThreshold,
        'Magasin': item.warehouse,
        'PUMP (FCFA)': item.averageUnitPrice,
        'Valeur Totale (FCFA)': item.totalValue || item.currentStock * item.averageUnitPrice,
        'Statut': available <= 0 ? 'Rupture' : available <= item.minThreshold ? 'Sous Seuil' : 'Disponible'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock_Articles');
    XLSX.writeFile(workbook, `GEBAT_Stock_Articles_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // EXPORT CSV ARTICLES
  const exportStockToCSV = () => {
    const headers = ['Code Article', 'Désignation', 'Catégorie', 'Unité', 'Stock Physique', 'Stock Réservé', 'Stock Disponible', 'Seuil Min', 'Magasin', 'PUMP FCFA', 'Valeur FCFA'];
    const rows = filteredStockItems.map(item => [
      `"${item.code}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.unit}"`,
      item.currentStock,
      item.reservedStock || 0,
      item.currentStock - (item.reservedStock || 0),
      item.minThreshold,
      `"${item.warehouse}"`,
      item.averageUnitPrice,
      item.totalValue || item.currentStock * item.averageUnitPrice
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GEBAT_Stock_Articles_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT EXCEL MOUVEMENTS
  const exportMovementsToExcel = () => {
    const data = filteredStockMovements.map(m => ({
      'Code Mouvement': m.code,
      'Date': formatFrenchDate(m.date),
      'Type': m.type,
      'Article': m.itemName,
      'Quantité': m.quantity,
      'Unité': m.unit,
      'Prix Unitaire (FCFA)': m.unitPrice,
      'Coût Total (FCFA)': m.totalCost,
      'Magasin Source': m.warehouse,
      'Magasin Destination': m.destinationWarehouse || '—',
      'Projet Imputé': m.projectName || m.projectId || '—',
      'Code WBS': m.wbsCode || '—',
      'Doc Source': m.sourceDoc || '—',
      'Utilisateur': m.user,
      'Notes': m.notes || '—'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mouvements_Stock');
    XLSX.writeFile(workbook, `GEBAT_Mouvements_Stock_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // SOUMISSION MOUVEMENT DE STOCK
  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = allOrderedStockItems.find(i => i.id === selectedItemId) || stockItems.find(i => i.id === selectedItemId);
    if (!item) return;

    const unitP = Number(movementUnitPrice) > 0 ? Number(movementUnitPrice) : item.averageUnitPrice;

    createStockMovement({
      code: `MVT-${Date.now().toString().slice(-6)}`,
      type: movementType,
      itemId: item.id,
      itemName: item.name,
      quantity: Number(movementQty),
      unit: item.unit,
      unitPrice: unitP,
      totalCost: Math.round(Number(movementQty) * unitP),
      warehouse: movementWarehouse,
      destinationWarehouse: movementType === 'Transfert' ? destinationWarehouse : undefined,
      projectId: selectedProjectId,
      projectName: selectedProject?.name,
      wbsCode: wbsCode,
      activityName: activityName,
      sourceDoc: sourceDoc,
      user: currentUser ? currentUser.name : 'Magasinier',
      date: new Date().toISOString().split('T')[0],
      notes: notes,
    });

    addAuditLog(
      `Création Mouvement de Stock [${movementType}] - ${item.name} (${movementQty} ${item.unit})`,
      'Stock & Logistique',
      sourceDoc,
      `Magasin: ${movementWarehouse} | Projet: ${selectedProject?.code} | WBS: ${wbsCode}`
    );

    alert(`Mouvement [${movementType}] enregistré avec succès !`);
    setShowMovementModal(false);
  };

  // SOUMISSION TRANSFERT DE STOCK INTER-MAGASINS
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = stockItems.find(i => i.id === selectedItemId);
    if (!item) return;

    if (movementWarehouse === destinationWarehouse) {
      alert('Le magasin d’origine et le magasin de destination doivent être différents !');
      return;
    }

    if (item.currentStock < movementQty) {
      alert(`Stock insuffisant dans le magasin d'origine (${item.currentStock} ${item.unit} disponibles).`);
      return;
    }

    createStockMovement({
      code: `TRF-${Date.now().toString().slice(-6)}`,
      type: 'Transfert',
      itemId: item.id,
      itemName: item.name,
      quantity: Number(movementQty),
      unit: item.unit,
      unitPrice: item.averageUnitPrice,
      totalCost: Math.round(Number(movementQty) * item.averageUnitPrice),
      warehouse: movementWarehouse,
      destinationWarehouse: destinationWarehouse,
      projectId: selectedProjectId,
      projectName: selectedProject?.name,
      wbsCode: wbsCode,
      sourceDoc: `ORD-TRF-${Date.now().toString().slice(-4)}`,
      user: currentUser ? currentUser.name : 'Responsable Logistique',
      date: new Date().toISOString().split('T')[0],
      notes: notes || `Transfert inter-magasins de ${movementWarehouse} vers ${destinationWarehouse}`,
    });

    addAuditLog(
      `Transfert Inter-Magasins [${movementWarehouse} ➔ ${destinationWarehouse}]`,
      'Stock & Logistique',
      item.code,
      `Quantité transférée : ${movementQty} ${item.unit} de ${item.name}`
    );

    alert(`Transfert de ${movementQty} ${item.unit} de ${movementWarehouse} vers ${destinationWarehouse} enregistré avec succès !`);
    setShowTransferModal(false);
  };

  // SOUMISSION INVENTAIRE PHYSIQUE
  const handleInventorySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let adjustedCount = 0;
    const targetItems = inventoryWarehouse === 'TOUS' ? stockItems : stockItems.filter(i => i.warehouse === inventoryWarehouse);

    targetItems.forEach(item => {
      const physicalQty = inventoryCounts[item.id];
      if (physicalQty !== undefined && !isNaN(physicalQty)) {
        const diff = physicalQty - item.currentStock;
        if (diff !== 0) {
          adjustedCount++;
          const type: StockMovementType = diff > 0 ? 'Ajustement +' : 'Ajustement -';
          createStockMovement({
            code: `INV-AJUST-${Date.now().toString().slice(-4)}`,
            type: type,
            itemId: item.id,
            itemName: item.name,
            quantity: Math.abs(diff),
            unit: item.unit,
            unitPrice: item.averageUnitPrice,
            totalCost: Math.round(Math.abs(diff) * item.averageUnitPrice),
            warehouse: item.warehouse,
            user: currentUser ? currentUser.name : 'Responsable Inventaire',
            date: new Date().toISOString().split('T')[0],
            notes: `Inventaire physique. Écart: ${diff > 0 ? '+' : ''}${diff} ${item.unit}. Justification: ${inventoryJustification}`,
          });
        }
      }
    });

    addAuditLog(
      `Inventaire Physique Validé (${adjustedCount} ajustements)`,
      'Stock & Logistique',
      inventoryWarehouse,
      `Justification : ${inventoryJustification}`
    );

    alert(`Inventaire physique validé avec succès ! ${adjustedCount} écart(s) ajusté(s) automatiquement dans la base de données.`);
    setInventoryCounts({});
  };

  // SOUMISSION RÉSERVATION DE STOCK
  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = stockItems.find(i => i.id === selectedItemId);
    if (!item) return;

    const available = item.currentStock - (item.reservedStock || 0);
    if (reservedQty > available) {
      alert(`Impossible de réserver plus que le stock disponible (${available} ${item.unit}).`);
      return;
    }

    createStockMovement({
      code: `RES-${Date.now().toString().slice(-6)}`,
      type: 'Réservation',
      itemId: item.id,
      itemName: item.name,
      quantity: Number(reservedQty),
      unit: item.unit,
      unitPrice: item.averageUnitPrice,
      totalCost: Math.round(Number(reservedQty) * item.averageUnitPrice),
      warehouse: item.warehouse,
      projectId: reservedForProject,
      wbsCode: reservationWbs || wbsCode,
      activityName: activityName,
      sourceDoc: `RES-PROJ-${reservedForProject}`,
      user: currentUser ? currentUser.name : 'Conducteur de Travaux',
      date: new Date().toISOString().split('T')[0],
      notes: reservationNotes || `Réservation préalable de stock pour l'activité ${activityName}`,
    });

    addAuditLog(
      `Réservation de Stock (${reservedQty} ${item.unit} pour ${item.name})`,
      'Stock & Logistique',
      reservationWbs || wbsCode,
      `Stock disponible réduit sans sortie physique.`
    );

    alert(`Réservation de ${reservedQty} ${item.unit} effectuée pour le WBS ${reservationWbs || wbsCode}. Stock disponible mis à jour !`);
    setShowReservationModal(false);
  };

  const handleReleaseReservation = (item: StockItem) => {
    const resQty = item.reservedStock || 0;
    if (resQty <= 0) return;

    if (confirm(`Voulez-vous libérer la réservation de ${resQty} ${item.unit} pour "${item.name}" ? Le stock redeviendra totalement disponible.`)) {
      createStockMovement({
        code: `REL-${Date.now().toString().slice(-6)}`,
        type: 'Libération Réservation',
        itemId: item.id,
        itemName: item.name,
        quantity: resQty,
        unit: item.unit,
        unitPrice: item.averageUnitPrice,
        totalCost: Math.round(resQty * item.averageUnitPrice),
        warehouse: item.warehouse,
        sourceDoc: `ANNUL-RES-${item.code}`,
        user: currentUser ? currentUser.name : 'Conducteur de Travaux',
        date: new Date().toISOString().split('T')[0],
        notes: `Libération de réservation : remise à disposition de ${resQty} ${item.unit}`,
      });

      addAuditLog(
        `Libération de Réservation (${resQty} ${item.unit} de ${item.name})`,
        'Stock & Logistique',
        item.code,
        `Stock disponible restauré.`
      );

      alert(`Réservation de ${resQty} ${item.unit} libérée avec succès !`);
    }
  };

  const handleConsumeReservation = (item: StockItem) => {
    const resQty = item.reservedStock || 0;
    if (resQty <= 0) return;

    if (confirm(`Confirmez-vous la sortie physique et l'imputation sur chantier de ${resQty} ${item.unit} de "${item.name}" ?`)) {
      createStockMovement({
        code: `MVT-RES-${Date.now().toString().slice(-6)}`,
        type: 'Sortie',
        itemId: item.id,
        itemName: item.name,
        quantity: resQty,
        unit: item.unit,
        unitPrice: item.averageUnitPrice,
        totalCost: Math.round(resQty * item.averageUnitPrice),
        warehouse: item.warehouse,
        projectId: selectedProjectId,
        projectName: selectedProject?.name,
        wbsCode: wbsCode,
        activityName: activityName,
        sourceDoc: `BON-SORTIE-RES-${item.code}`,
        user: currentUser ? currentUser.name : 'Conducteur de Travaux',
        date: new Date().toISOString().split('T')[0],
        notes: `Consommation sur chantier de la Réservation de ${resQty} ${item.unit}`,
      });

      addAuditLog(
        `Consommation Réservation sur Chantier [${resQty} ${item.unit} de ${item.name}]`,
        'Stock & Logistique',
        wbsCode,
        `Coût imputé : ${(Math.round(resQty * item.averageUnitPrice)).toLocaleString('fr-FR')} FCFA`
      );

      alert(`Sortie physique de ${resQty} ${item.unit} effectuée et imputée au projet avec succès !`);
    }
  };

  // SOUMISSION CRÉATION OU MODIFICATION D'ARTICLE
  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingArticle) {
      updateStockItem({
        ...editingArticle,
        name: articleForm.name,
        category: articleForm.category,
        unit: articleForm.unit,
        warehouse: articleForm.warehouse,
        minThreshold: Number(articleForm.minThreshold),
        currentStock: Number(articleForm.currentStock),
        averageUnitPrice: Number(articleForm.averageUnitPrice),
        totalValue: Number(articleForm.currentStock) * Number(articleForm.averageUnitPrice),
      });
      alert(`Article ${articleForm.name} mis à jour avec succès.`);
    } else {
      addStockItem({
        code: articleForm.code || `ART-${Date.now().toString().slice(-4)}`,
        name: articleForm.name,
        category: articleForm.category,
        unit: articleForm.unit,
        warehouse: articleForm.warehouse,
        minThreshold: Number(articleForm.minThreshold),
        currentStock: Number(articleForm.currentStock),
        reservedStock: 0,
        averageUnitPrice: Number(articleForm.averageUnitPrice),
        totalValue: Number(articleForm.currentStock) * Number(articleForm.averageUnitPrice),
      });
      alert(`Nouvel article ${articleForm.name} créé avec succès dans la base de données.`);
    }

    setShowAddArticleModal(false);
    setEditingArticle(null);
  };

  const handleOpenEditArticle = (item: StockItem) => {
    setEditingArticle(item);
    setArticleForm({
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      warehouse: item.warehouse,
      minThreshold: item.minThreshold,
      currentStock: item.currentStock,
      averageUnitPrice: item.averageUnitPrice,
    });
    setShowAddArticleModal(true);
  };

  const handleDeleteArticle = (item: StockItem) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'article "${item.name}" (${item.code}) ?`)) {
      deleteStockItem(item.id);
      if (selectedArticle?.id === item.id) setSelectedArticle(null);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* HEADER MODULE STOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package size={24} className="text-blue-600" /> Gestion des Stocks & Dépôts
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Valorisation PUMP, suivi multi-magasins, imputations WBS et contrôle des seuils de réapprovisionnement</p>
        </div>

        {/* ACTIONS PRINCIPALES */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingArticle(null);
              setArticleForm({
                code: `ART-${Date.now().toString().slice(-4)}`,
                name: '',
                category: 'Matériaux Liants',
                unit: 'sacs',
                warehouse: warehouses[0]?.name || 'Magasin Bingerville (Chantier)',
                minThreshold: 50,
                currentStock: 100,
                averageUnitPrice: 4800,
              });
              setShowAddArticleModal(true);
            }}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus size={14} /> Nouvel Article
          </button>
          <button
            onClick={() => setShowMovementModal(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus size={14} /> Nouveau Mouvement
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <ArrowRightLeft size={14} /> Transfert Inter-Magasins
          </button>
          <button
            onClick={() => setShowReservationModal(true)}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Lock size={14} /> Réserver Stock
          </button>
        </div>
      </div>

      {/* INDICATEURS SYNTHÉTIQUES DE STOCK */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-slate-400 font-sans font-extrabold uppercase block">Valeur Totale du Stock</span>
          <span className="text-base font-black text-slate-900">{totalStockValue.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-blue-600 font-sans font-extrabold uppercase block">Articles au Catalogue</span>
          <span className="text-base font-black text-blue-800">{stockItems.length} Réf.</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-amber-600 font-sans font-extrabold uppercase block">Articles Sous Seuil</span>
          <span className="text-base font-black text-amber-700">{lowStockCount} Réf.</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-rose-600 font-sans font-extrabold uppercase block">Articles en Rupture</span>
          <span className="text-base font-black text-rose-700">{outOfStockCount} Réf.</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-purple-600 font-sans font-extrabold uppercase block">Réservations Actives</span>
          <span className="text-base font-black text-purple-800">{activeReservationsCount} Unités</span>
        </div>
      </div>

      {/* BARRE DE NAVIGATION PAR ONGLETS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition ${
            activeTab === 'items'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Package size={15} /> Catalogue & Stock Physique
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'items' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {stockItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition ${
            activeTab === 'movements'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <ArrowRightLeft size={15} /> Journal des Mouvements & Traçabilité
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'movements' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {stockMovements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <ClipboardList size={15} /> Inventaire Physique & Écarts
        </button>

        <button
          onClick={() => setActiveTab('reservation')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition ${
            activeTab === 'reservation'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Lock size={15} /> Réservations de Chantier
          {activeReservationsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-100 text-purple-800">
              {activeReservationsCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ONGLET 1 : CATALOGUE ET STOCK PHYSIQUE */}
      {/* ========================================================================= */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* BARRE DE FILTRES MULTI-CRITÈRES */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 text-xs">Magasin :</span>
                <select
                  value={selectedWarehouseFilter}
                  onChange={e => setSelectedWarehouseFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                >
                  <option value="TOUS">Tous les magasins</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.name}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 text-xs">Catégorie :</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={e => setSelectedCategoryFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                >
                  <option value="TOUS">Toutes les catégories</option>
                  <option value="Matériaux Liants">Matériaux Liants (Ciment)</option>
                  <option value="Aciers & Armatures">Aciers & Armatures (Fer)</option>
                  <option value="Quincaillerie & Fixations">Quincaillerie & Fixations</option>
                  <option value="Tuyauterie & Plomberie">Tuyauterie & Plomberie</option>
                  <option value="Agglos & Briques">Agglos & Briques</option>
                  <option value="Combustibles & Lubrifiants">Combustibles & Lubrifiants</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 text-xs">Statut :</span>
                <select
                  value={selectedStatusFilter}
                  onChange={e => setSelectedStatusFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                >
                  <option value="TOUS">Tous les statuts</option>
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="SOUS_SEUIL">Sous Seuil</option>
                  <option value="RUPTURE">Rupture</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher article, code..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-56 focus:outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <button
                onClick={exportStockToExcel}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-xl border border-emerald-200 text-xs flex items-center gap-1.5 transition"
                title="Exporter en fichier Excel .xlsx"
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button
                onClick={exportStockToCSV}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl border border-slate-200 text-xs flex items-center gap-1.5 transition"
                title="Exporter en fichier CSV .csv"
              >
                <Download size={14} /> CSV
              </button>
            </div>
          </div>

          {/* TABLEAU DES ARTICLES EN STOCK */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-3">Code Article</th>
                    <th className="p-3">Désignation</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Unité</th>
                    <th className="p-3 text-right">Stock Physique</th>
                    <th className="p-3 text-right">Stock Réservé</th>
                    <th className="p-3 text-right">Stock Disponible</th>
                    <th className="p-3 text-right">Seuil Min</th>
                    <th className="p-3">Magasin Principal</th>
                    <th className="p-3 text-right">PUMP (FCFA)</th>
                    <th className="p-3 text-right">Valeur Totale</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStockItems.map(item => {
                    const reserved = item.reservedStock || 0;
                    const available = item.currentStock - reserved;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-blue-700">{item.code}</td>
                        <td className="p-3 font-extrabold text-slate-900">{item.name}</td>
                        <td className="p-3 text-slate-600">{item.category}</td>
                        <td className="p-3 font-mono text-slate-500">{item.unit}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{item.currentStock.toLocaleString('fr-FR')}</td>
                        <td className="p-3 text-right font-mono text-purple-700">{reserved > 0 ? reserved.toLocaleString('fr-FR') : '—'}</td>
                        <td className="p-3 text-right font-mono font-black text-blue-900 bg-blue-50/50">{available.toLocaleString('fr-FR')}</td>
                        <td className="p-3 text-right font-mono text-amber-700">{item.minThreshold.toLocaleString('fr-FR')}</td>
                        <td className="p-3 text-slate-600 text-[11px] truncate max-w-[140px]">{item.warehouse}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700">
                          {item.averageUnitPrice.toLocaleString('fr-FR')}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">
                          {(item.totalValue || item.currentStock * item.averageUnitPrice).toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="p-3 text-center">{getItemStatusBadge(item)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedArticle(item)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px] transition"
                              title="Fiche Article complète"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenEditArticle(item)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition"
                              title="Modifier l'article"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(item)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[10px] transition"
                              title="Supprimer l'article"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : JOURNAL DES MOUVEMENTS & TRAÇABILITÉ */}
      {/* ========================================================================= */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 text-xs">Magasin :</span>
                <select
                  value={selectedWarehouseFilter}
                  onChange={e => setSelectedWarehouseFilter(e.target.value)}
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
                  placeholder="Rechercher code, doc, WBS..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-56 focus:outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <button
                onClick={exportMovementsToExcel}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-xl border border-emerald-200 text-xs flex items-center gap-1.5 transition"
              >
                <FileSpreadsheet size={14} /> Exporter Mouvements
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-3">N° Mouvement</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Article</th>
                    <th className="p-3 text-right">Quantité</th>
                    <th className="p-3 text-right">PUMP Unit.</th>
                    <th className="p-3 text-right">Impact Coût</th>
                    <th className="p-3">Magasin Source</th>
                    <th className="p-3">Magasin Dest.</th>
                    <th className="p-3">Projet & WBS Imputé</th>
                    <th className="p-3">Doc Source</th>
                    <th className="p-3">Opérateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStockMovements.map(m => (
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
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{m.totalCost ? `${m.totalCost.toLocaleString('fr-FR')} FCFA` : '—'}</td>
                      <td className="p-3 text-slate-600 truncate max-w-[120px]">{m.warehouse}</td>
                      <td className="p-3 text-slate-600 truncate max-w-[120px]">{m.destinationWarehouse || '—'}</td>
                      <td className="p-3">
                        <span className="text-slate-800 block truncate max-w-[120px] font-bold">{m.projectName || '—'}</span>
                        <span className="text-[10px] font-mono text-purple-700 block">{m.wbsCode || '—'}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-500">{m.sourceDoc || '—'}</td>
                      <td className="p-3 text-slate-600">{m.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : INVENTAIRE PHYSIQUE & GESTION DES ÉCARTS */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-600" /> Saisie du Comptage Physique & Réconciliation
                </h3>
                <p className="text-slate-500 text-xs">Saisissez les quantités réelles comptées au dépôt pour générer automatiquement les ajustements de stock.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 text-xs">Magasin d'inventaire :</span>
                <select
                  value={inventoryWarehouse}
                  onChange={e => setInventoryWarehouse(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                >
                  <option value="TOUS">Tous les magasins</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.name}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={handleInventorySubmit} className="space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                      <th className="p-3">Code</th>
                      <th className="p-3">Désignation Article</th>
                      <th className="p-3">Magasin</th>
                      <th className="p-3 text-right">Stock Théorique (Système)</th>
                      <th className="p-3 text-right w-44">Comptage Physique Réel</th>
                      <th className="p-3 text-right">Écart Quantité</th>
                      <th className="p-3 text-right">Écart Valeur (FCFA)</th>
                      <th className="p-3 text-center">Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(inventoryWarehouse === 'TOUS' ? stockItems : stockItems.filter(i => i.warehouse === inventoryWarehouse)).map(item => {
                      const counted = inventoryCounts[item.id] !== undefined ? inventoryCounts[item.id] : item.currentStock;
                      const diff = counted - item.currentStock;
                      const diffVal = diff * item.averageUnitPrice;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-blue-700">{item.code}</td>
                          <td className="p-3 font-extrabold text-slate-900">{item.name}</td>
                          <td className="p-3 text-slate-600">{item.warehouse}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">{item.currentStock} {item.unit}</td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              className="w-28 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                              value={inventoryCounts[item.id] !== undefined ? inventoryCounts[item.id] : item.currentStock}
                              onChange={e => setInventoryCounts({ ...inventoryCounts, [item.id]: Number(e.target.value) })}
                            />
                          </td>
                          <td className="p-3 text-right font-mono font-black">
                            <span className={diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-400'}>
                              {diff > 0 ? `+${diff}` : diff} {item.unit}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-black">
                            <span className={diffVal > 0 ? 'text-emerald-700' : diffVal < 0 ? 'text-rose-700' : 'text-slate-400'}>
                              {diffVal > 0 ? `+${diffVal.toLocaleString('fr-FR')}` : diffVal.toLocaleString('fr-FR')} FCFA
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {diff === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ Conforme</span>
                            ) : diff > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">+ Excédent</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">⚠ Manquant</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t">
                <div className="flex-1 max-w-md">
                  <label className="block text-slate-700 font-bold mb-1">Motif / Justification d'Inventaire *</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    value={inventoryJustification}
                    onChange={e => setInventoryJustification(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <CheckCircle2 size={16} /> Valider l'Inventaire & Régulariser les Écarts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 4 : RÉSERVATIONS DE CHANTIER */}
      {/* ========================================================================= */}
      {activeTab === 'reservation' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Lock size={18} className="text-amber-600" /> Suivi des Réservations de Matériaux
                </h3>
                <p className="text-slate-500 text-xs">Articles bloqués pour des phases de travaux imminentes (le stock disponible est réduit mais le stock physique reste au dépôt).</p>
              </div>

              <button
                onClick={() => setShowReservationModal(true)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Plus size={14} /> Nouvelle Réservation
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-3">Code Article</th>
                    <th className="p-3">Désignation</th>
                    <th className="p-3">Magasin</th>
                    <th className="p-3 text-right">Stock Physique</th>
                    <th className="p-3 text-right">Quantité Réservée</th>
                    <th className="p-3 text-right">Stock Disponible Net</th>
                    <th className="p-3 text-right">Valeur Réservée (FCFA)</th>
                    <th className="p-3 text-center">Statut Réservation</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {stockItems.filter(i => (i.reservedStock || 0) > 0).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{item.code}</td>
                      <td className="p-3 font-extrabold text-slate-900">{item.name}</td>
                      <td className="p-3 text-slate-600">{item.warehouse}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">{item.currentStock} {item.unit}</td>
                      <td className="p-3 text-right font-mono font-black text-purple-700">{(item.reservedStock || 0)} {item.unit}</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-900">{item.currentStock - (item.reservedStock || 0)} {item.unit}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {((item.reservedStock || 0) * item.averageUnitPrice).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">
                          🔒 Réservé Chantier
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleConsumeReservation(item)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px] flex items-center gap-1 transition"
                            title="Consommer et sortir vers le chantier"
                          >
                            <ArrowRight size={12} /> Consommer
                          </button>
                          <button
                            onClick={() => handleReleaseReservation(item)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[10px] flex items-center gap-1 transition"
                            title="Libérer la réservation (remettre à disposition)"
                          >
                            <Unlock size={12} /> Libérer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stockItems.filter(i => (i.reservedStock || 0) > 0).length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                        Aucune réservation active pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL FICHE ARTICLE (INSPECTION COMPLETE) */}
      {/* ========================================================================= */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-mono text-blue-700 font-bold uppercase">{selectedArticle.code} — {selectedArticle.category}</span>
                <h3 className="font-extrabold text-slate-900 text-base">{selectedArticle.name}</h3>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-extrabold text-slate-900 text-xs block border-b pb-1">Informations Générales & Valorisation :</span>
                <div className="space-y-1">
                  <div className="flex justify-between"><span>Catégorie :</span> <strong>{selectedArticle.category}</strong></div>
                  <div className="flex justify-between"><span>Unité de mesure :</span> <strong>{selectedArticle.unit}</strong></div>
                  <div className="flex justify-between"><span>Magasin de stockage :</span> <strong>{selectedArticle.warehouse}</strong></div>
                  <div className="flex justify-between"><span>Prix Unitaire Moyen (PUMP) :</span> <strong>{selectedArticle.averageUnitPrice.toLocaleString('fr-FR')} FCFA</strong></div>
                  <div className="flex justify-between"><span>Valeur Totale en Stock :</span> <strong className="text-blue-900 font-mono">{(selectedArticle.totalValue || selectedArticle.currentStock * selectedArticle.averageUnitPrice).toLocaleString('fr-FR')} FCFA</strong></div>
                </div>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-2">
                <span className="font-extrabold text-blue-900 text-xs block border-b pb-1">Disponibilité du Stock :</span>
                <div className="space-y-1 font-mono">
                  <div className="flex justify-between"><span>Stock Physique :</span> <strong>{selectedArticle.currentStock.toLocaleString('fr-FR')} {selectedArticle.unit}</strong></div>
                  <div className="flex justify-between"><span>Stock Réservé :</span> <strong className="text-purple-700">{(selectedArticle.reservedStock || 0).toLocaleString('fr-FR')} {selectedArticle.unit}</strong></div>
                  <div className="flex justify-between text-sm font-black border-t pt-1 text-blue-950">
                    <span>Stock Disponible Net :</span>
                    <span>{(selectedArticle.currentStock - (selectedArticle.reservedStock || 0)).toLocaleString('fr-FR')} {selectedArticle.unit}</span>
                  </div>
                  <div className="flex justify-between text-amber-800"><span>Seuil d'Alerte Réappro :</span> <strong>{selectedArticle.minThreshold.toLocaleString('fr-FR')} {selectedArticle.unit}</strong></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-extrabold text-slate-900 text-xs block">Historique Récent des Mouvements sur cet Article :</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-extrabold text-[10px] text-slate-500 uppercase">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Quantité</th>
                      <th className="p-2">Magasin</th>
                      <th className="p-2">WBS Imputé</th>
                      <th className="p-2">Doc Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {stockMovements
                      .filter(m => m.itemId === selectedArticle.id || m.itemName.toLowerCase().includes(selectedArticle.name.toLowerCase()))
                      .slice(0, 5)
                      .map(m => (
                        <tr key={m.id}>
                          <td className="p-2">{formatFrenchDate(m.date)}</td>
                          <td className="p-2"><span className="font-bold">{m.type}</span></td>
                          <td className="p-2 text-right font-bold">{m.quantity} {m.unit}</td>
                          <td className="p-2 text-slate-600">{m.warehouse}</td>
                          <td className="p-2 text-purple-700">{m.wbsCode || '—'}</td>
                          <td className="p-2 text-slate-500">{m.sourceDoc || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedArticle(null);
                  handleOpenEditArticle(selectedArticle);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition"
              >
                Modifier l'Article
              </button>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL AJOUT / MODIFICATION ARTICLE */}
      {/* ========================================================================= */}
      {showAddArticleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Package size={18} className="text-blue-600" />
                {editingArticle ? `Modifier l'Article ${editingArticle.code}` : 'Créer un Nouvel Article de Stock'}
              </h3>
              <button onClick={() => setShowAddArticleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Code Article *</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs"
                    value={articleForm.code}
                    onChange={e => setArticleForm({ ...articleForm, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Catégorie *</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    value={articleForm.category}
                    onChange={e => setArticleForm({ ...articleForm, category: e.target.value })}
                  >
                    <option value="Matériaux Liants">Matériaux Liants (Ciment, Chaux)</option>
                    <option value="Aciers & Armatures">Aciers & Armatures (Fer à béton)</option>
                    <option value="Quincaillerie & Fixations">Quincaillerie & Fixations</option>
                    <option value="Tuyauterie & Plomberie">Tuyauterie & Plomberie</option>
                    <option value="Agglos & Briques">Agglos & Briques</option>
                    <option value="Combustibles & Lubrifiants">Combustibles & Lubrifiants</option>
                    <option value="Agrégats & Carrière">Agrégats & Carrière (Sable, Gravier)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Désignation Complète de l'Article *</label>
                <input
                  type="text"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  placeholder="Ex: Ciment CPJ 42.5 sac 50kg"
                  value={articleForm.name}
                  onChange={e => setArticleForm({ ...articleForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unité *</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    placeholder="sacs, tonnes, u..."
                    value={articleForm.unit}
                    onChange={e => setArticleForm({ ...articleForm, unit: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Stock {editingArticle ? 'Actuel' : 'Initial'} *</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs"
                    value={articleForm.currentStock}
                    onChange={e => setArticleForm({ ...articleForm, currentStock: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Seuil Min Alerte *</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-amber-700"
                    value={articleForm.minThreshold}
                    onChange={e => setArticleForm({ ...articleForm, minThreshold: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Magasin Principal *</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    value={articleForm.warehouse}
                    onChange={e => setArticleForm({ ...articleForm, warehouse: e.target.value })}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Prix Unitaire / PUMP (FCFA) *</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-blue-900"
                    value={articleForm.averageUnitPrice}
                    onChange={e => setArticleForm({ ...articleForm, averageUnitPrice: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddArticleModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition"
                >
                  {editingArticle ? 'Enregistrer Modifications' : 'Créer Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CRÉATION DE MOUVEMENT */}
      {/* ========================================================================= */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Plus size={18} className="text-blue-600" /> Saisir un Mouvement de Stock
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
                    <option value="Entrée">Entrée Stock</option>
                    <option value="Sortie">Sortie Chantier</option>
                    <option value="Transfert">Transfert Inter-Magasins</option>
                    <option value="Retour">Retour Chantier ➔ Stock</option>
                    <option value="Ajustement +">Ajustement Positif</option>
                    <option value="Ajustement -">Ajustement Négatif</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Magasin du Site *</label>
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
                  <label className="block text-slate-700 font-bold mb-1">N° Doc Source (BL/BS) *</label>
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
                      label="Nœud WBS Imputé (Sélection)"
                      options={wbsSelectOptions}
                      value={wbsCode}
                      onChange={handleWbsCodeSelect}
                      placeholder="Saisir un N° Prix, Code WBS..."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ARTICLE ET QUANTITÉ */}
              <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 space-y-2">
                <span className="font-extrabold text-blue-900 text-[11px] flex items-center gap-1.5">
                  <Package size={14} className="text-blue-600" /> Article & Quantité Liés au Nœud WBS sélectionné :
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
                      placeholder="Rechercher ou sélectionner un article..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-[10px]">Quantité *</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2 bg-white border border-blue-300 focus:border-blue-500 rounded-xl font-black font-mono text-xs text-blue-900 shadow-xs"
                      value={movementQty}
                      onChange={e => setMovementQty(Number(e.target.value))}
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
                      placeholder="Coulage radier et voiles du bassin..."
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

      {/* ========================================================================= */}
      {/* MODAL TRANSFERT INTER-MAGASINS */}
      {/* ========================================================================= */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-purple-600" /> Transfert Inter-Magasins
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Magasin Source (Origine) *</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    value={movementWarehouse}
                    onChange={e => setMovementWarehouse(e.target.value)}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Magasin Destination (Cible) *</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    value={destinationWarehouse}
                    onChange={e => setDestinationWarehouse(e.target.value)}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Article à Transférer *</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                >
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name} ({item.currentStock} {item.unit} dispo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quantité à Transférer *</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs"
                    value={movementQty}
                    onChange={e => setMovementQty(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Projet / Chantier Destinataire</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                  >
                    {authorizedProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes & Justification du Transfert</label>
                <input
                  type="text"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  placeholder="Ex: Réapprovisionnement urgent chantier Songon"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition"
                >
                  Exécuter le Transfert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL RÉSERVATION STOCK */}
      {/* ========================================================================= */}
      {showReservationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Lock size={18} className="text-amber-600" /> Réserver du Stock pour un Chantier
              </h3>
              <button onClick={() => setShowReservationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReservationSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Chantier Bénéficiaire *</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  value={reservedForProject}
                  onChange={e => setReservedForProject(e.target.value)}
                >
                  {authorizedProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Article à Réserver *</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                >
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name} (Dispo net: {item.currentStock - (item.reservedStock || 0)} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quantité à Réserver *</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-purple-800"
                    value={reservedQty}
                    onChange={e => setReservedQty(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Code WBS Associé</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    placeholder="Ex: 03.02.004"
                    value={reservationWbs}
                    onChange={e => setReservationWbs(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Motif de Réservation</label>
                <input
                  type="text"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  value={reservationNotes}
                  onChange={e => setReservationNotes(e.target.value)}
                  placeholder="Coulage prévu ce vendredi..."
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                <p><strong>Note :</strong> La réservation réduit immédiatement le stock disponible pour éviter les sur-allocations par d'autres équipes sans effectuer de sortie comptable.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReservationModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition"
                >
                  Confirmer la Réservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockModule;
