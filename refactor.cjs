const fs = require('fs');
const path = 'c:/Users/NID/OneDrive/Documents/Documents/in/src/InventorySystem.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Sun, Moon to imports
content = content.replace(
  /import \{ (.*?) \} from 'lucide-react';/,
  "import { $1, Sun, Moon } from 'lucide-react';"
);

// 2. Class name replacements
const replacements = [
  { from: /from-slate-950/g, to: 'from-slate-100 dark:from-slate-950' },
  { from: /via-slate-900/g, to: 'via-white dark:via-slate-900' },
  { from: /to-slate-950/g, to: 'to-slate-100 dark:to-slate-950' },
  { from: /text-slate-100/g, to: 'text-slate-900 dark:text-slate-100' },
  { from: /text-slate-300/g, to: 'text-slate-700 dark:text-slate-300' },
  { from: /text-slate-400/g, to: 'text-slate-600 dark:text-slate-400' },
  { from: /text-slate-500/g, to: 'text-slate-500 dark:text-slate-400' },
  { from: /bg-slate-900/g, to: 'bg-white dark:bg-slate-900' },
  { from: /bg-slate-800/g, to: 'bg-slate-50 dark:bg-slate-800' },
  { from: /border-slate-800/g, to: 'border-slate-200 dark:border-slate-800' },
  { from: /border-slate-700/g, to: 'border-slate-200 dark:border-slate-700' },
  { from: /border-slate-600/g, to: 'border-slate-300 dark:border-slate-600' },
  { from: /hover:border-slate-600/g, to: 'hover:border-slate-300 dark:hover:border-slate-600' },
  { from: /hover:bg-slate-800/g, to: 'hover:bg-slate-100 dark:hover:bg-slate-800' },
  { from: /hover:bg-slate-700/g, to: 'hover:bg-slate-200 dark:hover:bg-slate-700' },
  { from: /text-white/g, to: 'text-slate-900 dark:text-white' },
];

replacements.forEach(r => {
  content = content.replace(r.from, r.to);
});

// 3. Add state and effect for dark mode
const stateInjectionPoint = "  const [activeTab, setActiveTab] = useState('dashboard');";
const stateCode = `
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory:darkmode');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('inventory:darkmode', isDarkMode);
  }, [isDarkMode]);
`;
content = content.replace(stateInjectionPoint, stateInjectionPoint + '\n' + stateCode);

// 4. Add Toggle Button UI in header
const headerInjectionPoint = '<div className="flex gap-3">';
const toggleButtonCode = `
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                title="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
`;

content = content.replace(headerInjectionPoint, headerInjectionPoint + '\n' + toggleButtonCode);

fs.writeFileSync(path, content);
console.log('Successfully updated InventorySystem.jsx');
