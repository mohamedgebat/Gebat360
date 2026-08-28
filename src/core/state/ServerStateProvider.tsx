/**
 * GEBAT 360° ERP — Server State Management & Cache Invalidation
 * Gestionnaire de données d'arrière-plan (Server State) avec cache, refetching, invalidation et optimistic updates
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsApi, wbsApi, purchasesApi, stockApi, auditApi } from '../../services/api';
import { Project, WBSNode, PurchaseRequest, StockItem, AuditLog } from '../../types';
import { INITIAL_PROJECTS, INITIAL_WBS, INITIAL_STOCK_ITEMS, INITIAL_PURCHASE_REQUESTS, INITIAL_AUDIT_LOGS } from '../database/initialData';

interface ServerStateContextType {
  // Data Cache
  projects: Project[];
  wbsMap: Record<string, WBSNode[]>;
  purchaseRequests: PurchaseRequest[];
  stockItems: StockItem[];
  auditLogs: AuditLog[];

  // Cache Controls & Invalidation
  isLoading: boolean;
  isRefetching: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;
  invalidateQuery: (queryKey: 'projects' | 'wbs' | 'purchases' | 'stock' | 'audit') => Promise<void>;

  // Optimistic Mutations
  createProjectOptimistic: (project: Omit<Project, 'id'>) => Promise<void>;
  createDaOptimistic: (daData: any) => Promise<void>;
}

const ServerStateContext = createContext<ServerStateContextType | undefined>(undefined);

export const ServerStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [wbsMap, setWbsMap] = useState<Record<string, WBSNode[]>>(INITIAL_WBS);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(INITIAL_PURCHASE_REQUESTS);
  const [stockItems, setStockItems] = useState<StockItem[]>(INITIAL_STOCK_ITEMS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronisation avec l'API Backend REST
  const fetchServerState = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefetching(true);

    try {
      setError(null);
      const [pData, daData, stData, auData] = await Promise.all([
        projectsApi.getAll().catch(() => INITIAL_PROJECTS),
        purchasesApi.getRequests().catch(() => INITIAL_PURCHASE_REQUESTS),
        stockApi.getItems().catch(() => INITIAL_STOCK_ITEMS),
        auditApi.getLogs().catch(() => INITIAL_AUDIT_LOGS),
      ]);

      if (Array.isArray(pData) && pData.length > 0) setProjects(pData);
      if (Array.isArray(daData) && daData.length > 0) setPurchaseRequests(daData);
      if (Array.isArray(stData) && stData.length > 0) setStockItems(stData);
      if (Array.isArray(auData) && auData.length > 0) setAuditLogs(auData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données serveur API');
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, []);

  useEffect(() => {
    fetchServerState();
  }, [fetchServerState]);

  const invalidateQuery = async (queryKey: 'projects' | 'wbs' | 'purchases' | 'stock' | 'audit') => {
    await fetchServerState(true);
  };

  const createProjectOptimistic = async (newProject: Omit<Project, 'id'>) => {
    const tempId = `PRJ-TEMP-${Date.now()}`;
    const optimisticProj: Project = { ...newProject, id: tempId } as Project;

    // Optimistic UI Update
    setProjects(prev => [optimisticProj, ...prev]);

    try {
      await projectsApi.create(optimisticProj);
      await invalidateQuery('projects');
    } catch (err) {
      // Rollback on error
      setProjects(prev => prev.filter(p => p.id !== tempId));
      throw err;
    }
  };

  const createDaOptimistic = async (daData: any) => {
    const tempId = `DA-TEMP-${Date.now()}`;
    const optimisticDa: PurchaseRequest = { ...daData, id: tempId };

    setPurchaseRequests(prev => [optimisticDa, ...prev]);

    try {
      await purchasesApi.createRequest(optimisticDa);
      await invalidateQuery('purchases');
    } catch (err) {
      setPurchaseRequests(prev => prev.filter(d => d.id !== tempId));
      throw err;
    }
  };

  return (
    <ServerStateContext.Provider
      value={{
        projects,
        wbsMap,
        purchaseRequests,
        stockItems,
        auditLogs,
        isLoading,
        isRefetching,
        error,
        refetchAll: () => fetchServerState(false),
        invalidateQuery,
        createProjectOptimistic,
        createDaOptimistic,
      }}
    >
      {children}
    </ServerStateContext.Provider>
  );
};

export function useServerState() {
  const context = useContext(ServerStateContext);
  if (!context) throw new Error('useServerState doit être utilisé dans un ServerStateProvider');
  return context;
}
