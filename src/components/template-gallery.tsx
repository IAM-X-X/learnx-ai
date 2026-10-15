'use client';

import * as React from 'react';
import { Sparkles, FlaskConical, Calculator, Globe2, Languages, Code2, History, BookOpen, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/stores/app-store';
import type { Subject } from '@/lib/types';

interface Template {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  source: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'cell-biology',
    title: 'The Cell: Structure & Function',
    subject: 'Biology',
    subjectColor: 'emerald',
    source: 'The cell is the basic structural and functional unit of life. There are two broad categories: prokaryotic cells (bacteria and archaea, no nucleus) and eukaryotic cells (plants, animals, fungi, protists, with a membrane-bound nucleus). Key organelles include the nucleus (houses DNA), mitochondria (energy via ATP), endoplasmic reticulum (protein & lipid synthesis), Golgi apparatus (packaging), and chloroplasts in plants (photosynthesis). The cell membrane is selectively permeable. The cell cycle includes interphase (G1, S, G2) and mitosis (prophase, metaphase, anaphase, telophase) followed by cytokinesis.',
    icon: FlaskConical,
    color: 'text-emerald-500 bg-emerald-500/10',
    description: 'Cell types, organelles, and the cell cycle',
  },
  {
    id: 'photosynthesis',
    title: 'Photosynthesis',
    subject: 'Biology',
    subjectColor: 'emerald',
    source: 'Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy stored in glucose. It occurs in two stages: the light-dependent reactions (in the thylakoid membranes, producing ATP and NADPH) and the Calvin cycle (in the stroma, fixing CO2 into glucose). Chlorophyll absorbs red and blue light, reflecting green. The overall equation is 6CO2 + 6H2O + light → C6H12O6 + 6O2.',
    icon: FlaskConical,
    color: 'text-emerald-500 bg-emerald-500/10',
    description: 'Light reactions, Calvin cycle, chlorophyll',
  },
  {
    id: 'world-war-1',
    title: 'Causes of World War I',
    subject: 'History',
    subjectColor: 'amber',
    source: 'World War I (1914-1918) was caused by MAIN: Militarism (arms race between European powers), Alliances (Triple Entente vs Triple Alliance), Imperialism (competition for colonies), and Nationalism (especially Slavic nationalism in the Balkans). The assassination of Archduke Franz Ferdinand by Gavrilo Princip in Sarajevo on June 28, 1914 was the spark. Key events: the July Crisis, Austria-Hungary\'s ultimatum to Serbia, Russia\'s mobilization, Germany\'s Schlieffen Plan, and the invasion of Belgium bringing Britain into the war.',
    icon: History,
    color: 'text-amber-500 bg-amber-500/10',
    description: 'MAIN causes, assassination, July Crisis',
  },
  {
    id: 'algebra-basics',
    title: 'Algebra: Linear Equations',
    subject: 'Mathematics',
    subjectColor: 'cyan',
    source: 'A linear equation is an equation of the form ax + b = 0, where a ≠ 0. The solution is x = -b/a. A linear equation in two variables is y = mx + b, where m is the slope and b is the y-intercept. The slope measures the rate of change: m = (y2 - y1) / (x2 - x1). Parallel lines have equal slopes; perpendicular lines have slopes that are negative reciprocals (m1 * m2 = -1). Systems of linear equations can be solved by substitution, elimination, or graphing.',
    icon: Calculator,
    color: 'text-cyan-500 bg-cyan-500/10',
    description: 'Slope, intercepts, systems of equations',
  },
  {
    id: 'spanish-basics',
    title: 'Spanish: Essential Grammar',
    subject: 'Languages',
    subjectColor: 'rose',
    source: 'Spanish verb conjugation depends on the subject pronoun (yo, tú, él/ella, nosotros, vosotros, ellos/ellas) and tense. Regular -ar verbs (hablar): hablo, hablas, habla, hablamos, habláis, hablan. Regular -er verbs (comer): como, comes, come, comemos, coméis, comen. Regular -ir verbs (vivir): vivo, vives, vive, vivimos, vivís, viven. Ser (to be, permanent): soy, eres, es, somos, sois, son. Estar (to be, temporary/location): estoy, estás, está, estamos, estáis, están. Gender: nouns ending in -o are masculine, -a are feminine. Adjectives agree in gender and number.',
    icon: Languages,
    color: 'text-rose-500 bg-rose-500/10',
    description: 'Verb conjugation, ser vs estar, gender',
  },
  {
    id: 'js-fundamentals',
    title: 'JavaScript Fundamentals',
    subject: 'Computer Science',
    subjectColor: 'violet',
    source: 'JavaScript is a high-level, interpreted programming language. Variables can be declared with let (mutable), const (immutable binding), or var (function-scoped, legacy). Data types: string, number, boolean, null, undefined, symbol, bigint, and object. Functions can be declarations (function foo() {}), expressions (const foo = function() {}), or arrow functions (const foo = () => {}). Arrays are ordered lists with methods like push, pop, map, filter, reduce. Objects are key-value pairs. The DOM (Document Object Model) allows JS to manipulate HTML elements via document.querySelector and addEventListener.',
    icon: Code2,
    color: 'text-violet-500 bg-violet-500/10',
    description: 'Variables, types, functions, arrays, DOM',
  },
  {
    id: 'french-revolution',
    title: 'The French Revolution',
    subject: 'History',
    subjectColor: 'amber',
    source: 'The French Revolution (1789-1799) was caused by social inequality (Three Estates), financial crisis from wars and lavish spending, Enlightenment ideas (Rousseau, Voltaire), and weak leadership by Louis XVI. Key events: the Estates-General meeting (May 1789), the Tennis Court Oath, the storming of the Bastille (July 14, 1789), the Declaration of the Rights of Man and of the Citizen, the Reign of Terror under Robespierre (1793-1794), and the rise of Napoleon Bonaparte (1799).',
    icon: History,
    color: 'text-amber-500 bg-amber-500/10',
    description: 'Causes, Bastille, Reign of Terror, Napoleon',
  },
  {
    id: 'climate-change',
    title: 'Climate Change Science',
    subject: 'Geography',
    subjectColor: 'cyan',
    source: 'Climate change refers to long-term shifts in global temperatures and weather patterns. The primary cause is the greenhouse effect: human activities (burning fossil fuels, deforestation) release CO2, methane, and nitrous oxide that trap heat. Key concepts: radiative forcing, carbon cycle, albedo effect, ocean acidification. The Paris Agreement (2015) aims to limit warming to 1.5°C above pre-industrial levels. Mitigation strategies: renewable energy, carbon capture, reforestation. Adaptation strategies: sea walls, drought-resistant crops, early warning systems.',
    icon: Globe2,
    color: 'text-cyan-500 bg-cyan-500/10',
    description: 'Greenhouse effect, Paris Agreement, mitigation',
  },
];

interface TemplateGalleryProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subjects: Subject[];
  onCreated: () => void;
}

export function TemplateGallery({ open, onOpenChange, subjects, onCreated }: TemplateGalleryProps) {
  const openStudySet = useAppStore((s) => s.openStudySet);
  const [creating, setCreating] = React.useState<string | null>(null);

  async function applyTemplate(t: Template) {
    setCreating(t.id);
    try {
      // resolve or create subject
      let subjectId: string | undefined;
      let subj = subjects.find((s) => s.name === t.subject);
      if (!subj) {
        const created = await api.post<{ subject: Subject }>('/api/subjects', {
          name: t.subject,
          color: t.subjectColor,
        });
        subj = created.subject;
      }
      subjectId = subj?.id;

      // create the study set
      const res = await api.post<{ studySet: { id: string } }>('/api/study-sets', {
        title: t.title,
        source: t.source,
        sourceType: 'topic',
        subjectId,
        tags: '',
      });
      const id = res.studySet.id;
      toast.success(`Created "${t.title}"`);

      // auto-generate content
      try {
        await api.post(`/api/study-sets/${id}/notes`, { difficulty: 'intermediate', length: 'standard' });
      } catch { /* non-fatal */ }
      try {
        await api.post(`/api/study-sets/${id}/flashcards`, { count: 10 });
      } catch { /* non-fatal */ }
      try {
        await api.post(`/api/study-sets/${id}/quiz`, { count: 8, difficulty: 'medium', mixTypes: true });
      } catch { /* non-fatal */ }

      onCreated();
      onOpenChange(false);
      openStudySet(id, 'notes');
    } catch (e) {
      toast.error('Template failed', { description: (e as Error).message });
    } finally {
      setCreating(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" /> Study-set templates
          </DialogTitle>
          <DialogDescription>
            Start instantly from a pre-built topic — LearnX AI generates notes, flashcards, and a quiz in seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                disabled={creating !== null}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md disabled:opacity-50"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold leading-tight">{t.title}</p>
                    {creating === t.id && <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">{t.subject}</Badge>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-center text-[11px] text-muted-foreground pt-2 border-t">
          Templates use real study material — perfect for trying LearnX AI or starting a new subject quickly.
        </p>
      </DialogContent>
    </Dialog>
  );
}
