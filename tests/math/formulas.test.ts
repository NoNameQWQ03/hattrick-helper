import { describe, expect, it } from 'vitest';
import {
  calculateStadiumExpansion,
  calculateStaminaFactor,
  calculateTeamExperience,
  calculateYouthPromotionStatus,
  estimateTrainingWeeksPerLevel,
  findBestCaptain,
} from '../../src/core/math/formulas';

describe('math/formulas', () => {
  it('computes stamina factor accurately within bounds', () => {
    const at7 = calculateStaminaFactor(7);
    const expected7 = Math.pow((7 + 6.5) / 14, 0.6);
    expect(at7).toBeCloseTo(expected7, 6);

    const at1 = calculateStaminaFactor(1);
    const at9 = calculateStaminaFactor(9);
    expect(at9).toBeGreaterThan(at7);
    expect(at7).toBeGreaterThan(at1);
  });

  it('computes captaincy team experience and picks best leader+xp candidate', () => {
    const xps = [3, 4, 4, 5, 5, 6, 6, 7, 8, 9, 10];
    const teamXp = calculateTeamExperience(xps, 10, 7);
    // (67 + 10) / 12 * (1 - 0) = 6.416666...
    expect(teamXp).toBeCloseTo(77 / 12, 4);

    const picked = findBestCaptain([
      { id: 1, name: '高经验低领导', experience: 10, leadership: 3 },
      { id: 2, name: '高领导稳健队长', experience: 8, leadership: 7 },
    ]);
    expect(picked.best?.id).toBe(2);

    // 40人大名单中，经验14领导5的老将应击败经验1领导7的纯新人（使用前11人首发基准）
    const reserves = Array.from({ length: 30 }, (_, i) => ({
      id: 100 + i,
      name: `替补${i}`,
      experience: 1,
      leadership: 3,
    }));
    const bloatedPick = findBestCaptain([
      { id: 10, name: '高经验老将', experience: 14, leadership: 5 },
      { id: 11, name: '低经验高领导新人', experience: 1, leadership: 7 },
      ...Array.from({ length: 9 }, (_, i) => ({
        id: 20 + i,
        name: `主力${i}`,
        experience: 6,
        leadership: 4,
      })),
      ...reserves,
    ]);
    expect(bloatedPick.best?.id).toBe(10);
  });

  it('checks youth promotion requiring BOTH 17y0d AND 112 academy days', () => {
    // 17岁0天，但在营仅 100 天 -> 还差 12 天
    const stayBlocked = calculateYouthPromotionStatus(17, 0, 100);
    expect(stayBlocked.eligibleNow).toBe(false);
    expect(stayBlocked.daysRemaining).toBe(12);
    expect(stayBlocked.bottleneck).toBe('academy_stay');

    // 在营已满 130 天，但仅 16岁100天 -> 还差 12 天到 17 岁
    const ageBlocked = calculateYouthPromotionStatus(16, 100, 130);
    expect(ageBlocked.eligibleNow).toBe(false);
    expect(ageBlocked.daysRemaining).toBe(12);
    expect(ageBlocked.bottleneck).toBe('age');

    // 双条件满足
    const ready = calculateYouthPromotionStatus(17, 2, 112);
    expect(ready.eligibleNow).toBe(true);
    expect(ready.daysRemaining).toBe(0);
    expect(ready.bottleneck).toBe('ready');
  });

  it('computes 63/25/10/2 stadium expansion seat deltas without removing existing seats', () => {
    const plan = calculateStadiumExpansion(
      { terraces: 8000, basic: 3000, roof: 1000, vip: 0 },
      20000
    );
    expect(plan.currentTotal).toBe(12000);
    expect(plan.targetLayout).toEqual({
      terraces: 12600,
      basic: 5000,
      roof: 2000,
      vip: 400,
    });
    expect(plan.deltaToAdd).toEqual({
      terraces: 4600,
      basic: 2000,
      roof: 1000,
      vip: 400,
    });
    expect(plan.totalAddedSeats).toBe(8000);
  });

  it('estimates GK faster than PM and warns when intensity < 100', () => {
    const gk = estimateTrainingWeeksPerLevel({
      trainingType: 'GK',
      currentSkillLevel: 6,
      ageYears: 17,
      coachLevel: 4,
      assistantSum: 8,
      staminaSharePct: 10,
      intensityPct: 100,
    });
    const pm = estimateTrainingWeeksPerLevel({
      trainingType: 'PM',
      currentSkillLevel: 6,
      ageYears: 17,
      coachLevel: 4,
      assistantSum: 8,
      staminaSharePct: 10,
      intensityPct: 100,
    });
    expect(gk.maxWeeks).toBeLessThan(pm.minWeeks);

    const lowIntensity = estimateTrainingWeeksPerLevel({
      trainingType: 'GK',
      currentSkillLevel: 6,
      ageYears: 17,
      coachLevel: 4,
      assistantSum: 8,
      staminaSharePct: 10,
      intensityPct: 80,
    });
    expect(lowIntensity.efficiencyNote).toContain('100%');
  });
});
