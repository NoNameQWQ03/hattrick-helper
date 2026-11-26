import { describe, expect, it } from 'vitest';
import { evaluateRookieDiagnostics } from '../../src/core/rules/engine';
import { recommendTrainingPath } from '../../src/core/rules/training-advisor';
import type { ManualRookieState } from '../../src/core/types/domain';

const baseHealthyState: ManualRookieState = {
  newbieLicenseDone: true,
  trainingGoal: 'GK',
  trainingIntensityPct: 100,
  staminaSharePct: 10,
  seniorFriendlyBookedThisWeek: true,
  headCoachLevel: 4,
  assistantSum: 8,
  medicLevel: 4,
  weeklyCashEuro: 300000,
  weeklyNetBalanceEuro: 25000,
  youthAcademyActive: true,
  youthScoutsCount: 1,
  daysSinceLastYouthFriendly: 7,
  recentSunnyHomeFullCount: 0,
};

describe('rules/engine & training-advisor', () => {
  it('flags missing newbie license, unset training, missing friendly, and YA friendly due', () => {
    const alerts = evaluateRookieDiagnostics({
      ...baseHealthyState,
      newbieLicenseDone: false,
      trainingGoal: 'UNSET',
      trainingIntensityPct: 90,
      staminaSharePct: 25,
      seniorFriendlyBookedThisWeek: false,
      headCoachLevel: 3,
      assistantSum: 6,
      medicLevel: 0,
      youthScoutsCount: 3,
      weeklyCashEuro: 15000,
      weeklyNetBalanceEuro: -12000,
      daysSinceLastYouthFriendly: 21,
    });

    const ids = alerts.map((a) => a.id);
    expect(ids).toContain('SURVIVAL_NEWBIE_LICENSE');
    expect(ids).toContain('TRAIN_GOAL_UNSET');
    expect(ids).toContain('TRAIN_INTENSITY_NOT_100');
    expect(ids).toContain('TRAIN_STAMINA_OUT_OF_RANGE');
    expect(ids).toContain('TRAIN_NO_FRIENDLY_BOOKED');
    expect(ids).toContain('STAFF_COACH_LEVEL_LOW');
    expect(ids).toContain('STAFF_ASSISTANT_SUBOPTIMAL');
    expect(ids).toContain('STAFF_MEDIC_NEEDED');
    expect(ids).toContain('YOUTH_FINANCE_STRAIN');
    expect(ids).toContain('YOUTH_FRIENDLY_DUE');
    expect(ids).toContain('SURVIVAL_BANKRUPTCY_RISK');
  });

  it('unlocks stadium expansion only when consecutive sunny home matches are full', () => {
    const early = evaluateRookieDiagnostics(baseHealthyState);
    expect(early.map((a) => a.id)).toContain('STADIUM_DO_NOT_EXPAND_EARLY');

    const ready = evaluateRookieDiagnostics({
      ...baseHealthyState,
      recentSunnyHomeFullCount: 2,
    });
    expect(ready.map((a) => a.id)).toContain('STADIUM_EXPANSION_READY');
  });

  it('recommends GK for tight cashflow with active YA and PM for balanced healthy cashflow', () => {
    const tight = recommendTrainingPath({
      weeklyCashEuro: 90000,
      weeklyNetBalanceEuro: 2000,
      youthAcademyActive: true,
      preference: 'fast_cash',
    });
    expect(tight.primaryPick.goal).toBe('GK');

    const balanced = recommendTrainingPath({
      weeklyCashEuro: 400000,
      weeklyNetBalanceEuro: 40000,
      youthAcademyActive: true,
      preference: 'balanced_league',
    });
    expect(balanced.primaryPick.goal).toBe('PM');
  });

  it('detects real-world synced traps: cost inversion, extended training, bloated squad, and ready youth', () => {
    const alerts = evaluateRookieDiagnostics({
      ...baseHealthyState,
      headCoachLevel: 2,
      assistantSum: 10,
      staminaSharePct: 50,
      weeklyCashEuro: -349598,
      weeklyNetBalanceEuro: -57032,
      autoSynced: {
        squadCount: 44,
        trainingCode: '11',
        trainingLabel: '防守（门将、后卫和所有中场球员）',
        psychologistLevel: 5,
        stadiumUnderConstruction: true,
        youthPromotableNames: ['小妖甲', '小妖乙'],
        youthTopProspects: [{ name: '小妖丙', ageLabel: '16岁48天', maxPotential: 8 }],
        syncedPages: {},
      },
    });

    const ids = alerts.map((a) => a.id);
    expect(ids).toContain('SURVIVAL_BANKRUPTCY_RISK');
    expect(ids).toContain('TRAIN_EXTENDED_INEFFICIENT');
    expect(ids).toContain('STAFF_COST_INVERSION');
    expect(ids).toContain('SQUAD_BLOATED_WAGES');
    expect(ids).toContain('YOUTH_PROMOTE_READY_NOW');
    expect(ids).toContain('YOUTH_TOP_PROSPECTS_DETECTED');
    expect(ids).toContain('STADIUM_UNDER_CONSTRUCTION');
  });
});
