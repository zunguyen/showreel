import { openDB, type IDBPDatabase } from 'idb';
import type { ProjectDoc } from './types';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB('showreel', 1, {
    upgrade(d) {
      d.createObjectStore('projects');
      d.createObjectStore('assets');
    },
  });
  return dbPromise;
}

export async function putProject(doc: ProjectDoc): Promise<void> {
  await (await db()).put('projects', doc, doc.id);
}

export async function getAllProjects(): Promise<ProjectDoc[]> {
  return (await db()).getAll('projects');
}

export async function deleteProjectRow(id: string): Promise<void> {
  await (await db()).delete('projects', id);
}

export async function putAsset(id: string, blob: Blob): Promise<void> {
  await (await db()).put('assets', blob, id);
}

export async function getAsset(id: string): Promise<Blob | undefined> {
  return (await db()).get('assets', id);
}

export async function deleteAsset(id: string): Promise<void> {
  await (await db()).delete('assets', id);
}

let persistenceRequested = false;
export function requestPersistence(): void {
  if (persistenceRequested) return;
  persistenceRequested = true;
  navigator.storage?.persist?.().catch(() => {});
}
