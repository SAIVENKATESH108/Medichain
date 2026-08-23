import { Bell, Menu, LogIn, Sparkles, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@ninna-ui/primitives';
import { useAppDispatch, useAppSelector, toggleCommandPalette, setActiveModule } from '../../store';
import ThemePaletteSwitcher from './ThemePaletteSwitcher';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const notificationCount = useAppSelector((state) => state.ui.notificationCount);
  const { user, profile } = useAuth();
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  return (
    <header className="sticky top-0 z-30 transition-all duration-300 backdrop-blur-2xl border-b shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Left: Mobile Trigger & Quick Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-cyan-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Quick ⌘K button for fast navigation */}
          <button
            onClick={() => dispatch(toggleCommandPalette())}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-white hover:border-cyan-500/40 transition-all shadow-sm cursor-pointer"
          >
            <Command className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span className="text-xs font-semibold">Search anything in workspace...</span>
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono text-slate-500 dark:text-slate-400 shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Theme Switcher, Quick Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode & Palette Switcher */}
          <ThemePaletteSwitcher />

          {user ? (
            <>
              {/* Organization / Role Chip */}
              <div className="hidden md:flex flex-col text-right mr-1">
                <span className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100">
                  {profile?.organization || 'Apollo Health Network'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {profile?.role || 'Pharmacist'}
                </span>
              </div>

              <button
                onClick={() => {
                  dispatch(setActiveModule('verify'));
                  navigate('/verify');
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold glow-btn-cyan cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verify Medicine</span>
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => {
                  dispatch(setActiveModule('review-queue'));
                  navigate('/review-queue');
                }}
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Review Queue Notifications"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-900 shadow-sm"
                  />
                )}
              </button>

              {/* User Avatar */}
              <button
                onClick={() => {
                  dispatch(setActiveModule('settings'));
                  navigate('/settings');
                }}
                className="transition-transform hover:scale-105 focus:outline-none ring-2 ring-cyan-500/40 rounded-full p-0.5 cursor-pointer flex-shrink-0"
                aria-label="User Settings"
                title={profile?.full_name || user.email || 'User Settings'}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-950 flex items-center justify-center shadow-xs">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.full_name || user.email || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                      {(profile?.full_name || user.email || 'U').charAt(0)}
                    </div>
                  )}
                </div>
              </button>
            </>
          ) : (
            <Button
              variant="solid"
              color="primary"
              size="sm"
              onClick={() => navigate('/login')}
              leftIcon={<LogIn className="w-3.5 h-3.5" />}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
