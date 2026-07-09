import { useStore } from '../store';
import { Button } from '../toolcraft/ui/components/primitives';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../toolcraft/ui/components/composites';

export function ProjectsMenu() {
  const projects = useStore((s) => s.projects);
  const doc = useStore((s) => s.doc);
  const openProject = useStore((s) => s.openProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const newProject = useStore((s) => s.newProject);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            Projects
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuItem onClick={() => newProject('showreel')}>＋ New showreel</DropdownMenuItem>
        <DropdownMenuItem onClick={() => newProject('backdrop')}>＋ New backdrop</DropdownMenuItem>
        {projects.length > 0 && <DropdownMenuSeparator />}
        {projects.map((m) => (
          <DropdownMenuItem key={m.id} className="group" onClick={() => void openProject(m.id)}>
            {m.id === doc?.id && <span className="text-[color:var(--accent)]">●</span>}
            <span className="flex-1 truncate">{m.name || 'Untitled reel'}</span>
            {m.kind === 'backdrop' ? (
              <span className="rounded-sm border border-[color:color-mix(in_oklab,var(--border)_30%,transparent)] px-1 text-2xs text-[color:var(--muted-foreground)]">
                backdrop
              </span>
            ) : (
              <span className="text-2xs text-[color:var(--muted-foreground)]">
                {m.itemCount} {m.itemCount === 1 ? 'screen' : 'screens'}
              </span>
            )}
            <span
              role="button"
              tabIndex={-1}
              title="Delete project"
              onClickCapture={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (confirm(`Delete "${m.name || 'Untitled reel'}"? This cannot be undone.`)) {
                  void deleteProject(m.id);
                }
              }}
              className="hidden px-1 text-[color:var(--muted-foreground)] group-hover:inline hover:text-[color:var(--destructive)]"
            >
              ✕
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
