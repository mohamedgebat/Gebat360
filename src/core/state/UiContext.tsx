/**
 * GEBAT 360° ERP — UI State Context
 * Gestion dédiée de l'interface utilisateur : Thème, Sidebar, Modales et Filtres temporaires
 */

import React, { createContext, useContext, useState } from 'react';

interface UiContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

const UiContext = createContext<UiContextType | undefined>(undefined);

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('CIV-2026-ST-BING-001');

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);
  const openModal = (modalId: string) => setActiveModal(modalId);
  const closeModal = () => setActiveModal(null);

  return (
    <UiContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        activeModal,
        openModal,
        closeModal,
        selectedProjectId,
        setSelectedProjectId,
      }}
    >
      {children}
    </UiContext.Provider>
  );
};

export function useUi() {
  const context = useContext(UiContext);
  if (!context) throw new Error('useUi doit être utilisé dans un UiProvider');
  return context;
}
