// Types et structures de données pour le système DataInsight de GEBAT 360°

export interface DataInsightValueItem {
  label: string;
  value: string | number;
  subtext?: string;
  isResult?: boolean;
}

export interface DataInsightScope {
  projectName?: string;
  projectId?: string;
  projectCode?: string;
  wbsCode?: string;
  wbsName?: string;
  period?: string;
}

export interface DataInsightDrillDownAction {
  label: string;
  targetView: string;
  filterParams?: Record<string, any>;
}

export interface DataInsightMetricConfig {
  id: string;
  title: string;
  unit?: string;
  category: 'FINANCE' | 'PRODUCTION' | 'ACHATS' | 'STOCK' | 'PILOTAGE';
  definition: string;
  formulaDescription?: string;
  formulaVariables?: string[];
  sources: string[];
  calculateValues?: (context: any) => {
    currentValue: string | number;
    breakdown: DataInsightValueItem[];
    isAvailable: boolean;
    missingReason?: string;
  };
  getScope?: (context: any) => DataInsightScope;
  getLineage?: (context: any) => string[];
  getLastUpdated?: (context: any) => string;
  getTransactionCount?: (context: any) => number;
  getDrillDownActions?: (context: any) => DataInsightDrillDownAction[];
}

export interface DataInsightProps {
  metricId: string;
  title?: string;
  value?: string | number;
  context?: any;
  className?: string;
  iconSize?: number;
  align?: 'left' | 'right' | 'inline';
}
