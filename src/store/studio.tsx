import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Episode, Panel, Project } from './types';
import { emptyProject, migrateProject, uid } from './types';
import { buildDemoProject } from './demo';
import { deleteImage, getAllImages, putImage } from '../lib/imageStore';

// ---------------------------------------------------------------------------
// Studio state: project library, undo/redo, autosave, asset registry.
// Panel images are stored as refs ("img:xxx") and resolve through the asset
// registry, so project JSON and undo snapshots stay tiny.
// ---------------------------------------------------------------------------

const LS_KEY = 'manhwa-maker.v2';

interface Snapshot {
  projects: Project[];
  activeId: string;
}

interface Persisted {
  projects: Project[];
  activeId: string;
  seen: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface StudioCtx {
  projects: Project[];
  project: Project;
  episode: Episode;
  activeId: string;
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  /** mutate the active project (goes through undo history + autosave) */
  update: (recipe: (draft: Project) => void) => void;
  /** mutate without touching history (used for high-frequency drags) */
  updateLive: (recipe: (draft: Project) => void) => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;
  setActive: (id: string) => void;
  newProject: () => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  loadDemo: () => void;
  importProject: (json: string) => { ok: boolean; message: string };
  assets: Record<string, string>;
  resolve: (ref?: string) => string | undefined;
  putAsset: (dataUrl: string) => Promise<string>;
  removeAsset: (ref?: string) => void;
  toast: (msg: string, kind?: 'info' | 'ok' | 'warn' | 'err') => void;
  toasts: { id: string; msg: string; kind: string }[];
}

const Ctx = createContext<StudioCtx | null>(null);

const clone = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);

function seedState(): Persisted {
  const demo = buildDemoProject();
  const scratch = emptyProject();
  scratch.meta.title = 'New Manhwa';
  scratch.episodes[0].title = 'Episode 1';
  scratch.activeEpisodeId = scratch.episodes[0].id;
  return { projects: [demo, scratch], activeId: demo.id, seen: true };
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed?.projects?.length) return seedState();
    for (const p of parsed.projects) {
      migrateProject(p);
      if (!p.activeEpisodeId && p.episodes?.length) p.activeEpisodeId = p.episodes[0].id;
    }
    return parsed;
  } catch {
    return seedState();
  }
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [boot] = useState<Persisted>(() => loadPersisted());
  const [projects, setProjects] = useState<Project[]>(boot.projects);
  const [activeId, setActiveId] = useState<string>(boot.activeId);
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [toasts, setToasts] = useState<{ id: string; msg: string; kind: string }[]>([]);

  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [histTick, setHistTick] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const liveSnapshot = useRef<Snapshot | null>(null);

  // ---- assets -------------------------------------------------------------
  useEffect(() => {
    getAllImages().then(setAssets);
  }, []);

  const resolve = useCallback(
    (ref?: string) => {
      if (!ref) return undefined;
      if (ref.startsWith('img:')) return assets[ref];
      return ref;
    },
    [assets],
  );

  const putAsset = useCallback(async (dataUrl: string) => {
    const key = `img:${uid('a')}`;
    setAssets((prev) => ({ ...prev, [key]: dataUrl }));
    await putImage(key, dataUrl);
    return key;
  }, []);

  const removeAsset = useCallback((ref?: string) => {
    if (!ref?.startsWith('img:')) return;
    setAssets((prev) => {
      const next = { ...prev };
      delete next[ref];
      return next;
    });
    void deleteImage(ref);
  }, []);

  // ---- toasts -------------------------------------------------------------
  const toast = useCallback((msg: string, kind: 'info' | 'ok' | 'warn' | 'err' = 'info') => {
    const id = uid('t');
    setToasts((prev) => [...prev, { id, msg, kind }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  // ---- persistence --------------------------------------------------------
  const flush = useCallback(
    (projs: Project[], actId: string) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      setSaveState('saving');
      saveTimer.current = window.setTimeout(() => {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({ projects: projs, activeId: actId, seen: true }));
          setSaveState('saved');
        } catch {
          setSaveState('error');
        }
      }, 350);
    },
    [],
  );

  const pushHistory = useCallback((snap: Snapshot) => {
    past.current = [...past.current.slice(-24), snap];
    future.current = [];
    setHistTick((t) => t + 1);
  }, []);

  const snapshot = useCallback(
    (): Snapshot => ({ projects: clone(projects), activeId }),
    [projects, activeId],
  );

  const applyMutate = useCallback(
    (recipe: (draft: Project) => void, record: boolean) => {
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === activeId);
        if (idx === -1) return prev;
        if (record) pushHistory({ projects: clone(prev), activeId });
        const draft = clone(prev[idx]);
        recipe(draft);
        draft.meta.updatedAt = Date.now();
        const next = [...prev];
        next[idx] = draft;
        flush(next, activeId);
        return next;
      });
    },
    [activeId, flush, pushHistory],
  );

  const update = useCallback((recipe: (draft: Project) => void) => applyMutate(recipe, true), [applyMutate]);

  const updateLive = useCallback(
    (recipe: (draft: Project) => void) => {
      if (!liveSnapshot.current) liveSnapshot.current = snapshot();
      applyMutate(recipe, false);
    },
    [applyMutate, snapshot],
  );

  const commit = useCallback(() => {
    if (liveSnapshot.current) {
      past.current = [...past.current.slice(-24), liveSnapshot.current];
      future.current = [];
      liveSnapshot.current = null;
      setHistTick((t) => t + 1);
    }
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current = [{ projects: clone(projects), activeId }, ...future.current].slice(0, 25);
    setProjects(prev.projects);
    setActiveId(prev.activeId);
    flush(prev.projects, prev.activeId);
    setHistTick((t) => t + 1);
  }, [projects, activeId, flush]);

  const redo = useCallback(() => {
    const next = future.current.shift();
    if (!next) return;
    past.current = [...past.current, { projects: clone(projects), activeId }];
    setProjects(next.projects);
    setActiveId(next.activeId);
    flush(next.projects, next.activeId);
    setHistTick((t) => t + 1);
  }, [projects, activeId, flush]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ---- project ops --------------------------------------------------------
  const setActive = useCallback(
    (id: string) => {
      setActiveId(id);
      flush(projects, id);
    },
    [projects, flush],
  );

  const newProject = useCallback(() => {
    const p = emptyProject();
    p.episodes[0].title = 'Episode 1';
    p.activeEpisodeId = p.episodes[0].id;
    const next = [...projects, p];
    setProjects(next);
    setActiveId(p.id);
    flush(next, p.id);
    toast('New project created', 'ok');
  }, [projects, flush, toast]);

  const duplicate = useCallback(
    (id: string) => {
      const src = projects.find((p) => p.id === id);
      if (!src) return;
      const copy = clone(src);
      copy.id = uid('prj');
      copy.demo = false;
      copy.meta.title = `${src.meta.title} (copy)`;
      copy.episodes.forEach((ep) => {
        ep.id = uid('ep');
        ep.panels.forEach((pn) => {
          pn.id = uid('pnl');
        });
        ep.beats.forEach((b) => {
          b.id = uid('b');
        });
      });
      const versionMap = new Map<string, string>();
      copy.versions = (copy.versions ?? []).map((v) => {
        const next = { ...v, id: uid('ver') };
        versionMap.set(v.id, next.id);
        return next;
      });
      copy.versions.forEach((v) => {
        if (v.inheritsFrom) v.inheritsFrom = versionMap.get(v.inheritsFrom) ?? null;
      });
      copy.episodes.forEach((ep) =>
        ep.panels.forEach((pn) => {
          pn.versions = Object.fromEntries(
            Object.entries(pn.versions ?? {}).map(([cid, vid]) => [cid, versionMap.get(vid) ?? vid]),
          );
        }),
      );
      copy.activeEpisodeId = copy.episodes[0]?.id ?? '';
      const next = [...projects, copy];
      setProjects(next);
      setActiveId(copy.id);
      flush(next, copy.id);
      toast('Project duplicated', 'ok');
    },
    [projects, flush, toast],
  );

  const remove = useCallback(
    (id: string) => {
      if (projects.length <= 1) {
        toast('Keep at least one project', 'warn');
        return;
      }
      const next = projects.filter((p) => p.id !== id);
      setProjects(next);
      if (activeId === id) setActiveId(next[0].id);
      flush(next, activeId === id ? next[0].id : activeId);
      toast('Project deleted', 'info');
    },
    [projects, activeId, flush, toast],
  );

  const loadDemo = useCallback(() => {
    const demo = buildDemoProject();
    const existing = projects.find((p) => p.demo);
    const next = existing ? projects.map((p) => (p.demo ? demo : p)) : [demo, ...projects];
    setProjects(next);
    setActiveId(demo.id);
    flush(next, demo.id);
    toast('Loaded the reference project', 'ok');
  }, [projects, flush, toast]);

  const importProject = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json) as Project | Project[];
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const clean = list
          .filter((p) => p && typeof p === 'object' && 'meta' in p && 'episodes' in p)
          .map((p) => {
            const copy = migrateProject(clone(p));
            copy.id = uid('prj');
            copy.demo = false;
            if (!copy.activeEpisodeId) copy.activeEpisodeId = copy.episodes[0]?.id ?? '';
            return copy;
          });
        if (!clean.length) return { ok: false, message: 'No valid project found in that file.' };
        const next = [...projects, ...clean];
        setProjects(next);
        setActiveId(clean[0].id);
        flush(next, clean[0].id);
        toast(`Imported ${clean.length} project${clean.length > 1 ? 's' : ''}`, 'ok');
        return { ok: true, message: 'Imported' };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : 'Invalid JSON' };
      }
    },
    [projects, flush, toast],
  );

  // Repair: keep at least one project and a valid active episode.
  const project = useMemo(() => {
    const found = projects.find((p) => p.id === activeId) ?? projects[0];
    return found;
  }, [projects, activeId]);

  const episode = useMemo(() => {
    if (!project) return buildDemoProject().episodes[0];
    const found = project.episodes.find((e) => e.id === project.activeEpisodeId);
    return found ?? project.episodes[0];
  }, [project]);

  const value: StudioCtx = {
    projects,
    project,
    episode,
    activeId: project?.id ?? '',
    saveState,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    update,
    updateLive,
    commit,
    undo,
    redo,
    setActive,
    newProject,
    duplicate,
    remove,
    loadDemo,
    importProject,
    assets,
    resolve,
    putAsset,
    removeAsset,
    toast,
    toasts,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudio(): StudioCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudio must be used inside <StudioProvider>');
  return ctx;
}

/** Convenience: the currently selected episode with its panels. */
export function usePanels(): Panel[] {
  return useStudio().episode?.panels ?? [];
}
