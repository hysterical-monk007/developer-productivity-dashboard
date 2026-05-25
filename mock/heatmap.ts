import { subDays, format, getDay, startOfWeek, addDays } from "date-fns";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export type HeatmapCell = {
  date: string;
  iso: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  dow: number; // 0=Sun..6=Sat
};

export function generateHeatmap(seed = 7): HeatmapCell[] {
  const rand = seededRandom(seed);
  const today = new Date("2026-05-25");
  // Anchor: go back ~52 weeks from the end of this week, snap to a Sunday
  const endSunday = startOfWeek(today, { weekStartsOn: 0 });
  const start = addDays(endSunday, -52 * 7);

  const cells: HeatmapCell[] = [];
  for (let i = 0; i < 52 * 7 + (getDay(today) + 1); i++) {
    const date = addDays(start, i);
    if (date > today) break;
    const dow = getDay(date);
    const isWeekend = dow === 0 || dow === 6;

    // Weighted random: weekdays heavier, recent weeks heavier, mid-year dip
    const monthsAgo = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const recencyBoost = Math.max(0, 1 - monthsAgo / 14);
    const base = isWeekend ? 1 : 4;
    const noise = rand();
    const dip = Math.abs(Math.sin((i / 365) * Math.PI * 2)) * 2;
    let count = Math.round(base + noise * 8 + recencyBoost * 6 - dip);
    if (rand() > 0.85) count = 0;
    if (count < 0) count = 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count === 0) level = 0;
    else if (count <= 3) level = 1;
    else if (count <= 7) level = 2;
    else if (count <= 12) level = 3;
    else level = 4;

    cells.push({
      date: format(date, "EEE, MMM d, yyyy"),
      iso: format(date, "yyyy-MM-dd"),
      count,
      level,
      dow,
    });
  }
  return cells;
}

export const heatmapCells = generateHeatmap();
export const totalContributions = heatmapCells.reduce((s, c) => s + c.count, 0);
