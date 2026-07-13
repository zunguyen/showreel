/** Light/dark theme. An explicit choice is stored in localStorage; otherwise
 *  the OS preference is followed (initial class is set by an inline script in
 *  index.html so the first paint is already correct). */

const KEY = 'showreel-theme';

type Applied = 'light' | 'dark';

const media = window.matchMedia('(prefers-color-scheme: dark)');

const listeners = new Set<() => void>();

function stored(): Applied | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

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
    // if the choice matches the OS preference, forget it and follow the OS again
    if (next === (media.matches ? 'dark' : 'light')) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
  apply(next);
}

media.addEventListener('change', (e) => {
  if (!stored()) apply(e.matches ? 'dark' : 'light');
});
