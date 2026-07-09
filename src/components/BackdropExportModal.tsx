import { useEffect, useRef, useState } from 'react';
import type { ProjectDoc } from '../types';
import { BASE_DIMS, exportDims, type ResClass } from '../render/ratio';
import { renderFrame } from '../render/renderFrame';
import { cssGradient } from '../render/gradients';
import { totalDurationMs } from '../render/timing';
import { pickBitrate } from '../export/messages';
import { ExportCancelled, startExport, webCodecsSupported, type ExportHandle } from '../export/exporter';
import { Button } from '../toolcraft/ui/components/primitives';
import { SegmentedControl, SelectControl } from '../toolcraft/ui/components/controls';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Progress,
} from '../toolcraft/ui/components/composites';

type Format = 'png' | 'mp4' | 'css';
type Phase = 'config' | 'running' | 'error';

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

function baseName(doc: ProjectDoc): string {
  const base = doc.name.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase();
  return base || 'backdrop';
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function BackdropExportModal({ doc, onClose }: { doc: ProjectDoc; onClose: () => void }) {
  const bg = doc.background;
  const animated = bg.type === 'gradient' && (bg.animate ?? false);

  const [format, setFormat] = useState<Format>('png');
  const [pngScale, setPngScale] = useState<1 | 2>(1);
  const [res, setRes] = useState<ResClass>(1080);
  const [fps, setFps] = useState<30 | 60>(30);
  const [phase, setPhase] = useState<Phase>('config');
  const [progress, setProgress] = useState({ done: 0, total: 1 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const handleRef = useRef<ExportHandle | null>(null);

  useEffect(() => () => handleRef.current?.cancel(), []);

  const base = BASE_DIMS[doc.ratio];
  const pngDims = { w: base.w * pngScale, h: base.h * pngScale };
  const videoDims = exportDims(doc.ratio, res);
  const durationMs = totalDurationMs(doc);
  const supported = webCodecsSupported();
  const estBytes = (pickBitrate(videoDims.w, videoDims.h, fps) * durationMs) / 1000 / 8;
  const css = cssGradient(bg);

  const formatOptions = [
    { label: 'PNG', value: 'png' },
    ...(animated ? [{ label: 'Video loop', value: 'mp4' }] : []),
    { label: 'CSS', value: 'css' },
  ];

  const exportPng = async () => {
    try {
      const canvas = new OffscreenCanvas(pngDims.w, pngDims.h);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create a canvas context.');
      renderFrame(ctx, doc, () => undefined, 0, pngDims.w, pngDims.h);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      downloadBlob(blob, `${baseName(doc)}.png`);
      setNotice(`Downloaded ${baseName(doc)}.png (${fmtBytes(blob.size)})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  const exportVideo = () => {
    setPhase('running');
    setProgress({ done: 0, total: 1 });
    const handle = startExport(doc, { width: videoDims.w, height: videoDims.h, fps }, (done, total) =>
      setProgress({ done, total }),
    );
    handleRef.current = handle;
    handle.promise
      .then((blob) => {
        downloadBlob(blob, `${baseName(doc)}.mp4`);
        setNotice(`Downloaded ${baseName(doc)}.mp4 (${fmtBytes(blob.size)})`);
        setPhase('config');
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

  const copyCss = () => {
    navigator.clipboard
      .writeText(`background: ${css};`)
      .then(() => setNotice('CSS copied to clipboard'))
      .catch(() => setNotice('Copy failed — select the text and copy manually'));
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
          <DialogTitle>Export backdrop</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {phase === 'config' && (
            <>
              <SegmentedControl
                name="Format"
                options={formatOptions}
                value={format}
                onValueChange={(v) => {
                  setFormat(v as Format);
                  setNotice('');
                }}
              />

              {format === 'png' && (
                <>
                  <SelectControl
                    name="Size"
                    value={String(pngScale)}
                    options={[
                      { label: `1× · ${base.w}×${base.h}`, value: '1' },
                      { label: `2× · ${base.w * 2}×${base.h * 2}`, value: '2' },
                    ]}
                    onValueChange={(v) => setPngScale(Number(v) as 1 | 2)}
                  />
                  <Button onClick={() => void exportPng()}>Export PNG</Button>
                </>
              )}

              {format === 'mp4' && (
                <>
                  {!supported && (
                    <p className="rounded-md border border-[color:color-mix(in_oklab,var(--attention)_35%,transparent)] bg-[color:color-mix(in_oklab,var(--attention)_12%,transparent)] p-3 text-2xs text-[color:var(--attention)]">
                      This browser can't encode video locally (WebCodecs missing). Please use Chrome,
                      Edge or another Chromium browser.
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
                    Seamless {Math.round(durationMs / 1000)}s loop · est. {fmtBytes(estBytes)} — adjust
                    loop length in the panel.
                  </p>
                  <Button disabled={!supported} onClick={exportVideo}>
                    Export video loop
                  </Button>
                </>
              )}

              {format === 'css' && (
                <>
                  <textarea
                    readOnly
                    value={`background: ${css};`}
                    rows={6}
                    className="w-full resize-none rounded-md border border-[color:color-mix(in_oklab,var(--border)_25%,transparent)] bg-transparent p-2 font-mono text-2xs text-[color:var(--foreground)]"
                    onFocus={(e) => e.target.select()}
                  />
                  <p className="text-2xs text-[color:var(--muted-foreground)]">
                    Covers the gradient and glow layers. Grain and softness aren't expressible in
                    plain CSS — export a PNG for the full look.
                  </p>
                  <Button onClick={copyCss}>Copy CSS</Button>
                </>
              )}

              {notice && <p className="text-2xs text-[color:var(--muted-foreground)]">{notice}</p>}
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
