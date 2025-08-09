import React, { createContext, useContext, useState } from 'react';
import { OsrsTheme } from '../themes';

export type Theme = 'default' | 'osrs';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('osrs');

  const toggleTheme = () => {
    const newTheme = theme === 'osrs' ? 'default' : 'osrs';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {theme === 'osrs' && <OsrsTheme />}
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