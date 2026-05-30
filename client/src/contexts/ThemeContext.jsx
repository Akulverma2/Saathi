import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('saathi_theme') || 'light');
  const [customHue, setCustomHue] = useState(() => Number(localStorage.getItem('saathi_custom_hue')) || 25);
  const [calmMode, setCalmMode] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(() => localStorage.getItem('saathi_low_bw') === 'true');

  useEffect(() => {
    // Determine the actual theme string to apply
    let activeTheme = theme;
    if (calmMode) activeTheme = 'calm';

    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('saathi_theme', theme); // persist base theme
    
    if (theme === 'customized') {
      const root = document.documentElement;
      root.style.setProperty('--color-primary-50', `hsl(${customHue}, 45%, 95%)`);
      root.style.setProperty('--color-primary-100', `hsl(${customHue}, 45%, 88%)`);
      root.style.setProperty('--color-primary-200', `hsl(${customHue}, 45%, 78%)`);
      root.style.setProperty('--color-primary-300', `hsl(${customHue}, 45%, 65%)`);
      root.style.setProperty('--color-primary-400', `hsl(${customHue}, 45%, 55%)`);
      root.style.setProperty('--color-primary-500', `hsl(${customHue}, 40%, 45%)`);
      root.style.setProperty('--color-primary-600', `hsl(${customHue}, 40%, 38%)`);
      root.style.setProperty('--color-primary-700', `hsl(${customHue}, 45%, 28%)`);
      root.style.setProperty('--color-primary-800', `hsl(${customHue}, 50%, 18%)`);
      root.style.setProperty('--color-primary-900', `hsl(${customHue}, 50%, 10%)`);
      root.style.setProperty('--shadow-glow', `0 0 24px hsla(${customHue}, 40%, 45%, 0.35)`);
      
      // Dynamic surfaces and text for seamless hue integration
      root.style.setProperty('--surface-bg', `hsl(${customHue}, 25%, 97%)`);
      root.style.setProperty('--surface-card', '#ffffff');
      root.style.setProperty('--surface-elevated', '#ffffff');
      root.style.setProperty('--text-primary', `hsl(${customHue}, 50%, 15%)`);
      root.style.setProperty('--text-secondary', `hsl(${customHue}, 40%, 30%)`);
      root.style.setProperty('--text-muted', `hsl(${customHue}, 25%, 55%)`);
      root.style.setProperty('--color-neutral-100', `hsla(${customHue}, 40%, 45%, 0.05)`);
      root.style.setProperty('--color-neutral-200', `hsla(${customHue}, 40%, 45%, 0.1)`);
      
      localStorage.setItem('saathi_custom_hue', customHue);
    } else {
      const root = document.documentElement;
      root.style.removeProperty('--color-primary-50');
      root.style.removeProperty('--color-primary-100');
      root.style.removeProperty('--color-primary-200');
      root.style.removeProperty('--color-primary-300');
      root.style.removeProperty('--color-primary-400');
      root.style.removeProperty('--color-primary-500');
      root.style.removeProperty('--color-primary-600');
      root.style.removeProperty('--color-primary-700');
      root.style.removeProperty('--color-primary-800');
      root.style.removeProperty('--color-primary-900');
      root.style.removeProperty('--shadow-glow');
      
      // Clean up dynamic customized properties
      root.style.removeProperty('--surface-bg');
      root.style.removeProperty('--surface-card');
      root.style.removeProperty('--surface-elevated');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--text-muted');
      root.style.removeProperty('--color-neutral-100');
      root.style.removeProperty('--color-neutral-200');
    }

    if (lowBandwidth) {
      document.body.classList.add('low-bandwidth');
      localStorage.setItem('saathi_low_bw', 'true');
    } else {
      document.body.classList.remove('low-bandwidth');
      localStorage.setItem('saathi_low_bw', 'false');
    }
  }, [theme, customHue, calmMode, lowBandwidth]);

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ 
      theme, setTheme, customHue, setCustomHue, toggle, isDark: theme === 'dark',
      calmMode, setCalmMode,
      lowBandwidth, setLowBandwidth
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
