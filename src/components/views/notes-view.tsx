'use client';

import * as React from 'react';
import {
  NotebookPen,
  ArrowLeft,
  Loader2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Wand2,
  Plus,
  FileText,
  Type,
  History,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { Markdown } from '@/components/markdown';
import { StudySetCard } from '@/components/study-set-card';
import { CreateStudySetDialog } from '@/components/create-study-set-dialog';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { toast } from 'sonner';
import type { StudySet, Subject } from '@/lib/types';

export function NotesView({
  subjects,
  onSubjectsChange,
}: {
  subjects: Subject[];
  onSubjectsChange?: () => void;
}) {
  const selectedId = useAppStore((s) => s.selectedStudySetId);
  const setSelectedStudySetId = useAppStore((s) => s.setSelectedStudySetId);
  const [sets, setSets] = React.useState<StudySet[]>([]);
  const [active, setActive] = React.useState<StudySet | null>(null);
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  const loadList = React.useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.get<{ studySets: StudySet[] }>('/api/study-sets');
      setSets(res.studySets);
    } catch (e) {
      toast.error('Failed to load study sets', { description: (e as Error).message });
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = React.useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await api.get<{ studySet: StudySet }>(`/api/study-sets/${id}`);
      setActive(res.studySet);
    } catch (e) {
      toast.error('Failed to load notes', { description: (e as Error).message });
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  React.useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setActive(null);
  }, [selectedId, loadDetail]);

  if (selectedId && active) {
    return (
      <NotesDetail
        studySet={active}
        loading={loadingDetail}
        onBack={() => {
          setSelectedStudySetId(null);
          setActive(null);
        }}
        onRegenerated={(updated) => setActive(updated)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Your study sets</h2>
          <p className="text-sm text-muted-foreground">
            Pick a set to view its AI-generated notes, or create a new one.
          </p>
        </div>
        <CreateStudySetDialog subjects={subjects} onCreated={loadList} />
      </div>

      {loadingList ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No study sets yet"
          description="Create your first study set and LearnX AI will instantly turn it into structured notes, flashcards, and a quiz."
          action={
            <CreateStudySetDialog
              subjects={subjects}
              onCreated={loadList}
              trigger={
                <Button size="lg" className="gap-2">
                  <Plus className="h-4 w-4" /> Create study set
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => (
            <StudySetCard key={s.id} studySet={s} onDeleted={loadList} onToggleFavorite={loadList} />
          ))}
        </div>
      )}
    </div>
  );
}

function NotesDetail({
  studySet,
  loading,
  onBack,
  onRegenerated,
}: {
  studySet: StudySet;
  loading: boolean;
  onBack: () => void;
  onRegenerated: (s: StudySet) => void;
}) {
  const [regenerating, setRegenerating] = React.useState(false);
  const [difficulty, setDifficulty] = React.useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [length, setLength] = React.useState<'brief' | 'standard' | 'detailed'>('standard');
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(studySet.notes);
  const [copied, setCopied] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [versions, setVersions] = React.useState<{ id: string; difficulty: string; length: string; language: string; createdAt: string }[]>([]);
  const [previewVersion, setPreviewVersion] = React.useState<{ id: string; notes: string } | null>(null);
  const [restoring, setRestoring] = React.useState<string | null>(null);

  async function loadVersions() {
    try {
      const res = await api.get<{ versions: { id: string; difficulty: string; length: string; language: string; createdAt: string }[] }>(
        `/api/study-sets/${studySet.id}/versions`,
      );
      setVersions(res.versions);
    } catch {
      // ignore
    }
  }

  async function handlePreviewVersion(vid: string) {
    try {
      const res = await api.get<{ version: { id: string; notes: string } }>(`/api/note-versions/${vid}`);
      setPreviewVersion({ id: res.version.id, notes: res.version.notes });
    } catch (e) {
      toast.error('Could not load version', { description: (e as Error).message });
    }
  }

  async function handleRestoreVersion(vid: string) {
    setRestoring(vid);
    try {
      const res = await api.post<{ studySet: StudySet }>(`/api/note-versions/${vid}`, {});
      onRegenerated(res.studySet);
      setPreviewVersion(null);
      setHistoryOpen(false);
      toast.success('Notes restored from version');
      loadVersions();
    } catch (e) {
      toast.error('Restore failed', { description: (e as Error).message });
    } finally {
      setRestoring(null);
    }
  }

  async function handleDeleteVersion(vid: string) {
    try {
      await api.del(`/api/note-versions/${vid}`);
      setVersions((v) => v.filter((x) => x.id !== vid));
      if (previewVersion?.id === vid) setPreviewVersion(null);
      toast.success('Version deleted');
    } catch (e) {
      toast.error('Delete failed', { description: (e as Error).message });
    }
  }

  React.useEffect(() => {
    setDraft(studySet.notes);
  }, [studySet.notes]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await api.post<{ studySet: StudySet }>(`/api/study-sets/${studySet.id}/notes`, {
        difficulty,
        length,
      });
      onRegenerated(res.studySet);
      toast.success('Notes regenerated');
      loadVersions();
    } catch (e) {
      toast.error('Regeneration failed', { description: (e as Error).message });
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSaveEdit() {
    try {
      const res = await api.patch<{ studySet: StudySet }>(`/api/study-sets/${studySet.id}`, {
        notes: draft,
      });
      onRegenerated(res.studySet);
      setEditing(false);
      toast.success('Notes saved');
    } catch (e) {
      toast.error('Save failed', { description: (e as Error).message });
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(studySet.notes);
    setCopied(true);
    toast.success('Notes copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{studySet.title}</h2>
          {studySet.subject && (
            <Badge variant="outline" className="text-[10px]">{studySet.subject.name}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setHistoryOpen((v) => !v); if (!historyOpen) loadVersions(); }}
            className="gap-1"
          >
            <History className="h-4 w-4" /> History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((v) => !v)}
            className="gap-1"
          >
            <Wand2 className="h-4 w-4" /> {editing ? 'Preview' : 'Edit'}
          </Button>
        </div>
      </div>

      {/* Version history panel */}
      {historyOpen && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" /> Note version history
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No saved versions yet. Regenerate notes to create version snapshots (the previous version is saved automatically each time you regenerate).
              </p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">
                        {new Date(v.createdAt).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {v.difficulty} · {v.length} · {v.language}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handlePreviewVersion(v.id)}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleRestoreVersion(v.id)}
                      disabled={restoring === v.id}
                    >
                      {restoring === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteVersion(v.id)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {previewVersion && (
              <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold">Version preview</p>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => handleRestoreVersion(previewVersion.id)}
                    disabled={restoring === previewVersion.id}
                  >
                    {restoring === previewVersion.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                    Restore this version
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-thin rounded-md bg-background p-2">
                  <Markdown content={previewVersion.notes} className="text-xs" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">AI Notes</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">Level</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as 'beginner' | 'intermediate' | 'advanced')}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">Length</Label>
                <Select value={length} onValueChange={(v) => setLength(v as 'brief' | 'standard' | 'detailed')}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">Brief</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="gap-1"
              >
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {regenerating ? 'Generating...' : 'Regenerate'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading || regenerating ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {regenerating ? 'AI is writing your notes...' : 'Loading...'}
              </div>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-9/12" />
              <Skeleton className="h-6 w-1/2 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-10/12" />
            </div>
          ) : editing ? (
            <div className="space-y-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setDraft(studySet.notes); setEditing(false); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>Save changes</Button>
              </div>
            </div>
          ) : studySet.notes ? (
            <Markdown content={studySet.notes} />
          ) : (
            <EmptyState
              icon={FileText}
              title="No notes yet"
              description="Generate AI notes from this study set's source content."
              action={
                <Button size="sm" onClick={handleRegenerate} disabled={regenerating} className="gap-1">
                  <Sparkles className="h-4 w-4" /> Generate notes
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Source content preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4 text-muted-foreground" /> Source material
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground line-clamp-6">
            {studySet.sourceContent || 'No source content.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
