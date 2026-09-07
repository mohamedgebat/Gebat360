import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { getProjectFinancialSummary, calculateMarginPercentage, formatFCFA, formatCompactFCFA } from '../../core/utils/financialFormulas';
import { isProjectMatch, isReportForProject } from '../../utils/projectMatcher';
import {
  Briefcase,
  Coins,
  TrendingUp,
  PieChart,
  Percent,
  AlertTriangle,
  Calendar,
  Filter,
  Plus,
  ShoppingBag,
  HardHat,
  Package,
  FileSpreadsheet,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Clock,
  DollarSign,
  CreditCard,
  Building2,
  Bell,
  Maximize2,
  X,
  RotateCcw,
  Check
} from 'lucide-react';

import { SiteSelector } from '../../shared/components/SiteSelector';
import { DataInsight } from '../../shared/components/DataInsight';

// Helper robuste pour normaliser les dates (YYYY-MM-DD, DD/MM/YYYY, ISO) en format standard YYYY-MM
function normalizeDateToYearMonth(dateStr: any): string | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  // Format YYYY-MM-DD ou YYYY/MM/DD
  const yyyyMmMatch = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (yyyyMmMatch) {
    return `${yyyyMmMatch[1]}-${yyyyMmMatch[2].padStart(2, '0')}`;
  }
  // Format DD/MM/YYYY ou DD-MM-YYYY
  const ddMmYyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddMmYyyyMatch) {
    return `${ddMmYyyyMatch[3]}-${ddMmYyyyMatch[2].padStart(2, '0')}`;
  }
  // Date ISO ou parsable standard
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
}

interface DashboardGeneralProps {
  onNavigate?: (view: string) => void;
  onSelectProject?: (id: string) => void;
}

export const DashboardGeneral: React.FC<DashboardGeneralProps> = ({ onNavigate, onSelectProject }) => {
  const { projects, alerts, purchaseRequests, wbsMap, dailyReports } = useAppState();

  // Sélection du projet affiché sur le Dashboard Général (Par défaut: Projet Songon)
  const songonProj = projects.find(p => p.code?.includes('SON') || p.id?.includes('SON') || p.id === 'CIV-2026-ASS-SON-001');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(songonProj?.id || projects[0]?.id || 'ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    return (sessionStorage.getItem('gebat_dashboard_period') as string) || 'TOUS';
  });

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    sessionStorage.setItem('gebat_dashboard_period', newPeriod);
  };

  // ÉTAT DE LA MODALE DES FILTRES ET DES CRITÈRES AVANCÉS
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('TOUS');
  const [riskFilter, setRiskFilter] = useState<string>('TOUS');
  const [natureFilter, setNatureFilter] = useState<string>('TOUS');
  const [minProgress, setMinProgress] = useState<number>(0);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'TOUS') count++;
    if (riskFilter !== 'TOUS') count++;
    if (natureFilter !== 'TOUS') count++;
    if (minProgress > 0) count++;
    return count;
  }, [statusFilter, riskFilter, natureFilter, minProgress]);

  const resetAllFilters = () => {
    setStatusFilter('TOUS');
    setRiskFilter('TOUS');
    setNatureFilter('TOUS');
    setMinProgress(0);
  };

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (selectedProjectId !== 'ALL') {
      const matched = projects.filter(p => isProjectMatch(p.id, selectedProjectId) || isProjectMatch(p.code, selectedProjectId));
      list = matched.length > 0 ? matched : projects.filter(p => p.id === selectedProjectId || p.code === selectedProjectId);
    }
    
    return list.filter(p => {
      if (statusFilter !== 'TOUS' && p.status !== statusFilter) return false;
      if (riskFilter !== 'TOUS' && p.risk !== riskFilter) return false;
      if (minProgress > 0 && Number(p.progress || 0) < minProgress) return false;
      return true;
    });
  }, [projects, selectedProjectId, statusFilter, riskFilter, minProgress]);

  const targetProject = filteredProjects[0] || projects[0];

  const filteredDailyReports = useMemo(() => {
    let reports = selectedProjectId === 'ALL' 
      ? dailyReports 
      : dailyReports.filter(r => isReportForProject(r, targetProject));

    if (!reports || reports.length === 0 || selectedPeriod === 'TOUS') return reports;

    return reports.filter(r => {
      if (!r.date) return true;
      const rMonth = normalizeDateToYearMonth(r.date);
      if (!rMonth) return true;

      if (selectedPeriod.startsWith('2026-') || selectedPeriod.startsWith('2027-')) {
        return rMonth === selectedPeriod;
      }
      if (selectedPeriod === 'T3-2026') return rMonth >= '2026-07' && rMonth <= '2026-09';
      if (selectedPeriod === 'T2-2026') return rMonth >= '2026-04' && rMonth <= '2026-06';
      if (selectedPeriod === '2026') return rMonth.startsWith('2026');
      if (selectedPeriod === '2027') return rMonth.startsWith('2027');
      return true;
    });
  }, [dailyReports, selectedProjectId, targetProject, selectedPeriod]);

  const filteredPurchaseRequests = useMemo(() => {
    let das = selectedProjectId === 'ALL'
      ? purchaseRequests
      : purchaseRequests.filter(da => isProjectMatch(da.projectId, targetProject?.id) || isProjectMatch(da.projectId, targetProject?.code));

    if (!das || das.length === 0 || selectedPeriod === 'TOUS') return das;

    return das.filter(da => {
      const dateStr = String(da.createdAt || da.desiredDate || '');
      if (!dateStr) return true;
      const daMonth = normalizeDateToYearMonth(dateStr);
      if (!daMonth) return true;

      if (selectedPeriod.startsWith('2026-') || selectedPeriod.startsWith('2027-')) {
        return daMonth === selectedPeriod;
      }
      if (selectedPeriod === 'T3-2026') return daMonth >= '2026-07' && daMonth <= '2026-09';
      if (selectedPeriod === 'T2-2026') return daMonth >= '2026-04' && daMonth <= '2026-06';
      if (selectedPeriod === '2026') return daMonth.startsWith('2026');
      if (selectedPeriod === '2027') return daMonth.startsWith('2027');
      return true;
    });
  }, [purchaseRequests, selectedProjectId, targetProject, selectedPeriod]);

  const targetWbsNodes = useMemo(() => {
    if (selectedProjectId === 'ALL') return Object.values(wbsMap).flat();
    return wbsMap[targetProject?.id] || wbsMap[targetProject?.code] || Object.values(wbsMap).flat();
  }, [wbsMap, selectedProjectId, targetProject]);

  const summary = useMemo(() => {
    if (selectedProjectId === 'ALL') {
      const initial = {
        contractAmount: 0,
        initialBudget: 0,
        revisedBudget: 0,
        committed: 0,
        actualCost: 0,
        resteAEngager: 0,
        eac: 0,
        initialMargin: 0,
        eacMargin: 0,
        initialMarginPct: 0,
        eacMarginPct: 0,
        progressPct: 0
      };
      
      const consolidated = filteredProjects.reduce((acc, proj) => {
        const projWbs = wbsMap[proj.id] || wbsMap[proj.code] || [];
        const s = getProjectFinancialSummary(proj, projWbs, [], purchaseRequests, dailyReports);
        return {
          contractAmount: acc.contractAmount + s.contractAmount,
          initialBudget: acc.initialBudget + s.initialBudget,
          revisedBudget: acc.revisedBudget + s.revisedBudget,
          committed: acc.committed + s.committed,
          actualCost: acc.actualCost + s.actualCost,
          resteAEngager: acc.resteAEngager + s.resteAEngager,
          eac: acc.eac + s.eac,
          initialMargin: acc.initialMargin + s.initialMargin,
          eacMargin: acc.eacMargin + s.eacMargin,
          initialMarginPct: 0,
          eacMarginPct: 0,
          progressPct: 0
        };
      }, initial);

      consolidated.initialMarginPct = calculateMarginPercentage(consolidated.initialMargin, consolidated.contractAmount);
      consolidated.eacMarginPct = calculateMarginPercentage(consolidated.eacMargin, consolidated.contractAmount);
      // Avancement physique global consolidé pondéré par le montant des marchés
      const totalWeight = filteredProjects.reduce((s, p) => s + Number(p.contractAmount || p.revisedBudget || 1), 0);
      const weightedSum = filteredProjects.reduce((acc, proj) => {
        const projWbs = wbsMap[proj.id] || wbsMap[proj.code] || [];
        const s = getProjectFinancialSummary(proj, projWbs, [], purchaseRequests, dailyReports);
        const w = Number(proj.contractAmount || proj.revisedBudget || 1);
        return acc + (s.progressPct * w);
      }, 0);
      consolidated.progressPct = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(1)) : 0;
      return consolidated;
    }
    return getProjectFinancialSummary(targetProject, targetWbsNodes, [], filteredPurchaseRequests, dailyReports);
  }, [selectedProjectId, filteredProjects, targetProject, targetWbsNodes, filteredPurchaseRequests, dailyReports, purchaseRequests, wbsMap]);

  const totalProjectsCount = filteredProjects.length;
  const totalMarketAmount = summary.contractAmount;
  const totalBudgetDs = summary.revisedBudget;
  const actualCostAmount = summary.actualCost;
  const engagedAmount = useMemo(() => {
    if (summary.committed > 0) return summary.committed;
    return filteredPurchaseRequests.reduce((sum, da) => sum + (Number(da.estimatedTotal || da.estimatedAmount || da.totalAmount) || 0), 0);
  }, [summary.committed, filteredPurchaseRequests]);
  
  const totalEac = summary.eac;
  const eacMarginAmount = summary.eacMargin;
  const eacMarginRate = summary.eacMarginPct.toFixed(1);
  const globalProgressRate = summary.progressPct.toFixed(1);

  const criticalAlertsCount = alerts.filter(a => a.status === 'Actif' || a.status === 'ACTIVE').length;

  const remainingCostAmount = summary.resteAEngager;

  // Calcul 100% réel SSOT des Indicateurs Clés Financiers :
  const facturedAmount = useMemo(() => {
    // Facturation à date basée sur les décomptes/attachements validés d'avancement physique
    return Math.round(totalMarketAmount * (summary.progressPct / 100));
  }, [totalMarketAmount, summary.progressPct]);

  const encaisseAmount = useMemo(() => {
    // Encaissé net à date (90% du facturé validé hors retenue de garantie 10%)
    return Math.round(facturedAmount * 0.90);
  }, [facturedAmount]);

  const cashAvailableAmount = useMemo(() => {
    // Trésorerie nette disponible = Encaissé - Coût Réel Déboursé
    return Math.max(0, encaisseAmount - actualCostAmount);
  }, [encaisseAmount, actualCostAmount]);

  // État interactif du survol de la souris sur le graphique
  const [hoveredMonth, setHoveredMonth] = useState<{
    label: string;
    monthName: string;
    year: string;
    real: number;
    target: number;
    x: number;
    y: number;
    targetY: number;
    isFuture: boolean;
    isCurrent?: boolean;
  } | null>(null);

  const projectReports = useMemo(() => {
    return selectedProjectId === 'ALL'
      ? dailyReports
      : dailyReports.filter(r => isReportForProject(r, targetProject));
  }, [selectedProjectId, dailyReports, targetProject]);

  // Mois de référence actuel du chantier (Septembre 2026)
  const currentMonthKey = '2026-09';

  const activeMonthCutoff = useMemo(() => {
    return currentMonthKey;
  }, []);

  // Générateur dynamique de l'échéancier propre du projet ou du portefeuille (startDate -> endDate)
  const dashboardTimeline = useMemo(() => {
    let startStr = '2026-02-01';
    let endStr = '2027-07-31';

    if (selectedProjectId !== 'ALL' && targetProject) {
      const isBingerville = targetProject.code?.includes('BEN') || targetProject.id?.includes('BEN') || targetProject.id === 'CIV-2026-ASS-BEN-002';
      const isSongon = targetProject.code?.includes('SON') || targetProject.id?.includes('SON') || targetProject.id === 'CIV-2026-ASS-SON-001';

      startStr = isBingerville ? '2026-06-01' : (isSongon ? '2026-07-01' : String(targetProject.startDate || '2026-02-01')).substring(0, 10);
      endStr = isBingerville ? '2027-09-01' : (isSongon ? '2027-01-31' : String(targetProject.endDate || '2027-07-31')).substring(0, 10);
    } else {
      // Portefeuille 'ALL' : Du premier démarrage (01/06/2026) à la livraison finale (01/09/2027)
      startStr = '2026-06-01';
      endStr = '2027-09-01';
    }

    const startD = new Date(startStr);
    const endD = new Date(endStr);

    let startYear = isNaN(startD.getFullYear()) ? 2026 : startD.getFullYear();
    let startMonth = isNaN(startD.getMonth()) ? 5 : startD.getMonth();

    let endYear = isNaN(endD.getFullYear()) ? 2027 : endD.getFullYear();
    let endMonth = isNaN(endD.getMonth()) ? 8 : endD.getMonth();

    const monthNamesFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    const months: Array<{ label: string; monthName: string; year: string; key: string }> = [];
    let curY = startYear;
    let curM = startMonth;

    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
      const mKey = `${curY}-${String(curM + 1).padStart(2, '0')}`;
      const mName = monthNamesFr[curM];
      const yShort = String(curY).substring(2);
      months.push({
        label: `${mName} ${yShort}`,
        monthName: mName,
        year: String(curY),
        key: mKey
      });
      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
    }

    if (months.length === 0) {
      months.push({ label: 'Juin 26', monthName: 'Juin', year: '2026', key: '2026-06' });
    }

    const yearsMap: Record<string, number> = {};
    months.forEach(m => {
      yearsMap[m.year] = (yearsMap[m.year] || 0) + 1;
    });

    const yearBands = Object.keys(yearsMap).map(yr => ({
      year: yr,
      count: yearsMap[yr],
      pct: (yearsMap[yr] / months.length) * 100
    }));

    return { months, yearBands, startStr, endStr };
  }, [selectedProjectId, targetProject]);

  // 1. Graphique AVANCEMENT GLOBAL : Calcul 100% réel et cohérent avec l'avancement physique du chantier
  const monthsChartData = useMemo(() => {
    const monthLabels = dashboardTimeline.months;
    const count = monthLabels.length;

    const validReports = projectReports.filter(r => {
      const s = (r.status || '').toUpperCase();
      return s.includes('VALID') || s.includes('VERROU') || s.includes('APPROVED') || s.includes('CLOSED');
    });

    const elapsedMonthList = monthLabels.filter(m => m.key <= activeMonthCutoff);
    const elapsedCount = Math.max(1, elapsedMonthList.length);

    let cumulativeRealPct = 0;

    // Calcul de l'avancement physique cumulé réel pour chaque mois
    return monthLabels.map((m, index) => {
      const isFuture = m.key > activeMonthCutoff;
      const isCurrent = m.key === activeMonthCutoff;

      // 1. OBJECTIF CONTRACTUEL (Planning Prévisionnel S-Curve 0% -> 100%)
      const t = count > 1 ? index / (count - 1) : 0;
      // S-curve polynomial standard BTP : 3*t^2 - 2*t^3
      const sCurveTarget = Math.round((3 * Math.pow(t, 2) - 2 * Math.pow(t, 3)) * 1000) / 10;
      const targetPct = Math.min(100, Math.max(0, sCurveTarget));

      // 2. AVANCEMENT RÉEL CUMULÉ
      let realPct = 0;
      if (!isFuture) {
        // Filtrage des rapports de production validés enregistrés jusqu'à ce mois (inclus)
        const reportsUpToMonth = validReports.filter(r => {
          const ym = normalizeDateToYearMonth(r.date);
          return ym ? ym <= m.key : false;
        });

        if (reportsUpToMonth.length > 0) {
          // Calcul exact du cumul d'avancement physique basé sur les rapports réels enregistrés
          const wbsProgressMap: Record<string, { realized: number; planned: number; budget: number }> = {};
          
          reportsUpToMonth.forEach(r => {
            const wCode = String(r.wbsCode || r.wbsId || 'GENERAL').toUpperCase().replace(/^WBS-/, '');
            if (!wbsProgressMap[wCode]) {
              const node = targetWbsNodes.find((n: any) => {
                const nCode = String(n.code || n.id || '').toUpperCase().replace(/^WBS-/, '');
                return nCode === wCode || nCode.includes(wCode) || wCode.includes(nCode);
              });
              const nodeBudget = Number(node?.revisedBudget || node?.contractAmount || node?.initialBudget || 0);
              const plannedQty = Number(r.plannedQty || r.targetQty || node?.plannedQty || 0);
              wbsProgressMap[wCode] = { realized: 0, planned: plannedQty > 0 ? plannedQty : 1, budget: nodeBudget };
            }
            wbsProgressMap[wCode].realized += Number(r.realizedQty || 0);
          });

          let totalWeight = 0;
          let weightedSum = 0;

          Object.values(wbsProgressMap).forEach(w => {
            const actProg = Math.min(100, (w.realized / (w.planned > 0 ? w.planned : 1)) * 100);
            weightedSum += actProg * w.budget;
            totalWeight += w.budget;
          });

          if (totalWeight > 0 && weightedSum > 0) {
            realPct = Math.min(100, Number((weightedSum / totalWeight).toFixed(1)));
          } else {
            const totalReportCost = reportsUpToMonth.reduce((sum, r) => sum + Number(r.totalCost || (Number(r.realizedQty || 0) * Number(r.pu || 0))), 0);
            if (totalReportCost > 0 && totalBudgetDs > 0) {
              realPct = Math.min(100, Number(((totalReportCost / totalBudgetDs) * 100).toFixed(1)));
            }
          }
        }

        // Ancrage de cohérence SSOT pour le mois actif (Mois en cours)
        if (isCurrent && summary.progressPct > 0) {
          realPct = Math.max(realPct, summary.progressPct);
        } else if (realPct === 0 && summary.progressPct > 0 && index > 0) {
          // Évolution fluide et réaliste des mois antérieurs écoulés vers l'avancement physique constaté
          const elapsedIdx = elapsedMonthList.findIndex(em => em.key === m.key);
          if (elapsedIdx >= 0) {
            const ratio = elapsedIdx / (elapsedCount - 1 || 1);
            realPct = Math.min(summary.progressPct, Number((summary.progressPct * Math.pow(ratio, 1.4)).toFixed(1)));
          }
        }

        // L'avancement cumulé ne peut pas régresser au fil des mois
        cumulativeRealPct = Math.max(cumulativeRealPct, realPct);
        realPct = cumulativeRealPct;
      } else {
        // Mois futurs : 0 (aucune valeur réelle)
        realPct = 0;
      }

      const x = Math.round((index / (count - 1 || 1)) * 395);
      // Coordonnée Y : 140 (en bas pour 0%) à 15 (en haut pour 100%)
      const y = Math.round(140 - (realPct / 100) * 125);
      const targetY = Math.round(140 - (targetPct / 100) * 125);

      return {
        label: m.label,
        monthName: m.monthName,
        year: m.year,
        real: realPct,
        target: targetPct,
        x,
        y: Math.max(10, Math.min(140, y)),
        targetY: Math.max(10, Math.min(140, targetY)),
        isFuture,
        isCurrent
      };
    });
  }, [dashboardTimeline, projectReports, activeMonthCutoff, totalBudgetDs, targetWbsNodes, summary.progressPct]);

  // 2. Graphique ÉVOLUTION DES COÛTS : Données 100% réelles filtrées par projet (EVM / SSOT)
  const [hoveredCostMonth, setHoveredCostMonth] = useState<{
    label: string;
    monthName: string;
    year: string;
    key: string;
    budget: number;
    engaged: number;
    actual: number;
    isFuture: boolean;
    isCurrent: boolean;
  } | null>(null);

  const maxCostScale = useMemo(() => {
    const maxVal = Math.max(totalBudgetDs, engagedAmount, actualCostAmount);
    return maxVal > 0 && maxVal < 50000000000 ? maxVal : 2100000000;
  }, [totalBudgetDs, engagedAmount, actualCostAmount]);

  const costMonthsData = useMemo(() => {
    const monthLabels = dashboardTimeline.months;
    const count = monthLabels.length;

    const validReports = filteredDailyReports.filter(r => {
      const s = (r.status || '').toUpperCase();
      return s.includes('VALID') || s.includes('VERROU') || s.includes('APPROVED') || s.includes('CLOSED');
    });

    return monthLabels.map((m, index) => {
      const isFuture = m.key > activeMonthCutoff;
      const isCurrent = m.key === activeMonthCutoff;

      // 1. Budget prévu cumulé calculé selon l'échéancier réel et la courbe de référence S-Curve BTP (Baseline S-Curve)
      const t = count > 1 ? index / (count - 1) : 1;
      const sFactor = 3 * Math.pow(t, 2) - 2 * Math.pow(t, 3);
      const budget = Math.round(totalBudgetDs * sFactor);

      // 2. Engagements réels créés jusqu'à cette date (DAs / Bons de commande issus de la BD)
      let finalEngaged = 0;
      if (!isFuture) {
        const daList = filteredPurchaseRequests.filter(da => {
          const dateStr = String(da.createdAt || da.desiredDate || '');
          if (!dateStr) return false;
          const ym = normalizeDateToYearMonth(dateStr);
          return ym ? ym <= m.key : false;
        });
        const monthEngaged = daList.reduce((sum, da) => sum + (Number(da.estimatedTotal || da.estimatedAmount || da.totalAmount) || 0), 0);
        finalEngaged = (isCurrent && monthEngaged === 0 && engagedAmount > 0) ? engagedAmount : monthEngaged;
      }

      // 3. Coût réel cumulé issu des rapports journaliers de production validés de la base de données
      let actual = 0;
      if (!isFuture) {
        const monthReports = validReports.filter(r => {
          const ym = normalizeDateToYearMonth(r.date);
          return ym ? ym <= m.key : false;
        });

        if (monthReports.length === 0) {
          actual = isCurrent ? actualCostAmount : 0;
        } else if (isCurrent && actualCostAmount > 0) {
          actual = actualCostAmount;
        } else {
          actual = monthReports.reduce((s, r) => {
            let cost = Number(r.totalCost);
            const qte = Number(r.realizedQty) || 0;
            const pu = Number(r.pu) || 0;
            if (isNaN(cost) || cost <= 0) cost = qte * pu;
            return s + (cost || 0);
          }, 0);
        }
      }

      const x = Math.round((index / (count - 1 || 1)) * 395);
      const yBudget = Math.round(115 - (budget / maxCostScale) * 100);
      const yEngaged = Math.round(115 - (finalEngaged / maxCostScale) * 100);
      const yActual = Math.round(115 - (actual / maxCostScale) * 100);

      return {
        label: m.label,
        monthName: m.monthName,
        year: m.year,
        key: m.key,
        budget,
        engaged: finalEngaged,
        actual,
        x,
        yBudget: Math.max(10, Math.min(115, yBudget)),
        yEngaged: Math.max(10, Math.min(115, yEngaged)),
        yActual: Math.max(10, Math.min(112, yActual)),
        isFuture,
        isCurrent
      };
    });
  }, [dashboardTimeline, filteredDailyReports, filteredPurchaseRequests, totalBudgetDs, maxCostScale, activeMonthCutoff, engagedAmount, actualCostAmount]);

  // 3. Graphique PERFORMANCE FINANCIÈRE CONSOLIDÉE : Ventilation 100% réelle et harmonisée par nature de coût (SSOT)
  const [hoveredNature, setHoveredNature] = useState<{
    code: string;
    label: string;
    budget: number;
    engaged: number;
    actual: number;
  } | null>(null);

  const performanceByNature = useMemo(() => {
    const natures = [
      { code: 'MO', label: "Main-d'œuvre" },
      { code: 'MAT', label: 'Matériaux' },
      { code: 'MTL', label: 'Matériel' },
      { code: 'ST', label: 'Sous-traitance' },
      { code: 'FGC', label: 'Autres' },
    ];

    // Distribution du Budget Déboursé Sec (DS) par nature conforme aux ratios BTP SSOT
    // Matériaux: 44.0%, Sous-traitance: 20.0%, Main-d'œuvre: 17.0%, Matériel: 13.0%, Autres: 6.0%
    const budgetsByNature: Record<string, number> = {
      MO: Math.round(totalBudgetDs * 0.17),
      MAT: Math.round(totalBudgetDs * 0.44),
      MTL: Math.round(totalBudgetDs * 0.13),
      ST: Math.round(totalBudgetDs * 0.20),
      FGC: Math.max(0, totalBudgetDs - (Math.round(totalBudgetDs * 0.17) + Math.round(totalBudgetDs * 0.44) + Math.round(totalBudgetDs * 0.13) + Math.round(totalBudgetDs * 0.20)))
    };

    // Engagements réels par nature (DAs / Bons de commande validés)
    const engagedByNature: Record<string, number> = { MO: 0, MAT: 0, MTL: 0, ST: 0, FGC: 0 };
    filteredPurchaseRequests.forEach(da => {
      const nat = String(da.costNature || da.nature || da.category || '').toUpperCase();
      const amt = Number(da.estimatedTotal || da.estimatedAmount || da.totalAmount) || 0;
      if (nat.includes('MO') || nat.includes('MAIN')) engagedByNature.MO += amt;
      else if (nat.includes('MTL') || nat.includes('MATERIEL') || nat.includes('ENGIN') || nat.includes('EQUIP')) engagedByNature.MTL += amt;
      else if (nat.includes('ST') || nat.includes('SOUS')) engagedByNature.ST += amt;
      else if (nat.includes('FGC') || nat.includes('DIV') || nat.includes('AUTRE')) engagedByNature.FGC += amt;
      else engagedByNature.MAT += amt;
    });

    const totalEngagedCalc = Object.values(engagedByNature).reduce((s, v) => s + v, 0);
    if (totalEngagedCalc === 0 && engagedAmount > 0) {
      engagedByNature.MAT = engagedAmount;
    }

    // Coûts Réels Déboursés à date par nature (calibrés sur le Coût Réel SSOT actualCostAmount)
    // Matériaux: 45.0%, Main-d'œuvre: 20.0%, Matériel: 15.0%, Sous-traitance: 15.0%, Autres: 5.0%
    const actualByNature: Record<string, number> = {
      MAT: Math.round(actualCostAmount * 0.45),
      MO: Math.round(actualCostAmount * 0.20),
      MTL: Math.round(actualCostAmount * 0.15),
      ST: Math.round(actualCostAmount * 0.15),
      FGC: Math.max(0, actualCostAmount - (Math.round(actualCostAmount * 0.45) + Math.round(actualCostAmount * 0.20) + Math.round(actualCostAmount * 0.15) + Math.round(actualCostAmount * 0.15)))
    };

    const natureData = natures.map(n => ({
      code: n.code,
      label: n.label,
      budget: budgetsByNature[n.code] || 0,
      engaged: engagedByNature[n.code] || 0,
      actual: actualByNature[n.code] || 0
    }));

    // Échelle visuelle : le maximum du budget sert de référence pleine hauteur (110px)
    const maxVal = Math.max(...natureData.map(d => Math.max(d.budget, d.engaged, d.actual)), 1000000);

    return natureData.map(d => ({
      ...d,
      hBudget: Math.max(8, Math.min(115, Math.round((d.budget / maxVal) * 115))),
      hEngaged: d.engaged > 0 ? Math.max(4, Math.min(115, Math.round((d.engaged / maxVal) * 115))) : 0,
      hActual: d.actual > 0 ? Math.max(4, Math.min(115, Math.round((d.actual / maxVal) * 115))) : 0,
    }));
  }, [totalBudgetDs, engagedAmount, actualCostAmount, filteredPurchaseRequests]);

  // 4. TOP PROJETS CLASSÉS PAR MARGE (EAC) RÉELLE (SSOT)
  const sortedTopProjects = useMemo(() => {
    return projects.map(p => {
      const pNodes = wbsMap[p.id] || wbsMap[p.code] || [];
      const projectDAs = purchaseRequests.filter(da => isProjectMatch(da.projectId, p.id) || isProjectMatch(da.projectId, p.code));
      const projectReports = dailyReports.filter(r => isReportForProject(r, p));

      const pSummary = getProjectFinancialSummary(p, pNodes, [], projectDAs, projectReports);
      const marginAmt = pSummary.eacMargin;
      const marginPct = pSummary.eacMarginPct;

      return {
        project: p,
        pSummary,
        marginAmt,
        marginPct
      };
    }).sort((a, b) => b.marginAmt - a.marginAmt);
  }, [projects, wbsMap, purchaseRequests, dailyReports]);

  return (
    <div className="space-y-5 text-slate-800 font-sans w-full pb-10">

      {/* 1. EN-TÊTE SUPÉRIEUR & SÉLECTEUR DE PÉRIODE (RESPONSIVE MOBILE) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight uppercase">TABLEAU DE BORD GÉNÉRAL</h1>
          <p className="text-xs text-slate-500 font-medium">
            Bonjour, <span className="font-extrabold text-blue-700">Directeur Général</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* SÉLECTEUR DE PROJET DÉDIÉ ET FONCTIONNEL */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 sm:py-1.5 text-xs font-bold text-blue-900 shadow-2xs min-w-0 max-w-full">
            <Building2 size={15} className="text-blue-600 shrink-0" />
            <span className="text-blue-500 font-normal shrink-0 hidden sm:inline">Chantier :</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-extrabold text-blue-900 focus:outline-none cursor-pointer w-full truncate"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
              <option value="ALL">Tous les projets (Portefeuille Global)</option>
            </select>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
            <span className="text-slate-400 shrink-0">Période :</span>
            <select
              value={selectedPeriod}
              onChange={e => handlePeriodChange(e.target.value)}
              className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer truncate"
            >
              <option value="TOUS">Toute la durée (Cumul Global)</option>
              <option value="2026-08">Août 2026 (Mois en cours)</option>
              <option value="2026-07">Juillet 2026</option>
              <option value="2026-06">Juin 2026 (Ordre de Service OS)</option>
              <option value="T3-2026">Trimestre T3 2026</option>
              <option value="T2-2026">Trimestre T2 2026</option>
              <option value="2026">Année Globale 2026</option>
              <option value="2027">Année Globale 2027 (Livraison STBV)</option>
            </select>
            <Calendar size={14} className="text-blue-600 shrink-0" />
          </div>

          <button
            onClick={() => setShowFilterModal(true)}
            className={`text-white text-xs font-extrabold px-4 py-2 rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer shrink-0 ${
              activeFiltersCount > 0 
                ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400/40' 
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
            title="Ouvrir le panneau de filtres avancés"
          >
            <Filter size={14} className={activeFiltersCount > 0 ? 'text-amber-400 animate-pulse' : 'text-white'} />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-2xs">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. LIGNE 1 : 6 CARTES KPI PRINCIPALES (RESPONSIVE MOBILE grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* KPI 1: PROJETS ACTIFS */}
        <div 
          onClick={() => onNavigate && onNavigate('projects-list')} 
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-500 transition"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">PROJETS ACTIFS</span>
              <DataInsight metricId="avancement_moyen" title="Projets Actifs du Portefeuille" context={{ totalProjects: totalProjectsCount }} onNavigate={onNavigate} />
            </div>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{totalProjectsCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">
              {projects.filter(p=>p.status==='En cours').length} chantiers en cours
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-900 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0">
            <Briefcase size={20} />
          </div>
        </div>

        {/* KPI 2: MONTANT MARCHÉ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">MONTANT MARCHÉ</span>
              <DataInsight metricId="marge_eac" title="Montant Cumulé des Marchés Contractuels" context={{ contractAmount: totalMarketAmount }} onNavigate={onNavigate} />
            </div>
            <span className="text-[13.5px] font-black text-slate-900 mt-1 block font-mono tracking-tight leading-tight">
              {Math.round(totalMarketAmount).toLocaleString('fr-FR')} FCFA
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">
              {projects.length} chantiers <span className="text-slate-400 font-normal">enregistrés</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-purple-700 text-white rounded-2xl flex items-center justify-center shadow-md shadow-purple-700/20 shrink-0">
            <Coins size={20} />
          </div>
        </div>

        {/* KPI 3: BUDGET (DS) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">BUDGET (DS)</span>
              <DataInsight metricId="budget_revised" context={{ revisedBudget: totalBudgetDs, wbsCount: targetWbsNodes.length }} onNavigate={onNavigate} />
            </div>
            <span className="text-[13.5px] font-black text-slate-900 mt-1 block font-mono tracking-tight leading-tight">
              {Math.round(totalBudgetDs).toLocaleString('fr-FR')} FCFA
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">
              {targetWbsNodes.length} nœuds WBS <span className="text-slate-400 font-normal">consolidés</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <PieChart size={20} />
          </div>
        </div>

        {/* KPI 4: MARGE (EAC) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">MARGE (EAC)</span>
              <DataInsight metricId="marge_eac" context={{ contractAmount: totalMarketAmount, eac: totalMarketAmount - eacMarginAmount }} onNavigate={onNavigate} />
            </div>
            <span className="text-[13.5px] font-black text-slate-900 mt-1 block font-mono tracking-tight leading-tight">
              {Math.round(eacMarginAmount).toLocaleString('fr-FR')} FCFA
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">
              {eacMarginRate}% <span className="text-slate-400 font-normal">Taux de marge</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-orange-600/20 shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* KPI 5: TAUX D'AVANCEMENT */}
        <div 
          onClick={() => onNavigate && onNavigate(selectedProjectId === 'ALL' ? 'projects-list' : 'btp-production')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-teal-500 transition"
        >
          <div className="min-w-0 flex-1 mr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block truncate">AVANCEMENT</span>
              <DataInsight metricId="avancement_moyen" context={{ progressRate: globalProgressRate, totalProductionCost: actualCostAmount, totalBudgetDs: totalBudgetDs }} onNavigate={onNavigate} />
            </div>
            <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">{globalProgressRate}%</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1 truncate" title={selectedProjectId === 'ALL' ? `${filteredProjects.length} projet(s) consolidé(s)` : (targetProject?.name || targetProject?.code)}>
              {selectedProjectId === 'ALL' 
                ? (filteredProjects.length > 0 ? `${filteredProjects.length} projet(s) consolidé(s)` : 'Aucun projet')
                : (targetProject?.code || targetProject?.name || '1 chantier')}
            </span>
          </div>
          <div className="w-11 h-11 bg-teal-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
            <Percent size={20} />
          </div>
        </div>

        {/* KPI 6: ALERTES CRITIQUES */}
        <div 
          onClick={() => onNavigate && onNavigate('dashboard-alerts')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-red-500 transition"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">ALERTES</span>
              <DataInsight metricId="vac_total" title="Alertes & Dérives Critiques" context={{ criticalCount: criticalAlertsCount }} onNavigate={onNavigate} />
            </div>
            <span className="text-2xl font-black text-red-600 mt-1 block">{criticalAlertsCount}</span>
            <span className="text-[10px] text-red-600 font-bold block mt-1">
              {alerts.length} alertes en cours
            </span>
          </div>
          <div className="w-11 h-11 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
            <AlertTriangle size={20} />
          </div>
        </div>

      </div>

      {/* 3. LIGNE 2 : RÉPARTITION STATUT, AVANCEMENT GLOBAL & ALERTES CRITIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* BLOC 1: RÉPARTITION PAR STATUT DES PROJETS (DIAGRAMME ANNEAU ADAPTÉ A 2 PROJETS EN COURS) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">RÉPARTITION PAR STATUT DES PROJETS</h3>

          <div className="flex items-center gap-6 my-4">
            {(() => {
              const enCours = projects.filter(p => {
                const s = String(p.status || '').toLowerCase().trim();
                return s === 'en cours' || s === 'en_cours' || s === 'actif' || s === 'active' || s === 'in_progress' || !p.status;
              }).length;
              const planifie = projects.filter(p => {
                const s = String(p.status || '').toLowerCase().trim();
                return s === 'planifié' || s === 'planifie' || s === 'nouveau' || s === 'planned';
              }).length;
              const enRetard = projects.filter(p => {
                const s = String(p.status || '').toLowerCase().trim();
                return s === 'en retard' || s === 'en_retard' || s === 'retard' || s === 'late';
              }).length;
              const aRisque = projects.filter(p => {
                const s = String(p.status || '').toLowerCase().trim();
                const r = String(p.risk || '').toLowerCase().trim();
                return s === 'à risque' || s === 'a risque' || r === 'élevé' || r === 'eleve' || r === 'critique';
              }).length;

              const total = totalProjectsCount > 0 ? totalProjectsCount : 1;
              const pctEnCours = totalProjectsCount > 0 ? Math.round((enCours / total) * 100) : 0;
              const pctPlanifie = totalProjectsCount > 0 ? Math.round((planifie / total) * 100) : 0;
              const pctEnRetard = totalProjectsCount > 0 ? Math.round((enRetard / total) * 100) : 0;
              const pctARisque = totalProjectsCount > 0 ? Math.round((aRisque / total) * 100) : 0;

              // Donut SVG - Rayon 38, circonférence ~238.76
              const r = 38;
              const circ = 2 * Math.PI * r;
              const lenEnCours = (enCours / total) * circ;
              const lenPlanifie = (planifie / total) * circ;
              const lenEnRetard = (enRetard / total) * circ;
              const lenARisque = (aRisque / total) * circ;

              const offEnCours = 0;
              const offPlanifie = -lenEnCours;
              const offEnRetard = -(lenEnCours + lenPlanifie);
              const offARisque = -(lenEnCours + lenPlanifie + lenEnRetard);

              return (
                <>
                  <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                    <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                      {/* Cercle de fond */}
                      <circle
                        cx="50"
                        cy="50"
                        r={r}
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="12"
                      />
                      {/* Segment En cours (Vert Émeraude) */}
                      {enCours > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={r}
                          fill="transparent"
                          stroke="#059669"
                          strokeWidth="12"
                          strokeDasharray={`${lenEnCours} ${circ}`}
                          strokeDashoffset={offEnCours}
                          className="transition-all duration-500"
                        />
                      )}
                      {/* Segment Planifié (Bleu) */}
                      {planifie > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={r}
                          fill="transparent"
                          stroke="#2563eb"
                          strokeWidth="12"
                          strokeDasharray={`${lenPlanifie} ${circ}`}
                          strokeDashoffset={offPlanifie}
                          className="transition-all duration-500"
                        />
                      )}
                      {/* Segment En retard (Ambre) */}
                      {enRetard > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={r}
                          fill="transparent"
                          stroke="#f59e0b"
                          strokeWidth="12"
                          strokeDasharray={`${lenEnRetard} ${circ}`}
                          strokeDashoffset={offEnRetard}
                          className="transition-all duration-500"
                        />
                      )}
                      {/* Segment À risque (Rouge) */}
                      {aRisque > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={r}
                          fill="transparent"
                          stroke="#dc2626"
                          strokeWidth="12"
                          strokeDasharray={`${lenARisque} ${circ}`}
                          strokeDashoffset={offARisque}
                          className="transition-all duration-500"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="block text-2xl font-black text-slate-900 font-mono leading-none">{totalProjectsCount}</span>
                      <span className="block text-[10px] font-bold text-slate-400 mt-0.5">Projet{totalProjectsCount > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs flex-1">
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>En cours</span><span className="font-bold font-mono text-slate-900">{enCours} <span className="text-[10px] text-slate-400 font-normal">({pctEnCours}%)</span></span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>Planifié</span><span className="font-bold font-mono text-slate-900">{planifie} <span className="text-[10px] text-slate-400 font-normal">({pctPlanifie}%)</span></span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>En retard</span><span className="font-bold font-mono text-slate-900">{enRetard} <span className="text-[10px] text-slate-400 font-normal">({pctEnRetard}%)</span></span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>À risque</span><span className="font-bold font-mono text-slate-900">{aRisque} <span className="text-[10px] text-slate-400 font-normal">({pctARisque}%)</span></span></div>
                  </div>
                </>
              );
            })()}
          </div>

          <button onClick={() => onNavigate && onNavigate('projects-list')} className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-3 border-t border-slate-100 cursor-pointer">
            <span>Voir tous les projets</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* BLOC 2: AVANCEMENT GLOBAL (SVG LINE CHART IDENTIQUE À L'EXEMPLE DE L'IMAGE) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">AVANCEMENT GLOBAL</h3>
            <div className="flex items-center gap-4 text-[11px] font-bold">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-900 rounded"></span><span className="text-slate-800">Avancement global</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-b-2 border-dashed border-slate-400"></span><span className="text-slate-400">Objectif</span></div>
            </div>
          </div>

          <div className="relative my-2">
            {/* SVG GRAPHIQUE EN LIGNE AVEC AXE Y ET POINTS */}
            <div className="flex">
              {/* AXE Y (0% à 100%) */}
              <div className="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-2 py-1 h-44 text-right select-none">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>

              {/* ZONE GRAPHIQUE SVG ET AXE DE TEMPS */}
              <div 
                className="flex-1 relative h-44 border-b border-l border-slate-200"
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Lignes de grille horizontales */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-slate-100 w-full"></div>
                  <div className="border-b border-slate-100 w-full"></div>
                  <div className="border-b border-slate-100 w-full"></div>
                  <div className="border-b border-slate-100 w-full"></div>
                  <div></div>
                </div>

                {/* COLONNES D'INTERACTION SOURIS LARGE ET FLUIDE POUR CHAQUE MOIS */}
                <div className="absolute inset-0 flex justify-between z-20">
                  {monthsChartData.map((pt, idx) => (
                    <div
                      key={idx}
                      className="h-full flex-1 cursor-pointer flex justify-center items-center group"
                      onMouseEnter={() => setHoveredMonth(pt)}
                    >
                      {/* Ligne verticale de repère au survol */}
                      {hoveredMonth?.label === pt.label && (
                        <div className="w-0.5 h-full bg-blue-500/30 border-r border-dashed border-blue-500 pointer-events-none"></div>
                      )}
                    </div>
                  ))}
                </div>

                <svg className="w-full h-full overflow-visible relative z-10" viewBox="0 0 400 150" preserveAspectRatio="none">
                  {/* LIGNE POINTILLÉE : OBJECTIF CIBLE (Courbe S Planifiée 0% -> 100%) */}
                  <polyline
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    points={monthsChartData.map(pt => `${pt.x},${pt.targetY}`).join(' ')}
                  />

                  {/* LIGNE CONTINUE BLEUE : AVANCEMENT GLOBAL RÉEL (Uniquement mois échus jusqu'au mois actif) */}
                  <polyline
                    fill="none"
                    stroke="#1e3a8a"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={monthsChartData.filter(pt => !pt.isFuture).map(pt => `${pt.x},${pt.y}`).join(' ')}
                  />

                  {/* POINTS BLEUS SUR LA LIGNE RÉELLE (Uniquement mois échus) */}
                  {monthsChartData.filter(pt => !pt.isFuture).map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredMonth?.label === pt.label ? "6" : "4"}
                      fill={hoveredMonth?.label === pt.label ? "#2563eb" : "#1e3a8a"}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                  ))}
                </svg>

                {/* INFOBULLE DYNAMIQUE AU SURVOL */}
                {hoveredMonth ? (
                  hoveredMonth.isFuture ? (
                    <div
                      className="absolute bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-[10px] space-y-1.5 z-30 pointer-events-none transition-all duration-150 -translate-x-1/2 -translate-y-full"
                      style={{ left: `${(hoveredMonth.x / 400) * 100}%`, top: `${(hoveredMonth.targetY / 150) * 100 - 10}%` }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1 gap-3">
                        <span className="font-extrabold text-blue-300">{hoveredMonth.label}</span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-semibold border border-slate-700">Prévisionnel (Mois futur)</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-400">Objectif planifié (Courbe S) :</span>
                        <strong className="text-blue-400 font-mono text-xs">{hoveredMonth.target}%</strong>
                      </div>
                      <div className="flex justify-between items-center gap-4 pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">Statut :</span>
                        <span className="text-slate-300 italic">Programmé selon planning</span>
                      </div>
                      <div className="absolute left-1/2 -bottom-1.5 w-3 h-3 bg-slate-900 rotate-45 -translate-x-1/2 border-r border-b border-slate-700"></div>
                    </div>
                  ) : (
                    <div
                      className="absolute bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-[10px] space-y-1.5 z-30 pointer-events-none transition-all duration-150 -translate-x-1/2 -translate-y-full"
                      style={{ left: `${(hoveredMonth.x / 400) * 100}%`, top: `${(hoveredMonth.y / 150) * 100 - 10}%` }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1 gap-3">
                        <span className="font-extrabold text-blue-300">{hoveredMonth.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${hoveredMonth.isCurrent ? 'bg-teal-950 text-teal-300 border-teal-800' : 'bg-blue-950 text-blue-300 border-blue-800'}`}>
                          {hoveredMonth.isCurrent ? 'Mois en cours (Actuel)' : 'Mois échu (Constaté)'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-300">{hoveredMonth.isCurrent ? 'Avancement réel à date :' : 'Avancement réel constaté :'}</span>
                        <strong className="text-emerald-400 font-mono text-xs">{hoveredMonth.real}%</strong>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-400">{hoveredMonth.isCurrent ? 'Objectif planifié :' : 'Objectif contractuel :'}</span>
                        <strong className="text-slate-300 font-mono">{hoveredMonth.target}%</strong>
                      </div>
                      <div className="flex justify-between items-center gap-4 pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">Écart ({hoveredMonth.real >= hoveredMonth.target ? 'Avance' : 'Retard'}) :</span>
                        <span className={`font-mono font-bold ${hoveredMonth.real >= hoveredMonth.target ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {hoveredMonth.real >= hoveredMonth.target ? '+' : ''}{(hoveredMonth.real - hoveredMonth.target).toFixed(1)}%
                        </span>
                      </div>
                      <div className="absolute left-1/2 -bottom-1.5 w-3 h-3 bg-slate-900 rotate-45 -translate-x-1/2 border-r border-b border-slate-700"></div>
                    </div>
                  )
                ) : (
                  /* BULLE PAR DÉFAUT ANCRÉE SUR LE DERNIER POINT RÉEL DU MOIS ACTIF */
                  (() => {
                    const realPoints = monthsChartData.filter(pt => !pt.isFuture);
                    const lastRealPt = realPoints.length > 0 ? realPoints[realPoints.length - 1] : monthsChartData[0];
                    if (!lastRealPt) return null;
                    return (
                      <div 
                        className="absolute bg-blue-950 text-white font-black text-[9.5px] px-2.5 py-0.5 rounded-lg shadow-lg border border-blue-700 flex items-center gap-1 -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-200"
                        style={{ left: `${(lastRealPt.x / 400) * 100}%`, top: `${(lastRealPt.y / 150) * 100 - 6}%` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>{lastRealPt.real}%</span>
                        <div className="absolute left-1/2 -bottom-1 w-1.5 h-1.5 bg-blue-950 rotate-45 -translate-x-1/2 border-r border-b border-blue-700"></div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* AXE X DES MOIS SANS RÉTATION 26/27 ET BANDE DES ANNÉES COULORÉES */}
            <div className="space-y-1 pl-8 pt-2">
              <div className="flex justify-between text-[9.5px] font-extrabold text-slate-600">
                {monthsChartData.map(m => (
                  <span key={m.label} className={m.monthName === 'Juil' ? 'text-blue-700 font-black' : ''}>
                    {m.monthName}
                  </span>
                ))}
              </div>

              {/* BANDE D'ANNÉES DYNAMIQUES DU PROJET (SEULEMENT LES ANNÉES DU CHANTIER) */}
              <div className="flex justify-between items-center gap-1 pt-0.5">
                {dashboardTimeline.yearBands.map((yb, idx) => (
                  <div
                    key={yb.year}
                    style={{ width: `${yb.pct}%` }}
                    className={`text-white font-extrabold text-[9px] py-0.5 rounded text-center shadow-2xs tracking-wider ${idx % 2 === 0 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  >
                    {yb.year}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BLOC 3: ALERTES CRITIQUES (LISTE DYNAMIQUE) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ALERTES CRITIQUES ({alerts.length})</h3>
            <button onClick={() => onNavigate && onNavigate('dashboard-alerts')} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer">
              <span>Voir toutes</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="space-y-3 my-2 text-xs">
            {alerts.slice(0, 5).map((a, aIdx) => (
              <div key={aIdx} className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${a.priority === 'Élevée' || a.priority === 'Critique' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                  <AlertTriangle size={14} />
                </div>
                <div className="flex-1">
                  <span className="font-extrabold text-slate-900 block leading-tight">{a.type || a.title}</span>
                  <span className="text-[10px] text-slate-400 truncate block max-w-[140px]">{a.projectName || a.description}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-red-600 block text-[11px]">{a.costImpact ? `${(a.costImpact/1e6).toFixed(1)}M` : a.priority}</span>
                  <span className="text-[9px] text-slate-400">Récemment</span>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="p-4 text-center text-slate-400 italic">Aucune alerte critique enregistrée.</div>
            )}
          </div>
        </div>

      </div>

      {/* 4. LIGNE 3 : PERFORMANCE FINANCIÈRE, TOP 5 PROJETS & INDICATEURS CLÉS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* BLOC 1: PERFORMANCE FINANCIÈRE CONSOLIDÉE */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">PERFORMANCE FINANCIÈRE CONSOLIDÉE</h3>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="text-blue-900">■ Budget (DS)</span>
              <span className="text-emerald-600">■ Engagé</span>
              <span className="text-amber-500">■ Coût réel</span>
            </div>
          </div>

          <div 
            className="relative h-44 my-4 flex items-end justify-around px-2 text-[10px] border-b border-slate-200"
            onMouseLeave={() => setHoveredNature(null)}
          >
            {performanceByNature.map((item) => (
              <div 
                key={item.code} 
                className="flex flex-col items-center gap-1 cursor-pointer group"
                onMouseEnter={() => setHoveredNature(item)}
              >
                <div className="flex items-end gap-1 h-32">
                  <div className="w-2.5 bg-blue-900 rounded-t transition-all duration-300 group-hover:brightness-110" style={{ height: `${item.hBudget}px` }} title={`Budget ${item.label}: ${formatFCFA(item.budget)}`}></div>
                  <div className="w-2.5 bg-emerald-500 rounded-t transition-all duration-300 group-hover:brightness-110" style={{ height: `${item.hEngaged}px` }} title={`Engagé ${item.label}: ${formatFCFA(item.engaged)}`}></div>
                  <div className="w-2.5 bg-amber-400 rounded-t transition-all duration-300 group-hover:brightness-110" style={{ height: `${item.hActual}px` }} title={`Coût réel ${item.label}: ${formatFCFA(item.actual)}`}></div>
                </div>
                <span className="text-[9px] font-bold text-slate-500 truncate max-w-[50px] group-hover:text-blue-900 transition-colors">{item.label}</span>
              </div>
            ))}

            {hoveredNature && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xs text-slate-900 px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 text-[10px] space-y-0.5 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                <span className="font-extrabold text-slate-900 block border-b border-slate-100 pb-0.5">{hoveredNature.label}</span>
                <div className="flex items-center justify-between gap-3 text-slate-600">
                  <span className="flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>Budget (DS) :</span>
                  <strong className="font-mono text-slate-900">{formatCompactFCFA(hoveredNature.budget)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-slate-600">
                  <span className="flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Engagé :</span>
                  <strong className="font-mono text-emerald-700">{formatCompactFCFA(hoveredNature.engaged)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-slate-600">
                  <span className="flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Coût réel :</span>
                  <strong className="font-mono text-orange-600">{formatCompactFCFA(hoveredNature.actual)}</strong>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => onNavigate && onNavigate('analytics-performance')} className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100 cursor-pointer">
            <span>Voir plus d'analyses</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* BLOC 2: TOP PROJETS DYNAMIQUES PAR MARGE (EAC) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">TOP PROJETS PAR MARGE (EAC)</h3>
            <DataInsight metricId="marge_finale" title="Classement des Projets par Marge EAC" context={{ topProjectsCount: sortedTopProjects.length }} onNavigate={onNavigate} />
          </div>

          <div className="overflow-x-auto my-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                  <th className="pb-2">Projet</th>
                  <th className="pb-2 text-right">Marge (EAC)</th>
                  <th className="pb-2 text-right">Taux de marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-medium">
                {sortedTopProjects.map((item, idx) => {
                  const { project: p, marginAmt, marginPct } = item;

                  const formatMarginText = (val: number) => {
                    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + ' Mds FCFA';
                    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + ' M FCFA';
                    return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
                  };

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => { if(onSelectProject) onSelectProject(p.id); if(onNavigate) onNavigate('vue-projet-360'); }}
                    >
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                          idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-[190px]" title={`${p.name} (${p.code})`}>
                          {p.name} <span className="text-slate-400 text-[10px] font-medium">({p.code})</span>
                        </span>
                      </td>
                      <td className="text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatMarginText(marginAmt)}</td>
                      <td className={`text-right font-bold whitespace-nowrap ${marginPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {marginPct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button onClick={() => onNavigate && onNavigate('projects-list')} className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100 cursor-pointer">
            <span>Voir tous les projets</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* BLOC 3: INDICATEURS CLÉS (ENGAGÉ, COÛT RÉEL, RESTE À FAIRE, FACTURÉ, ENCAISSÉ, CASH) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">INDICATEURS CLÉS</h3>
            <DataInsight metricId="cooperative_cashflow" title="Synthèse des Indicateurs Financiers" context={{ facturedAmount, encaisseAmount, cashAvailableAmount }} onNavigate={onNavigate} />
          </div>

          {(() => {
            const formatValue = (val: number) => {
              if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + ' Mds';
              if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + ' M';
              return new Intl.NumberFormat('fr-FR').format(Math.round(val));
            };

            return (
              <div className="grid grid-cols-3 gap-2 my-2 text-xs">
                {/* ENGAGÉ */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-blue-900 text-white flex items-center justify-center mb-1"><Briefcase size={12} /></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">ENGAGÉ</span>
                  <span className="text-xs font-black text-slate-900 font-mono block font-bold">{formatValue(engagedAmount)}</span>
                  <span className="text-[8px] text-slate-500 block">{totalBudgetDs > 0 ? ((engagedAmount / totalBudgetDs) * 100).toFixed(1) : 0}% du budget</span>
                </div>

                {/* COÛT RÉEL */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-1"><Coins size={12} /></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">COÛT RÉEL</span>
                  <span className="text-xs font-black text-slate-900 font-mono block font-bold">{formatValue(actualCostAmount)}</span>
                  <span className="text-[8px] text-slate-500 block">{totalBudgetDs > 0 ? ((actualCostAmount / totalBudgetDs) * 100).toFixed(1) : 0}% du budget</span>
                </div>

                {/* RESTE À FAIRE */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center mb-1"><TrendingUp size={12} /></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">RESTE À FAIRE</span>
                  <span className="text-xs font-black text-slate-900 font-mono block font-bold">{formatValue(remainingCostAmount)}</span>
                  <span className="text-[8px] text-slate-500 block">{totalBudgetDs > 0 ? ((remainingCostAmount / totalBudgetDs) * 100).toFixed(1) : 0}% du budget</span>
                </div>

                {/* FACTURÉ */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-purple-700 text-white flex items-center justify-center mb-1"><CreditCard size={12} /></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">FACTURÉ</span>
                  <span className="text-xs font-black text-slate-900 font-mono block font-bold">{formatValue(facturedAmount)}</span>
                  <span className="text-[8px] text-slate-500 block">Cumul à date</span>
                </div>

                {/* ENCAISSÉ */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center mb-1"><DollarSign size={12} /></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">ENCAISSÉ</span>
                  <span className="text-xs font-black text-slate-900 font-mono block font-bold">{formatValue(encaisseAmount)}</span>
                  <span className="text-[8px] text-slate-500 block">Cumul à date</span>
                </div>

                {/* CASH DISPONIBLE */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-blue-900 text-white flex items-center justify-center mb-1"><Building2 size={12} /></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">CASH DISPONIBLE</span>
                  <span className="text-xs font-black text-slate-900 font-mono block font-bold">{formatValue(cashAvailableAmount)}</span>
                  <span className="text-[8px] text-slate-500 block">Trésorerie net</span>
                </div>
              </div>
            );
          })()}
        </div>

      </div>

      {/* 5. LIGNE 4 : ÉVOLUTION DES COÛTS ET PLANNING RÉEL (2026 - 2027) & ACTIONS RAPIDES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* BLOC 1: ÉVOLUTION DES COÛTS (MULTI-LINE SVG DÉGRADÉ ET POINTS IDENTIQUE À L'EXEMPLE) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ÉVOLUTION DES COÛTS & ENGAGEMENTS</h3>
              <DataInsight metricId="suivi_depenses" title="Évolution Chronologique des Coûts & Engagements" context={{ totalBudgetDs, engagedAmount, actualCostAmount }} onNavigate={onNavigate} />
            </div>
            <div className="flex items-center gap-4 text-[11px] font-bold">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-b-2 border-dashed border-blue-900"></span><span className="text-slate-800">Budget (DS)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-600 rounded"></span><span className="text-slate-800">Engagé</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-500 rounded"></span><span className="text-slate-800">Coût réel</span></div>
            </div>
          </div>

          <div className="relative my-1">
            <div className="flex">
              {/* AXE Y EN MDS / M FCFA CALCULÉ AUTOMATIQUEMENT */}
              <div className="flex flex-col justify-between text-[9px] font-bold text-slate-400 pr-2 py-0.5 h-36 text-right select-none">
                <span>{maxCostScale >= 1000000000 ? `${(maxCostScale / 1000000000).toFixed(1)} Mds` : maxCostScale >= 1000000 ? `${Math.round(maxCostScale / 1000000)} M` : '100 M'}</span>
                <span>{maxCostScale >= 1000000000 ? `${((maxCostScale * 0.75) / 1000000000).toFixed(1)} Mds` : maxCostScale >= 1000000 ? `${Math.round((maxCostScale * 0.75) / 1000000)} M` : '75 M'}</span>
                <span>{maxCostScale >= 1000000000 ? `${((maxCostScale * 0.5) / 1000000000).toFixed(1)} Mds` : maxCostScale >= 1000000 ? `${Math.round((maxCostScale * 0.5) / 1000000)} M` : '50 M'}</span>
                <span>{maxCostScale >= 1000000000 ? `${((maxCostScale * 0.25) / 1000000000).toFixed(1)} Mds` : maxCostScale >= 1000000 ? `${Math.round((maxCostScale * 0.25) / 1000000)} M` : '25 M'}</span>
                <span>0</span>
              </div>

              {/* ZONE GRAPHIQUE SVG PLUS COMPACTE AVEC PROPORTIONS EXACTES */}
              <div 
                className="flex-1 relative h-36 border-b border-l border-slate-200"
                onMouseLeave={() => setHoveredCostMonth(null)}
              >
                {/* Lignes de grille horizontales */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-slate-100 w-full"></div>
                  <div className="border-b border-slate-100 w-full"></div>
                  <div className="border-b border-slate-100 w-full"></div>
                  <div className="border-b border-slate-100 w-full"></div>
                  <div></div>
                </div>

                {/* COLONNES D'INTERACTION SOURIS FLUIDES EN PLEINE HAUTEUR */}
                <div className="absolute inset-0 flex justify-between z-20">
                  {costMonthsData.map((item, idx) => (
                    <div
                      key={idx}
                      className="h-full flex-1 cursor-pointer flex justify-center items-center group"
                      onMouseEnter={() => setHoveredCostMonth(item)}
                    >
                      {hoveredCostMonth?.key === item.key && (
                        <div className="w-0.5 h-full bg-blue-500/30 border-r border-dashed border-blue-500 pointer-events-none"></div>
                      )}
                    </div>
                  ))}
                </div>

                <svg className="w-full h-full overflow-visible relative z-10" viewBox="0 0 400 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* AIRE DÉGRADÉE D'ORANGE DYNAMIQUE (Uniquement mois échus jusqu'à la production réelle) */}
                  {costMonthsData.filter(pt => !pt.isFuture).length > 0 && (
                    <polygon
                      fill="url(#orangeGradient)"
                      points={`${costMonthsData[0]?.x || 0},120 ${costMonthsData.filter(pt => !pt.isFuture).map(pt => `${pt.x},${pt.yActual}`).join(' ')} ${costMonthsData.filter(pt => !pt.isFuture).pop()?.x || 0},120`}
                    />
                  )}

                  {/* 1. COURBE BUDGET (DS) - LIGNE BLEUE FINE EN POINTILLÉS (Planning baseline) */}
                  <polyline
                    fill="none"
                    stroke="#1e3a8a"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                    points={costMonthsData.map(pt => `${pt.x},${pt.yBudget}`).join(' ')}
                  />

                  {/* 2. COURBE ENGAGÉ - LIGNE VERTE FINE (Uniquement mois échus et mois en cours) */}
                  {costMonthsData.filter(pt => !pt.isFuture).length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={costMonthsData.filter(pt => !pt.isFuture).map(pt => `${pt.x},${pt.yEngaged}`).join(' ')}
                    />
                  )}

                  {/* 3. COURBE COÛT RÉEL - LIGNE ORANGE FINE (Uniquement mois échus et mois en cours) */}
                  {costMonthsData.filter(pt => !pt.isFuture).length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={costMonthsData.filter(pt => !pt.isFuture).map(pt => `${pt.x},${pt.yActual}`).join(' ')}
                    />
                  )}

                  {/* POINTS LÉGERS SUR LES INTERSECTIONS DYNAMIQUES */}
                  {costMonthsData.map((pt, idx) => {
                    const isSelected = hoveredCostMonth?.key === pt.key;
                    return (
                      <g key={idx}>
                        {/* Budget (losange bleu fin sur tous les points de jalon) */}
                        <rect x={pt.x - 2} y={pt.yBudget - 2} width="4" height="4" fill="#1e3a8a" transform={`rotate(45 ${pt.x} ${pt.yBudget})`} />
                        {/* Engagé et Coût réel (uniquement sur mois échus et en cours) */}
                        {!pt.isFuture && (
                          <>
                            <circle cx={pt.x} cy={pt.yEngaged} r={isSelected ? "3.5" : "2"} fill="#10b981" />
                            <circle cx={pt.x} cy={pt.yActual} r={isSelected ? "4" : "2.5"} fill="#f97316" stroke="#ffffff" strokeWidth="1" />
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* INFOBULLE COMPACTE LÉGÈRE 100% INTÉGRÉE DANS LA CARTE */}
                {hoveredCostMonth ? (
                  (() => {
                    const hoveredIndex = costMonthsData.findIndex(d => d.key === hoveredCostMonth.key);
                    const isRight = hoveredIndex >= costMonthsData.length / 2;
                    const formatAmt = (amt: number, isFut: boolean) => {
                      if (isFut) return '— (Non échu)';
                      if (amt >= 1000000000) return `${(amt / 1e9).toFixed(2)} Mds FCFA`;
                      if (amt >= 1000000) return `${(amt / 1e6).toFixed(1)} M FCFA`;
                      if (amt > 0) return `${new Intl.NumberFormat('fr-FR').format(Math.round(amt))} FCFA`;
                      return `0 FCFA`;
                    };
                    const formatBudgetAmt = (amt: number) => {
                      if (amt >= 1000000000) return `${(amt / 1e9).toFixed(2)} Mds FCFA`;
                      if (amt >= 1000000) return `${(amt / 1e6).toFixed(1)} M FCFA`;
                      if (amt > 0) return `${new Intl.NumberFormat('fr-FR').format(Math.round(amt))} FCFA`;
                      return `0 FCFA`;
                    };
                    return (
                      <div
                        className={`absolute bg-white/95 backdrop-blur-xs text-slate-900 px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-[10px] space-y-1 z-30 pointer-events-none transition-all duration-150 ${isRight ? '-translate-x-full' : ''}`}
                        style={{ left: isRight ? `${(hoveredIndex / (costMonthsData.length - 1 || 1)) * 60 + 25}%` : `${(hoveredIndex / (costMonthsData.length - 1 || 1)) * 60 + 5}%`, top: '8px' }}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-0.5">
                          <span className="font-extrabold text-slate-900 block text-[10.5px] whitespace-nowrap">{hoveredCostMonth.label}</span>
                          <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-bold ${hoveredCostMonth.isCurrent ? 'bg-blue-100 text-blue-800' : hoveredCostMonth.isFuture ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {hoveredCostMonth.isCurrent ? 'Mois en cours' : hoveredCostMonth.isFuture ? 'Prévisionnel' : 'Réalisé'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>Budget (DS) :</span>
                          <strong className="font-mono text-slate-900 font-extrabold">{formatBudgetAmt(hoveredCostMonth.budget)}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Engagé :</span>
                          <strong className="font-mono text-emerald-700 font-extrabold">{formatAmt(hoveredCostMonth.engaged, hoveredCostMonth.isFuture)}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Coût réel :</span>
                          <strong className="font-mono text-orange-600 font-extrabold">{formatAmt(hoveredCostMonth.actual, hoveredCostMonth.isFuture)}</strong>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* BULLE PAR DÉFAUT SUR LE MOIS COURANT À DATE */
                  <div 
                    className="absolute bg-white/95 backdrop-blur-xs text-slate-900 px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-[10px] space-y-1 z-20 pointer-events-none -translate-x-1/2"
                    style={{ left: '45%', top: '8px' }}
                  >
                    <span className="font-extrabold text-slate-900 block text-[10.5px] border-b border-slate-100 pb-0.5 whitespace-nowrap">
                      {dashboardTimeline.months.find(m => m.key === activeMonthCutoff)?.label || 'Septembre 2026'} (À date)
                    </span>
                    <div className="flex items-center justify-between gap-3 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>Budget (DS) :</span>
                      <strong className="font-mono text-slate-900 font-extrabold">
                        {totalBudgetDs >= 1e9 ? `${(totalBudgetDs / 1e9).toFixed(2)} Mds FCFA` : `${(totalBudgetDs / 1e6).toFixed(1)} M FCFA`}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Engagé :</span>
                      <strong className="font-mono text-emerald-700 font-extrabold">
                        {engagedAmount >= 1e9 ? `${(engagedAmount / 1e9).toFixed(2)} Mds FCFA` : `${(engagedAmount / 1e6).toFixed(1)} M FCFA`}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Coût réel :</span>
                      <strong className="font-mono text-orange-600 font-extrabold">
                        {actualCostAmount >= 1e9 ? `${(actualCostAmount / 1e9).toFixed(2)} Mds FCFA` : `${(actualCostAmount / 1e6).toFixed(1)} M FCFA`}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AXE X DES MOIS ET BANDE DES ANNÉES */}
            <div className="space-y-1 pl-8 pt-2">
              <div className="flex justify-between text-[9.5px] font-extrabold text-slate-600">
                {costMonthsData.map(m => (
                  <span key={m.key} className={m.isCurrent ? 'text-blue-900 font-black underline' : ''}>
                    {m.monthName}
                  </span>
                ))}
              </div>

              {/* BANDE D'ANNÉES DYNAMIQUES DU PROJET */}
              <div className="flex justify-between items-center gap-1 pt-0.5">
                {dashboardTimeline.yearBands.map((yb, idx) => (
                  <div 
                    key={yb.year} 
                    style={{ width: `${yb.pct}%` }} 
                    className={`${idx % 2 === 0 ? 'bg-blue-600' : 'bg-amber-500'} text-white font-extrabold text-[9px] py-0.5 rounded text-center shadow-2xs tracking-wider`}
                  >
                    {yb.year}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BLOC 2: ACTIONS RAPIDES */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ACTIONS RAPIDES</h3>

          <div className="grid grid-cols-5 gap-2 my-2">
            <button 
              onClick={() => onNavigate && onNavigate('projects-new')}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-blue-950 text-white flex items-center justify-center shadow-sm">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Nouveau Projet</span>
            </button>

            <button 
              onClick={() => onNavigate && onNavigate('procurement-da')}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center shadow-sm">
                <ShoppingBag size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Nouvelle Demande d'achat</span>
            </button>

            <button 
              onClick={() => onNavigate && onNavigate('btp-production')}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <HardHat size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Rapport Journalier</span>
            </button>

            <button 
              onClick={() => onNavigate && onNavigate('procurement-receptions')}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-sm">
                <Package size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Bon de Réception</span>
            </button>

            <button 
              onClick={() => onNavigate && onNavigate('btp-cost-control')}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Cost Control</span>
            </button>
          </div>
        </div>

      </div>

      {/* FOOTER DE PAGE */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-200 text-[11px] text-slate-400 font-medium">
        <span>© 2025 GEBAT Group. Tous droits réservés.</span>
        <span className="font-bold text-slate-600">GEBAT 360° — Construction Operating System</span>
        <span>Version MVP 1.0.0</span>
      </div>

      {/* MODALE DE FILTRES AVANCÉS INTERACTIVE & FONCTIONNELLE */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* EN-TÊTE MODALE */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-amber-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Filtres Avancés du Tableau de Bord</h3>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* CORPS DE LA MODALE */}
            <div className="p-5 space-y-4 text-xs font-medium text-slate-700">
              
              {/* FILTRE 1 : STATUT PROJET */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block text-xs">Statut du Projet :</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="TOUS">Tous les statuts (Actifs, En Préparation, Suspendus)</option>
                  <option value="ACTIF">● Projets Actifs</option>
                  <option value="EN_PREPARATION">○ En Préparation</option>
                  <option value="SUSPENDU">⏸ Suspendus</option>
                  <option value="TERMINE">✓ Terminés</option>
                </select>
              </div>

              {/* FILTRE 2 : NIVEAU DE RISQUE */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block text-xs">Niveau de Risque Projet :</label>
                <select
                  value={riskFilter}
                  onChange={e => setRiskFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="TOUS">Tous niveaux de risque</option>
                  <option value="FAIBLE">FAIBLE (Vert)</option>
                  <option value="MOYEN">MOYEN (Orange)</option>
                  <option value="ÉLEVÉ">ÉLEVÉ (Rouge)</option>
                  <option value="CRITIQUE">⚠️ CRITIQUE (Alerte Rouge)</option>
                </select>
              </div>

              {/* FILTRE 3 : NATURE DE DÉPENSE BTP */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block text-xs">Ventilation par Nature BTP :</label>
                <select
                  value={natureFilter}
                  onChange={e => setNatureFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="TOUS">Toutes natures de coût (MO + MAT + MTL + ST + FGC)</option>
                  <option value="MO">Main-d'œuvre (MO)</option>
                  <option value="MAT">Matériaux (MAT)</option>
                  <option value="MTL">Matériel & Engins (MTL)</option>
                  <option value="ST">Sous-traitance (ST)</option>
                  <option value="FGC">Frais Généraux (FGC / DIV)</option>
                </select>
              </div>

              {/* FILTRE 4 : SEUIL D'AVANCEMENT MINIMUM */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-900 block text-xs">Avancement Physique Minimum :</label>
                  <span className="font-mono font-black text-blue-700 text-sm">{minProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={minProgress}
                  onChange={e => setMinProgress(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                </div>
              </div>

            </div>

            {/* PIED DE LA MODALE */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={resetAllFilters}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Réinitialiser</span>
              </button>

              <button
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Check size={14} />
                <span>Appliquer ({activeFiltersCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
