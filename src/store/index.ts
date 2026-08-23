import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

export type NavigationModule =
  | 'verify'
  | 'dashboard'
  | 'review-queue'
  | 'quarantine-vault'
  | 'ledger-explorer'
  | 'cdsco-hub'
  | 'radar-scanner'
  | 'telemetry-lab'
  | 'assistant'
  | 'reports'
  | 'settings';

export type ColorMode = 'dark' | 'light';
export type ColorPalette = 'cyan' | 'emerald' | 'indigo' | 'amber' | 'rose';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isCurrent?: boolean;
}

export const MODULE_TITLES: Record<string, string> = {
  verify: 'Verify Medicine',
  dashboard: 'Supply Chain Analytics',
  'review-queue': 'Regulatory Review Queue',
  'quarantine-vault': 'Quarantine & Batch Vault',
  'ledger-explorer': 'SHA-256 Ledger Explorer',
  'cdsco-hub': 'CDSCO & Global Registry Hub',
  'radar-scanner': 'Global Risk Radar',
  'telemetry-lab': 'AI Telemetry & Model Lab',
  assistant: 'Safety Assistant',
  reports: 'Audit Records',
  settings: 'Organization Settings',
  profile: 'User Profile & Security',
};

interface NavigationState {
  activeModule: NavigationModule;
  activeSubTab: string;
  previousModule: NavigationModule | null;
  breadcrumbs: BreadcrumbItem[];
  commandPaletteOpen: boolean;
  sidebarCollapsed: boolean;
  searchQuery: string;
}

const initialNavigationState: NavigationState = {
  activeModule: 'dashboard',
  activeSubTab: 'default',
  previousModule: null,
  breadcrumbs: [
    { label: 'Dashboard', path: '/dashboard', isCurrent: true },
  ],
  commandPaletteOpen: false,
  sidebarCollapsed: false,
  searchQuery: '',
};

export const navigationSlice = createSlice({
  name: 'navigation',
  initialState: initialNavigationState,
  reducers: {
    setActiveModule: (state, action: PayloadAction<NavigationModule>) => {
      const newModule = action.payload;
      if (state.activeModule !== newModule) {
        state.previousModule = state.activeModule;
      }
      state.activeModule = newModule;
      state.activeSubTab = 'default';

      const currentTitle = MODULE_TITLES[newModule] || 'Module';
      const prevTitle = state.previousModule ? MODULE_TITLES[state.previousModule] : 'Supply Chain Analytics';
      const prevPath = state.previousModule ? `/${state.previousModule}` : '/dashboard';

      if (newModule === 'dashboard') {
        state.breadcrumbs = [
          { label: 'Dashboard', path: '/dashboard', isCurrent: true },
        ];
      } else {
        state.breadcrumbs = [
          { label: 'Dashboard', path: '/dashboard' },
          ...(state.previousModule && state.previousModule !== newModule && state.previousModule !== 'dashboard'
            ? [{ label: prevTitle, path: prevPath }]
            : []),
          { label: currentTitle, isCurrent: true },
        ];
      }
    },
    setActiveSubTab: (state, action: PayloadAction<string>) => {
      state.activeSubTab = action.payload;
    },
    toggleCommandPalette: (state) => {
      state.commandPaletteOpen = !state.commandPaletteOpen;
    },
    setCommandPaletteOpen: (state, action: PayloadAction<boolean>) => {
      state.commandPaletteOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setGlobalSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
  },
});

interface UiState {
  colorMode: ColorMode;
  palette: ColorPalette;
  theme: string;
  activeInspectorModal: any | null;
  liveLedgerStreamActive: boolean;
  notificationCount: number;
}

const savedMode = (typeof window !== 'undefined' && localStorage.getItem('medichain_mode') as ColorMode) || 'dark';
const savedPalette = (typeof window !== 'undefined' && localStorage.getItem('medichain_palette') as ColorPalette) || 'cyan';

const initialUiState: UiState = {
  colorMode: savedMode,
  palette: savedPalette,
  theme: 'ocean',
  activeInspectorModal: null,
  liveLedgerStreamActive: true,
  notificationCount: 3,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUiState,
  reducers: {
    setColorMode: (state, action: PayloadAction<ColorMode>) => {
      state.colorMode = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('medichain_mode', action.payload);
      }
    },
    toggleColorMode: (state) => {
      const next = state.colorMode === 'dark' ? 'light' : 'dark';
      state.colorMode = next;
      if (typeof window !== 'undefined') {
        localStorage.setItem('medichain_mode', next);
      }
    },
    setPalette: (state, action: PayloadAction<ColorPalette>) => {
      state.palette = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('medichain_palette', action.payload);
      }
    },
    setTheme: (state, action: PayloadAction<string>) => {
      state.theme = action.payload;
    },
    openInspectorModal: (state, action: PayloadAction<any>) => {
      state.activeInspectorModal = action.payload;
    },
    closeInspectorModal: (state) => {
      state.activeInspectorModal = null;
    },
    toggleLiveLedgerStream: (state) => {
      state.liveLedgerStreamActive = !state.liveLedgerStreamActive;
    },
    decrementNotificationCount: (state) => {
      if (state.notificationCount > 0) state.notificationCount -= 1;
    },
  },
});

export const store = configureStore({
  reducer: {
    navigation: navigationSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const {
  setActiveModule,
  setActiveSubTab,
  toggleCommandPalette,
  setCommandPaletteOpen,
  toggleSidebar,
  setSidebarCollapsed,
  setGlobalSearchQuery,
} = navigationSlice.actions;

export const {
  setColorMode,
  toggleColorMode,
  setPalette,
  setTheme,
  openInspectorModal,
  closeInspectorModal,
  toggleLiveLedgerStream,
  decrementNotificationCount,
} = uiSlice.actions;
