import { useRef, useState } from 'react';
import {
  ImagesIcon,
  PlayIcon,
  ShieldCheckIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react';
import { useStore } from '../store';
import { generateSampleFiles } from '../samples';
import { Button } from '../toolcraft/ui/components/primitives';
import { EmptyExamplePreview } from './EmptyExamplePreview';

export function EmptyState() {
  const addFiles = useStore((s) => s.addFiles);
  const newProject = useStore((s) => s.newProject);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: File[]) => {
    if (!files.length || busy) return;
    setBusy(true);
    try {
      const res = await addFiles(files);
      if (res.rejected.length) setNotice(res.rejected.join(' · '));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className={`empty-workspace flex min-h-0 flex-1 items-center overflow-y-auto px-8 py-10 transition-colors duration-200 ${
        dragging ? 'is-dragging' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles([...e.dataTransfer.files]);
      }}
    >
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)] items-center gap-12">
        <section className="max-w-[390px]">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[color:var(--foreground)]">
            <ImagesIcon size={21} weight="duotone" />
          </div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]">
            New showreel
          </p>
          <h1 className="max-w-sm text-[32px] font-semibold leading-[1.08] tracking-[-0.035em]">
            Turn polished screens into motion.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[color:var(--muted-foreground)]">
            Import your design screens, choose a motion style, and export a portfolio-ready MP4.
          </p>

          <div className="mt-7 flex flex-col items-start gap-3">
            <Button size="lg" onClick={() => inputRef.current?.click()} disabled={busy}>
              <ImagesIcon />
              Choose images
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void generateSampleFiles().then(handleFiles)}
              disabled={busy}
            >
              <PlayIcon />
              {busy ? 'Preparing sample…' : 'Try sample screens'}
            </Button>
          </div>

          <div className="mt-7 flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
            <ShieldCheckIcon size={16} className="text-[color:var(--accent)]" />
            <span>Processed locally. Your files never leave this browser.</span>
          </div>

          <button
            type="button"
            onClick={() => newProject('backdrop')}
            className="group mt-8 flex items-center gap-3 border-t border-[color:var(--hairline)] pt-5 text-left"
          >
            <span className="backdrop-swatch flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-black/60">
              <SquaresFourIcon size={16} />
            </span>
            <span>
              <span className="block text-xs font-medium text-[color:var(--foreground)] transition-colors group-hover:text-[color:var(--accent)]">
                Create an animated backdrop
              </span>
              <span className="mt-0.5 block text-[11px] text-[color:var(--muted-foreground)]">
                Looping gradients, no screens required
              </span>
            </span>
          </button>

          {notice && <p className="mt-4 text-xs text-[color:var(--attention)]">{notice}</p>}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              void handleFiles([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
        </section>

        <section className="relative min-w-0">
          <div className="pointer-events-none absolute -inset-10 rounded-full bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] blur-3xl" />
          <div className="relative">
            <EmptyExamplePreview />
            <p className="mt-4 text-center text-[11px] text-[color:var(--muted-foreground)]">
              Drop PNG, JPG, WebP, or AVIF files anywhere in this workspace
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
