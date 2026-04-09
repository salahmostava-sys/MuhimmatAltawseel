import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { format } from 'date-fns';

interface TemporalContextType {
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
}

const TemporalContext = createContext<TemporalContextType | undefined>(undefined);

export const TemporalProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage if available, otherwise current month
  const [selectedMonth, setSelectedMonthState] = useState(() => {
    const saved = localStorage.getItem('global_selected_month');
    return saved || format(new Date(), 'yyyy-MM');
  });

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month);
    localStorage.setItem('global_selected_month', month);
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'global_selected_month' && e.newValue) {
        setSelectedMonthState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
