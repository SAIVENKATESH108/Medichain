import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ChevronRight, LayoutDashboard, Shield } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import CommandPalette from './CommandPalette';
import { useAppDispatch, useAppSelector, setActiveModule, type NavigationModule } from '../../store';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const dispatch = useAppDispatch();
  const breadcrumbs = useAppSelector((state) => state.navigation.breadcrumbs);
  const activeModule = useAppSelector((state) => state.navigation.activeModule);
  const colorMode = useAppSelector((state) => state.ui.colorMode);

  // Sync Redux activeModule with URL route
  useEffect(() => {
    const path = location.pathname.replace('/', '') as NavigationModule;
    if (path) {
      dispatch(setActiveModule(path));
    }
  }, [location.pathname, dispatch]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  return (
    <div className={`flex min-h-screen bg-cyber-dark selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-300 ${colorMode === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
      <CommandPalette />
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[270px]'}`}>
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 min-h-[calc(100vh-4rem)] p-3 sm:p-6 space-y-6">
          {/* Main Section Dynamic Breadcrumb Trail */}
          <div className="max-w-7xl mx-auto flex items-center justify-between py-2 px-1">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold flex-wrap">
              {breadcrumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  {crumb.path && !crumb.isCurrent ? (
                    <Link
                      to={crumb.path}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-cyan-500 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      {idx === 0 && <LayoutDashboard className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
                      <span>{crumb.label}</span>
                    </Link>
                  ) : (
                    <span className="glow-pill-cyan px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      {idx === 0 && <LayoutDashboard className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />}
                      <span>{crumb.label}</span>
                    </span>
                  )}
                </div>
              ))}
            </nav>

            <div className="hidden sm:flex items-center gap-2">
              <span className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 px-2.5 py-0.5 rounded-md text-[10px] font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                Module: <span className="font-bold text-cyan-600 dark:text-cyan-300 uppercase">{activeModule}</span>
              </span>
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
