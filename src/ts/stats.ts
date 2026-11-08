import { Assessment, Chance, OpenSlot, PowerKey, Practice, Stage } from './types';
import { chanceXp, practiceXp, POWERS, TITLES, XP_PER_LEVEL } from './options';
import { addDays, hashString, parseKey, todayKey } from './dates';

export function totalXp(chances: Chance[], practices: Practice[]): number {
  return chances.reduce((s, c) => s + chanceXp(c), 0) + practices.reduce((s, p) => s + practiceXp(p), 0);
}

export function titleOf(xp: number): { name: string; min: number; next: { min: number; name: string } | null } {
  let idx = 0;
  TITLES.forEach((t, i) => { if (xp >= t.min) idx = i; });
  return { name: TITLES[idx].name, min: TITLES[idx].min, next: TITLES[idx + 1] ?? null };
}

export interface PowerStat {
  key: PowerKey;
  xp: number;
  /** 稽古の回数 */
  practices: number;
  /** この力で寄り道できた偶然の数 */
  chances: number;
  level: number;
  /** 次のレベルまでの進み具合 0〜1 */
  progress: number;
}

/** 力ごとの経験値。稽古はその力に、寄ってみた偶然は選んだ力に経験値を分ける */
export function powerStats(chances: Chance[], practices: Practice[]): Record<PowerKey, PowerStat> {
  const map = {} as Record<PowerKey, PowerStat>;
  POWERS.forEach((p) => { map[p.key] = { key: p.key, xp: 0, practices: 0, chances: 0, level: 1, progress: 0 }; });
  practices.forEach((p) => {
    map[p.power].xp += practiceXp(p);
    map[p.power].practices += 1;
  });
  chances.filter((c) => c.choice === 'go').forEach((c) => {
    c.powers.forEach((k) => {
      map[k].xp += chanceXp(c);
      map[k].chances += 1;
    });
  });
  Object.values(map).forEach((s) => {
    s.level = 1 + Math.floor(s.xp / XP_PER_LEVEL);
    s.progress = (s.xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  });
  return map;
}

/** 稽古か寄り道ログをつけた日が続いている日数（今日か昨日まで続いていれば有効） */
export function streak(chances: Chance[], practices: Practice[]): number {
  const days = activeDays(chances, practices);
  let cur = todayKey();
  if (!days.has(cur)) cur = addDays(cur, -1);
  let count = 0;
  while (days.has(cur)) {
    count += 1;
    cur = addDays(cur, -1);
  }
  return count;
}

function activeDays(chances: Chance[], practices: Practice[]): Set<string> {
  return new Set([...chances.map((c) => c.date), ...practices.map((p) => p.date)]);
}

/** 日付ごとの活動数（寄り道ログ＋稽古） */
export function countByDate(chances: Chance[], practices: Practice[]): Map<string, number> {
  const map = new Map<string, number>();
  [...chances.map((c) => c.date), ...practices.map((p) => p.date)]
    .forEach((d) => map.set(d, (map.get(d) ?? 0) + 1));
  return map;
}

export function stageCounts(chances: Chance[]): Record<Stage, number> {
  const map: Record<Stage, number> = { seed: 0, sprout: 0, flower: 0, fruit: 0 };
  chances.filter((c) => c.choice === 'go').forEach((c) => { map[c.stage] += 1; });
  return map;
}

/** 見直し日が来た保留 */
export function dueHolds(chances: Chance[], day: string): Chance[] {
  return chances.filter((c) => c.choice === 'hold' && (!c.holdUntil || c.holdUntil <= day));
}

/** ふりかえり待ちのあき枠（今週より前で、日付が過ぎているもののうち最新の1件） */
export function pendingPastSlot(slots: OpenSlot[], day: string, thisWeek: string): OpenSlot | null {
  const past = slots.filter((s) => s.week < thisWeek && s.date <= day && !s.result);
  past.sort((a, b) => b.week.localeCompare(a.week));
  return past[0] ?? null;
}

/** 空けられた週の数（予定を入れなかった週） */
export function keptSlots(slots: OpenSlot[]): number {
  return slots.filter((s) => s.result === 'chance' || s.result === 'rest').length;
}

/** 寄ってみた割合（保留中は数えない） */
export function goRate(chances: Chance[]): number | null {
  const decided = chances.filter((c) => c.choice !== 'hold');
  if (!decided.length) return null;
  return decided.filter((c) => c.choice === 'go').length / decided.length;
}

export function latestAssessment(list: Assessment[]): Assessment | null {
  return list.length ? list[list.length - 1] : null;
}

/** 見送ったときに「足りなかった」と選ばれた回数がいちばん多い力 */
export function weakFromPass(chances: Chance[]): PowerKey | null {
  const count = new Map<PowerKey, number>();
  chances.filter((c) => c.choice === 'pass').forEach((c) => c.powers.forEach((k) => count.set(k, (count.get(k) ?? 0) + 1)));
  let best: PowerKey | null = null;
  let max = 0;
  count.forEach((v, k) => { if (v > max) { max = v; best = k; } });
  return best;
}

/**
 * 今日の稽古で鍛える力。
 * 自己チェックがあれば点数がいちばん低いもの（同点なら稽古回数が少ないもの）、
 * なければ日替わりで順番に。
 */
export function todayPower(chances: Chance[], practices: Practice[], assessments: Assessment[], day: string): PowerKey {
  const latest = latestAssessment(assessments);
  if (!latest) return POWERS[hashString(day) % POWERS.length].key;
  const stats = powerStats(chances, practices);
  const sorted = [...POWERS].sort((a, b) =>
    latest.scores[a.key] - latest.scores[b.key] || stats[a.key].practices - stats[b.key].practices);
  return sorted[0].key;
}

/** 力のお題を日替わりで選ぶ（offset で「別のお題」） */
export function drillIndex(power: PowerKey, day: string, offset: number, length: number): number {
  return (hashString(`${day}:${power}`) + offset) % length;
}

/** 「寄り道のあゆみ」でくらべる期間の長さ（日） */
export const COMPARE_DAYS = 30;

export function daysBetween(from: string, to: string): number {
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86400000);
}

export interface PeriodStat {
  from: string;
  to: string;
  /** メモした偶然 */
  memos: number;
  /** 寄ってみた偶然 */
  goes: number;
  /** 寄ってみた割合（保留中は数えない） */
  rate: number | null;
  /** 芽より先に育った寄り道 */
  grown: number;
  /** 寄り道でいちばん多く使った力 */
  topPower: PowerKey | null;
}

export function periodStat(chances: Chance[], from: string, to: string): PeriodStat {
  const list = chances.filter((c) => c.date >= from && c.date <= to);
  const goes = list.filter((c) => c.choice === 'go');
  const count = new Map<PowerKey, number>();
  goes.forEach((c) => c.powers.forEach((k) => count.set(k, (count.get(k) ?? 0) + 1)));
  let topPower: PowerKey | null = null;
  let max = 0;
  POWERS.forEach((p) => {
    const v = count.get(p.key) ?? 0;
    if (v > max) { max = v; topPower = p.key; }
  });
  return {
    from,
    to,
    memos: list.length,
    goes: goes.length,
    rate: goRate(list),
    grown: goes.filter((c) => c.stage !== 'seed').length,
    topPower,
  };
}

/**
 * はじめの頃（最初のメモから30日）と最近（今日までの30日）をくらべる。
 * 最初のメモからの日数が短く、2つの期間が重なるうちは recent を null にする。
 */
export function journeyCompare(chances: Chance[], day: string): { start: string; days: number; first: PeriodStat; recent: PeriodStat | null } | null {
  if (!chances.length) return null;
  const start = chances.reduce((min, c) => (c.date < min ? c.date : min), chances[0].date);
  const days = daysBetween(start, day);
  const first = periodStat(chances, start, addDays(start, COMPARE_DAYS - 1));
  const recentFrom = addDays(day, -(COMPARE_DAYS - 1));
  const recent = recentFrom > first.to ? periodStat(chances, recentFrom, day) : null;
  return { start, days, first, recent };
}
