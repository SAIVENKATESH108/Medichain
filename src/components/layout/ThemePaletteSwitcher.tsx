import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Palette, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector, setColorMode, setPalette, type ColorPalette } from '../../store';

const PALETTES: { id: ColorPalette; name: string; hex: string; bgClass: string; borderClass: string }[] = [
  { id: 'cyan', name: 'Cyber Cyan', hex: '#06b6d4', bgClass: 'bg-cyan-500', borderClass: 'border-cyan-400' },
  { id: 'emerald', name: 'Emerald Matrix', hex: '#10b981', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-400' },
  { id: 'indigo', name: 'Cyber Indigo', hex: '#6366f1', bgClass: 'bg-indigo-500', borderClass: 'border-indigo-400' },
  { id: 'amber', name: 'Amber Solar', hex: '#f59e0b', bgClass: 'bg-amber-500', borderClass: 'border-amber-400' },
  { id: 'rose', name: 'Crimson Rose', hex: '#f43f5e', bgClass: 'bg-rose-500', borderClass: 'border-rose-400' },
];

export default function ThemePaletteSwitcher() {
  const dispatch = useAppDispatch();
  const colorMode = useAppSelector((state) => state.ui.colorMode);
  const currentPalette = useAppSelector((state) => state.ui.palette);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync with DOM
  useEffect(() => {
    const root = document.documentElement;
    if (colorMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    root.setAttribute('data-mode', colorMode);
    root.setAttribute('data-palette', currentPalette);
  }, [colorMode, currentPalette]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleThemeMode = () => {
    dispatch(setColorMode(colorMode === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="relative flex items-center gap-1.5" ref={menuRef}>
      {/* Direct 1-Click Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleThemeMode}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
        title={colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle Theme Mode"
      >
        <AnimatePresence mode="wait" initial={false}>
          {colorMode === 'dark' ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5"
            >
              <Moon className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold hidden md:inline-block">Dark</span>
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5"
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold hidden md:inline-block">Light</span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Palette Picker Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center p-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-xs active:scale-95"
        title="Customize Color Palette"
        aria-label="Customize Color Palette"
      >
        <span
          className={`w-3 h-3 rounded-full ${PALETTES.find((p) => p.id === currentPalette)?.bgClass || 'bg-cyan-500'} ring-1 ring-white/20 shadow-xs`}
        />
      </button>

      {/* Palette Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-64 p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/15 shadow-2xl z-50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-cyan-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                Color Theme
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
                {currentPalette}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    dispatch(setPalette(p.id));
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPalette === p.id
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-cyan-500/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3.5 h-3.5 rounded-full ${p.bgClass} shadow-xs ring-1 ring-white/20`} />
                    <span>{p.name}</span>
                  </div>
                  {currentPalette === p.id && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
