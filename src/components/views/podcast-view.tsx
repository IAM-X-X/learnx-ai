'use client';

import * as React from 'react';
import {
  Headphones,
  ArrowLeft,
  Loader2,
  Sparkles,
  Plus,
  Play,
  Pause,
  Volume2,
  Download,
  FileText,
  Radio,
  Mic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { EmptyState } from '@/components/empty-state';
import { StudySetCard } from '@/components/study-set-card';
import { CreateStudySetDialog } from '@/components/create-study-set-dialog';
import { Markdown } from '@/components/markdown';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { toast } from 'sonner';
import type { Podcast, StudySet, Subject } from '@/lib/types';
import { cn } from '@/lib/utils';

const VOICES = [
  { id: 'jam', label: 'Jam', desc: 'British gentleman — natural English' },
  { id: 'kazi', label: 'Kazi', desc: 'Clear & standard — neutral' },
  { id: 'douji', label: 'Douji', desc: 'Natural flow — conversational' },
  { id: 'xiaochen', label: 'Xiaochen', desc: 'Calm & professional' },
  { id: 'luodo', label: 'Luodo', desc: 'Engaging & expressive' },
  { id: 'tongtong', label: 'Tongtong', desc: 'Warm & friendly' },
];

export function PodcastView({
  subjects: _subjects,
}: {
  subjects?: Subject[];
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
      toast.error('Failed to load', { description: (e as Error).message });
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
      toast.error('Failed to load', { description: (e as Error).message });
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
      <PodcastStudio
        studySet={active}
        loading={loadingDetail}
        onBack={() => { setSelectedStudySetId(null); setActive(null); }}
        onGenerated={() => loadDetail(active.id)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">AI Podcasts</h2>
          <p className="text-sm text-muted-foreground">
            Turn any study set into an audio podcast — listen on the go, while commuting or working out.
          </p>
        </div>
      </div>

      {loadingList ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <EmptyState
          icon={Headphones}
          title="No podcasts yet"
          description="Create a study set first, then generate an AI podcast to listen to your material."
          action={
            <CreateStudySetDialog
              subjects={_subjects || []}
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

function PodcastStudio({
  studySet,
  loading,
  onBack,
  onGenerated,
}: {
  studySet: StudySet;
  loading: boolean;
  onBack: () => void;
  onGenerated: () => void;
}) {
  const [voice, setVoice] = React.useState('jam');
  const [generatingScript, setGeneratingScript] = React.useState(false);
  const [generatingAudio, setGeneratingAudio] = React.useState(false);
  const [activePodcast, setActivePodcast] = React.useState<Podcast | null>(studySet.podcasts[0] || null);

  React.useEffect(() => {
    setActivePodcast(studySet.podcasts[0] || null);
  }, [studySet.podcasts]);

  async function handleGenerate(withAudio: boolean) {
    if (withAudio) setGeneratingAudio(true);
    else setGeneratingScript(true);
    try {
      const res = await api.post<{ podcast: Podcast; audioError?: string }>(`/api/study-sets/${studySet.id}/podcast`, {
        generateAudio: withAudio,
        voice,
      });
      setActivePodcast(res.podcast);
      onGenerated();
      if (withAudio && res.audioError) {
        toast.error('Audio generation failed', {
          description: res.audioError + ' The script is still available — try generating audio again in a minute.',
          duration: 8000,
        });
      } else if (withAudio && !res.podcast.hasAudio) {
        toast.warning('Audio not available', {
          description: 'The TTS service may be rate-limited. The script is ready — try generating audio again shortly.',
          duration: 8000,
        });
      } else {
        toast.success(withAudio ? 'Podcast with audio generated!' : 'Podcast script generated!');
      }
    } catch (e) {
      toast.error('Generation failed', { description: (e as Error).message });
    } finally {
      setGeneratingScript(false);
      setGeneratingAudio(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{studySet.title}</h2>
          <p className="text-sm text-muted-foreground">AI Podcast Studio</p>
        </div>
      </div>

      {/* Generator */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4 text-primary" /> Generate a podcast
          </CardTitle>
          <CardDescription>
            LearnX AI writes a conversational two-host script (Alex & Sam) and narrates it with natural voices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Narrator voice</label>
            <div className="flex flex-wrap gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs transition-all',
                    voice === v.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <span className="font-medium">{v.label}</span>
                  <span className="ml-1.5 text-muted-foreground">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleGenerate(false)} disabled={generatingScript || generatingAudio} variant="outline" className="gap-1">
              {generatingScript ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generatingScript ? 'Writing script...' : 'Script only'}
            </Button>
            <Button onClick={() => handleGenerate(true)} disabled={generatingScript || generatingAudio} className="gap-1">
              {generatingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              {generatingAudio ? 'Synthesizing audio...' : 'Script + audio'}
            </Button>
          </div>
          {(generatingScript || generatingAudio) && (
            <p className="text-xs text-muted-foreground">
              {generatingAudio ? 'Audio synthesis happens in chunks — this can take 30-90 seconds.' : 'Writing your podcast script...'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Active podcast */}
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : activePodcast ? (
        <PodcastPlayer podcast={activePodcast} />
      ) : (
        <EmptyState
          icon={Headphones}
          title="No podcast yet"
          description="Generate your first podcast above to start listening to your study material."
        />
      )}
    </div>
  );
}

function PodcastPlayer({ podcast }: { podcast: Podcast }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0); // 0-100
  const [duration, setDuration] = React.useState(podcast.durationSec || 0);
  const [showScript, setShowScript] = React.useState(false);

  const audioUrl = podcast.hasAudio ? `/api/podcasts/${podcast.id}/audio` : null;

  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    };
    const onMeta = () => setDuration(a.duration || podcast.durationSec || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [podcast.durationSec, podcast.id]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  function seek(val: number[]) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = (val[0] / 100) * a.duration;
    setProgress(val[0]);
  }

  function fmtTime(s: number) {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  async function handleDownload() {
    if (!audioUrl) return;
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${podcast.title.replace(/\s+/g, '_')}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Download failed', { description: (e as Error).message });
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="brand-gradient h-2 w-full" />
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Headphones className="h-4 w-4 text-primary" /> {podcast.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {podcast.hasAudio ? `${fmtTime(duration)} · voice: ${podcast.voice}` : 'Script only — generate audio to listen'}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Mic className="h-3 w-3" /> {podcast.voice}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Player */}
        {podcast.hasAudio && audioUrl ? (
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/20 p-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={togglePlay}
                size="icon"
                className="h-12 w-12 rounded-full"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              <div className="flex-1 space-y-1.5">
                <Slider
                  value={[progress]}
                  max={100}
                  step={0.1}
                  onValueChange={seek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{fmtTime((progress / 100) * (duration || 0))}</span>
                  <span>{fmtTime(duration)}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleDownload} title="Download">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            <Volume2 className="mx-auto mb-2 h-6 w-6" />
            No audio yet — regenerate with <strong>Script + audio</strong> to listen.
          </div>
        )}

        {/* Script toggle */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-muted-foreground" /> Transcript
          </h4>
          <Button variant="ghost" size="sm" onClick={() => setShowScript((v) => !v)}>
            {showScript ? 'Hide' : 'Show'}
          </Button>
        </div>
        {showScript && (
          <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-xl border border-border bg-muted/30 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{podcast.script}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
