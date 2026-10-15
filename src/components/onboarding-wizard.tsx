'use client';

import * as React from 'react';
import { Brain, ArrowRight, ArrowLeft, Check, Search, GraduationCap, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'learnx:onboarding-complete';
const PROFILE_KEY = 'learnx:user-profile';

interface UserProfile {
  name: string;
  level: string;
  subjects: string[];
}

interface OnboardingWizardProps {
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
}

const EDUCATION_LEVELS = [
  { id: 'primary', label: 'Primary School' },
  { id: 'junior-cert', label: 'Junior Cert (1st–3rd Year)' },
  { id: 'transition', label: 'Transition Year' },
  { id: 'leaving-cert', label: 'Leaving Cert (5th–6th Year)' },
  { id: 'fet', label: 'FET / PLC Course' },
  { id: 'college', label: 'University / College' },
  { id: 'postgrad', label: 'Postgraduate' },
  { id: 'self', label: 'Self-taught / Hobby' },
  { id: 'other', label: 'Other' },
];

const ALL_SUBJECTS = [
  // Irish curriculum
  'Gaeilge', 'English', 'Mathematics', 'Science', 'History', 'Geography',
  'Business Studies', 'French', 'German', 'Spanish', 'Italian', 'Latin',
  'Art', 'Music', 'Physical Education (PE)', 'CSPE', 'SPHE', 'Religion',
  'Technology', 'Wood Technology', 'Metalwork', 'Home Economics',
  'Technical Graphics', 'Typing', 'Drama',
  // Leaving Cert
  'Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Applied Maths',
  'Accounting', 'Economics', 'Business (LC)', 'Politics & Society',
  'Computer Science', 'Design & Communication Graphics', 'Engineering',
  'Construction Studies', 'LCVP', 'LCA', 'Classical Studies',
  'Religious Education (LC)', 'Physical Education (LC)',
  // Languages
  'Irish', 'English Language', 'Welsh', 'Polish', 'Portuguese', 'Russian',
  'Arabic', 'Chinese (Mandarin)', 'Japanese', 'Dutch', 'Latin (Classical)',
  'Ancient Greek', 'Hebrew',
  // University / General
  'Mathematics (Advanced)', 'Statistics', 'Computer Science (CS)',
  'Software Engineering', 'Data Science', 'Machine Learning', 'Artificial Intelligence',
  'Medicine', 'Nursing', 'Pharmacy', 'Dentistry', 'Veterinary Science',
  'Law', 'Psychology', 'Sociology', 'Philosophy', 'Anthropology',
  'Economics (University)', 'Finance', 'Accounting (University)',
  'Marketing', 'Management', 'Business Administration',
  'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering',
  'Chemical Engineering', 'Biomedical Engineering', 'Architecture',
  'Graphic Design', 'Multimedia', 'Journalism', 'Film Studies',
  'Music Theory', 'Music Performance', 'Drama Studies', 'Fine Art',
  'Education', 'Early Childhood Education', 'Special Needs Education',
  'Environmental Science', 'Geology', 'Astronomy', 'Marine Science',
  'Food Science', 'Genetics', 'Microbiology', 'Biochemistry',
  'Political Science', 'International Relations', 'Public Administration',
  'Criminology', 'Social Work', 'Human Resources',
  // Other
  'Cooking', 'Personal Finance', 'Driving Theory', 'Aviation', 'First Aid',
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState('');
  const [level, setLevel] = React.useState('');
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const filteredSubjects = React.useMemo(() => {
    const q = search.toLowerCase();
    const list = q
      ? ALL_SUBJECTS.filter(s => s.toLowerCase().includes(q))
      : ALL_SUBJECTS;
    // Sort: selected first, then alphabetical
    return [...list].sort((a, b) => {
      const aSel = selectedSubjects.includes(a) ? 0 : 1;
      const bSel = selectedSubjects.includes(b) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.localeCompare(b);
    });
  }, [search, selectedSubjects]);

  function toggleSubject(s: string) {
    setSelectedSubjects(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  function finish() {
    const profile: UserProfile = { name: name.trim() || 'Learner', level, subjects: selectedSubjects };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch { /* ignore */ }
    onComplete(profile);
  }

  const steps = [
    { title: 'Welcome to LearnX AI', desc: 'Let\'s set up your learning profile — takes 30 seconds.' },
    { title: 'About You', desc: 'What should we call you?' },
    { title: 'Your Subjects', desc: 'Pick the subjects you\'re studying — we\'ll tailor your experience.' },
    { title: 'You\'re all set!', desc: 'Your profile is ready. Let\'s start learning!' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg overflow-hidden border-0 shadow-2xl">
        {/* Gradient header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 text-white">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{steps[step].title}</h2>
              <p className="text-sm text-white/80">{steps[step].desc}</p>
            </div>
          </div>
          {/* Progress dots */}
          <div className="relative mt-4 flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all',
                  i === step ? 'bg-white' : i < step ? 'bg-white/50' : 'bg-white/20'
                )}
              />
            ))}
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <Sparkles className="h-8 w-8" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                LearnX AI is a free AI-powered study platform. Turn any topic into
                notes, flashcards, quizzes, and podcasts — powered by AI.
              </p>
              <div className="grid grid-cols-2 gap-2 text-left">
                {[
                  { icon: '📝', label: 'AI Study Notes' },
                  { icon: '🃏', label: 'Smart Flashcards' },
                  { icon: '✅', label: 'AI Quizzes' },
                  { icon: '🎧', label: 'AI Podcasts' },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                    <span className="text-lg">{f.icon}</span>
                    <span className="text-xs font-medium">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Name + Level */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name or nickname</Label>
                <Input
                  id="name"
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) setStep(2); }}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">We'll use this to greet you. You can change it anytime.</p>
              </div>
              <div className="space-y-2">
                <Label>Your education level</Label>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {EDUCATION_LEVELS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLevel(l.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                        level === l.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      <GraduationCap className="h-4 w-4 shrink-0" />
                      <span className="truncate">{l.label}</span>
                      {level === l.id && <Check className="h-4 w-4 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Subjects */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Search & select your subjects</Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        {search || 'Search subjects...'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[460px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Type to search — try 'Gaeilge', 'Physics', 'Maths'..."
                        value={search}
                        onValueChange={setSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No subject found. You can still continue.</CommandEmpty>
                        <CommandGroup>
                          {filteredSubjects.slice(0, 50).map(s => (
                            <CommandItem
                              key={s}
                              value={s}
                              onSelect={() => { toggleSubject(s); setSearch(''); }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', selectedSubjects.includes(s) ? 'opacity-100' : 'opacity-0')} />
                              {s}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Selected subjects chips */}
              {selectedSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSubjects.map(s => (
                    <Badge key={s} variant="secondary" className="gap-1 pr-1">
                      {s}
                      <button onClick={() => toggleSubject(s)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                        <span className="text-xs">×</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No subjects selected yet — search above. You can skip this step.</p>
              )}

              {/* Quick suggestions */}
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Popular:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Gaeilge', 'English', 'Mathematics', 'Biology', 'History', 'Computer Science (CS)'].map(s => (
                    !selectedSubjects.includes(s) && (
                      <button
                        key={s}
                        onClick={() => toggleSubject(s)}
                        className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted transition-colors"
                      >
                        + {s}
                      </button>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                  <Check className="h-8 w-8" />
                </div>
              </div>
              <div>
                <p className="text-sm">
                  Welcome, <strong>{name.trim() || 'Learner'}</strong>! 🎉
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You're all set to start learning. Try creating a study set or
                  use a template to get started instantly.
                </p>
              </div>
              {selectedSubjects.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {selectedSubjects.slice(0, 6).map(s => (
                    <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                  ))}
                  {selectedSubjects.length > 6 && <Badge variant="outline" className="text-[10px]">+{selectedSubjects.length - 6}</Badge>}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t">
            {step > 0 && step < 3 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onSkip} className="text-xs">
                Skip setup
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !name.trim()}
                className="gap-1"
              >
                {step === 0 ? 'Get started' : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                <Sparkles className="h-4 w-4" /> Start learning
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function isOnboardingComplete(): boolean {
  try { return localStorage.getItem(ONBOARDING_KEY) === '1'; } catch { return false; }
}

export function getUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
