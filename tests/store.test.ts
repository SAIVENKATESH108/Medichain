import { describe, it, expect } from 'vitest';
import {
  store,
  setActiveModule,
  toggleCommandPalette,
  setCommandPaletteOpen,
  toggleSidebar,
  setColorMode,
  toggleColorMode,
  setPalette,
  decrementNotificationCount,
} from '../src/store';

describe('Redux Enterprise Navigation & UI State Management', () => {
  it('initializes with default state', () => {
    const state = store.getState();
    expect(state.navigation.activeModule).toBe('dashboard');
    expect(state.navigation.commandPaletteOpen).toBe(false);
    expect(state.ui.notificationCount).toBe(3);
    expect(['dark', 'light']).toContain(state.ui.colorMode);
  });

  it('updates activeModule and breadcrumbs correctly', () => {
    store.dispatch(setActiveModule('quarantine-vault'));
    let state = store.getState();
    expect(state.navigation.activeModule).toBe('quarantine-vault');
    expect(state.navigation.breadcrumbs).toEqual([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Quarantine & Batch Vault', isCurrent: true },
    ]);

    store.dispatch(setActiveModule('cdsco-hub'));
    state = store.getState();
    expect(state.navigation.activeModule).toBe('cdsco-hub');
    expect(state.navigation.breadcrumbs).toEqual([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Quarantine & Batch Vault', path: '/quarantine-vault' },
      { label: 'CDSCO & Global Registry Hub', isCurrent: true },
    ]);
  });

  it('handles command palette toggling', () => {
    store.dispatch(setCommandPaletteOpen(true));
    expect(store.getState().navigation.commandPaletteOpen).toBe(true);

    store.dispatch(toggleCommandPalette());
    expect(store.getState().navigation.commandPaletteOpen).toBe(false);
  });

  it('handles light and dark color mode and palette toggles', () => {
    store.dispatch(setColorMode('light'));
    expect(store.getState().ui.colorMode).toBe('light');

    store.dispatch(toggleColorMode());
    expect(store.getState().ui.colorMode).toBe('dark');

    store.dispatch(setPalette('emerald'));
    expect(store.getState().ui.palette).toBe('emerald');

    store.dispatch(setPalette('indigo'));
    expect(store.getState().ui.palette).toBe('indigo');
  });

  it('toggles sidebar and updates notification counts', () => {
    const prevCollapsed = store.getState().navigation.sidebarCollapsed;
    store.dispatch(toggleSidebar());
    expect(store.getState().navigation.sidebarCollapsed).toBe(!prevCollapsed);

    store.dispatch(decrementNotificationCount());
    expect(store.getState().ui.notificationCount).toBe(2);
  });
});
