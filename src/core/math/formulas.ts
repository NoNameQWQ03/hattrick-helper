import type { TrainingGoal } from '../types/domain';

/**
 * 1. 比赛体力系数公式（社区验证模型）：
 * StaminaFactor = ((StaminaLevel + 6.5) / 14) ^ 0.6
 */
export function calculateStaminaFactor(staminaLevel: number): number {
  const clamped = Math.max(1, Math.min(9, staminaLevel));
  return Math.pow((clamped + 6.5) / 14, 0.6);
}

/**
 * 2. 队长经验对全队经验的加成公式（来自 The Unwritten Manual）：
 * TeamExperience = ((Sum(11 Players' XP) + CaptainXP) / 12) * (1 - (7 - CaptainLeadership) / 20)
 */
export function calculateTeamExperience(
  elevenPlayerXps: number[],
  captainXp: number,
  captainLeadership: number
): number {
  if (elevenPlayerXps.length === 0) return 0;
  const sumXp = elevenPlayerXps.reduce((acc, xp) => acc + Math.max(0, xp), 0);
  const clampedLeadership = Math.max(1, Math.min(7, captainLeadership));
  const avgWithCaptain = (sumXp + Math.max(0, captainXp)) / (elevenPlayerXps.length + 1);
  const leadershipFactor = 1 - (7 - clampedLeadership) / 20;
  return avgWithCaptain * leadershipFactor;
}

export interface CaptainCandidate {
  id: number;
  name: string;
  experience: number;
  leadership: number;
}

export function findBestCaptain(candidates: CaptainCandidate[]): {
  best: CaptainCandidate | null;
  teamExperience: number;
} {
  if (candidates.length === 0) return { best: null, teamExperience: 0 };
  // 按 11 人首发经验基准模拟（取队内经验最高的前 11 人），避免大名单替补稀释队长自身经验权重
  const topElevenXps = candidates
    .map((c) => c.experience)
    .sort((a, b) => b - a)
    .slice(0, 11);
  let best = candidates[0]!;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = calculateTeamExperience(topElevenXps, candidate.experience, candidate.leadership);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return { best, teamExperience: Number(bestScore.toFixed(2)) };
}

/**
 * 3. 青训提拔条件计算：
 * 必须同时满足 年满 17 岁 0 天 且 在青训营待满 112 天（1 完整赛季）。
 */
export interface YouthPromotionCheck {
  eligibleNow: boolean;
  daysUntil17: number;
  daysUntil112: number;
  daysRemaining: number;
  bottleneck: 'ready' | 'age' | 'academy_stay';
}

export function calculateYouthPromotionStatus(
  ageYears: number,
  ageDays: number,
  daysInAcademy: number
): YouthPromotionCheck {
  const totalAgeDays = ageYears * 112 + ageDays;
  const targetAgeDays = 17 * 112;
  const daysUntil17 = Math.max(0, targetAgeDays - totalAgeDays);
  const daysUntil112 = Math.max(0, 112 - daysInAcademy);
  const daysRemaining = Math.max(daysUntil17, daysUntil112);

  let bottleneck: YouthPromotionCheck['bottleneck'] = 'ready';
  if (daysRemaining > 0) {
    bottleneck = daysUntil17 >= daysUntil112 ? 'age' : 'academy_stay';
  }

  return {
    eligibleNow: daysRemaining === 0,
    daysUntil17,
    daysUntil112,
    daysRemaining,
    bottleneck,
  };
}

/**
 * 4. 球场扩建 63% / 25% / 10% / 2% 基准比例测算器
 * 返回目标配比及各看台需扩建的差值（不建议直接拆座位，缺口为正值才施工）。
 */
export interface ArenaLayout {
  terraces: number;
  basic: number;
  roof: number;
  vip: number;
}

export interface ArenaExpansionPlan {
  currentTotal: number;
  targetTotal: number;
  targetLayout: ArenaLayout;
  deltaToAdd: ArenaLayout;
  totalAddedSeats: number;
}

export function calculateStadiumExpansion(
  current: ArenaLayout,
  targetTotalCapacity: number
): ArenaExpansionPlan {
  const currentTotal = current.terraces + current.basic + current.roof + current.vip;
  const safeTarget = Math.max(currentTotal, Math.round(targetTotalCapacity));

  const targetTerraces = Math.round(safeTarget * 0.63);
  const targetBasic = Math.round(safeTarget * 0.25);
  const targetRoof = Math.round(safeTarget * 0.10);
  const targetVip = Math.max(0, safeTarget - targetTerraces - targetBasic - targetRoof);

  const deltaToAdd: ArenaLayout = {
    terraces: Math.max(0, targetTerraces - current.terraces),
    basic: Math.max(0, targetBasic - current.basic),
    roof: Math.max(0, targetRoof - current.roof),
    vip: Math.max(0, targetVip - current.vip),
  };

  return {
    currentTotal,
    targetTotal: safeTarget,
    targetLayout: {
      terraces: targetTerraces,
      basic: targetBasic,
      roof: targetRoof,
      vip: targetVip,
    },
    deltaToAdd,
    totalAddedSeats:
      deltaToAdd.terraces + deltaToAdd.basic + deltaToAdd.roof + deltaToAdd.vip,
  };
}

/**
 * 5. 训练升一级所需周数基准估算（参考 1-5 级教练体系与 17 岁各技能公开经验速度）
 * 返回区间 [minWeeks, maxWeeks]，明确标注为近似规划参考值。
 */
export interface TrainingEstimateInput {
  trainingType: Exclude<TrainingGoal, 'UNSET'>;
  currentSkillLevel: number;
  ageYears: number;
  coachLevel: number; // 1..5
  assistantSum: number; // 0..10
  staminaSharePct: number; // 5..100
  intensityPct: number; // 0..100
}

export interface TrainingEstimateResult {
  minWeeks: number;
  maxWeeks: number;
  efficiencyNote: string;
}

// 17岁、5级教练、8级助教、10%体力、100%强度下的 5->8 级中段基线（周/级）
const BASE_WEEKS_AT_17_MID: Record<Exclude<TrainingGoal, 'UNSET'>, number> = {
  GK: 1.9,
  DEF: 3.0,
  WING: 2.9,
  PM: 4.0,
  SCOR: 4.5,
  PASS: 5.8,
};

export function estimateTrainingWeeksPerLevel(
  input: TrainingEstimateInput
): TrainingEstimateResult {
  const baseMid = BASE_WEEKS_AT_17_MID[input.trainingType];
  const agePenalty = 1 + Math.max(0, input.ageYears - 17) * 0.085;
  const skillFactor = Math.max(0.55, 0.72 + (input.currentSkillLevel - 5) * 0.14);

  // 教练 1-5 级效率系数（5级=1.00，4级≈0.93，3级≈0.85）
  const clampedCoach = Math.max(1, Math.min(5, input.coachLevel));
  const coachSpeed = 0.70 + clampedCoach * 0.06;

  // 助教总和 0-10（0级约0.74，8级约0.94，10级=1.00）
  const clampedAssist = Math.max(0, Math.min(10, input.assistantSum));
  const assistSpeed = 0.74 + clampedAssist * 0.026;

  const intensityRatio = Math.max(0.1, Math.min(1, input.intensityPct / 100));
  const primaryShareRatio = Math.max(0.1, (100 - Math.min(90, input.staminaSharePct)) / 90);

  const combinedSpeed = coachSpeed * assistSpeed * intensityRatio * primaryShareRatio;
  const centerWeeks = (baseMid * agePenalty * skillFactor) / combinedSpeed;

  const minWeeks = Number(Math.max(0.8, centerWeeks * 0.85).toFixed(1));
  const maxWeeks = Number(Math.max(minWeeks + 0.3, centerWeeks * 1.15).toFixed(1));

  let efficiencyNote = '配置合理，训练速度正常。';
  if (input.intensityPct < 100) {
    efficiencyNote = '警告：训练强度低于 100%，速度被白白拖慢！';
  } else if (clampedCoach < 4) {
    efficiencyNote = '提示：主教练低于 4 级（良好），建议资金允许后尽快换 4 级教练。';
  } else if (clampedAssist < 8) {
    efficiencyNote = '提示：助教总等级不足 8 级（双 4 级），还有明显提速空间。';
  }

  return { minWeeks, maxWeeks, efficiencyNote };
}
