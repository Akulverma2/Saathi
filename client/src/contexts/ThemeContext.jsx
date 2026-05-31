import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

// ── 20 Google Font options ──────────────────────────────────────────────────
export const FONT_OPTIONS = [
  { id: 'outfit',        label: 'Outfit',          category: 'Modern',    url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',        stack: "'Outfit', system-ui, sans-serif" },
  { id: 'inter',         label: 'Inter',            category: 'Modern',    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',         stack: "'Inter', system-ui, sans-serif" },
  { id: 'poppins',       label: 'Poppins',          category: 'Rounded',   url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',        stack: "'Poppins', system-ui, sans-serif" },
  { id: 'nunito',        label: 'Nunito',           category: 'Friendly',  url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap',         stack: "'Nunito', system-ui, sans-serif" },
  { id: 'quicksand',     label: 'Quicksand',        category: 'Soft',      url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap',      stack: "'Quicksand', system-ui, sans-serif" },
  { id: 'figtree',       label: 'Figtree',          category: 'Friendly',  url: 'https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&display=swap',        stack: "'Figtree', system-ui, sans-serif" },
  { id: 'dm_sans',       label: 'DM Sans',          category: 'Modern',    url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap',        stack: "'DM Sans', system-ui, sans-serif" },
  { id: 'roboto',        label: 'Roboto',           category: 'Clean',     url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',             stack: "'Roboto', system-ui, sans-serif" },
  { id: 'open_sans',     label: 'Open Sans',        category: 'Readable',  url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap',      stack: "'Open Sans', system-ui, sans-serif" },
  { id: 'lato',          label: 'Lato',             category: 'Clean',     url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap',                  stack: "'Lato', system-ui, sans-serif" },
  { id: 'montserrat',    label: 'Montserrat',       category: 'Bold',      url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',     stack: "'Montserrat', system-ui, sans-serif" },
  { id: 'raleway',       label: 'Raleway',          category: 'Elegant',   url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap',        stack: "'Raleway', system-ui, sans-serif" },
  { id: 'josefin',       label: 'Josefin Sans',     category: 'Geometric', url: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&display=swap',       stack: "'Josefin Sans', system-ui, sans-serif" },
  { id: 'ubuntu',        label: 'Ubuntu',           category: 'Humanist',  url: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap',             stack: "'Ubuntu', system-ui, sans-serif" },
  { id: 'source_sans',   label: 'Source Sans 3',    category: 'Readable',  url: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap',  stack: "'Source Sans 3', system-ui, sans-serif" },
  { id: 'space_grotesk', label: 'Space Grotesk',    category: 'Tech',      url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',  stack: "'Space Grotesk', system-ui, sans-serif" },
  { id: 'sora',          label: 'Sora',             category: 'Tech',      url: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap',           stack: "'Sora', system-ui, sans-serif" },
  { id: 'playfair',      label: 'Playfair Display', category: 'Serif',     url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',   stack: "'Playfair Display', Georgia, serif" },
  { id: 'merriweather',  label: 'Merriweather',     category: 'Serif',     url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap',           stack: "'Merriweather', Georgia, serif" },
  { id: 'lora',          label: 'Lora',             category: 'Serif',     url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',               stack: "'Lora', Georgia, serif" },
];

function injectGoogleFont(url) {
  const id = 'saathi-dynamic-font';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('link');
    el.id = id;
    el.rel = 'stylesheet';
    document.head.appendChild(el);
  }
  el.href = url;
}

export function ThemeProvider({ children }) {
  const [theme,        setTheme]        = useState(() => localStorage.getItem('saathi_theme') || 'light');
  const [customHue,    setCustomHue]    = useState(() => Number(localStorage.getItem('saathi_custom_hue')) || 25);
  const [calmMode,     setCalmMode]     = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(() => localStorage.getItem('saathi_low_bw') === 'true');
  const [fontId,       setFontId]       = useState(() => localStorage.getItem('saathi_font') || 'outfit');

  // ── Apply chosen font globally ─────────────────────────────────────────
  useEffect(() => {
    const font = FONT_OPTIONS.find(f => f.id === fontId) || FONT_OPTIONS[0];
    injectGoogleFont(font.url);
    document.documentElement.style.setProperty('--font-sans', font.stack);
    localStorage.setItem('saathi_font', fontId);
  }, [fontId]);

  // ── Apply theme + hue + bandwidth mode ────────────────────────────────
  useEffect(() => {
    let activeTheme = theme;
    if (calmMode) activeTheme = 'calm';

    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('saathi_theme', theme);

    if (theme === 'customized') {
      const root = document.documentElement;
      root.style.setProperty('--color-primary-50',  `hsl(${customHue}, 45%, 95%)`);
      root.style.setProperty('--color-primary-100', `hsl(${customHue}, 45%, 88%)`);
      root.style.setProperty('--color-primary-200', `hsl(${customHue}, 45%, 78%)`);
      root.style.setProperty('--color-primary-300', `hsl(${customHue}, 45%, 65%)`);
      root.style.setProperty('--color-primary-400', `hsl(${customHue}, 45%, 55%)`);
      root.style.setProperty('--color-primary-500', `hsl(${customHue}, 40%, 45%)`);
      root.style.setProperty('--color-primary-600', `hsl(${customHue}, 40%, 38%)`);
      root.style.setProperty('--color-primary-700', `hsl(${customHue}, 45%, 28%)`);
      root.style.setProperty('--color-primary-800', `hsl(${customHue}, 50%, 18%)`);
      root.style.setProperty('--color-primary-900', `hsl(${customHue}, 50%, 10%)`);
      root.style.setProperty('--shadow-glow',       `0 0 24px hsla(${customHue}, 40%, 45%, 0.35)`);
      root.style.setProperty('--surface-bg',        `hsl(${customHue}, 25%, 97%)`);
      root.style.setProperty('--surface-card',      '#ffffff');
      root.style.setProperty('--surface-elevated',  '#ffffff');
      root.style.setProperty('--text-primary',      `hsl(${customHue}, 50%, 15%)`);
      root.style.setProperty('--text-secondary',    `hsl(${customHue}, 40%, 30%)`);
      root.style.setProperty('--text-muted',        `hsl(${customHue}, 25%, 55%)`);
      root.style.setProperty('--color-neutral-100', `hsla(${customHue}, 40%, 45%, 0.05)`);
      root.style.setProperty('--color-neutral-200', `hsla(${customHue}, 40%, 45%, 0.1)`);
      localStorage.setItem('saathi_custom_hue', customHue);
    } else {
      const root = document.documentElement;
      ['--color-primary-50','--color-primary-100','--color-primary-200','--color-primary-300',
       '--color-primary-400','--color-primary-500','--color-primary-600','--color-primary-700',
       '--color-primary-800','--color-primary-900','--shadow-glow','--surface-bg','--surface-card',
       '--surface-elevated','--text-primary','--text-secondary','--text-muted',
       '--color-neutral-100','--color-neutral-200'].forEach(p => root.style.removeProperty(p));
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
      lowBandwidth, setLowBandwidth,
      fontId, setFontId,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
