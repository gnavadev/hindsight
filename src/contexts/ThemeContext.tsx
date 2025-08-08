import React, { createContext, useContext, useState } from 'react';
import { OSRSStyle } from '../themes/OsrsTheme';

export type Theme = 'default' | 'osrs';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('default');

  const toggleTheme = () => {
    const newTheme = theme === 'default' ? 'osrs' : 'default';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {theme === 'osrs' && <OSRSStyle />}
      {children}
    </ThemeContext.Provider>
  );
};

// Add this hook export
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};