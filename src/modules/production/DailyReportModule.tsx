import React, { useState } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { DailyReport } from '../../types';
import { HardHat, Sun, CloudRain, Cloud, Zap, Plus, CheckCircle, AlertTriangle } from 'lucide-react';

export const DailyReportModule: React.FC = () => {
  const { dailyReports, projects, wbsMap, createDailyReport, currentUser } = useAppState();
  const [showModal, setShowModal] = useState(false);

  const [selectedFilterProjectId, setSelectedFilterProjectId] = useState<string>(projects[0]?.id || 'TOUS');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [selectedWbsId, setSelectedWbsId] = useState('');
  const [weather, setWeather] = useState<'Ensoleillé' | 'Pluie' | 'Nuageux' | 'Orage'>('Ensoleillé');
  const [activityName, setActivityName] = useState('Lit de pose & Pose de canalisations DN1000');
  const [plannedQty, setPlannedQty] = useState(50);
  const [realizedQty, setRealizedQty] = useState(48);
  const [unit, setUnit] = useState('m3');
  const [workersCount, setWorkersCount] = useState(15);
  const [hoursWorked, setHoursWorked] = useState(8);
  const [equipmentCount, setEquipmentCount] = useState(2);
  const [equipmentHours, setEquipmentHours] = useState(8);
  const [notes, setNotes] = useState('RAS. Bon avancement malgré légère humidité le matin.');

  // Filtrage des rapports selon le projet sélectionné
  const filteredReports = useMemo(() => {
    if (selectedFilterProjectId === 'TOUS') return dailyReports;
    return dailyReports.filter(r => r.projectId === selectedFilterProjectId);
  }, [dailyReports, selectedFilterProjectId]);

  // Calcul du rendement moyen sur le chantier
  const averageProductivity = useMemo(() => {
    if (filteredReports.length === 0) return 0;
    const sum = filteredReports.reduce((acc, r) => acc + (r.productivityRate || 0), 0);
    return (sum / filteredReports.length).toFixed(1);
  }, [filteredReports]);

  const projectWBS = wbsMap[selectedProjectId] || [];
  const flattenWBS = (nodes: any[]): any[] => {
    let list: any[] = [];
    nodes.forEach(n => {
      list.push(n);
      if (n.children) list = list.concat(flattenWBS(n.children));
    });
    return list;
  };
  const flattenedWBS = flattenWBS(projectWBS);
  const targetWBS = flattenedWBS.find(w => w.id === selectedWbsId) || flattenedWBS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);
    if (!proj || !targetWBS) return;

    createDailyReport({
      date: new Date().toISOString().substring(0, 10),
      projectId: proj.id,
      projectName: proj.name,
      wbsId: targetWBS.id,
      wbsCode: targetWBS.code,
      activityName,
      weather,
      plannedQty,
      realizedQty,
      unit,
      workersCount,
      hoursWorked,
      equipmentCount,
      equipmentHours,
      notes,
      status: 'Validé',
      createdBy: currentUser.name,
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Rapports Journaliers de Chantier & Suivi de Production</h2>
          <p className="text-xs text-slate-500 mt-0.5">Saisie des avancements physiques terrain, heures d'engins, effectifs et calcul de productivité</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
            <span className="text-slate-500">Chantier :</span>
            <select
              value={selectedFilterProjectId}
              onChange={e => setSelectedFilterProjectId(e.target.value)}
              className="bg-transparent text-slate-900 font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="TOUS">Tous les chantiers ({projects.length})</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (flattenedWBS.length > 0) setSelectedWbsId(flattenedWBS[0].id);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Plus size={16} /> Nouveau Rapport Journalier
          </button>
        </div>
      </div>

      {/* BANNIÈRE DE PERFORMANCES PRODUCTION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RAPPORTS VALIDÉS</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{filteredReports.length} rapports</span>
          </div>
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <HardHat size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">TAUX DE PRODUCTIVITÉ MOYEN</span>
            <span className="text-xl font-black text-emerald-600 mt-0.5 block">{averageProductivity}%</span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <Zap size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">CONFORMITÉ DU PLANNING</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              {Number(averageProductivity) >= 90 ? 'Conforme (Dans les temps)' : 'Attention aux retards'}
            </span>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* Grid of Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReports.map(report => (
          <div key={report.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-blue-300 transition">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <span className="font-extrabold text-blue-600 text-xs block">{report.code || report.id}</span>
                <span className="font-bold text-slate-900 text-sm">{report.activityName || (report as any).designation || (report as any).taskName || 'Travaux de Génie Civil & Aménagements'}</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-black shadow-2xs ${
                  report.productivityRate >= 90
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : report.productivityRate >= 75
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {report.productivityRate}% Productivité
              </span>
            </div>

            <div className="text-xs space-y-1 text-slate-600">
              <div>Projet: <span className="font-semibold text-slate-800">{report.projectName}</span></div>
              <div>Code WBS: <span className="font-bold text-purple-700 font-mono">{report.wbsCode || (report as any).wbsId || '200.1.4'}</span></div>
              <div className="flex gap-4 pt-1">
                <span>Prévu: <strong>{report.plannedQty} {report.unit}</strong></span>
                <span>Réalisé: <strong className="text-blue-600">{report.realizedQty} {report.unit}</strong></span>
                <span>Météo: <strong>{report.weather}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600">
              <div>Personnel engagé: <strong>{report.workersCount} pers. ({report.hoursWorked}h)</strong></div>
              <div>Matériel & Engins: <strong>{report.equipmentCount} unités ({report.equipmentHours}h)</strong></div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 border-t flex justify-between">
              <span>Saisi par: <strong className="text-slate-700">{report.createdBy}</strong></span>
              <span className="font-bold font-mono text-slate-700">{report.date}</span>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 font-bold text-xs space-y-2">
            <div>Aucun rapport journalier trouvé pour ce chantier.</div>
            <button
              onClick={() => setShowModal(true)}
              className="text-blue-600 hover:underline font-extrabold"
            >
              Cliquez ici pour saisir le premier rapport de production
            </button>
          </div>
        )}
      </div>

      {/* Modal Saisie Terrain */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">Nouveau Rapport Journalier de Chantier</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Projet</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">WBS & Activité</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                    value={selectedWbsId}
                    onChange={e => setSelectedWbsId(e.target.value)}
                  >
                    {flattenedWBS.map(w => (
                      <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Désignation Activité Réalisée</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                  value={activityName}
                  onChange={e => setActivityName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quantité Prévue</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold"
                    value={plannedQty}
                    onChange={e => setPlannedQty(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quantité Réalisée</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold text-blue-600"
                    value={realizedQty}
                    onChange={e => setRealizedQty(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unité</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Météo Chantier</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                    value={weather}
                    onChange={e => setWeather(e.target.value as any)}
                  >
                    <option value="Ensoleillé">☀️ Ensoleillé</option>
                    <option value="Pluie">🌧️ Pluie</option>
                    <option value="Nuageux">☁️ Nuageux</option>
                    <option value="Orage">⛈️ Orage</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Taux de Productivité Calculé</label>
                  <div className="bg-slate-100 border border-slate-200 rounded p-2 text-xs font-black text-blue-600">
                    {Math.round((realizedQty / (plannedQty || 1)) * 100)} % Rendement
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observations & Faits Marquants</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow"
                >
                  Enregistrer le Rapport
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
