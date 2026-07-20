import { useEffect, useRef, useState } from 'react';
import { ImagesIcon, PlusIcon, SquaresFourIcon, XIcon } from '@phosphor-icons/react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store';
import { getBitmap, getCached } from '../assets';
import { usePlayback } from '../playback';
import { renderFrame } from '../render/renderFrame';
import { getFrameState, totalDurationMs } from '../render/timing';
import {
  TEMPLATE_PRESENTATIONS,
  type ItemDoc,
  type ProjectDoc,
  type TemplatePresentation,
} from '../types';
import { useWorkspacePreferences, type WorkspaceRailTab } from '../workspacePreferences';
import { Button } from '../toolcraft/ui/components/primitives';

function Thumb({
  item,
  index,
  active,
  onSelect,
}: {
  item: ItemDoc;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const removeItem = useStore((s) => s.removeItem);
  const url = getCached(item.assetId)?.url;
  const tall = item.h / item.w > 2;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-10 opacity-70' : 'relative'}
    >
      <div
        className={`group relative overflow-hidden rounded-lg border transition-colors duration-150 ${
          active
            ? 'border-[color:var(--accent)] ring-1 ring-[color:color-mix(in_oklab,var(--accent)_40%,transparent)]'
            : 'border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)]'
        }`}
      >
        {url ? (
          <button
            type="button"
            aria-label={`Select ${item.name}`}
            onClick={onSelect}
            {...attributes}
            {...listeners}
            className="block w-full cursor-grab bg-[color:var(--control)] active:cursor-grabbing"
          >
            <img src={url} alt="" draggable={false} className="block w-full" />
          </button>
        ) : (
          <div className="h-20 w-full animate-pulse bg-[color:var(--control)]" />
        )}
        <span className="pointer-events-none absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/65 px-1 text-[10px] font-semibold text-white">
          {index + 1}
        </span>
        {tall && (
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-md bg-[color:var(--accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
            Scroll
          </span>
        )}
        <button
          type="button"
          aria-label={`Remove ${item.name}`}
          title="Remove screen"
          onClick={() => removeItem(item.id)}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-white/65 opacity-0 transition-opacity hover:bg-[color:var(--destructive)] hover:text-white focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <XIcon size={12} />
        </button>
      </div>
    </div>
  );
}

function TemplatePreview({
  presentation,
  doc,
  animate,
}: {
  presentation: TemplatePresentation;
  doc: ProjectDoc;
  animate: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '60px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !visible) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previewDoc: ProjectDoc = { ...doc, template: presentation.id, ratio: '16:9' };
    const total = totalDurationMs(previewDoc);
    let raf = 0;
    let lastDraw = 0;
    const start = performance.now() - presentation.previewTimeMs;

    const draw = (now: number) => {
      if (now - lastDraw >= 82) {
        const t = reduced || !animate ? presentation.previewTimeMs : (now - start) % total;
        renderFrame(ctx, previewDoc, getBitmap, t, canvas.width, canvas.height);
        lastDraw = now;
      }
      if (!reduced && animate) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [animate, doc, presentation, visible]);

  return (
    <div ref={wrapRef} className="relative aspect-video overflow-hidden rounded-md bg-[#090a0c]">
      <canvas
        ref={canvasRef}
        width={320}
        height={180}
        className="absolute inset-0 block h-full w-full"
      />
      <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
    </div>
  );
}

function TemplateCard({ presentation, doc }: { presentation: TemplatePresentation; doc: ProjectDoc }) {
  const updateDoc = useStore((s) => s.updateDoc);
  const [hovered, setHovered] = useState(false);
  const selected = doc.template === presentation.id;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => updateDoc({ template: presentation.id })}
      className={`min-w-0 rounded-lg border p-1.5 text-left transition-[border-color,background-color] duration-150 ${
        selected
          ? 'border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_9%,transparent)]'
          : 'border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)] hover:bg-white/[0.025]'
      }`}
    >
      <TemplatePreview presentation={presentation} doc={doc} animate={selected || hovered} />
      <span className="flex items-start gap-1.5 px-0.5 pb-0.5 pt-1.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-medium text-[color:var(--foreground)]">{presentation.label}</span>
          <span className="mt-0.5 line-clamp-2 block min-h-6 text-[9px] leading-3 text-[color:var(--muted-foreground)]">
            {presentation.description}
          </span>
        </span>
        <span
          aria-hidden
          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
            selected ? 'bg-[color:var(--accent)]' : 'border border-[color:var(--hairline-strong)]'
          }`}
        />
      </span>
    </button>
  );
}

function RailTab({
  tab,
  active,
  onSelect,
  children,
}: {
  tab: WorkspaceRailTab;
  active: boolean;
  onSelect: (tab: WorkspaceRailTab) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(tab)}
      className={`relative flex h-10 flex-1 items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
        active ? 'text-[color:var(--foreground)]' : 'text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]'
      }`}
    >
      {children}
      <span
        className={`absolute inset-x-2 bottom-0 h-px transition-colors ${
          active ? 'bg-[color:var(--accent)]' : 'bg-transparent'
        }`}
      />
    </button>
  );
}

export function MediaRail() {
  const doc = useStore((s) => s.doc)!;
  useStore((s) => s.assetsVersion);
  const reorderItems = useStore((s) => s.reorderItems);
  const addFiles = useStore((s) => s.addFiles);
  const timeMs = usePlayback((s) => s.timeMs);
  const activeRailTab = useWorkspacePreferences((s) => s.activeRailTab);
  const setActiveRailTab = useWorkspacePreferences((s) => s.setActiveRailTab);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeIndex = getFrameState(doc, Math.min(timeMs, totalDurationMs(doc))).aIndex;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = doc.items.findIndex((i) => i.id === active.id);
    const to = doc.items.findIndex((i) => i.id === over.id);
    reorderItems(from, to);
  };

  return (
    <aside
      className="panel-surface flex h-full min-h-0 flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void addFiles([...e.dataTransfer.files]);
      }}
    >
      <div role="tablist" aria-label="Workspace rail" className="flex border-b border-[color:var(--hairline)] px-2">
        <RailTab tab="screens" active={activeRailTab === 'screens'} onSelect={setActiveRailTab}>
          <ImagesIcon size={14} /> Screens
        </RailTab>
        <RailTab tab="templates" active={activeRailTab === 'templates'} onSelect={setActiveRailTab}>
          <SquaresFourIcon size={14} /> Templates
        </RailTab>
      </div>

      {activeRailTab === 'screens' ? (
        <div role="tabpanel" className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.11em] text-[color:var(--muted-foreground)]">
            Sequence <span className="ml-auto font-mono tracking-normal">{doc.items.length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={doc.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {doc.items.map((item, index) => (
                    <Thumb
                      key={item.id}
                      item={item}
                      index={index}
                      active={index === activeIndex}
                      onSelect={() => usePlayback.getState().seek(index * doc.itemDurationMs)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full border-dashed"
              onClick={() => inputRef.current?.click()}
            >
              <PlusIcon /> Add screens
            </Button>
          </div>
        </div>
      ) : (
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <p className="pb-3 pt-3 text-[11px] leading-4 text-[color:var(--muted-foreground)]">
            Choose a motion style. Hover a template to preview it.
          </p>
          {(['Core', 'Spatial', 'Transitions'] as const).map((category) => {
            const presentations = TEMPLATE_PRESENTATIONS.filter(
              (presentation) => presentation.category === category,
            );
            return (
              <section key={category} className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                  {category}
                  <span className="h-px flex-1 bg-[color:var(--hairline)]" />
                  <span className="font-mono tracking-normal">{presentations.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {presentations.map((presentation) => (
                    <TemplateCard key={presentation.id} presentation={presentation} doc={doc} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          void addFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
    </aside>
  );
}
