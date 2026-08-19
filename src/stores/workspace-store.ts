import { create } from 'zustand';

export type ViewType = 'day' | 'command' | 'board' | 'issues' | 'cycles' | 'analytics';
export type UserScope = 'my_tasks' | 'all';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

const LAST_ACTIVE_PROJECT_KEY = 'workspace:lastActiveProject';

function readLastActiveProject(): { id: string; key: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVE_PROJECT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLastActiveProject(id: string | null, key: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      window.localStorage.setItem(LAST_ACTIVE_PROJECT_KEY, JSON.stringify({ id, key }));
    } else {
      window.localStorage.removeItem(LAST_ACTIVE_PROJECT_KEY);
    }
  } catch {
    // ignore storage errors (e.g. private browsing / storage disabled)
  }
}

interface WorkspaceState {
  /** Currently active project UUID */
  activeProjectId: string | null;
  /** Currently active project identifier key (e.g. a Plane project's short code) */
  activeProjectKey: string | null;
  /** Desktop sidebar expanded state */
  sidebarOpen: boolean;
  /** ⌘K command palette visibility */
  commandPaletteOpen: boolean;
  /** Selected issue UUID for detail panel */
  selectedIssueId: string | null;
  /** Current active view in main content area */
  activeView: ViewType;
  /** Color theme */
  theme: 'dark' | 'light';
  /** User filtering scope - defaults to 'my_tasks' */
  userScope: UserScope;
  /** Authenticated User Profile, resolved from Plane's /users/me/ on app load. Null until resolved. */
  currentUser: UserProfile | null;

  // Actions
  setActiveProject: (id: string | null, key?: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setSelectedIssue: (id: string | null) => void;
  setActiveView: (view: ViewType) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setUserScope: (scope: UserScope) => void;
  setCurrentUser: (user: UserProfile | null) => void;
}

const lastActiveProject = readLastActiveProject();

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeProjectId: lastActiveProject?.id ?? null,
  activeProjectKey: lastActiveProject?.key ?? null,
  sidebarOpen: true,
  commandPaletteOpen: false,
  selectedIssueId: null,
  activeView: 'day',
  theme: 'dark',
  userScope: 'my_tasks',
  currentUser: null,

  setActiveProject: (id, key = null) => {
    writeLastActiveProject(id, key);
    set({ activeProjectId: id, activeProjectKey: key });
  },
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setSelectedIssue: (id) => set({ selectedIssueId: id }),
  setActiveView: (view) => set({ activeView: view }),
  setTheme: (theme) => set({ theme }),
  setUserScope: (scope) => set({ userScope: scope }),
  setCurrentUser: (user) => set({ currentUser: user }),
}));
