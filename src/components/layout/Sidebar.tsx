import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, BarChart3, MessageSquare, FileText, Settings, Shield,
  ChevronLeft, LogOut, FileCheck, Lock, Globe,
  BookOpen, ShieldAlert, Cpu, Command, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '@ninna-ui/primitives';
import { useAppDispatch, useAppSelector, setActiveModule, type NavigationModule, toggleCommandPalette } from '../../store';

interface NavItem {
  key: NavigationModule;
  path: string;
  label: string;
  icon: typeof Search;
  colorClass: string;
  badge?: string | null;
  badgeColor?: 'primary' | 'danger' | 'warning' | 'success' | 'neutral';
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    title: 'Analytics & Intelligence',
    items: [
      { key: 'dashboard', path: '/dashboard', label: 'Analytics Dashboard', icon: BarChart3, colorClass: 'text-emerald-400 group-hover:text-emerald-300', badge: 'Live', badgeColor: 'success' },
      { key: 'radar-scanner', path: '/radar-scanner', label: 'Threat Radar', icon: Globe, colorClass: 'text-blue-400 group-hover:text-blue-300' },
      { key: 'telemetry-lab', path: '/telemetry-lab', label: 'AI Telemetry Lab', icon: Cpu, colorClass: 'text-violet-400 group-hover:text-violet-300' },
    ],
  },
  {
    title: 'Verification & Review',
    items: [
      { key: 'verify', path: '/verify', label: 'Verify Medicine', icon: Search, colorClass: 'text-cyan-400 group-hover:text-cyan-300', badge: 'AI Engine', badgeColor: 'primary' },
      { key: 'review-queue', path: '/review-queue', label: 'Review Queue', icon: FileCheck, colorClass: 'text-amber-400 group-hover:text-amber-300', badge: 'Drafts', badgeColor: 'warning' },
      { key: 'quarantine-vault', path: '/quarantine-vault', label: 'Quarantine Vault', icon: ShieldAlert, colorClass: 'text-rose-400 group-hover:text-rose-300', badge: 'Lots', badgeColor: 'danger' },
    ],
  },
  {
    title: 'Compliance & Ledger',
    items: [
      { key: 'cdsco-hub', path: '/cdsco-hub', label: 'CDSCO Rules & Registry', icon: BookOpen, colorClass: 'text-indigo-400 group-hover:text-indigo-300' },
      { key: 'ledger-explorer', path: '/ledger-explorer', label: 'SHA-256 Ledger', icon: Lock, colorClass: 'text-teal-400 group-hover:text-teal-300', badge: 'Chain', badgeColor: 'neutral' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { key: 'assistant', path: '/assistant', label: 'Safety Assistant', icon: MessageSquare, colorClass: 'text-sky-400 group-hover:text-sky-300' },
      { key: 'reports', path: '/reports', label: 'Audit Records', icon: FileText, colorClass: 'text-lime-400 group-hover:text-lime-300' },
      { key: 'settings', path: '/settings', label: 'Settings & Orgs', icon: Settings, colorClass: 'text-slate-400 group-hover:text-slate-200' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const activeModule = useAppSelector((state) => state.navigation.activeModule);
  const { user, profile, signOut } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<NavItem | null>(null);

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const displayName = fullName || user?.email?.split('@')[0] || 'Enterprise Operator';
  const displayRole = profile?.role || 'Pharmacist';

  // Global Keyboard Shortcut: Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);

  const handleNavigate = (key: NavigationModule, path: string) => {
    dispatch(setActiveModule(key));
    navigate(path);
    onMobileClose();
  };

  const sidebarContent = (
    <div
      className={`sidebar-container flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 transition-all duration-300 relative select-none ${
        collapsed ? 'w-[72px]' : 'w-[270px]'
      }`}
    >
      {/* ─── Sidebar Header ─── */}
      <div className={`flex items-center justify-between px-3.5 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/40 ${collapsed ? 'justify-center' : ''}`}>
        <div
          onClick={() => handleNavigate('dashboard', '/dashboard')}
          className="flex items-center gap-3 min-w-0 cursor-pointer group"
          title="MediChain Verify Dashboard"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform ring-2 ring-cyan-400/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-black text-base tracking-tight text-slate-900 dark:text-white block truncate">
                MediChain <span className="text-cyan-600 dark:text-cyan-400">Verify</span>
              </span>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Enterprise Suite</p>
            </div>
          )}
        </div>

        {/* Header Trigger Button (expanded mode) */}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Collapse Sidebar (Ctrl+B)"
            aria-label="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─── Quick Search Command Trigger (expanded) ─── */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <button
            onClick={() => dispatch(toggleCommandPalette())}
            className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
          >
            <span className="flex items-center gap-2 font-medium">
              <Command className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              <span>Quick Navigation</span>
            </span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono text-slate-500 dark:text-slate-400 shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ─── Sidebar Content / Navigation Items ─── */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto overflow-x-hidden">
        {navCategories.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                {cat.title}
              </p>
            )}

            {cat.items.map((item) => {
              const isActive = location.pathname === item.path || activeModule === item.key;
              return (
                <div
                  key={item.key}
                  className="relative"
                  onMouseEnter={() => collapsed && setHoveredItem(item)}
                  onMouseLeave={() => collapsed && setHoveredItem(null)}
                >
                  <button
                    onClick={() => handleNavigate(item.key, item.path)}
                    className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group text-left cursor-pointer ${
                      collapsed ? 'justify-center py-3' : ''
                    } ${
                      isActive
                        ? 'nav-item-active bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                        : 'nav-item-inactive text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Active glowing indicator bar */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActiveIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-cyan-500 rounded-r-full shadow-sm shadow-cyan-400"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}

                    {/* Navigation Icon - BIGGER (w-6 h-6) with distinct vibrant color in collapsed state */}
                    <div
                      className={`flex items-center justify-center transition-all ${
                        collapsed ? 'scale-110' : ''
                      }`}
                    >
                      <item.icon
                        className={`transition-all duration-200 ${
                          collapsed ? 'w-6 h-6' : 'w-5 h-5'
                        } ${
                          isActive
                            ? 'text-cyan-600 dark:text-cyan-300 drop-shadow-sm'
                            : item.colorClass
                        }`}
                      />
                    </div>

                    {/* Label & Badge (hidden when collapsed) */}
                    {!collapsed && (
                      <div className="flex items-center justify-between w-full min-w-0">
                        <span className="text-xs font-semibold truncate">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant={isActive ? 'solid' : 'soft'}
                            color={item.badgeColor || 'neutral'}
                            size="sm"
                            className="text-[9px] px-1.5 py-0 font-bold"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Floating Hover Tooltip in Collapsed Mode */}
                  {collapsed && hoveredItem?.key === item.key && (
                    <motion.div
                      initial={{ opacity: 0, x: 8, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 8, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-[78px] top-1/2 -translate-y-1/2 z-50 px-3 py-2 rounded-xl bg-slate-900/95 dark:bg-slate-900/95 text-white text-xs font-bold whitespace-nowrap shadow-2xl border border-white/15 backdrop-blur-xl flex items-center gap-2 pointer-events-none"
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ─── Sidebar Footer ─── */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/40 space-y-2">
        {/* User Semi-Rounded Profile Card */}
        {user ? (
          <div
            onClick={() => handleNavigate('settings', '/settings')}
            className={`rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 hover:border-cyan-500/40 transition-all cursor-pointer shadow-xs ${
              collapsed ? 'p-2 flex justify-center' : 'p-2.5'
            }`}
            title={`Logged in as ${displayName}`}
          >
            <div className="flex items-center gap-2.5">
              {/* Perfectly Rounded Full Avatar with Sleek Cyan Ring */}
              <div className="relative w-9 h-9 rounded-full ring-2 ring-cyan-500/50 p-0.5 flex-shrink-0 bg-slate-950 shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                    {displayName.charAt(0)}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-xs" />
              </div>

              {/* Profile Details (hidden when collapsed) */}
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                    <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">{displayRole}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      signOut();
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* Collapse Toggle Trigger Button */}
        <button
          onClick={onToggle}
          className={`hidden lg:flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer shadow-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50 ${
            collapsed ? 'px-0' : 'px-3'
          }`}
          title={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-cyan-500" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-cyan-500" />
              <span>Collapse Sidebar</span>
              <kbd className="ml-auto px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono text-slate-400">
                ⌘B
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* ─── Sidebar Rail (Clickable Edge) ─── */}
      <button
        onClick={onToggle}
        className="hidden lg:block absolute -right-1 top-0 bottom-0 w-2 hover:w-3 bg-transparent hover:bg-cyan-500/30 transition-all cursor-col-resize z-30"
        title="Toggle Sidebar Rail"
        aria-label="Toggle Sidebar Rail"
      />
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile slide-over drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[270px]"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
