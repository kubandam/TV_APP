import React, { createContext, useContext, ReactNode } from 'react';
import { usePersistentTVConnection } from './usePersistentTVConnection';

// Create the context
const TVConnectionContext = createContext<ReturnType<typeof usePersistentTVConnection> | null>(null);

// Provider component
export function TVConnectionProvider({ children }: { children: ReactNode }) {
  const connection = usePersistentTVConnection();
  
  return (
    <TVConnectionContext.Provider value={connection}>
      {children}
    </TVConnectionContext.Provider>
  );
}

// Hook to use the connection
export function useTVConnection() {
  const context = useContext(TVConnectionContext);
  if (!context) {
    throw new Error('useTVConnection must be used within a TVConnectionProvider');
  }
  return context;
}
