import { useEffect, useRef, useState } from 'react';
import type { ProjectDoc } from '../types';
import { exportDims, type ResClass } from '../render/ratio';
import { totalDurationMs } from '../render/timing';
import { pickBitrate } from '../export/messages';
import { ExportCancelled, startExport, webCodecsSupported, type ExportHandle } from '../export/exporter';
import { Button, buttonVariants } from '../toolcraft/ui/components/primitives';
import { SelectControl } from '../toolcraft/ui/components/controls';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Progress,
} from '../toolcraft/ui/components/composites';
import { cn } from '../toolcraft/ui/lib/utils';

type Phase = 'config' | 'running' | 'done' | 'error';

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fileName(doc: ProjectDoc): string {
  const base = doc.name.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase();
  return `${base || 'showreel'}.mp4`;
}

export function ExportModal({ doc, onClose }: { doc: ProjectDoc; onClose: () => void }) {
  const [res, setRes] = useState<ResClass>(1080);
  const [fps, setFps] = useState<30 | 60>(30);
  const [phase, setPhase] = useState<Phase>('config');
  const [progress, setProgress] = useState({ done: 0, total: 1 });
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const handleRef = useRef<ExportHandle | null>(null);
  const urlRef = useRef<string | null>(null);

  const supported = webCodecsSupported();
  const dims = exportDims(doc.ratio, res);
  const durationMs = totalDurationMs(doc);
  const estBytes = (pickBitrate(dims.w, dims.h, fps) * durationMs) / 1000 / 8;

  useEffect(
    () => () => {
      handleRef.current?.cancel();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const start = () => {
    setPhase('running');
    setProgress({ done: 0, total: 1 });
    const handle = startExport(doc, { width: dims.w, height: dims.h, fps }, (done, total) =>
      setProgress({ done, total }),
    );
    handleRef.current = handle;
    handle.promise
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setResult({ url, size: blob.size });
        setPhase('done');
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName(doc);
        a.click();
      })
      .catch((err: unknown) => {
        if (err instanceof ExportCancelled) {
          setPhase('config');
        } else {
          setError(err instanceof Error ? err.message : String(err));
          setPhase('error');
        }
      });
  };

  const pct = Math.round((progress.done / Math.max(1, progress.total)) * 100);

  return (
    <Dialog
      open
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export MP4</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {phase === 'config' && (
            <>
              {!supported && (
                <p className="rounded-md border border-[color:color-mix(in_oklab,var(--attention)_35%,transparent)] bg-[color:color-mix(in_oklab,var(--attention)_12%,transparent)] p-3 text-2xs text-[color:var(--attention)]">
                  This browser can't encode video locally (WebCodecs missing). Please use Chrome,
                  Edge or another Chromium browser — a compatibility encoder is on the roadmap.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <SelectControl
                  name="Resolution"
                  value={String(res)}
                  options={[
                    { label: `1080p · ${exportDims(doc.ratio, 1080).w}×${exportDims(doc.ratio, 1080).h}`, value: '1080' },
                    { label: `720p · ${exportDims(doc.ratio, 720).w}×${exportDims(doc.ratio, 720).h}`, value: '720' },
                  ]}
                  onValueChange={(v) => setRes(Number(v) as ResClass)}
                />
                <SelectControl
                  name="Frame rate"
                  value={String(fps)}
                  options={[
                    { label: '30 fps', value: '30' },
                    { label: '60 fps', value: '60' },
                  ]}
                  onValueChange={(v) => setFps(Number(v) as 30 | 60)}
                />
              </div>
              <p className="text-2xs text-[color:var(--muted-foreground)]">
                {doc.items.length} screens · {fmtDuration(durationMs)} · est. {fmtBytes(estBytes)}
              </p>
              <Button disabled={!supported} onClick={start}>
                Export video
              </Button>
            </>
          )}

          {phase === 'running' && (
            <>
              <p className="text-xs-plus text-[color:var(--foreground)]">
                Rendering frame {progress.done} of {progress.total}…
              </p>
              <Progress value={pct} />
              <Button variant="outline" onClick={() => handleRef.current?.cancel()}>
                Cancel
              </Button>
            </>
          )}

          {phase === 'done' && result && (
            <>
              <p className="text-xs-plus">
                Done — <span className="font-medium">{fileName(doc)}</span> ({fmtBytes(result.size)})
                has been downloaded.
              </p>
              <div className="flex gap-2">
                <a
                  href={result.url}
                  download={fileName(doc)}
                  className={cn(buttonVariants({ variant: 'default', size: 'default' }), 'flex-1')}
                >
                  Download again
                </a>
                <Button variant="outline" className="flex-1" onClick={() => setPhase('config')}>
                  Export another
                </Button>
              </div>
            </>
          )}

          {phase === 'error' && (
            <>
              <p className="rounded-md border border-[color:color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--destructive)_12%,transparent)] p-3 text-2xs text-[color:var(--destructive)]">
                Export failed: {error}
              </p>
              <Button variant="outline" onClick={() => setPhase('config')}>
                Back
              </Button>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
