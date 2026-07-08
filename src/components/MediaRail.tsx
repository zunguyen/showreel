import { useRef } from 'react';
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
import { getCached } from '../assets';
import type { ItemDoc } from '../types';
import { Button } from '../toolcraft/ui/components/primitives';

function Thumb({ item, index }: { item: ItemDoc; index: number }) {
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
      className={isDragging ? 'z-10 opacity-70' : ''}
    >
      <div className="group relative">
        {url ? (
          <img
            src={url}
            alt={item.name}
            draggable={false}
            {...attributes}
            {...listeners}
            className="w-full cursor-grab rounded-md border border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] bg-[color:var(--card)] active:cursor-grabbing"
          />
        ) : (
          <div className="h-20 w-full animate-pulse rounded-md bg-[color:var(--muted)]" />
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--foreground)]">
          {index + 1}
        </span>
        {tall && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-[color:var(--accent)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--accent-foreground)]">
            scrolls
          </span>
        )}
        <button
          title="Remove"
          onClick={() => removeItem(item.id)}
          className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded bg-black/60 text-xs text-[color:var(--muted-foreground)] hover:bg-[color:var(--destructive)] hover:text-white group-hover:flex"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function MediaRail() {
  const doc = useStore((s) => s.doc)!;
  useStore((s) => s.assetsVersion); // re-render when thumbnails become available
  const reorderItems = useStore((s) => s.reorderItems);
  const addFiles = useStore((s) => s.addFiles);
  const inputRef = useRef<HTMLInputElement>(null);

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
      className="flex min-h-0 flex-col border-r border-[color:color-mix(in_oklab,var(--border)_12%,transparent)]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void addFiles([...e.dataTransfer.files]);
      }}
    >
      <div className="px-3 py-2 text-2xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
        Screens · {doc.items.length}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={doc.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {doc.items.map((item, i) => (
                <Thumb key={item.id} item={item} index={i} />
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
          ＋ Add screens
        </Button>
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
      </div>
    </aside>
  );
}
