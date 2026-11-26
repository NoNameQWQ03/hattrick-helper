import type { ParsedSeniorPlayer, PlayerSkills, PlayerSnapshotRecord, SkillKey } from '../types/domain';

export interface SnapshotDiffSummary {
  hasHistory: boolean;
  tsiDelta: number;
  poppedSkills: Array<{ skill: SkillKey; from: number; to: number }>;
  trendBadge: string | null;
}

const TRACKABLE_SKILLS: readonly SkillKey[] = [
  'keeper',
  'defending',
  'playmaking',
  'winger',
  'passing',
  'scoring',
  'setPieces',
];

const SKILL_ZH: Record<SkillKey, string> = {
  keeper: '守门',
  defending: '防守',
  playmaking: '组织',
  winger: '边锋',
  passing: '传球',
  scoring: '进球',
  setPieces: '定位球',
};

export function getSkillDiffs(
  prev: PlayerSkills,
  curr: PlayerSkills
): Array<{ skill: SkillKey; from: number; to: number }> {
  const popped: Array<{ skill: SkillKey; from: number; to: number }> = [];
  for (const key of TRACKABLE_SKILLS) {
    if (curr[key] > prev[key]) {
      popped.push({ skill: key, from: prev[key], to: curr[key] });
    }
  }
  return popped;
}

/**
 * 对比当前球员数据与历史最早/前一次快照，得出 TSI 增量与升星动态提示。
 */
export function compareWithPreviousSnapshot(
  current: ParsedSeniorPlayer,
  previous: PlayerSnapshotRecord | undefined
): SnapshotDiffSummary {
  if (!previous) {
    return { hasHistory: false, tsiDelta: 0, poppedSkills: [], trendBadge: null };
  }

  const tsiDelta = current.tsi - previous.tsi;
  const poppedSkills = getSkillDiffs(previous.skills, current.skills);

  let trendBadge: string | null = null;
  if (poppedSkills.length > 0) {
    const names = poppedSkills.map((p) => `${SKILL_ZH[p.skill]}${p.from}→${p.to}`).join('/');
    trendBadge = `✨ 升星: ${names}`;
  } else if (tsiDelta >= 80 && current.ageYears <= 23) {
    trendBadge = `📈 TSI +${tsiDelta}（训练增长中）`;
  } else if (tsiDelta <= -150 && current.ageYears >= 28) {
    trendBadge = `📉 TSI ${tsiDelta}`;
  }

  return {
    hasHistory: true,
    tsiDelta,
    poppedSkills,
    trendBadge,
  };
}

/**
 * 返回用于周度去重的自然周期 Key（YYYYWW 整数编码）。
 */
export function getWeekBucketKey(nowMs = Date.now()): { htSeason: number; htWeek: number } {
  const d = new Date(nowMs);
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const days = Math.floor((nowMs - startOfYear.getTime()) / 86400000);
  const weekNum = Math.floor(days / 7) + 1;
  return {
    htSeason: d.getUTCFullYear(),
    htWeek: weekNum,
  };
}
