'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface HeatmapProps {
  /** 84 daily entries (oldest first), each { date: 'YYYY-MM-DD', count: N } */
  data: { date: string; count: number }[];
  className?: string;
}

const WEEKDAYS = ['Mon', 'Wed', 'Fri'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A GitHub-style contribution heatmap (12 weeks × 7 days). */
export function Heatmap({ data, className }: HeatmapProps) {
  // Build a 7×12 grid (rows = weekday, cols = week). Align so the last column
  // ends today and the first column starts ~12 weeks ago.
  const cells = React.useMemo(() => {
    // data is oldest→newest, 84 entries. Pad the start so the first column's
    // weekday matches the actual weekday of the first date.
    if (data.length === 0) return { grid: [], max: 1, monthLabels: [] };
    const first = new Date(data[0].date);
    const firstWeekday = (first.getDay() + 6) % 7; // Mon=0 ... Sun=6
    const padded = [
      ...Array.from({ length: firstWeekday }, () => ({ date: '', count: -1 })),
      ...data,
    ];
    // group into weeks of 7
    const weeks: { date: string; count: number }[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }
    // ensure 7 rows
    while (weeks.length < 13) weeks.push([]);

    const max = Math.max(1, ...data.map((d) => d.count));

    // month labels: for each week column, find the month of its first valid date
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const firstValid = week.find((d) => d.date);
      if (firstValid) {
        const m = new Date(firstValid.date).getMonth();
        if (m !== lastMonth) {
          monthLabels.push({ col, label: MONTHS[m] });
          lastMonth = m;
        }
      }
    });

    return { grid: weeks, max, monthLabels };
  }, [data]);

  if (!cells.grid.length) {
    return (
      <div className={cn('flex h-24 items-center justify-center text-xs text-muted-foreground', className)}>
        No activity yet
      </div>
    );
  }

  function level(count: number, max: number): number {
    if (count <= 0) return 0;
    const ratio = count / max;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  }

  const levelColors = [
    'bg-muted-foreground/10',
    'bg-primary/25',
    'bg-primary/45',
    'bg-primary/70',
    'bg-primary',
  ];

  const total = data.reduce((n, d) => n + d.count, 0);
  const activeDays = data.filter((d) => d.count > 0).length;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{total}</strong> activities in the last 12 weeks
          {activeDays > 0 && <> · <strong className="text-foreground">{activeDays}</strong> active days</>}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {levelColors.map((c, i) => (
            <span key={i} className={cn('h-2.5 w-2.5 rounded-sm', c)} />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 min-w-0">
        {/* weekday labels */}
        <div className="flex shrink-0 flex-col gap-[3px] pt-[15px] text-[9px] text-muted-foreground">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="h-[11px] leading-[11px]">
              {WEEKDAYS.includes(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]) ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] : ''}
            </span>
          ))}
        </div>
        <div className="min-w-0 shrink-0">
          {/* month labels */}
          <div className="relative h-[15px] text-[9px] text-muted-foreground">
            {cells.monthLabels.map((m) => (
              <span
                key={m.col}
                className="absolute"
                style={{ left: `calc(${m.col} * (11px + 3px))` }}
              >
                {m.label}
              </span>
            ))}
          </div>
          {/* grid */}
          <div className="flex gap-[3px]">
            {cells.grid.map((week, col) => (
              <div key={col} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, row) => {
                  const cell = week[row];
                  if (!cell || cell.count < 0) {
                    return <span key={row} className="h-[11px] w-[11px] rounded-sm bg-transparent" />;
                  }
                  const lv = level(cell.count, cells.max);
                  return (
                    <div
                      key={row}
                      className={cn('h-[11px] w-[11px] rounded-sm transition-colors hover:ring-1 hover:ring-primary/40', levelColors[lv])}
                      title={`${cell.date}: ${cell.count} activities`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
