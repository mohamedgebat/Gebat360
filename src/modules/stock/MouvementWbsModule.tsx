import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { StockMovementType } from '../../types';
import { isProjectMatch } from '../../utils/projectMatcher';
import {
  ArrowRightLeft, Plus, Calculator, Search, Filter, Warehouse as WarehouseIcon,
  CheckCircle2, FileText, Calendar, Building2, Layers, AlertTriangle, ShieldCheck, RefreshCw, X
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
  const { projects, wbsMap, stockItems, stockMovements, createStockMovement, processGoodsReceipt, purchaseOrders, addAuditLog, currentUser } = useAppState();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

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

  if (projects.length === 0 || !selectedProject) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-xl mx-auto my-12 text-xs">
        <ArrowRightLeft size={56} className="text-slate-300 mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Mouvements & Imputations WBS</h2>
        <p className="text-slate-500">
          Aucun projet n'est enregistré dans la base de données. Créez un projet pour imputer des mouvements de stock sur le WBS.
        </p>
      </div>
    );
  }

  // Filtres de recherche du tableau des mouvements
  const [typeFilter, setTypeFilter] = useState<string>('TOUS');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('TOUS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modale d'intégration automatique de réception
  const [showAutoReceiptModal, setShowAutoReceiptModal] = useState<boolean>(false);
  const [selectedPOId, setSelectedPOId] = useState<string>(purchaseOrders[0]?.id || '');
  const [receiptDocNumber, setReceiptDocNumber] = useState<string>(`PVR-2026-${Math.floor(1000 + Math.random() * 9000)}`);

  // Formulaire de saisie d'un Mouvement / Imputation WBS
  const [movementType, setMovementType] = useState<StockMovementType>('Sortie');
  const [selectedItemId, setSelectedItemId] = useState<string>(stockItems[0]?.id || '');
  const [warehouse, setWarehouse] = useState<string>('Magasin Bingerville (Chantier)');
  const [destinationWarehouse, setDestinationWarehouse] = useState<string>('Magasin Songon (Chantier)');
  const [quantity, setQuantity] = useState<number>(10);
  const [wbsCode, setWbsCode] = useState<string>(projectWbsNodes[0]?.code || '03.02.004');
  const [activityName, setActivityName] = useState<string>(projectWbsNodes[0]?.name || 'Béton armé pour Voiles & Radiers');
  const [sourceDoc, setSourceDoc] = useState<string>('BL-2026-089-SOCIMAC');
  const [notes, setNotes] = useState<string>('Sortie magasin pour imputation directe travaux radier');

  const selectedItem = stockItems.find(i => i.id === selectedItemId) || stockItems[0];

  // SOUMISSION MOUVEMENT MANUEL
  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    createStockMovement({
      code: `MVT-${Date.now().toString().slice(-6)}`,
      type: movementType,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: Number(quantity),
      unit: selectedItem.unit,
      unitPrice: selectedItem.averageUnitPrice,
      totalCost: Math.round(Number(quantity) * selectedItem.averageUnitPrice),
      warehouse: warehouse,
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
      `Chantier: ${selectedProject.code} | Coût Imputé: ${(Math.round(Number(quantity) * selectedItem.averageUnitPrice)).toLocaleString()} FCFA`
    );

    alert(`Mouvement [${movementType}] de ${quantity} ${selectedItem.unit} imputé au WBS ${wbsCode} avec succès !`);
  };

  // INTÉGRATION AUTOMATIQUE RÉCEPTION ➔ STOCK SANS DOUBLE SAISIE (PARTIE 3.10)
  const handleExecuteAutoReceiptIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    const po = purchaseOrders.find(p => p.id === selectedPOId);
    if (!po) return;

    // Appeler la fonction globale de traitement de réception avec idempotence
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
      const matchWarehouse = warehouseFilter === 'TOUS' || m.warehouse === warehouseFilter;
      const matchSearch = searchTerm === '' ||
        m.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.wbsCode && m.wbsCode.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchProject && matchType && matchWarehouse && matchSearch;
    });
  }, [stockMovements, selectedProjectId, typeFilter, warehouseFilter, searchTerm]);

  // CUMUL FINANCIER DES MOUVEMENTS FILTRÉS
  const totalCostFiltered = useMemo(() => {
    return filteredMovements.reduce((sum, m) => sum + (m.totalCost || 0), 0);
  }, [filteredMovements]);

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* HEADER MOUVEMENTS DE STOCK (PARTIE 3.7) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowRightLeft size={24} className="text-blue-600" /> Mouvements de Stock & Consommation Chantier
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Historique complet des entrées, sorties et imputations Projet ➔ WBS ➔ Activité</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAutoReceiptModal(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <RefreshCw size={14} /> Réception Auto ➔ Entrée Stock
          </button>
        </div>
      </div>

      {/* FILTRES COMPACTS DES MOUVEMENTS (PARTIE 3.7) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Chantier :</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Type Mouvement :</span>
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
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-500 font-sans">Total Mouvements Filtrés :</span>
          <strong className="text-slate-900 font-bold bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
            {totalCostFiltered.toLocaleString()} FCFA
          </strong>
        </div>
      </div>

      {/* TABLEAU HISTORIQUE DES MOUVEMENTS DE STOCK (PARTIE 3.7) */}
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
                <th className="p-3">Magasin Source</th>
                <th className="p-3">Magasin Destination</th>
                <th className="p-3">Projet & WBS Imputé</th>
                <th className="p-3">Doc. Source</th>
                <th className="p-3">Utilisateur</th>
                <th className="p-3 text-right">Impact Financier</th>
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
                  <td className="p-3 text-slate-600 truncate max-w-[130px]">{m.warehouse}</td>
                  <td className="p-3 text-slate-600 truncate max-w-[130px]">{m.destinationWarehouse || '—'}</td>
                  <td className="p-3">
                    <strong className="text-slate-800 block truncate max-w-[120px]">{m.projectName || '—'}</strong>
                    <span className="text-[10px] font-mono text-purple-700 block">{m.wbsCode || '—'}</span>
                  </td>
                  <td className="p-3 font-mono text-slate-500">{m.sourceDoc || '—'}</td>
                  <td className="p-3 text-slate-600">{m.user}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{m.totalCost ? `${m.totalCost.toLocaleString()} FCFA` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INTÉGRATION RÉCEPTION AUTO SANS DOUBLE SAISIE (PARTIE 3.10) */}
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
                    <option key={po.id} value={po.id}>{po.code} — {po.supplier} ({po.totalAmount.toLocaleString()} FCFA)</option>
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
