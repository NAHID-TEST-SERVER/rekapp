import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  headerColor: string;
  headerTextColor: string;
  buttonColor: string;
  buttonTextColor: string;
  cardColor: string;
  cardTextColor: string;
  backgroundColor: string;
  sectionBackgroundColor: string;
  borderColor: string;
  titleColor: string;
  subtitleColor: string;
  linkColor: string;
  iconColor: string;
  tableHeaderColor: string;
  tableRowColor: string;
  inputBackgroundColor: string;
  inputTextColor: string;
  sidebarColor: string;
  sidebarTextColor: string;
  buttonRadius: string;
  cardRadius: string;
  shadow: boolean;
  borderThickness: string;
  fontSizePreset: string;
  spacing: string;
  stylePreset: string;
  sectionGap: string;
  containerWidth: string;
  hoverEffect: string;
  headerStyle: string;
  cardStyle: string;
  tableStyle: string;
  navbarLogoUrl: string;
}

export const defaultTheme: ThemeSettings = {
  primaryColor: '#ff4e00',
  secondaryColor: '#3a1510',
  headerColor: '#ffffff',
  headerTextColor: '#000000',
  buttonColor: '#ff4e00',
  buttonTextColor: '#ffffff',
  cardColor: '#ffffff',
  cardTextColor: '#000000',
  backgroundColor: '#f5f5f5',
  sectionBackgroundColor: '#ffffff',
  borderColor: '#e5e5e5',
  titleColor: '#000000',
  subtitleColor: '#666666',
  linkColor: '#ff4e00',
  iconColor: '#000000',
  tableHeaderColor: '#f9fafb',
  tableRowColor: '#ffffff',
  inputBackgroundColor: '#ffffff',
  inputTextColor: '#000000',
  sidebarColor: '#ffffff',
  sidebarTextColor: '#000000',
  buttonRadius: '8px',
  cardRadius: '12px',
  shadow: true,
  borderThickness: '1px',
  fontSizePreset: 'medium',
  spacing: 'normal',
  stylePreset: 'light',
  sectionGap: '24px',
  containerWidth: 'max-w-7xl',
  hoverEffect: 'medium',
  headerStyle: 'standard',
  cardStyle: 'standard',
  tableStyle: 'standard',
  navbarLogoUrl: '',
};

interface ThemeContextType {
  theme: ThemeSettings;
  setTheme: (theme: ThemeSettings) => void;
  saveTheme: (theme: ThemeSettings) => Promise<void>;
  resetTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  saveTheme: async () => {},
  resetTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeSettings>(defaultTheme);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'theme'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as ThemeSettings;
        setThemeState({ ...defaultTheme, ...data });
        applyTheme(data);
      } else {
        applyTheme(defaultTheme);
      }
    }, (error) => {
      console.error("Theme Firestore error:", error);
      applyTheme(defaultTheme);
    });

    return unsubscribe;
  }, []);

  const applyTheme = (themeData: ThemeSettings) => {
    const root = document.documentElement;
    Object.entries(themeData).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
      }
    });
  };

  const saveTheme = async (themeData: ThemeSettings) => {
    await setDoc(doc(db, 'settings', 'theme'), themeData);
    setThemeState(themeData);
    applyTheme(themeData);
  };

  const resetTheme = async () => {
    await setDoc(doc(db, 'settings', 'theme'), defaultTheme);
    setThemeState(defaultTheme);
    applyTheme(defaultTheme);
  };

  const contextValue = useMemo(() => ({ theme, setTheme: setThemeState, saveTheme, resetTheme }), [theme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
