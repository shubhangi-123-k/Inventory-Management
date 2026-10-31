import React, { createContext, useContext, useState, useEffect } from 'react';

const StockViewContext = createContext();

export const STOCK_VIEWS = {
  GOVERNMENT: 'GOVERNMENT',
  PHYSICAL: 'PHYSICAL',
  CONSOLIDATED_GAP: 'CONSOLIDATED_GAP'
};

export const StockViewProvider = ({ children }) => {
  const [stockView, setStockView] = useState(() => {
    return localStorage.getItem('inventory_stock_view') || STOCK_VIEWS.CONSOLIDATED_GAP;
  });

  const changeStockView = (newView) => {
    setStockView(newView);
    localStorage.setItem('inventory_stock_view', newView);
  };

  return (
    <StockViewContext.Provider value={{ stockView, setStockView: changeStockView, STOCK_VIEWS }}>
      {children}
    </StockViewContext.Provider>
  );
};

export const useStockView = () => {
  const context = useContext(StockViewContext);
  if (!context) {
    throw new Error('useStockView must be used within a StockViewProvider');
  }
  return context;
};
