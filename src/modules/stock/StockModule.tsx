import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { StockItem, StockMovementType, Warehouse } from '../../types';
import { isProjectMatch } from '../../utils/projectMatcher';
import { hasPermission, hasProjectAccess } from '../../core/permissions';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import {
  Package, ArrowRightLeft, AlertCircle, Plus, CheckCircle2, RefreshCw,
  Search, Filter, Calculator, ShieldCheck, DollarSign, ArrowRight, FileText,
  Warehouse as WarehouseIcon, RotateCcw, ClipboardList, Lock, Layers, Download, Eye, X, ChevronRight
} from 'lucide-react';

export const StockModule: React.FC = () => {
  const { stockItems, warehouses, stockMovements, projects, wbsMap, createStockMovement, processGoodsReceipt, purchaseOrders, addAuditLog, currentUser } = useAppState();

  const authorizedProjects = useMemo(() => {
    return projects.filter(p => hasProjectAccess(currentUser, p.id) || hasProjectAccess(currentUser, p.code));
  }, [projects, currentUser]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(authorizedProjects[0]?.id || authorizedProjects[0]?.code || '');
  const selectedProject = authorizedProjects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || authorizedProjects[0];

  // Onglet courant : Stock Physique, Mouvements, Inventaire, Réservations
  const [activeTab, setActiveTab] = useState<'items' | 'transfer' | 'inventory' | 'reservation'>('items');

  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('TOUS');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TOUS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TOUS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // SÉLECTION D'UN ARTICLE POUR LA FICHE ARTICLE (INSPECTOR MODAL)
  const [selectedArticle, setSelectedArticle] = useState<StockItem | null>(null);

  // MODALES ET FORMULAIRES
  const [showMovementModal, setShowMovementModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
  const [showReservationModal, setShowReservationModal] = useState<boolean>(false);

  // ÉTATS DE SAISIE DE MOUVEMENT
  const [movementType, setMovementType] = useState<StockMovementType>('Entrée');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [movementWarehouse, setMovementWarehouse] = useState<string>('Magasin Bingerville (Chantier)');
  const [destinationWarehouse, setDestinationWarehouse] = useState<string>('Magasin Songon (Chantier)');
  const [movementQty, setMovementQty] = useState<number>(50);
  const [wbsCode, setWbsCode] = useState<string>('');
  const [activityName, setActivityName] = useState<string>('Béton armé pour Voiles & Radiers bassins');
  const [sourceDoc, setSourceDoc] = useState<string>('BL-2026-089-SOCIMAC');
  const [notes, setNotes] = useState<string>('Livraison conforme avec vérification bon de livraison');

  // Auto-initialisation des sélections par défaut quand les articles et projets sont chargés
  React.useEffect(() => {
    if (stockItems.length > 0 && (!selectedItemId || !stockItems.some(i => i.id === selectedItemId))) {
      setSelectedItemId(stockItems[0].id);
    }
  }, [stockItems, selectedItemId]);

  // ÉTATS DE SAISIE INVENTAIRE PHYSIQUE
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, number>>({});
  const [inventoryJustification, setInventoryJustification] = useState<string>('Ajustement suite au comptage physique trimestriel');

  // ÉTATS DE SAISIE RÉSERVATION
  const [reservedQty, setReservedQty] = useState<number>(20);
  const [reservedForProject, setReservedForProject] = useState<string>(selectedProject?.id || '');

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

    // 1. Détecter les articles de stock correspondant aux activités de BTP / WBS
    let matches = stockItems.filter(item => {
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
    
    // Combiner : Articles recommandés WBS en 1er, puis TOUS les autres articles de stock
    const otherItems = stockItems.filter(i => !recommended.some(r => r.id === i.id));
    const allOrdered = [...recommended, ...otherItems];

    const plannedQty = Math.round(node?.plannedQty || 50);

    return {
      recommendedStockItems: recommended,
      allOrderedStockItems: allOrdered,
      defaultQty: plannedQty > 0 ? plannedQty : 50,
    };
  }, [wbsCode, selectedProject, stockItems, projectWbsNodes]);

  // OPTIONS POUR LE COMPOSANT SEARCHABLE SELECT (WBS & ARTICLES DE STOCK)
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
        sublabel: `Code: ${item.code} | Stock disponible: ${item.currentStock} ${item.unit} | Magasin: ${item.warehouse}`,
      };
    });
  }, [allOrderedStockItems, recommendedStockItems]);

  // SÉLECTION D'UN NŒUD WBS
  const handleWbsCodeSelect = (targetWbsCode: string) => {
    setWbsCode(targetWbsCode);
    const node = projectWbsNodes.find(n => n.code === targetWbsCode);
    if (node) setActivityName(node.name);
  };

  // Synchronisation automatique de l'article recommandé et de la quantité au changement de WBS
  React.useEffect(() => {
    if (recommendedStockItems.length > 0) {
      setSelectedItemId(recommendedStockItems[0].id);
      setMovementQty(defaultQty);
    } else if (stockItems.length > 0) {
      setSelectedItemId(stockItems[0].id);
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

  // MAGASINS CORRESPONDANT AU PROJET ET À SON SITE
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

  // Synchronisation automatique du magasin selon le chantier sélectionné
  React.useEffect(() => {
    if (availableWarehousesForProject.length > 0) {
      const siteWh = availableWarehousesForProject.find(w => w.projectId && isProjectMatch(w.projectId, selectedProjectId)) || availableWarehousesForProject[0];
      if (siteWh && siteWh.name !== movementWarehouse) {
        setMovementWarehouse(siteWh.name);
      }
    }
  }, [selectedProjectId, availableWarehousesForProject]);

  // CALCULS COMPACTS DE SUIVI DE STOCK
  const totalStockValue = useMemo(() => {
    return stockItems.reduce((sum, item) => sum + (item.totalValue || item.currentStock * item.averageUnitPrice), 0);
  }, [stockItems]);

  const lowStockCount = useMemo(() => {
    return stockItems.filter(item => item.currentStock <= item.minThreshold).length;
  }, [stockItems]);

  const activeReservationsCount = useMemo(() => {
    return stockItems.reduce((sum, item) => sum + (item.reservedStock || 0), 0);
  }, [stockItems]);

  // ARTICLES FILTRÉS DYNAMIQUEMENT
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

  // ÉVOLUTION ET CALCUL DU STOCK DISPONIBLE (PARTIE 2.4 : DISPONIBLE = PHYSIQUE - RÉSERVÉ)
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

  // SOUMISSION MOUVEMENT DE STOCK
  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = stockItems.find(i => i.id === selectedItemId) || currentWbsArticles.find(a => a.id === selectedItemId);
    if (!item) return;

    createStockMovement({
      code: `MVT-${Date.now().toString().slice(-6)}`,
      type: movementType,
      itemId: item.id,
      itemName: item.name,
      quantity: Number(movementQty),
      unit: item.unit,
      unitPrice: item.averageUnitPrice,
      totalCost: Math.round(Number(movementQty) * item.averageUnitPrice),
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
      `Magasin: ${movementWarehouse} | Projet: ${selectedProject.code} | WBS: ${wbsCode}`
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
      notes: `Transfert inter-magasins de ${movementWarehouse} vers ${destinationWarehouse}`,
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
    Object.entries(inventoryCounts).forEach(([itemId, physicalQty]) => {
      const item = stockItems.find(i => i.id === itemId);
      if (item) {
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
            warehouse: selectedWarehouseFilter !== 'TOUS' ? selectedWarehouseFilter : item.warehouse,
            user: currentUser ? currentUser.name : 'Responsable Inventaire',
            date: new Date().toISOString().split('T')[0],
            notes: `Ajustement d’inventaire. ${inventoryJustification}`,
          });
        }
      }
    });

    addAuditLog(
      `Inventaire Physique Validé (${adjustedCount} ajustements)`,
      'Stock & Logistique',
      selectedWarehouseFilter,
      `Justification : ${inventoryJustification}`
    );

    alert(`Inventaire physique validé avec succès ! ${adjustedCount} écart(s) ajusté(s) automatiquement.`);
    setShowInventoryModal(false);
  };

  // SOUMISSION RÉRERVATION DE STOCK
  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = stockItems.find(i => i.id === selectedItemId);
    if (!item) return;

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
      wbsCode: wbsCode,
      activityName: activityName,
      sourceDoc: `RES-PROJ-${reservedForProject}`,
      user: currentUser ? currentUser.name : 'Conducteur de Travaux',
      date: new Date().toISOString().split('T')[0],
      notes: `Réservation préalable de stock pour l'activité ${activityName}`,
    });

    addAuditLog(
      `Réservation de Stock (${reservedQty} ${item.unit} pour ${item.name})`,
      'Stock & Logistique',
      wbsCode,
      `Stock disponible réduit sans sortie physique.`
    );

    alert(`Réservation de ${reservedQty} ${item.unit} effectuée pour le WBS ${wbsCode}. Stock disponible mis à jour !`);
    setShowReservationModal(false);
  };

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* HEADER MODULE STOCK (PARTIE 2.2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package size={24} className="text-blue-600" /> Gestion des Stocks
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Suivi des articles, disponibilités et mouvements par magasin et projet</p>
        </div>

        {/* ACTIONS PRINCIPALES */}
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => setShowInventoryModal(true)}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <ClipboardList size={14} /> Inventaire Physique
          </button>
          <button
            onClick={() => setShowReservationModal(true)}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Lock size={14} /> Réservation Stock
          </button>
        </div>
      </div>

      {/* INDICATEURS COMPACTS DE STOCK (PARTIE 2.2) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-slate-400 font-sans font-extrabold uppercase block">Valeur Totale du Stock</span>
          <span className="text-base font-black text-slate-900">{totalStockValue.toLocaleString()} FCFA</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-blue-600 font-sans font-extrabold uppercase block">Articles en Stock</span>
          <span className="text-base font-black text-blue-800">{stockItems.length} Réf.</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-amber-600 font-sans font-extrabold uppercase block">Articles Sous Seuil</span>
          <span className="text-base font-black text-amber-700">{lowStockCount} Réf.</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-purple-600 font-sans font-extrabold uppercase block">Réservations Actives</span>
          <span className="text-base font-black text-purple-800">{activeReservationsCount} Unités</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
          <span className="text-[10px] text-emerald-600 font-sans font-extrabold uppercase block">Mouvements Récents</span>
          <span className="text-base font-black text-emerald-700">{stockMovements.length} Mvt</span>
        </div>
      </div>

      {/* BARRE DE FILTRES MULTI-CRITÈRES ET RECHERCHE (PARTIE 2.2) */}
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
            <span className="font-bold text-slate-600 text-xs">Statut Stock :</span>
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

        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher code, désignation..."
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-64 focus:outline-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TABLEAU DES ARTICLES EN STOCK (PARTIE 2.4 : CALCUL DISPONIBLE = PHYSIQUE - RÉSERVÉ) */}
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
                <th className="p-3 text-right">Stock Min</th>
                <th className="p-3">Magasin Principal</th>
                <th className="p-3 text-right">Valeur Estimée</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3 text-center">Action</th>
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
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{item.currentStock.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-purple-700">{reserved > 0 ? reserved.toLocaleString() : '—'}</td>
                    <td className="p-3 text-right font-mono font-black text-blue-900 bg-blue-50/50">{available.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-amber-700">{item.minThreshold.toLocaleString()}</td>
                    <td className="p-3 text-slate-600 text-[11px] truncate max-w-[140px]">{item.warehouse}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {(item.totalValue || item.currentStock * item.averageUnitPrice).toLocaleString()} FCFA
                    </td>
                    <td className="p-3 text-center">{getItemStatusBadge(item)}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedArticle(item)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[10px] flex items-center gap-1 mx-auto transition"
                      >
                        <Eye size={12} /> Examiner
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL FICHE ARTICLE (PARTIE 2.5 : INSPECTION ARTICLE COMPLETE) */}
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

            {/* SECTIONS DE LA FICHE ARTICLE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SECTION 1 & 2 : INFORMATIONS GÉNÉRALES & PRIX */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-extrabold text-slate-900 text-xs block border-b pb-1">Informations Générales & Prix :</span>
                <div className="space-y-1">
                  <div className="flex justify-between"><span>Catégorie :</span> <strong>{selectedArticle.category}</strong></div>
                  <div className="flex justify-between"><span>Unité de mesure :</span> <strong>{selectedArticle.unit}</strong></div>
                  <div className="flex justify-between"><span>Nature de Coût :</span> <strong>MAT — Matériaux</strong></div>
                  <div className="flex justify-between"><span>Prix Moyen (PMP) :</span> <strong>{selectedArticle.averageUnitPrice.toLocaleString()} FCFA</strong></div>
                  <div className="flex justify-between"><span>Dernier Prix Constaté :</span> <strong>{selectedArticle.averageUnitPrice.toLocaleString()} FCFA</strong></div>
                  <div className="flex justify-between"><span>Dernière Mise à jour :</span> <strong className="font-mono">2026-08-21</strong></div>
                </div>
              </div>

              {/* SECTION 3 : ÉTAT DU STOCK */}
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-2">
                <span className="font-extrabold text-blue-900 text-xs block border-b pb-1">Disponibilité du Stock :</span>
                <div className="space-y-1 font-mono">
                  <div className="flex justify-between"><span>Stock Physique :</span> <strong>{selectedArticle.currentStock.toLocaleString()} {selectedArticle.unit}</strong></div>
                  <div className="flex justify-between"><span>Stock Réservé :</span> <strong className="text-purple-700">{(selectedArticle.reservedStock || 0).toLocaleString()} {selectedArticle.unit}</strong></div>
                  <div className="flex justify-between text-sm font-black border-t pt-1 text-blue-950">
                    <span>Stock Disponible :</span>
                    <span>{(selectedArticle.currentStock - (selectedArticle.reservedStock || 0)).toLocaleString()} {selectedArticle.unit}</span>
                  </div>
                  <div className="flex justify-between text-amber-800"><span>Seuil d'Alerte Min :</span> <strong>{selectedArticle.minThreshold.toLocaleString()} {selectedArticle.unit}</strong></div>
                </div>
              </div>
            </div>

            {/* SECTION 4 : HISTORIQUE DES MOUVEMENTS RÉCENTS */}
            <div className="space-y-2">
              <span className="font-extrabold text-slate-900 text-xs block">Mouvements de Stock Récents sur cet Article :</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-extrabold text-[10px] text-slate-500 uppercase">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Quantité</th>
                      <th className="p-2">Magasin</th>
                      <th className="p-2">Imputation WBS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {stockMovements
                      .filter(m => m.itemId === selectedArticle.id || m.itemName.includes(selectedArticle.name))
                      .slice(0, 5)
                      .map(m => (
                        <tr key={m.id}>
                          <td className="p-2">{m.date}</td>
                          <td className="p-2"><span className="font-bold">{m.type}</span></td>
                          <td className="p-2 text-right font-bold">{m.quantity} {m.unit}</td>
                          <td className="p-2 text-slate-600">{m.warehouse}</td>
                          <td className="p-2 text-purple-700">{m.wbsCode || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
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

      {/* MODAL CRÉATION DE MOUVEMENT */}
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
              {/* LIGNE 1 : TYPE DE MOUVEMENT, MAGASIN ET DOCUMENT SOURCE */}
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

              {/* CARTE 1 : IMPUTATION CHANTIER PROJET + WBS */}
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
                      {projects.map(p => (
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

              {/* CARTE 2 : JUSTE EN DESSOUS — ARTICLES ET QUANTITÉS LIÉS DIRECTEMENT AU WBS */}
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
                      onChange={val => setSelectedItemId(val)}
                      placeholder="Rechercher ou sélectionner un article..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-[10px]">Quantité (Pré-remplie DS) *</label>
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

                <div className="pt-1">
                  <label className="block text-slate-600 font-bold text-[10px] mb-0.5">Activité & Description du Mouvement :</label>
                  <input
                    type="text"
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Coulage radier et voiles du bassin..."
                  />
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
    </div>
  );
};

export default StockModule;
