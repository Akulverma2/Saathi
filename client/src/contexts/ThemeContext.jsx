import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('saathi_theme') || 'light');
  const [calmMode, setCalmMode] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(() => localStorage.getItem('saathi_low_bw') === 'true');

  useEffect(() => {
    // Determine the actual theme string to apply
    let activeTheme = theme;
    if (calmMode) activeTheme = 'calm';

    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('saathi_theme', theme); // persist base theme
    
    if (lowBandwidth) {
      document.body.classList.add('low-bandwidth');
      localStorage.setItem('saathi_low_bw', 'true');
    } else {
      document.body.classList.remove('low-bandwidth');
      localStorage.setItem('saathi_low_bw', 'false');
    }
  }, [theme, calmMode, lowBandwidth]);

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ 
      theme, toggle, isDark: theme === 'dark',
      calmMode, setCalmMode,
      lowBandwidth, setLowBandwidth
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
