'use client';

import * as React from 'react';
import {
  Library,
  Plus,
  Search,
  Star,
  Loader2,
  FolderPlus,
  Tag,
  LayoutGrid,
  Upload,
  FileDown,
  Link2,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import { StudySetCard } from '@/components/study-set-card';
import { CreateStudySetDialog } from '@/components/create-study-set-dialog';
import { TemplateGallery } from '@/components/template-gallery';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { StudySet, Subject } from '@/lib/types';
import { cn } from '@/lib/utils';

const COLORS = ['violet', 'emerald', 'amber', 'rose', 'cyan', 'orange'];

export function LibraryView({
  subjects,
  onSubjectsChange,
}: {
  subjects: Subject[];
  onSubjectsChange?: () => void;
}) {
  const [sets, setSets] = React.useState<StudySet[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [subjectFilter, setSubjectFilter] = React.useState<string>('all');
  const [favOnly, setFavOnly] = React.useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = React.useState(false);
  const [newSubjectName, setNewSubjectName] = React.useState('');
  const [newSubjectColor, setNewSubjectColor] = React.useState('violet');
  const [creatingSubject, setCreatingSubject] = React.useState(false);
  const importFileRef = React.useRef<HTMLInputElement>(null);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [linkInput, setLinkInput] = React.useState('');
  const [importingLink, setImportingLink] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.post('/api/import', { data });
      toast.success(`Imported "${data.title || 'study set'}"`);
      load();
      onSubjectsChange?.();
    } catch (err) {
      toast.error('Import failed', { description: (err as Error).message });
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  }

  async function handleImportLink() {
    const raw = linkInput.trim();
    if (!raw) return;
    // extract token from URL or bare token
    let token = raw;
    try {
      const url = new URL(raw);
      const s = url.searchParams.get('s');
      if (s) token = s;
    } catch {
      // not a URL — treat as bare token
    }
    setImportingLink(true);
    try {
      const res = await api.get<{ studySet: { title: string; notes: string; sourceContent: string; sourceType: string; flashcards: { front: string; back: string }[]; quizzes: { title: string; difficulty: string; questions: { type: string; question: string; options: string[]; correctIndex: number; explanation: string }[] }[]; podcasts: { title: string; script: string; voice: string }[]; subject: { name: string; color: string; icon: string } | null } }>(`/api/shared/${token}`);
      const ss = res.studySet;
      // Re-import via the import API (handles subject creation + flashcards/quizzes/podcasts)
      await api.post('/api/import', {
        data: {
          format: 'learnx-studyset/v1',
          title: ss.title,
          description: '',
          sourceType: ss.sourceType || 'paste',
          sourceContent: ss.sourceContent || '',
          notes: ss.notes || '',
          tags: '',
          subject: ss.subject ? { name: ss.subject.name, color: ss.subject.color, icon: ss.subject.icon } : null,
          flashcards: ss.flashcards || [],
          quizzes: ss.quizzes || [],
          podcasts: ss.podcasts || [],
        },
      });
      toast.success(`Imported "${ss.title}" from link`);
      setLinkInput('');
      setLinkDialogOpen(false);
      load();
      onSubjectsChange?.();
    } catch (err) {
      toast.error('Could not import from link', { description: (err as Error).message });
    } finally {
      setImportingLink(false);
    }
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ studySets: StudySet[] }>('/api/study-sets');
      setSets(res.studySets);
    } catch (e) {
      toast.error('Failed to load library', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = sets.filter((s) => {
    if (favOnly && !s.favorite) return false;
    if (subjectFilter !== 'all' && s.subjectId !== subjectFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.toLowerCase().includes(q) ||
        s.sourceContent.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleCreateSubject() {
    if (!newSubjectName.trim()) return;
    setCreatingSubject(true);
    try {
      await api.post('/api/subjects', { name: newSubjectName.trim(), color: newSubjectColor });
      toast.success('Subject created');
      setNewSubjectName('');
      setCreateSubjectOpen(false);
      onSubjectsChange?.();
    } catch (e) {
      toast.error('Failed', { description: (e as Error).message });
    } finally {
      setCreatingSubject(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header + controls */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My Library</h2>
          <p className="text-sm text-muted-foreground">
            {sets.length} study set{sets.length !== 1 ? 's' : ''} across {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createSubjectOpen} onOpenChange={setCreateSubjectOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1">
                <FolderPlus className="h-4 w-4" /> New subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a subject</DialogTitle>
                <DialogDescription>Organize your study sets by subject.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="subj-name">Name</Label>
                  <Input
                    id="subj-name"
                    placeholder="e.g. Biology"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewSubjectColor(c)}
                        className={cn(
                          'h-8 w-8 rounded-full border-2 transition-all',
                          `bg-${c}-500`,
                          newSubjectColor === c ? 'border-foreground scale-110' : 'border-transparent',
                        )}
                        style={{
                          backgroundColor: colorHex(c),
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateSubjectOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateSubject} disabled={creatingSubject || !newSubjectName.trim()} className="gap-1">
                  {creatingSubject && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)} className="gap-1">
            <BookOpen className="h-4 w-4" /> Templates
          </Button>
          <CreateStudySetDialog subjects={subjects} onCreated={load} />
          <Button variant="ghost" size="sm" onClick={() => setLinkDialogOpen(true)} className="gap-1" title="Import from a share link">
            <Link2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => importFileRef.current?.click()} className="gap-1" title="Import a study set JSON">
            <Upload className="h-4 w-4" />
          </Button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      {/* Import-from-link dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" /> Import from share link
            </DialogTitle>
            <DialogDescription>
              Paste a LearnX AI share link or token to import a copy of that study set into your library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="https://learnx.ai/?s=abc123def456"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !importingLink) handleImportLink(); }}
            />
            <p className="text-[11px] text-muted-foreground">
              The shared study set's notes, flashcards, quizzes, and podcasts will be copied to your library. You can then edit them freely.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImportLink} disabled={importingLink || !linkInput.trim()} className="gap-1">
              {importingLink && <Loader2 className="h-4 w-4 animate-spin" />}
              {importingLink ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template gallery */}
      <TemplateGallery
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        subjects={subjects}
        onCreated={() => { load(); onSubjectsChange?.(); }}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search study sets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-44">
            <Tag className="mr-1 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={favOnly ? 'default' : 'outline'}
          size="icon"
          onClick={() => setFavOnly((v) => !v)}
          className="gap-1"
          title="Favorites only"
        >
          <Star className={cn('h-4 w-4', favOnly && 'fill-current')} />
        </Button>
      </div>

      {/* Subject chips */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubjectFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              subjectFilter === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted',
            )}
          >
            All ({sets.length})
          </button>
          {subjects.map((s) => {
            const count = sets.filter((x) => x.subjectId === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setSubjectFilter(s.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  subjectFilter === s.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted',
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorHex(s.color) }} />
                {s.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={sets.length === 0 ? Library : LayoutGrid}
          title={sets.length === 0 ? 'Your library is empty' : 'No study sets match your filters'}
          description={
            sets.length === 0
              ? 'Create your first study set and let AI do the heavy lifting.'
              : 'Try clearing the search or filters.'
          }
          action={
            sets.length === 0 ? (
              <CreateStudySetDialog
                subjects={subjects}
                onCreated={load}
                trigger={
                  <Button size="lg" className="gap-2">
                    <Plus className="h-4 w-4" /> Create study set
                  </Button>
                }
              />
            ) : (
              <Button variant="outline" onClick={() => { setSearch(''); setSubjectFilter('all'); setFavOnly(false); }}>
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <StudySetCard
              key={s.id}
              studySet={s}
              onDeleted={load}
              onToggleFavorite={async () => {
                try {
                  await api.patch(`/api/study-sets/${s.id}`, { favorite: !s.favorite });
                  load();
                } catch (e) {
                  toast.error('Failed to update', { description: (e as Error).message });
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function colorHex(name: string): string {
  const map: Record<string, string> = {
    violet: '#8b5cf6',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    cyan: '#06b6d4',
    orange: '#f97316',
  };
  return map[name] || '#8b5cf6';
}
