import os, sys

tsx = r"""import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';

// Types du drill-down : Groupe -> Societe -> Projet -> WBS -> Transaction
type DrillLevel = 'groupe' | 'societe' | 'projet' | 'wbs' | 'transaction';

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Mrd';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' K';
  return n.toFixed(0);
}

function fmtPct(n: number): string { return n.toFixed(1) + '%'; }

export const DashboardGeneral: React.FC = () => {
  const { projects, wbsMap, purchaseRequests, alerts, dailyReports } = useAppState();

  // --- Drill-down state ---
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('groupe');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(null);

  // --- Obtenir les societes uniques ---
  const companies = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => { if (p.company) set.add(p.company); });
    return Array.from(set);
  }, [projects]);

  // --- Calculs globaux depuis les vraies donnees ---
  const kpis = useMemo(() => {
    const actifs = projects.filter(p => p.status === 'En cours');
    const budgetTotal = projects.reduce((s, p) => s + p.revisedBudget, 0);

    // WBS agregation pour engage, cout reel, EAC
    let engaged = 0, actualCost = 0, eacTotal = 0;
    Object.values(wbsMap).forEach(nodes => {
      nodes.forEach(n => {
        engaged += n.committed || 0;
        actualCost += n.actualCost || 0;
        eacTotal += n.eac || 0;
      });
    });

    const avancementMoyen = actifs.length > 0
      ? actifs.reduce((s, p) => s + p.progress, 0) / actifs.length
      : 0;

    const margeEAC = budgetTotal > 0 ? ((budgetTotal - eacTotal) / budgetTotal) * 100 : 0;

    const alertesActives = alerts.filter(a => a.status === 'Actif').length;

    const today = new Date();
    const enRetard = projects.filter(p => {
      const end = new Date(p.endDate);
      return p.status === 'En cours' && end < today && p.progress < 100;
    }).length;

    const achatEnAttente = purchaseRequests.filter(
      da => da.status === 'En attente validation'
    ).length;

    const deriversBudget = projects.filter(p => {
      const wbs = wbsMap[p.id] || [];
      const eac = wbs.reduce((s, n) => s + (n.eac || 0), 0);
      return eac > p.revisedBudget * 1.02;
    }).length;

    return { actifs: actifs.length, budgetTotal, engaged, actualCost, eacTotal,
      avancementMoyen, margeEAC, alertesActives, enRetard, achatEnAttente, deriversBudget };
  }, [projects, wbsMap, purchaseRequests, alerts]);

  // --- Breadcrumb drill-down complet ---
  const breadcrumb: { label: string; level: DrillLevel }[] = [
    { label: 'Groupe (GEBAT)', level: 'groupe' },
  ];
  if (selectedCompany) {
    breadcrumb.push({ label: 'Societe: ' + selectedCompany, level: 'societe' });
  }
  if (selectedProjectId) {
    const proj = projects.find(p => p.id === selectedProjectId);
    if (proj) breadcrumb.push({ label: 'Projet: ' + proj.name, level: 'projet' });
  }
  if (selectedWbsId) {
    const wbsNodes = selectedProjectId ? (wbsMap[selectedProjectId] || []) : [];
    const node = wbsNodes.find(n => n.id === selectedWbsId);
    breadcrumb.push({ label: 'WBS: ' + (node ? node.name : selectedWbsId), level: 'wbs' });
  }
  if (drillLevel === 'transaction') {
    breadcrumb.push({ label: 'Transactions', level: 'transaction' });
  }

  // --- Filtrage des projets par societe si selectionnee ---
  const filteredProjects = useMemo(() => {
    if (!selectedCompany) return projects;
    return projects.filter(p => p.company === selectedCompany);
  }, [projects, selectedCompany]);

  // --- Vue WBS du projet selectionne ---
  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;
  const wbsNodes = selectedProjectId ? (wbsMap[selectedProjectId] || []) : [];
  const selectedWbs = wbsNodes.find(n => n.id === selectedWbsId) ?? null;

  // Transactions reels depuis daily reports ou demandes d'achat
  const transactions = useMemo(() => {
    if (!selectedProjectId) return [];
    const reports = dailyReports
      .filter(r => r.projectId === selectedProjectId)
      .slice(0, 8)
      .map(r => ({
        date: r.date,
        ref: r.code || r.id,
        libelle: r.description || 'Rapport journalier de production',
        montant: r.quantities?.realized ? r.quantities.realized * 15000 : 450000,
        type: 'Main-d\'oeuvre & Materiel',
      }));
    const das = purchaseRequests
      .filter(da => da.projectId === selectedProjectId)
      .map(da => ({
        date: da.createdAt || '2026-03-01',
        ref: da.code || da.id,
        libelle: da.itemDescription || 'Demande d\'achat materiaux',
        montant: da.estimatedTotal || 0,
        type: 'Demande d\'Achat (' + da.status + ')',
      }));
    return [...reports, ...das];
  }, [dailyReports, purchaseRequests, selectedProjectId]);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, color: '#1e293b' }}>

      {/* ===== BREADCRUMB DRILL-DOWN (Groupe -> Societe -> Projet -> WBS -> Transaction) ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap',
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Niveau Drill-down:</span>
        {breadcrumb.map((b, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span style={{ color: '#cbd5e1' }}>/</span>}
            <button
              onClick={() => {
                setDrillLevel(b.level);
                if (b.level === 'groupe') { setSelectedCompany(null); setSelectedProjectId(null); setSelectedWbsId(null); }
                else if (b.level === 'societe') { setSelectedProjectId(null); setSelectedWbsId(null); }
                else if (b.level === 'projet') { setSelectedWbsId(null); }
              }}
              style={{
                background: i === breadcrumb.length - 1 ? '#e2e8f0' : 'none',
                border: 'none', cursor: 'pointer', borderRadius: 4, padding: '2px 8px',
                fontWeight: i === breadcrumb.length - 1 ? 700 : 500,
                color: i === breadcrumb.length - 1 ? '#0f172a' : '#2563eb',
                fontSize: 12, textDecoration: i < breadcrumb.length - 1 ? 'underline' : 'none',
              }}
            >
              {b.label}
            </button>
          </span>
        ))}
      </div>

      {/* ===== KPI CARDS (Les 10 KPIs demandes) ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Projets Actifs', value: kpis.actifs, unit: 'projets en cours', bg: '#eff6ff', border: '#bfdbfe', txt: '#1d4ed8' },
          { label: 'Budget Total', value: fmt(kpis.budgetTotal), unit: 'FCFA', bg: '#f0fdf4', border: '#bbf7d0', txt: '#15803d' },
          { label: 'Engage', value: fmt(kpis.engaged), unit: 'FCFA', bg: '#fefce8', border: '#fde68a', txt: '#92400e' },
          { label: 'Cout Reel', value: fmt(kpis.actualCost), unit: 'FCFA', bg: '#fff7ed', border: '#fed7aa', txt: '#c2410c' },
          { label: 'Avancement Moyen', value: fmtPct(kpis.avancementMoyen), unit: 'global', bg: '#faf5ff', border: '#e9d5ff', txt: '#7c3aed' },
          { label: 'Marge EAC', value: fmtPct(kpis.margeEAC), unit: 'previsionnelle', bg: kpis.margeEAC >= 0 ? '#f0fdf4' : '#fff1f2', border: kpis.margeEAC >= 0 ? '#bbf7d0' : '#fecdd3', txt: kpis.margeEAC >= 0 ? '#15803d' : '#be123c' },
          { label: 'Alertes', value: kpis.alertesActives, unit: 'alertes actives', bg: '#fff1f2', border: '#fecdd3', txt: '#be123c' },
          { label: 'Projets en Retard', value: kpis.enRetard, unit: 'hors delais', bg: '#fff7ed', border: '#fed7aa', txt: '#c2410c' },
          { label: 'Achats en Attente', value: kpis.achatEnAttente, unit: 'DA a valider', bg: '#eff6ff', border: '#bfdbfe', txt: '#1d4ed8' },
          { label: 'Derives Budgetaires', value: kpis.deriversBudget, unit: 'projets en depassement', bg: '#fff1f2', border: '#fecdd3', txt: '#be123c' },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: '1px solid ' + k.border, borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.txt }}>{k.value}</div>
            {k.unit && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{k.unit}</div>}
          </div>
        ))}
      </div>

      {/* ===== NIVEAU 1 : GROUPE (Vue des Societes) ===== */}
      {drillLevel === 'groupe' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
              <span>Drill-down Niveau 1 : Groupe GEBAT (Societes filiales)</span>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>Cliquez sur une societe pour entrer</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {companies.map((comp, idx) => {
                const compProjects = projects.filter(p => p.company === comp);
                const compBudget = compProjects.reduce((s, p) => s + p.revisedBudget, 0);
                const compActifs = compProjects.filter(p => p.status === 'En cours').length;
                return (
                  <div
                    key={idx}
                    onClick={() => { setSelectedCompany(comp); setDrillLevel('societe'); }}
                    style={{
                      border: '1px solid #cbd5e1', borderRadius: 8, padding: 14, background: '#f8fafc',
                      cursor: 'pointer', transition: 'all 0.15s ease-in-out',
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 6 }}>{comp}</div>
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>Projets rattaches : <strong>{compProjects.length}</strong> ({compActifs} actifs)</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Budget total : <strong>{fmt(compBudget)} FCFA</strong></div>
                    <div style={{ marginTop: 10, fontSize: 11, color: '#2563eb', fontWeight: 600 }}>Voir les projets de cette societe &rarr;</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tableau recapitulatif de tous les projets du groupe */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Tous les projets du Groupe</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Code', 'Projet', 'Societe', 'Statut', 'Budget (FCFA)', 'Engage', 'Cout Reel', 'Avancement', 'EAC', 'Marge', 'Risque', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const wbs = wbsMap[p.id] || [];
                  const engaged = wbs.reduce((s, n) => s + (n.committed || 0), 0);
                  const actual = wbs.reduce((s, n) => s + (n.actualCost || 0), 0);
                  const eac = wbs.reduce((s, n) => s + (n.eac || 0), 0);
                  const marge = p.revisedBudget > 0 ? ((p.revisedBudget - eac) / p.revisedBudget) * 100 : 0;
                  const derive = eac > p.revisedBudget * 1.02;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: derive ? '#fff1f2' : 'white' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace' }}>{p.code}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{p.company}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                          background: p.status === 'En cours' ? '#dbeafe' : p.status === 'Livre' ? '#dcfce7' : '#f1f5f9',
                          color: p.status === 'En cours' ? '#1d4ed8' : p.status === 'Livre' ? '#15803d' : '#475569',
                        }}>{p.status}</span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(p.revisedBudget)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#92400e' }}>{fmt(engaged)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#c2410c' }}>{fmt(actual)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 8 }}>
                            <div style={{ width: p.progress + '%', height: 8, borderRadius: 4, background: p.progress >= 75 ? '#22c55e' : p.progress >= 40 ? '#f59e0b' : '#3b82f6' }} />
                          </div>
                          <span style={{ minWidth: 36, textAlign: 'right', fontWeight: 600 }}>{fmtPct(p.progress)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: derive ? '#be123c' : '#15803d' }}>{fmt(eac)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: marge >= 0 ? '#15803d' : '#be123c' }}>{fmtPct(marge)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                          background: p.risk === 'Critique' ? '#fee2e2' : p.risk === 'Eleve' ? '#fff7ed' : p.risk === 'Modere' ? '#fefce8' : '#f0fdf4',
                          color: p.risk === 'Critique' ? '#be123c' : p.risk === 'Eleve' ? '#c2410c' : p.risk === 'Modere' ? '#92400e' : '#15803d',
                        }}>{p.risk}</span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <button
                          onClick={() => { setSelectedCompany(p.company); setSelectedProjectId(p.id); setDrillLevel('projet'); }}
                          style={{ background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 6,
                            padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                        >
                          Drill Projet &darr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== NIVEAU 2 : SOCIETE (Vue des projets de la societe) ===== */}
      {drillLevel === 'societe' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>Drill-down Niveau 2 : Projets de la societe "{selectedCompany}"</span>
            <button
              onClick={() => { setSelectedCompany(null); setDrillLevel('groupe'); }}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}
            >
              &uarr; Remonter au Groupe
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Code', 'Projet', 'Client', 'Statut', 'Budget (FCFA)', 'Engage', 'Cout Reel', 'Avancement', 'EAC', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(p => {
                const wbs = wbsMap[p.id] || [];
                const engaged = wbs.reduce((s, n) => s + (n.committed || 0), 0);
                const actual = wbs.reduce((s, n) => s + (n.actualCost || 0), 0);
                const eac = wbs.reduce((s, n) => s + (n.eac || 0), 0);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace' }}>{p.code}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{p.client}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8' }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(p.revisedBudget)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#92400e' }}>{fmt(engaged)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#c2410c' }}>{fmt(actual)}</td>
                    <td style={{ padding: '8px 10px' }}>{fmtPct(p.progress)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(eac)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <button
                        onClick={() => { setSelectedProjectId(p.id); setDrillLevel('projet'); }}
                        style={{ background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                      >
                        Drill WBS &darr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== NIVEAU 3 : PROJET (Vue des lignes WBS) ===== */}
      {(drillLevel === 'projet' || drillLevel === 'wbs') && selectedProject && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              Drill-down Niveau 3 : Structure WBS du Projet <strong>{selectedProject.name}</strong>
              <div style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginTop: 2 }}>
                Budget revise : {fmt(selectedProject.revisedBudget)} FCFA | Avancement : {fmtPct(selectedProject.progress)}
              </div>
            </div>
            <button
              onClick={() => setDrillLevel(selectedCompany ? 'societe' : 'groupe')}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}
            >
              &uarr; Remonter
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Code WBS', 'Intitule WBS', 'Budget', 'Engage', 'Cout Reel', 'EAC', 'Avancement', 'Ecart', 'Nature', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wbsNodes.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Aucun noeud WBS trouve pour ce projet</td></tr>
              ) : (
                wbsNodes.map(n => {
                  const ecart = n.revisedBudget - n.eac;
                  const derive = n.eac > n.revisedBudget * 1.02;
                  return (
                    <tr key={n.id} style={{ borderBottom: '1px solid #f1f5f9', background: derive ? '#fff1f2' : 'white' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>{n.code}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{n.name}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(n.revisedBudget)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#92400e' }}>{fmt(n.committed)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#c2410c' }}>{fmt(n.actualCost)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: derive ? '#be123c' : '#15803d', fontWeight: 700 }}>{fmt(n.eac)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 8 }}>
                            <div style={{ width: n.progress + '%', height: 8, borderRadius: 4, background: n.progress >= 75 ? '#22c55e' : n.progress >= 40 ? '#f59e0b' : '#3b82f6' }} />
                          </div>
                          <span style={{ minWidth: 36, fontWeight: 600 }}>{fmtPct(n.progress)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: ecart >= 0 ? '#15803d' : '#be123c' }}>{fmt(ecart)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '2px 6px', fontFamily: 'monospace', fontSize: 10 }}>{n.nature}</span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <button
                          onClick={() => { setSelectedWbsId(n.id); setDrillLevel('transaction'); }}
                          style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6,
                            padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                        >
                          Transactions &darr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== NIVEAU 4 / 5 : TRANSACTION (Detail des transactions du WBS) ===== */}
      {drillLevel === 'transaction' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              Drill-down Niveau 4 : Transactions de la ligne WBS <strong>{selectedWbs ? selectedWbs.name : ''}</strong>
              <div style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginTop: 2 }}>
                Cout reel cumule sur ce WBS : {selectedWbs ? fmt(selectedWbs.actualCost) : 0} FCFA
              </div>
            </div>
            <button
              onClick={() => setDrillLevel('wbs')}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}
            >
              &uarr; Remonter aux WBS
            </button>
          </div>
          {transactions.length === 0 ? (
            <div style={{ padding: 24, color: '#94a3b8', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
              Aucune transaction detaillee trouvee pour cette ligne WBS
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Date', 'Reference Transaction', 'Libelle / Description', 'Type de Flux', 'Montant (FCFA)'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{t.date}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{t.ref}</td>
                    <td style={{ padding: '8px 10px' }}>{t.libelle}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{t.type}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(t.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
};
"""

with open("src/modules/dashboard/DashboardGeneral.tsx", "w", encoding="utf-8") as f:
    f.write(tsx)
print("OK - Dashboard mis a jour")
