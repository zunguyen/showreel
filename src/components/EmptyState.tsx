import { useRef, useState } from 'react';
import { useStore } from '../store';
import { generateSampleFiles } from '../samples';
import { Button } from '../toolcraft/ui/components/primitives';

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
    <div
      className="flex flex-1 items-center justify-center p-8"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles([...e.dataTransfer.files]);
      }}
    >
      <div className="flex w-full max-w-xl flex-col gap-4">
        <div
          className={`flex flex-col items-center gap-5 rounded-xl border-2 border-dashed px-10 py-16 text-center transition-colors ${
            dragging
              ? 'border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_6%,transparent)]'
              : 'border-[color:color-mix(in_oklab,var(--border)_25%,transparent)]'
          }`}
        >
          <h1 className="text-xl font-semibold tracking-tight">Drop your design screens here</h1>
          <p className="max-w-md text-xs-plus text-[color:var(--muted-foreground)]">
            PNG, JPG, WebP or AVIF. Everything runs locally in your browser — your designs are
            never uploaded anywhere.
          </p>
          <div className="flex gap-3">
            <Button size="lg" onClick={() => inputRef.current?.click()} disabled={busy}>
              Choose images
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => void generateSampleFiles().then(handleFiles)}
              disabled={busy}
            >
              {busy ? 'Preparing…' : 'Try with sample screens'}
            </Button>
          </div>
          {notice && <p className="text-2xs text-[color:var(--attention)]">{notice}</p>}
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
        </div>

        <button
          type="button"
          onClick={() => newProject('backdrop')}
          className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-[color:color-mix(in_oklab,var(--border)_25%,transparent)] px-5 py-4 text-left transition-colors hover:border-[color:color-mix(in_oklab,var(--accent)_45%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_4%,transparent)]"
        >
          <span aria-hidden className="backdrop-swatch h-12 w-12 shrink-0 rounded-lg" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium tracking-tight">Or design a backdrop</span>
            <span className="text-2xs text-[color:var(--muted-foreground)]">
              Looping gradient backgrounds — for video backdrops, wallpapers and hero sections. No
              screens needed.
            </span>
          </span>
          <span
            aria-hidden
            className="ml-auto text-[color:var(--muted-foreground)] transition-colors group-hover:text-[color:var(--foreground)]"
          >
            →
          </span>
        </button>
      </div>
    </div>
  );
}
