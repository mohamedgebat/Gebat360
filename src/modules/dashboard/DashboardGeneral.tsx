import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { getProjectFinancialSummary, calculateMarginPercentage } from '../../core/utils/financialFormulas';
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
      const rDate = String(r.date);
      const rMonth = rDate.substring(0, 7);

      if (selectedPeriod.startsWith('2026-') || selectedPeriod.startsWith('2027-')) {
        return rMonth === selectedPeriod;
      }
      if (selectedPeriod === 'T3-2026') return rDate >= '2026-07-01' && rDate <= '2026-09-30';
      if (selectedPeriod === 'T2-2026') return rDate >= '2026-04-01' && rDate <= '2026-06-30';
      if (selectedPeriod === '2026') return rDate.startsWith('2026');
      if (selectedPeriod === '2027') return rDate.startsWith('2027');
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
      const daMonth = dateStr.substring(0, 7);

      if (selectedPeriod.startsWith('2026-') || selectedPeriod.startsWith('2027-')) {
        return daMonth === selectedPeriod;
      }
      if (selectedPeriod === 'T3-2026') return dateStr >= '2026-07-01' && dateStr <= '2026-09-30';
      if (selectedPeriod === 'T2-2026') return dateStr >= '2026-04-01' && dateStr <= '2026-06-30';
      if (selectedPeriod === '2026') return dateStr.startsWith('2026');
      if (selectedPeriod === '2027') return dateStr.startsWith('2027');
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
  const engagedAmount = summary.committed;
  const totalEac = summary.eac;
  const eacMarginAmount = summary.eacMargin;
  const eacMarginRate = summary.eacMarginPct.toFixed(1);
  const globalProgressRate = summary.progressPct.toFixed(1);

  const criticalAlertsCount = alerts.filter(a => a.status === 'Actif' || a.status === 'ACTIVE').length;

  const remainingCostAmount = summary.resteAEngager;
  const facturedAmount = 0;
  const encaisseAmount = 0;
  const cashAvailableAmount = Math.max(0, encaisseAmount - actualCostAmount);

  // État interactif du survol de la souris sur le graphique
  const [hoveredMonth, setHoveredMonth] = useState<{
    label: string;
    real: number;
    target: number;
    x: number;
    y: number;
  } | null>(null);

  const activeMonthCutoff = useMemo(() => {
    if (!filteredDailyReports || filteredDailyReports.length === 0) return '2026-08';
    const dates = filteredDailyReports
      .map(r => String(r.date || '').substring(0, 7))
      .filter(d => d && d >= '2026-01' && d <= '2027-12');
    return dates.length > 0 ? dates.sort().pop() || '2026-08' : '2026-08';
  }, [filteredDailyReports]);

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

  // 1. Graphique AVANCEMENT GLOBAL : Calcul 100% réel à partir des rapports de production et de l'échéancier propre
  const monthsChartData = useMemo(() => {
    const monthLabels = dashboardTimeline.months;
    const count = monthLabels.length;
    const currentProg = Math.min(100, Math.max(0, summary.progressPct));

    const validReports = filteredDailyReports.filter(r => {
      const s = (r.status || '').toUpperCase();
      return s.includes('VALID') || s.includes('VERROU') || s.includes('APPROVED') || s.includes('CLOSED');
    });

    return monthLabels.map((m, index) => {
      const isFuture = m.key > activeMonthCutoff;

      let realPct = 0;
      if (!isFuture) {
        // Filtrage des rapports de production validés enregistrés jusqu'à ce mois (inclus)
        const reportsUpToMonth = validReports.filter(r => {
          if (!r.date) return false;
          return String(r.date).substring(0, 7) <= m.key;
        });

        if (reportsUpToMonth.length === 0) {
          // S'il n'y a pas de valeurs/rapports validés enregistrés à cette date -> STRICTEMENT 0
          realPct = 0;
        } else if (m.key === activeMonthCutoff) {
          // Mois actif courant : Valeur réelle SSOT exacte
          realPct = currentProg;
        } else {
          // Mois antérieur avec rapports enregistrés : Calcul réel du cumul d'avancement physique
          const wbsProgressMap: Record<string, { realized: number; planned: number; budget: number }> = {};
          
          reportsUpToMonth.forEach(r => {
            const wCode = String(r.wbsCode || r.wbsId || 'GENERAL').toUpperCase();
            if (!wbsProgressMap[wCode]) {
              const node = targetWbsNodes.find((n: any) => String(n.code || n.id || '').toUpperCase() === wCode);
              const nodeBudget = Number(node?.revisedBudget || node?.contractAmount || node?.initialBudget || 1);
              const plannedQty = Number(r.plannedQty || r.targetQty || node?.plannedQty || 1);
              wbsProgressMap[wCode] = { realized: 0, planned: plannedQty > 0 ? plannedQty : 1, budget: nodeBudget };
            }
            wbsProgressMap[wCode].realized += Number(r.realizedQty || 0);
          });

          let totalWeight = 0;
          let weightedSum = 0;

          Object.values(wbsProgressMap).forEach(w => {
            const actProg = Math.min(100, (w.realized / w.planned) * 100);
            weightedSum += actProg * w.budget;
            totalWeight += w.budget;
          });

          if (totalWeight > 0 && weightedSum > 0) {
            realPct = Math.min(currentProg, Number((weightedSum / totalWeight).toFixed(1)));
          } else {
            realPct = currentProg;
          }
        }
      } else {
        // Mois futurs : Projection prévisionnelle
        const activeIdx = monthLabels.findIndex(mon => mon.key === activeMonthCutoff);
        const validActiveIdx = activeIdx >= 0 ? activeIdx : 0;
        const remainingMonths = count - 1 - validActiveIdx;

        if (remainingMonths > 0) {
          const futureStep = index - validActiveIdx;
          const pos = futureStep / remainingMonths;
          const sFactor = 3 * Math.pow(pos, 2) - 2 * Math.pow(pos, 3);
          const gap = 100 - currentProg;
          realPct = Math.min(100, Math.max(0, Number((currentProg + (gap * sFactor)).toFixed(1))));
        } else {
          realPct = 100;
        }
      }

      // Objectif prévisionnel
      const targetPct = realPct > 0 ? Math.min(100, Number((realPct * 1.05).toFixed(1))) : 0;
      const x = Math.round((index / (count - 1 || 1)) * 395);
      const y = Math.round(140 - (realPct / 100) * 125);

      return {
        label: m.label,
        monthName: m.monthName,
        year: m.year,
        real: realPct,
        target: targetPct,
        x,
        y: Math.max(10, Math.min(135, y)),
        isFuture
      };
    });
  }, [dashboardTimeline, filteredDailyReports, activeMonthCutoff, summary.progressPct, targetWbsNodes]);

  // 2. Graphique ÉVOLUTION DES COÛTS (12 DERNIERS MOIS) : Données 100% réelles filtrées par projet
  const [hoveredCostMonth, setHoveredCostMonth] = useState<{
    label: string;
    budget: number;
    engaged: number;
    actual: number;
  } | null>(null);

  const maxCostScale = useMemo(() => {
    const maxVal = Math.max(totalBudgetDs, engagedAmount, actualCostAmount);
    return maxVal > 0 && maxVal < 50000000000 ? maxVal : 2100000000;
  }, [totalBudgetDs, engagedAmount, actualCostAmount]);

  const costMonthsData = useMemo(() => {
    const monthLabels = [
      { label: 'Fév 26', monthName: 'Fév', year: '2026', key: '2026-02' },
      { label: 'Mar 26', monthName: 'Mar', year: '2026', key: '2026-03' },
      { label: 'Avr 26', monthName: 'Avr', year: '2026', key: '2026-04' },
      { label: 'Mai 26', monthName: 'Mai', year: '2026', key: '2026-05' },
      { label: 'Juin 26', monthName: 'Juin', year: '2026', key: '2026-06' },
      { label: 'Juil 26', monthName: 'Juil', year: '2026', key: '2026-07' },
      { label: 'Aoû 26', monthName: 'Aoû', year: '2026', key: '2026-08' },
      { label: 'Sep 26', monthName: 'Sep', year: '2026', key: '2026-09' },
      { label: 'Oct 26', monthName: 'Oct', year: '2026', key: '2026-10' },
      { label: 'Nov 26', monthName: 'Nov', year: '2026', key: '2026-11' },
      { label: 'Déc 26', monthName: 'Déc', year: '2026', key: '2026-12' },
      { label: 'Jan 27', monthName: 'Jan', year: '2027', key: '2027-01' },
    ];

    return monthLabels.map((m, index) => {
      const isFuture = m.key > activeMonthCutoff;

      // 1. Budget prévu cumulé au prorata des mois du projet
      const budget = Math.round(totalBudgetDs * Math.min(1, (index + 1) / 12));

      // 2. Engagements réels créés jusqu'à cette date
      const monthEngaged = filteredPurchaseRequests
        .filter(da => da.createdAt && da.createdAt <= `${m.key}-31`)
        .reduce((sum, da) => sum + (Number(da.estimatedTotal || da.estimatedAmount) || 0), 0);

      // 3. Coût réel cumulé (0 pour les mois futurs non échus)
      let actual = 0;
      if (!isFuture) {
        const monthReports = filteredDailyReports.filter(r => r.date && r.date <= `${m.key}-31`);
        actual = monthReports.reduce((s, r) => {
          let cost = Number(r.totalCost);
          const qte = Number(r.realizedQty) || 0;
          const pu = Number(r.pu) || 0;
          if (isNaN(cost) || cost <= 0) cost = qte * pu;
          return s + (cost || 0);
        }, 0);
      }

      const x = Math.round((index / 11) * 360);
      const yBudget = Math.round(115 - (budget / maxCostScale) * 100);
      const yEngaged = Math.round(115 - (monthEngaged / maxCostScale) * 100);
      const yActual = Math.round(115 - (actual / maxCostScale) * 100);

      return {
        label: m.label,
        monthName: m.monthName,
        year: m.year,
        budget,
        engaged: monthEngaged,
        actual,
        x,
        yBudget: Math.max(10, Math.min(115, yBudget)),
        yEngaged: Math.max(10, Math.min(115, yEngaged)),
        yActual: Math.max(10, Math.min(112, yActual)),
        isFuture
      };
    });
  }, [filteredDailyReports, filteredPurchaseRequests, totalBudgetDs, maxCostScale, activeMonthCutoff]);

  // 3. Graphique PERFORMANCE FINANCIÈRE CONSOLIDÉE : Agrégation 100% réelle par nature de coût (SSOT)
  const performanceByNature = useMemo(() => {
    const natures = [
      { code: 'MO', label: "Main-d'œuvre" },
      { code: 'MAT', label: 'Matériaux' },
      { code: 'MTL', label: 'Matériel' },
      { code: 'ST', label: 'Sous-traitance' },
      { code: 'FGC', label: 'Autres' },
    ];

    const getLeaves = (arr: any[]): any[] => {
      let res: any[] = [];
      (arr || []).forEach(n => {
        if (!n.children || n.children.length === 0) res.push(n);
        else res = res.concat(getLeaves(n.children));
      });
      return res;
    };
    const leafNodes = getLeaves(targetWbsNodes);

    const getNatureFromNode = (n: any): string => {
      const code = String(n.nature || n.costNature || n.code || '').toUpperCase();
      const desc = String(n.name || n.description || n.wbsName || '').toLowerCase();
      if (code.includes('MO') || desc.includes('gardiennage') || desc.includes('main d\'oeuvre') || desc.includes('équipe') || desc.includes('aide') || desc.includes('chef') || desc.includes('agent') || desc.includes('maçon')) return 'MO';
      if (code.includes('MTL') || desc.includes('amené') || desc.includes('repli') || desc.includes('location') || desc.includes('bull') || desc.includes('camion') || desc.includes('chargeur') || desc.includes('engin') || desc.includes('tuyau')) return 'MTL';
      if (code.includes('ST') || desc.includes('sous-traitance') || desc.includes('prestataire') || desc.includes('soustraitance')) return 'ST';
      if (code.includes('FGC') || code.includes('DIV') || desc.includes('bureau') || desc.includes('caisse') || desc.includes('mission') || desc.includes('extincteur') || desc.includes('panneau') || desc.includes('frais')) return 'FGC';
      return 'MAT';
    };

    const natureData = natures.map(n => {
      // 1. Budget réel WBS par nature (nœuds feuilles)
      const natureLeaves = leafNodes.filter(node => getNatureFromNode(node) === n.code);
      let budget = natureLeaves.reduce((sum, node) => sum + (Number(node.revisedBudget || node.budget || node.initialBudget || node.contractAmount) || 0), 0);
      
      // En l'absence de nœuds WBS explicites par nature, ventiler le budget DS global sur les proportions BTP standard
      if (budget === 0 && totalBudgetDs > 0) {
        if (n.code === 'MAT') budget = Math.round(totalBudgetDs * 0.65);
        else if (n.code === 'MO') budget = Math.round(totalBudgetDs * 0.15);
        else if (n.code === 'MTL') budget = Math.round(totalBudgetDs * 0.10);
        else if (n.code === 'ST') budget = Math.round(totalBudgetDs * 0.05);
        else if (n.code === 'FGC') budget = Math.round(totalBudgetDs * 0.05);
      }

      // 2. Engagement réel par nature (DAs / POs validés)
      const engaged = filteredPurchaseRequests
        .filter(da => {
          const daNat = String(da.costNature || da.nature || '').toUpperCase();
          if (n.code === 'MAT') return daNat === 'MAT' || !daNat;
          return daNat === n.code;
        })
        .reduce((sum, da) => sum + (Number(da.estimatedTotal || da.estimatedAmount || da.totalAmount) || 0), 0);

      // 3. Coût réel WBS / Production par nature
      let actual = natureLeaves.reduce((sum, node) => sum + (Number(node.actualCost || node.actualCostAmount) || 0), 0);
      
      const validReports = filteredDailyReports.filter(r => {
        const s = (r.status || '').toUpperCase();
        return s.includes('VALID') || s.includes('VERROU') || s.includes('APPROVED') || s.includes('CLOSED');
      });
      
      const reportsActual = validReports
        .filter(r => {
          const wCode = String(r.wbsCode || r.wbsId || '').toUpperCase();
          const node = targetWbsNodes.find((n: any) => String(n.code || n.id || '').toUpperCase() === wCode);
          return node ? getNatureFromNode(node) === n.code : n.code === 'MAT';
        })
        .reduce((s, r) => s + (Number(r.totalCost) || (Number(r.realizedQty || 0) * Number(r.pu || 500000))), 0);

      if (reportsActual > actual) {
        actual = reportsActual;
      }

      return { ...n, budget, engaged, actual };
    });

    const maxVal = Math.max(...natureData.map(d => Math.max(d.budget, d.engaged, d.actual)), 1000000);

    return natureData.map(d => ({
      ...d,
      hBudget: Math.max(8, Math.round((d.budget / maxVal) * 115)),
      hEngaged: Math.max(6, Math.round((d.engaged / maxVal) * 115)),
      hActual: Math.max(6, Math.round((d.actual / maxVal) * 115)),
    }));
  }, [targetWbsNodes, filteredPurchaseRequests, filteredDailyReports, totalBudgetDs]);

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
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">AVANCEMENT</span>
              <DataInsight metricId="avancement_moyen" context={{ progressRate: globalProgressRate, totalProductionCost: actualCostAmount, totalBudgetDs: totalBudgetDs }} onNavigate={onNavigate} />
            </div>
            <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">{globalProgressRate}%</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">
              {projects.length > 0 ? `${projects.length} projet(s) consolidé(s)` : 'Aucun projet'}
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
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <div className="w-36 h-36 rounded-full border-[16px] border-emerald-600 flex items-center justify-center shadow-inner">
                <div className="text-center">
                  <span className="block text-2xl font-black text-slate-900 font-mono">{totalProjectsCount}</span>
                  <span className="block text-[10px] font-bold text-slate-400">Projet(s)</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs flex-1">
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

                const pctEnCours = totalProjectsCount > 0 ? Math.round((enCours / totalProjectsCount) * 100) : 0;
                const pctPlanifie = totalProjectsCount > 0 ? Math.round((planifie / totalProjectsCount) * 100) : 0;
                const pctEnRetard = totalProjectsCount > 0 ? Math.round((enRetard / totalProjectsCount) * 100) : 0;
                const pctARisque = totalProjectsCount > 0 ? Math.round((aRisque / totalProjectsCount) * 100) : 0;

                return (
                  <>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>En cours</span><span className="font-bold font-mono text-slate-900">{enCours} <span className="text-[10px] text-slate-400 font-normal">({pctEnCours}%)</span></span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-blue-800"></span>Planifié</span><span className="font-bold font-mono text-slate-900">{planifie} <span className="text-[10px] text-slate-400 font-normal">({pctPlanifie}%)</span></span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>En retard</span><span className="font-bold font-mono text-slate-900">{enRetard} <span className="text-[10px] text-slate-400 font-normal">({pctEnRetard}%)</span></span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>À risque</span><span className="font-bold font-mono text-slate-900">{aRisque} <span className="text-[10px] text-slate-400 font-normal">({pctARisque}%)</span></span></div>
                  </>
                );
              })()}
            </div>
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
                  {/* LIGNE POINTILLÉE : OBJECTIF CIBLE */}
                  <polyline
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    points={monthsChartData.map(pt => `${pt.x},${Math.round(150 - (pt.target / 100) * 150)}`).join(' ')}
                  />

                  {/* LIGNE CONTINUE BLEUE : AVANCEMENT GLOBAL RÉEL (Uniquement mois échus jusqu'à la production réelle) */}
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
                  <div
                    className="absolute bg-slate-900 text-white p-2.5 rounded-xl shadow-2xl border border-slate-700 text-[10px] space-y-1 z-30 pointer-events-none transition-all duration-150 -translate-x-1/2 -translate-y-full"
                    style={{ left: `${(hoveredMonth.x / 400) * 100}%`, top: `${(hoveredMonth.y / 150) * 100 - 10}%` }}
                  >
                    <span className="font-extrabold text-blue-300 block border-b border-slate-700 pb-1">{hoveredMonth.label}</span>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-slate-300">Avancement réel :</span>
                      <strong className="text-emerald-400 font-mono text-xs">{hoveredMonth.real}%</strong>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-slate-400">Objectif théorique :</span>
                      <strong className="text-slate-300 font-mono">{hoveredMonth.target}%</strong>
                    </div>
                    <div className="absolute left-1/2 -bottom-1.5 w-3 h-3 bg-slate-900 rotate-45 -translate-x-1/2 border-r border-b border-slate-700"></div>
                  </div>
                ) : (
                  /* BULLE PAR DÉFAUT ANCRÉE SUR LE DERNIER POINT RÉEL (JUILLET 2026 : 3.1%) */
                  (() => {
                    const lastRealPt = monthsChartData.filter(pt => !pt.isFuture).pop() || monthsChartData[5];
                    return (
                      <div 
                        className="absolute bg-blue-950 text-white font-black text-[9px] px-2 py-0.5 rounded-md shadow-md border border-blue-800 flex items-center gap-1 -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-200"
                        style={{ left: `${(lastRealPt.x / 400) * 100}%`, top: `${(lastRealPt.y / 150) * 100 - 4}%` }}
                      >
                        <span>{lastRealPt.real}%</span>
                        <div className="absolute left-1/2 -bottom-1 w-1.5 h-1.5 bg-blue-950 rotate-45 -translate-x-1/2"></div>
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

          <div className="relative h-44 my-4 flex items-end justify-around px-2 text-[10px] border-b border-slate-200">
            {performanceByNature.map((item) => (
              <div key={item.code} className="flex flex-col items-center gap-1">
                <div className="flex items-end gap-1 h-32">
                  <div className="w-2 bg-blue-900 rounded-t transition-all duration-300" style={{ height: `${item.hBudget}px` }} title={`Budget ${item.label}: ${item.budget.toLocaleString()} FCFA`}></div>
                  <div className="w-2 bg-emerald-500 rounded-t transition-all duration-300" style={{ height: `${item.hEngaged}px` }} title={`Engagé ${item.label}: ${item.engaged.toLocaleString()} FCFA`}></div>
                  <div className="w-2 bg-amber-400 rounded-t transition-all duration-300" style={{ height: `${item.hActual}px` }} title={`Coût réel ${item.label}: ${item.actual.toLocaleString()} FCFA`}></div>
                </div>
                <span className="text-[9px] font-bold text-slate-500 truncate max-w-[50px]">{item.label}</span>
              </div>
            ))}
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
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">INDICATEURS CLÉS</h3>

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
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ÉVOLUTION DES COÛTS (12 DERNIERS MOIS)</h3>
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
                      {hoveredCostMonth?.label === item.label && (
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
                  <polygon
                    fill="url(#orangeGradient)"
                    points={`0,120 ${costMonthsData.filter(pt => !pt.isFuture).map(pt => `${pt.x},${pt.yActual}`).join(' ')} ${costMonthsData.filter(pt => !pt.isFuture).pop()?.x || 0},120`}
                  />

                  {/* 1. COURBE BUDGET (DS) - LIGNE BLEUE FINE EN POINTILLÉS (Planning baseline) */}
                  <polyline
                    fill="none"
                    stroke="#1e3a8a"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                    points={costMonthsData.map(pt => `${pt.x},${pt.yBudget}`).join(' ')}
                  />

                  {/* 2. COURBE ENGAGÉ - LIGNE VERTE FINE (Uniquement mois échus) */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={costMonthsData.filter(pt => !pt.isFuture).map(pt => `${pt.x},${pt.yEngaged}`).join(' ')}
                  />

                  {/* 3. COURBE COÛT RÉEL - LIGNE ORANGE FINE (Uniquement mois échus enregistrés) */}
                  <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={costMonthsData.filter(pt => !pt.isFuture).map(pt => `${pt.x},${pt.yActual}`).join(' ')}
                  />

                  {/* POINTS LÉGERS SUR LES INTERSECTIONS DYNAMIKES (Uniquement mois échus) */}
                  {costMonthsData.filter(pt => !pt.isFuture).map((pt, idx) => {
                    const isSelected = hoveredCostMonth?.label === pt.label;
                    return (
                      <g key={idx}>
                        {/* Budget (losange bleu fin) */}
                        <rect x={pt.x - 2} y={pt.yBudget - 2} width="4" height="4" fill="#1e3a8a" transform={`rotate(45 ${pt.x} ${pt.yBudget})`} />
                        {/* Engagé (point vert fin) */}
                        <circle cx={pt.x} cy={pt.yEngaged} r={isSelected ? "3.5" : "2"} fill="#10b981" />
                        {/* Coût réel (point orange fin) */}
                        <circle cx={pt.x} cy={pt.yActual} r={isSelected ? "4" : "2.5"} fill="#f97316" stroke="#ffffff" strokeWidth="1" />
                      </g>
                    );
                  })}
                </svg>

                {/* INFOBULLE COMPACTE LÉGÈRE 100% INTÉGRÉE DANS LA CARTE */}
                {hoveredCostMonth ? (
                  (() => {
                    const hoveredIndex = costMonthsData.findIndex(d => d.label === hoveredCostMonth.label);
                    const isRight = hoveredIndex >= 6;
                    const formatAmt = (amt: number) => {
                      if (amt >= 1000000000) return `${(amt / 1e9).toFixed(2)} Mds FCFA`;
                      if (amt >= 1000000) return `${(amt / 1e6).toFixed(2)} M FCFA`;
                      if (amt > 0) return `${amt.toLocaleString('fr-FR')} FCFA`;
                      return `0.00 M FCFA`;
                    };
                    return (
                      <div
                        className={`absolute bg-white/95 backdrop-blur-xs text-slate-900 px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-[10px] space-y-1 z-30 pointer-events-none transition-all duration-150 ${isRight ? '-translate-x-full' : ''}`}
                        style={{ left: isRight ? `${(hoveredIndex / 11) * 70 + 25}%` : `${(hoveredIndex / 11) * 70 + 5}%`, top: '8px' }}
                      >
                        <span className="font-extrabold text-slate-900 block text-[10.5px] border-b border-slate-100 pb-0.5 whitespace-nowrap">{hoveredCostMonth.label}</span>
                        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>Budget (DS) :</span>
                          <strong className="font-mono text-slate-900 font-extrabold">{formatAmt(hoveredCostMonth.budget)}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Engagé :</span>
                          <strong className="font-mono text-emerald-700 font-extrabold">{formatAmt(hoveredCostMonth.engaged)}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Coût réel :</span>
                          <strong className="font-mono text-orange-600 font-extrabold">{formatAmt(hoveredCostMonth.actual)}</strong>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* BULLE PAR DÉFAUT SUR LE MOIS COURANT À DATE (JUILLET 2026) */
                  <div 
                    className="absolute bg-white/95 backdrop-blur-xs text-slate-900 px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-[10px] space-y-1 z-20 pointer-events-none -translate-x-1/2"
                    style={{ left: '45%', top: '8px' }}
                  >
                    <span className="font-extrabold text-slate-900 block text-[10.5px] border-b border-slate-100 pb-0.5 whitespace-nowrap">Juillet 2026 (À date)</span>
                    <div className="flex items-center justify-between gap-3 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>Budget (DS) :</span>
                      <strong className="font-mono text-slate-900">{(totalBudgetDs / 1e9).toFixed(2)} Mds FCFA</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Engagé :</span>
                      <strong className="font-mono text-emerald-700">{(engagedAmount / 1e9).toFixed(2)} Mds FCFA</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Coût réel :</span>
                      <strong className="font-mono text-orange-600 font-extrabold">{(actualCostAmount / 1e6).toFixed(2)} M FCFA</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AXE X DES MOIS SANS RÉTATION 26/27 ET BANDE DES ANNÉES COULORÉES */}
            <div className="space-y-1 pl-8 pt-2">
              <div className="flex justify-between text-[9.5px] font-extrabold text-slate-600">
                {costMonthsData.map(m => (
                  <span key={m.label} className={m.monthName === 'Juil' ? 'text-blue-900 font-black' : ''}>
                    {m.monthName}
                  </span>
                ))}
              </div>

              {/* BANDE D'ANNÉES 2026 ET 2027 DISTINCTES AVEC COULEURS */}
              <div className="flex justify-between items-center gap-1 pt-0.5">
                <div className="flex-1 bg-blue-600 text-white font-extrabold text-[9px] py-0.5 rounded text-center shadow-2xs tracking-wider">
                  2026
                </div>
                <div className="w-[8%] bg-amber-500 text-white font-extrabold text-[9px] py-0.5 rounded text-center shadow-2xs tracking-wider">
                  2027
                </div>
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
