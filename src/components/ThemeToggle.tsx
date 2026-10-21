'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg"
      aria-label={label}
      title={label}
    >
      {theme === 'light' ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
};

export default ThemeToggle;
