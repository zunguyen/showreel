/** Dark-first editor theme with an explicit, persisted light-mode option. */

const KEY = 'showreel-theme';

type Applied = 'light' | 'dark';

const listeners = new Set<() => void>();

function apply(theme: Applied) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  listeners.forEach((l) => l());
}

export function appliedTheme(): Applied {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function toggleTheme() {
  const next: Applied = appliedTheme() === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
  apply(next);
}
