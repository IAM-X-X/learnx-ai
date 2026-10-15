'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, FileText, Type, Link2, Upload, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { toast } from 'sonner';
import type { Subject, StudySet } from '@/lib/types';

interface CreateStudySetDialogProps {
  subjects: Subject[];
  trigger?: React.ReactNode;
  onCreated?: (set: StudySet) => void;
}

export function CreateStudySetDialog({ subjects, trigger, onCreated }: CreateStudySetDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'topic' | 'paste' | 'url' | 'file'>('topic');
  const [title, setTitle] = React.useState('');
  const [source, setSource] = React.useState('');
  const [urlInput, setUrlInput] = React.useState('');
  const [ingesting, setIngesting] = React.useState(false);
  const [fileName, setFileName] = React.useState('');
  const [fileLoading, setFileLoading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [subjectId, setSubjectId] = React.useState<string>('');
  const [autoGenerate, setAutoGenerate] = React.useState(true);
  const [language, setLanguage] = React.useState<string>('en');
  const [creating, setCreating] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const router = useRouter();
  const openStudySet = useAppStore((s) => s.openStudySet);

  function reset() {
    setTitle('');
    setSource('');
    setUrlInput('');
    setFileName('');
    setFileLoading(false);
    setSubjectId('');
    setAutoGenerate(true);
    setLanguage('en');
    setMode('topic');
  }

  async function handleIngestUrl() {
    if (!urlInput.trim()) return;
    setIngesting(true);
    try {
      const res = await api.post<{ title: string; text: string }>('/api/ingest', { url: urlInput.trim() });
      setSource(res.text.slice(0, 20000));
      if (!title.trim()) setTitle(res.title.slice(0, 80));
      toast.success('Content extracted from URL');
    } catch (e) {
      toast.error('Could not read that URL', { description: (e as Error).message });
    } finally {
      setIngesting(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileLoading(true);
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.pdf')) {
        // PDFs need server-side parsing — send base64 to /api/ingest
        const b64 = await fileToBase64(file);
        const res = await api.post<{ title: string; text: string }>('/api/ingest', {
          fileBase64: b64,
          fileName: file.name,
        });
        setSource(res.text.slice(0, 20000));
        if (!title.trim()) setTitle(res.title.slice(0, 80));
        toast.success(`Extracted ${res.text.length.toLocaleString()} chars from PDF`);
      } else {
        // text files — read directly
        const text = await file.text();
        setSource(text.slice(0, 20000));
        if (!title.trim()) {
          const base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
          setTitle(base.slice(0, 80));
        }
        toast.success(`Loaded ${file.name}`);
      }
    } catch (err) {
      toast.error('Could not read file', { description: (err as Error).message });
    } finally {
      setFileLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleCreate() {
    if (!title.trim() || !source.trim()) {
      toast.error('Please provide a title and content');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post<{ studySet: StudySet }>('/api/study-sets', {
        title: title.trim(),
        source: source.trim(),
        sourceType: mode,
        subjectId: subjectId || undefined,
        tags: '',
      });
      const id = res.studySet.id;
      toast.success('Study set created!');

      if (autoGenerate) {
        setGenerating(true);
        // fire-and-forget-ish but await for UX
        try {
          await api.post(`/api/study-sets/${id}/notes`, {
            difficulty: 'intermediate',
            length: 'standard',
            language,
          });
          toast.success('Notes generated');
        } catch (e) {
          toast.error('Notes generation failed', { description: (e as Error).message });
        }
        try {
          await api.post(`/api/study-sets/${id}/flashcards`, { count: 10 });
        } catch (e) {
          console.error(e);
        }
        try {
          await api.post(`/api/study-sets/${id}/quiz`, { count: 8, difficulty: 'medium', mixTypes: true });
        } catch (e) {
          console.error(e);
        }
        setGenerating(false);
      }

      onCreated?.(res.studySet);
      setOpen(false);
      reset();
      openStudySet(id, 'notes');
    } catch (e) {
      toast.error('Failed to create study set', { description: (e as Error).message });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            New Study Set
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Create a study set
          </DialogTitle>
          <DialogDescription>
            Give LearnX AI a topic or paste your notes — it'll generate study notes,
            flashcards, and a quiz automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'topic' | 'paste' | 'url' | 'file')}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="topic" className="gap-1.5 text-xs sm:text-sm">
                <Type className="h-4 w-4" /> <span className="hidden sm:inline">Topic</span>
              </TabsTrigger>
              <TabsTrigger value="paste" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Paste</span>
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-1.5 text-xs sm:text-sm">
                <Globe className="h-4 w-4" /> <span className="hidden sm:inline">URL</span>
              </TabsTrigger>
              <TabsTrigger value="file" className="gap-1.5 text-xs sm:text-sm">
                <Upload className="h-4 w-4" /> <span className="hidden sm:inline">File</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder={
                mode === 'topic' ? 'e.g. Photosynthesis' :
                mode === 'url' ? 'e.g. Article on Mitochondria' :
                mode === 'file' ? 'e.g. Lecture Notes Ch.3' :
                'e.g. Chapter 4: The Cell'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {mode === 'url' && (
            <div className="space-y-2">
              <Label>Web URL</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="https://en.wikipedia.org/wiki/Photosynthesis"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleIngestUrl} disabled={ingesting || !urlInput.trim()} className="gap-1 shrink-0">
                  {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  Extract
                </Button>
              </div>
              {source && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-300">
                  ✓ Extracted {source.length.toLocaleString()} characters
                </p>
              )}
            </div>
          )}

          {mode === 'file' && (
            <div className="space-y-2">
              <Label>Upload a file (PDF, text, or markdown)</Label>
              <button
                onClick={() => !fileLoading && fileRef.current?.click()}
                disabled={fileLoading}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:opacity-60"
              >
                {fileLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {fileLoading ? 'Extracting text...' : fileName || 'Click to upload'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  .pdf, .txt, .md, .csv, .json — up to ~20k chars
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md,.csv,.json,.text,text/*,application/pdf"
                className="hidden"
                onChange={handleFile}
              />
              {source && !fileLoading && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-300">
                  ✓ Loaded {source.length.toLocaleString()} characters
                </p>
              )}
            </div>
          )}

          {mode !== 'url' && mode !== 'file' && (
            <div className="space-y-2">
              <Label htmlFor="source">
                {mode === 'topic' ? 'What do you want to learn?' : 'Paste your notes, transcript, or article'}
              </Label>
              <Textarea
                id="source"
                placeholder={
                  mode === 'topic'
                    ? 'e.g. Photosynthesis: how plants convert light into chemical energy, the light and dark reactions, and the role of chlorophyll.'
                    : 'Paste any text — lecture notes, an article, a transcript... LearnX will turn it into structured study material.'
                }
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="min-h-[160px] resize-y"
              />
              <p className="text-[11px] text-muted-foreground">
                {source.length.toLocaleString()} characters
              </p>
            </div>
          )}

          {(mode === 'url' || mode === 'file') && source && (
            <div className="space-y-2">
              <Label>Extracted content (editable)</Label>
              <Textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="min-h-[120px] resize-y text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                {source.length.toLocaleString()} characters
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="No subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Output language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="English" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="zh">Chinese (Simplified)</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                  <SelectItem value="pl">Polish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Auto-generate</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" /> Notes + Cards + Quiz
                </Badge>
                <button
                  onClick={() => setAutoGenerate((v) => !v)}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  {autoGenerate ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            AI generation takes ~30-60s. You can regenerate anytime later.
          </p>
          <Button
            onClick={handleCreate}
            disabled={creating || generating || !title.trim() || !source.trim()}
          >
            {(creating || generating) && <Loader2 className="h-4 w-4 animate-spin" />}
            {creating ? 'Creating...' : generating ? 'AI generating...' : 'Create & Generate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
