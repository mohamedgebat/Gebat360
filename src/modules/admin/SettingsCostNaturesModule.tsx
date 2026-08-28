import React, { useState } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { CostNatureConfig } from '../../types';
import { Settings, Plus, Tag, Edit3, CheckCircle2, XCircle, Search, Save, X, ShieldAlert } from 'lucide-react';

export const SettingsCostNaturesModule: React.FC = () => {
  const { costNatures, addCostNature, updateCostNature, toggleCostNatureStatus } = useAppState();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNature, setEditingNature] = useState<CostNatureConfig | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !label) return;

    addCostNature({
      code: code.trim().toUpperCase(),
      label: label.trim(),
      description: description.trim(),
      status: 'Actif',
    });

    setCode('');
    setLabel('');
    setDescription('');
    setShowAddModal(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNature || !code || !label) return;

    updateCostNature({
      ...editingNature,
      code: code.trim().toUpperCase(),
      label: label.trim(),
      description: description.trim(),
    });

    setEditingNature(null);
  };

  const filteredNatures = costNatures.filter(n =>
    n.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-800 font-sans max-w-7xl mx-auto pb-10">

      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Administration — Natures de Coûts</h1>
            <span className="bg-purple-100 text-purple-800 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full border border-purple-200">
              GEBAT 360° PARAMÉTRAGE
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Gérez la taxonomie des natures de dépenses associées aux activités WBS pour le pilotage Cost Control.
          </p>
        </div>

        <button
          onClick={() => {
            setCode('');
            setLabel('');
            setDescription('');
            setShowAddModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
        >
          <Plus size={16} /> Ajouter une Nature
        </button>
      </div>

      {/* RECHERCHE ET TABLEAU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par code (MAT, MO...) ou libellé..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
            />
          </div>

          <span className="text-xs text-slate-500 font-bold font-mono">
            {filteredNatures.length} Natures configurées
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase text-[10px]">
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Libellé Nature de Coût</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-center">Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
              {filteredNatures.map(n => (
                <tr key={n.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-mono font-black text-purple-700 text-sm">
                    <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{n.code}</span>
                  </td>
                  <td className="p-3.5 font-extrabold text-slate-900">{n.label}</td>
                  <td className="p-3.5 text-slate-500 text-xs">{n.description || '—'}</td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      n.status === 'Actif'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-300'
                    }`}>
                      {n.status === 'Actif' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {n.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingNature(n);
                        setCode(n.code);
                        setLabel(n.label);
                        setDescription(n.description || '');
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => toggleCostNatureStatus(n.id)}
                      className={`font-bold hover:underline cursor-pointer ${
                        n.status === 'Actif' ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'
                      }`}
                    >
                      {n.status === 'Actif' ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AJOUT / ÉDITION */}
      {(showAddModal || editingNature) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Tag size={18} className="text-purple-600" />
                {editingNature ? `Modifier la Nature : ${editingNature.code}` : 'Nouvelle Nature de Coût'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingNature(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={editingNature ? handleUpdate : handleCreate} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 mb-1">Code Nature (ex: MAT, MO, MTL...)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="ex: MAT"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-purple-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Libellé complet</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="ex: Matériaux"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Description / Champ d'application</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Précisez les types de dépenses couvertes par cette nature..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:border-blue-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingNature(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-extrabold hover:bg-blue-700 shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={15} /> {editingNature ? 'Enregistrer les modifications' : 'Créer la Nature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsCostNaturesModule;
