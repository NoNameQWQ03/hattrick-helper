import type {
  CompactSquadPlayer,
  LineupSlotRecommendation,
  TrainingGoal,
} from '../types/domain';
import { calculateStaminaFactor } from './formulas';

export interface LineupPlan {
  formationName: string;
  assignments: LineupSlotRecommendation[];
}

interface SlotDef {
  slotId: number;
  roleZh: string;
  group: 'GK' | 'WB' | 'CD' | 'W' | 'IM' | 'FW';
}

const SLOT_CATALOG: Record<number, SlotDef> = {
  100: { slotId: 100, roleZh: '门将', group: 'GK' },
  101: { slotId: 101, roleZh: '左边卫', group: 'WB' },
  102: { slotId: 102, roleZh: '左中卫', group: 'CD' },
  103: { slotId: 103, roleZh: '中卫', group: 'CD' },
  104: { slotId: 104, roleZh: '右中卫', group: 'CD' },
  105: { slotId: 105, roleZh: '右边卫', group: 'WB' },
  106: { slotId: 106, roleZh: '左边锋', group: 'W' },
  107: { slotId: 107, roleZh: '左中前卫', group: 'IM' },
  108: { slotId: 108, roleZh: '中前卫', group: 'IM' },
  109: { slotId: 109, roleZh: '右中前卫', group: 'IM' },
  110: { slotId: 110, roleZh: '右边锋', group: 'W' },
  111: { slotId: 111, roleZh: '左前锋', group: 'FW' },
  112: { slotId: 112, roleZh: '中锋', group: 'FW' },
  113: { slotId: 113, roleZh: '右前锋', group: 'FW' },
};

const FORMATION_TEMPLATES: Record<TrainingGoal, { name: string; slots: number[] }> = {
  GK: { name: '3-5-2（门将通用）', slots: [100, 102, 103, 104, 106, 107, 108, 109, 110, 111, 112] },
  DEF: { name: '5-3-2（吃满5后卫训练）', slots: [100, 101, 102, 103, 104, 105, 107, 108, 109, 111, 112] },
  PM: { name: '3-5-2（吃满中场组织训练）', slots: [100, 102, 103, 104, 106, 107, 108, 109, 110, 111, 112] },
  WING: { name: '4-4-2（边锋+边卫联动）', slots: [100, 101, 102, 104, 105, 106, 107, 109, 110, 111, 112] },
  SCOR: { name: '3-4-3（吃满3前锋进球）', slots: [100, 102, 103, 104, 106, 107, 109, 110, 111, 112, 113] },
  PASS: { name: '3-5-2（中前场传球）', slots: [100, 102, 103, 104, 106, 107, 108, 109, 110, 111, 112] },
  UNSET: { name: '3-5-2（均衡最强首发）', slots: [100, 102, 103, 104, 106, 107, 108, 109, 110, 111, 112] },
};

function isTraineeSlot(group: SlotDef['group'], goal: TrainingGoal): boolean {
  if (goal === 'GK') return group === 'GK';
  if (goal === 'DEF') return group === 'CD' || group === 'WB';
  if (goal === 'PM') return group === 'IM' || group === 'W';
  if (goal === 'WING') return group === 'W' || group === 'WB';
  if (goal === 'SCOR') return group === 'FW';
  if (goal === 'PASS') return group === 'IM' || group === 'W' || group === 'FW';
  return false;
}

function scorePlayerForSlot(
  player: CompactSquadPlayer,
  group: SlotDef['group'],
  traineePriority: boolean
): number {
  const s = player.skills;
  let baseSkill = 0;
  if (group === 'GK') baseSkill = s.keeper;
  else if (group === 'CD') baseSkill = s.defending * 0.85 + s.playmaking * 0.15;
  else if (group === 'WB') baseSkill = s.defending * 0.7 + s.winger * 0.3;
  else if (group === 'IM') baseSkill = s.playmaking * 0.7 + s.passing * 0.15 + s.defending * 0.15;
  else if (group === 'W') baseSkill = s.winger * 0.65 + s.playmaking * 0.2 + s.passing * 0.15;
  else if (group === 'FW') baseSkill = s.scoring * 0.75 + s.passing * 0.2 + s.winger * 0.05;

  const formMultiplier = 0.75 + Math.max(1, player.form) * 0.035;
  const staminaFactor = calculateStaminaFactor(Math.max(1, player.stamina));
  let score = baseSkill * formMultiplier * staminaFactor;

  // 若该位置属于主训槽位，对 17–21 岁潜力苗子加权优先上场吃经验
  if (traineePriority && player.ageYears <= 21) {
    score += 4.0 + Math.max(0, 21 - player.ageYears) * 0.3;
  }

  return score;
}

function shortenPlayerName(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');
  if (parts.length >= 2 && cleaned.length > 10) {
    return `${parts[0]!.slice(0, 1)}. ${parts[parts.length - 1]}`;
  }
  return cleaned.slice(0, 12);
}

function formatPrimaryHint(player: CompactSquadPlayer, group: SlotDef['group']): string {
  const s = player.skills;
  if (group === 'GK') return `守门${s.keeper}`;
  if (group === 'CD' || group === 'WB') return `防守${s.defending}`;
  if (group === 'IM') return `组织${s.playmaking}`;
  if (group === 'W') return `边锋${s.winger}`;
  return `进球${s.scoring}`;
}

/**
 * 根据主训目标与真实一线队名单，生成傻瓜式逐位置（#100..#113）11人摆阵推荐方案。
 */
export function recommendLineupPlan(
  roster: CompactSquadPlayer[],
  trainingGoal: TrainingGoal
): LineupPlan | null {
  if (roster.length === 0) return null;

  const template = FORMATION_TEMPLATES[trainingGoal] ?? FORMATION_TEMPLATES.UNSET;
  const slotDefs = template.slots
    .map((id) => SLOT_CATALOG[id])
    .filter((d): d is SlotDef => Boolean(d));

  // 先填主训位置（优先塞进年轻苗子吃训练），再填其余位置（按实战最高分）
  const orderedSlots = [...slotDefs].sort((a, b) => {
    const aTrain = isTraineeSlot(a.group, trainingGoal) ? 0 : 1;
    const bTrain = isTraineeSlot(b.group, trainingGoal) ? 0 : 1;
    return aTrain - bTrain || a.slotId - b.slotId;
  });

  const usedIds = new Set<number>();
  const pickedBySlotId = new Map<number, LineupSlotRecommendation>();

  for (const slot of orderedSlots) {
    const traineeSlot = isTraineeSlot(slot.group, trainingGoal);
    let bestPlayer: CompactSquadPlayer | null = null;
    let bestScore = -1;

    for (const player of roster) {
      if (usedIds.has(player.playerId)) continue;
      const score = scorePlayerForSlot(player, slot.group, traineeSlot);
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    }

    if (!bestPlayer) break;
    usedIds.add(bestPlayer.playerId);

    const skillHint = formatPrimaryHint(bestPlayer, slot.group);
    const reason =
      traineeSlot && bestPlayer.ageYears <= 21
        ? `🌟 ${bestPlayer.ageYears}岁主训苗(${skillHint})`
        : `💪 最强实战(${skillHint}/状${bestPlayer.form})`;

    pickedBySlotId.set(slot.slotId, {
      slotId: slot.slotId,
      roleZh: slot.roleZh,
      playerId: bestPlayer.playerId,
      playerName: bestPlayer.name,
      shortName: shortenPlayerName(bestPlayer.name),
      reason,
      isTraineeSlot: traineeSlot,
    });
  }

  const assignments = template.slots
    .map((id) => pickedBySlotId.get(id))
    .filter((a): a is LineupSlotRecommendation => Boolean(a));

  return {
    formationName: template.name,
    assignments,
  };
}
