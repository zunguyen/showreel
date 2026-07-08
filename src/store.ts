import { create } from 'zustand';
import { defaultProject, migrateProject, type ItemDoc, type ProjectDoc, type ProjectMeta } from './types';
import * as storage from './storage';
import { clearAssetCache, evictAsset, loadIntoCache } from './assets';
import { usePlayback } from './playback';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const WARN_FILE_BYTES = 15 * 1024 * 1024;
const MAX_ITEMS = 100;

export interface AddResult {
  added: number;
  rejected: string[];
  warnings: string[];
}

interface StoreState {
  ready: boolean;
  doc: ProjectDoc | null;
  projects: ProjectMeta[];
  /** bumped whenever the asset cache changes, so canvases/thumbs re-render */
  assetsVersion: number;

  init: () => Promise<void>;
  updateDoc: (patch: Partial<ProjectDoc>) => void;
  addFiles: (files: File[]) => Promise<AddResult>;
  removeItem: (itemId: string) => void;
  reorderItems: (from: number, to: number) => void;
  newProject: () => void;
  openProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(doc: ProjectDoc) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    storage.putProject(doc).catch((err) => console.error('auto-save failed', err));
    storage.requestPersistence();
  }, 400);
}

function toMeta(doc: ProjectDoc): ProjectMeta {
  return { id: doc.id, name: doc.name, updatedAt: doc.updatedAt, itemCount: doc.items.length };
}

function upsertMeta(metas: ProjectMeta[], doc: ProjectDoc): ProjectMeta[] {
  const rest = metas.filter((m) => m.id !== doc.id);
  return [toMeta(doc), ...rest].sort((x, y) => y.updatedAt - x.updatedAt);
}

async function loadProjectAssets(doc: ProjectDoc): Promise<void> {
  await Promise.all(
    doc.items.map(async (item) => {
      const blob = await storage.getAsset(item.assetId);
      if (blob) await loadIntoCache(item.assetId, blob);
    }),
  );
}

let initStarted = false;

export const useStore = create<StoreState>()((set, get) => ({
  ready: false,
  doc: null,
  projects: [],
  assetsVersion: 0,

  init: async () => {
    if (initStarted) return;
    initStarted = true;
    const all = (await storage.getAllProjects()).map(migrateProject).sort((a, b) => b.updatedAt - a.updatedAt);
    const doc = all[0] ?? null;
    if (doc) await loadProjectAssets(doc);
    set({
      ready: true,
      doc,
      projects: all.map(toMeta),
      assetsVersion: get().assetsVersion + 1,
    });
  },

  updateDoc: (patch) => {
    const doc = get().doc;
    if (!doc) return;
    const next = { ...doc, ...patch, updatedAt: Date.now() };
    scheduleSave(next);
    set({ doc: next, projects: upsertMeta(get().projects, next) });
  },

  addFiles: async (files) => {
    const result: AddResult = { added: 0, rejected: [], warnings: [] };
    let doc = get().doc;
    if (!doc) {
      doc = defaultProject('Untitled reel');
      set({ doc, projects: upsertMeta(get().projects, doc) });
    }

    for (const file of files) {
      if (get().doc && get().doc!.items.length >= MAX_ITEMS) {
        result.rejected.push(`${file.name}: project is at the ${MAX_ITEMS}-image limit`);
        continue;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        result.rejected.push(`${file.name}: unsupported format (use PNG, JPG, WebP or AVIF)`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        result.rejected.push(`${file.name}: over the 40 MB limit`);
        continue;
      }
      if (file.size > WARN_FILE_BYTES) {
        result.warnings.push(`${file.name} is large (${(file.size / 1e6).toFixed(0)} MB) — import may be slow`);
      }
      try {
        const assetId = crypto.randomUUID();
        const cached = await loadIntoCache(assetId, file);
        await storage.putAsset(assetId, file);
        const item: ItemDoc = {
          id: crypto.randomUUID(),
          assetId,
          name: file.name,
          w: cached.bitmap.width,
          h: cached.bitmap.height,
        };
        const current = get().doc!;
        const next = { ...current, items: [...current.items, item], updatedAt: Date.now() };
        scheduleSave(next);
        set({
          doc: next,
          projects: upsertMeta(get().projects, next),
          assetsVersion: get().assetsVersion + 1,
        });
        result.added++;
      } catch (err) {
        console.error('import failed', file.name, err);
        result.rejected.push(`${file.name}: could not be decoded`);
      }
    }
    return result;
  },

  removeItem: (itemId) => {
    const doc = get().doc;
    if (!doc) return;
    const item = doc.items.find((i) => i.id === itemId);
    if (!item) return;
    const next = { ...doc, items: doc.items.filter((i) => i.id !== itemId), updatedAt: Date.now() };
    const stillUsed = next.items.some((i) => i.assetId === item.assetId);
    if (!stillUsed) {
      evictAsset(item.assetId);
      storage.deleteAsset(item.assetId).catch(() => {});
    }
    scheduleSave(next);
    set({
      doc: next,
      projects: upsertMeta(get().projects, next),
      assetsVersion: get().assetsVersion + 1,
    });
  },

  reorderItems: (from, to) => {
    const doc = get().doc;
    if (!doc || from === to || from < 0 || to < 0) return;
    const items = [...doc.items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    get().updateDoc({ items });
  },

  newProject: () => {
    const current = get().doc;
    if (current) storage.putProject(current).catch(() => {});
    clearAssetCache();
    usePlayback.setState({ timeMs: 0 });
    const doc = defaultProject('Untitled reel');
    scheduleSave(doc);
    set({
      doc,
      projects: upsertMeta(get().projects, doc),
      assetsVersion: get().assetsVersion + 1,
    });
  },

  openProject: async (id) => {
    if (get().doc?.id === id) return;
    const all = await storage.getAllProjects();
    const found = all.find((d) => d.id === id);
    if (!found) return;
    const doc = migrateProject(found);
    clearAssetCache();
    usePlayback.setState({ timeMs: 0 });
    await loadProjectAssets(doc);
    set({ doc, assetsVersion: get().assetsVersion + 1 });
  },

  deleteProject: async (id) => {
    const all = await storage.getAllProjects();
    const victim = all.find((d) => d.id === id);
    if (!victim) return;
    await storage.deleteProjectRow(id);
    await Promise.all(victim.items.map((i) => storage.deleteAsset(i.assetId).catch(() => {})));
    const remaining = get().projects.filter((m) => m.id !== id);
    set({ projects: remaining });
    if (get().doc?.id === id) {
      clearAssetCache();
      usePlayback.setState({ timeMs: 0 });
      const nextId = remaining[0]?.id;
      if (nextId) {
        set({ doc: null, assetsVersion: get().assetsVersion + 1 });
        await get().openProject(nextId);
      } else {
        set({ doc: null, assetsVersion: get().assetsVersion + 1 });
      }
    }
  },
}));
