import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { format } from 'date-fns';

interface TemporalContextType {
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
}

const TemporalContext = createContext<TemporalContextType | undefined>(undefined);

export const TemporalProvider = ({ children }: { children: ReactNode }) => {
  // Always start with current month on fresh page load.
  // Use sessionStorage to persist selection within the same browser session
  // (navigating between pages keeps the month), but resets when opening new tab/window.
  const [selectedMonth, setSelectedMonthState] = useState(() => {
    const saved = sessionStorage.getItem('global_selected_month');
    return saved || format(new Date(), 'yyyy-MM');
  });

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month);
    sessionStorage.setItem('global_selected_month', month);
  };

  useEffect(() => {
    // Clean up old localStorage value (migration from previous behavior)
    localStorage.removeItem('global_selected_month');
  }, []);

  return (
    <TemporalContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </TemporalContext.Provider>
  );
};

export const useTemporalContext = () => {
  const context = useContext(TemporalContext);
  if (context === undefined) {
    throw new Error('useTemporalContext must be used within a TemporalProvider');
  }
  return context;
};
