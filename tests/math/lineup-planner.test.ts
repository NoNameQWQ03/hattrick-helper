import { describe, expect, it } from 'vitest';
import { recommendLineupPlan } from '../../src/core/math/lineup-planner';
import type { CompactSquadPlayer, PlayerSkills } from '../../src/core/types/domain';

function makePlayer(
  playerId: number,
  name: string,
  ageYears: number,
  overrides: Partial<PlayerSkills> = {},
  stamina = 7,
  form = 6
): CompactSquadPlayer {
  return {
    playerId,
    name,
    ageYears,
    stamina,
    form,
    specialty: null,
    skills: {
      keeper: 2,
      defending: 4,
      playmaking: 4,
      winger: 4,
      passing: 4,
      scoring: 4,
      setPieces: 3,
      ...overrides,
    },
  };
}

function buildSampleRoster(): CompactSquadPlayer[] {
  return [
    makePlayer(1, 'Tapani Leppiniemi', 28, { keeper: 7, defending: 2, playmaking: 2, scoring: 1 }),
    makePlayer(2, 'Young Keeper', 18, { keeper: 5, defending: 2, playmaking: 1, scoring: 1 }),
    makePlayer(3, 'Young Def 1', 18, { defending: 6 }),
    makePlayer(4, 'Young Def 2', 19, { defending: 6 }),
    makePlayer(5, 'Young Def 3', 20, { defending: 5 }),
    makePlayer(6, 'Young Def 4', 21, { defending: 5 }),
    makePlayer(7, 'Young Def 5', 17, { defending: 4 }),
    makePlayer(8, 'Old Stopper', 30, { defending: 7 }),
    makePlayer(9, 'Veteran Mid 1', 26, { playmaking: 8, passing: 6 }),
    makePlayer(10, 'Young Mid 2', 19, { playmaking: 6, passing: 5 }),
    makePlayer(11, 'Veteran Mid 3', 27, { playmaking: 7, defending: 5 }),
    makePlayer(12, 'Wing Master', 25, { winger: 8, passing: 6 }),
    makePlayer(13, 'Wing Runner', 24, { winger: 7, playmaking: 5 }),
    makePlayer(14, 'Main Striker', 26, { scoring: 8, passing: 6 }),
    makePlayer(15, 'Sub Striker', 25, { scoring: 7, passing: 5 }),
    makePlayer(16, 'Third Striker', 20, { scoring: 6, passing: 5 }),
  ];
}

describe('recommendLineupPlan', () => {
  it('returns null when squad roster is empty', () => {
    expect(recommendLineupPlan([], 'DEF')).toBeNull();
  });

  it('builds 5-3-2 for DEF and prioritizes <=21yo trainees into all 5 defender slots', () => {
    const plan = recommendLineupPlan(buildSampleRoster(), 'DEF');
    expect(plan).not.toBeNull();
    expect(plan!.formationName).toContain('5-3-2');
    expect(plan!.assignments).toHaveLength(11);

    const uniqueIds = new Set(plan!.assignments.map((a) => a.playerId));
    expect(uniqueIds.size).toBe(11);

    const defSlots = plan!.assignments.filter((a) => [101, 102, 103, 104, 105].includes(a.slotId));
    expect(defSlots).toHaveLength(5);
    expect(defSlots.every((d) => d.isTraineeSlot)).toBe(true);
    // 5名<=21岁年轻后卫全部优先入选吃5后卫训练，而不是让30岁老将抢走后卫训练槽
    const youngDefIds = new Set([3, 4, 5, 6, 7]);
    expect(defSlots.every((d) => youngDefIds.has(d.playerId))).toBe(true);
    expect(plan!.assignments.find((a) => a.slotId === 100)?.playerId).toBe(1);
  });

  it('prioritizes young keeper for GK training and builds 3-5-2', () => {
    const plan = recommendLineupPlan(buildSampleRoster(), 'GK');
    expect(plan).not.toBeNull();
    expect(plan!.formationName).toContain('3-5-2');
    const gk = plan!.assignments.find((a) => a.slotId === 100);
    expect(gk?.playerId).toBe(2);
    expect(gk?.isTraineeSlot).toBe(true);
  });

  it('builds 3-5-2 for PM and 3-4-3 for SCOR, and balanced 3-5-2 for UNSET', () => {
    const roster = buildSampleRoster();
    const pm = recommendLineupPlan(roster, 'PM');
    expect(pm?.assignments.filter((a) => a.isTraineeSlot)).toHaveLength(5);

    const scor = recommendLineupPlan(roster, 'SCOR');
    expect(scor?.formationName).toContain('3-4-3');
    expect(scor?.assignments.filter((a) => [111, 112, 113].includes(a.slotId))).toHaveLength(3);

    const unset = recommendLineupPlan(roster, 'UNSET');
    expect(unset?.formationName).toContain('3-5-2');
    expect(unset?.assignments.every((a) => !a.isTraineeSlot)).toBe(true);
  });
});
