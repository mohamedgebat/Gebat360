import { CostNature } from '../types';

export interface CeoProjectItem {
  id: string;
  code: string;
  name: string;
  company: 'GEBAT SA' | 'GEBAT INFRA' | 'GEBAT LOG';
  manager: string;
  progress: number;
  scheduleStatus: string;
  scheduleColor: string;
  contractValue: number;
  budget: number;
  committed: number;
  actualCost: number;
  eac: number;
  initialMarginPct: number;
  eacMarginPct: number;
  cashStatus: string;
  riskLevel: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
  riskColor: string;
  score: number;
  lastUpdate: string;
  scoreBreakdown: {
    finance: number;
    planning: number;
    production: number;
    cash: number;
    procurement: number;
    qhse: number;
    risk: number;
  };
  mainOverrunCause?: string;
}

export interface CeoExecutiveAlert {
  id: string;
  severity: '🔴 CRITIQUE' | '🟠 VIGILANCE' | '🔵 INFO';
  projectCode: string;
  projectName: string;
  company: string;
  title: string;
  detail: string;
  impact: string;
  threshold: string;
  manager: string;
  date: string;
  action: string;
  initialBudget: number;
  currentBudget: number;
  actualCost: number;
  remainingToFinish: number;
  eac: number;
  initialMarginPct: number;
  eacMarginPct: number;
  mainCause: string;
  daysDelay?: number;
  penaltyPerDay?: string;
  impactedMilestones?: Array<{
    name: string;
    plannedDate: string;
    forecastDate: string;
    delayDays: number;
    wbsCode: string;
  }>;
  correctivePlan?: Array<{
    action: string;
    resource: string;
    costImpact: string;
    targetRecoveryDays: number;
  }>;
}

export interface CeoDecisionItem {
  id: string;
  severity: '🔴 URGENT' | '🟠 DECISION' | '🔵 INFO';
  title: string;
  project: string;
  projectCode: string;
  wbsCode: string;
  amount: string;
  amountNumber: number;
  marginImpactPct: number;
  deadline: string;
  description: string;
  justification: string;
  impactIfRefused: string;
  dqePostes: Array<{
    code: string;
    description: string;
    initial: number;
    revised: number;
    diff: number;
  }>;
  attachments: string[];
}

export interface CashForecastHorizon {
  horizon: string;
  cashAvailable: number;
  expectedInflow: number;
  expectedOutflow: number;
  futureCommitments: number;
  projectedBalance: number;
  fundingNeed: number;
}
