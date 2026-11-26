import type { DiagnosticItem, ManualRookieState, ParsedLineupData } from '../types/domain';

/**
 * 排阵页（MatchOrder）陪伴式检查规则。
 */
export function evaluateLineupDiagnostics(
  lineup: ParsedLineupData,
  state: ManualRookieState
): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];
  const auto = state.autoSynced;

  // 1. 阵型合规 / 人数不足检查
  if (
    lineup.totalStarters < 9 ||
    lineup.keeperCount === 0 ||
    lineup.defenderCount > 5 ||
    lineup.innerMidfielderCount > 3 ||
    lineup.forwardCount > 3
  ) {
    items.push({
      id: 'LINEUP_ILLEGAL_FORMATION_RISK',
      category: 'tactics',
      severity: 'critical',
      title: `注意！这套阵型（${lineup.formationText} / ${lineup.totalStarters}人）不符合规则，会丢掉本周训练`,
      reason:
        '游戏规定：至少要排满 9 人、必须有门将，且每条线不能超人数（后卫最多 5、中前卫最多 3、前锋最多 3），否则全队本周一丁点训练都拿不到！',
      actionHint: '对照球场上的贴纸再检查一遍人数，排满合规的 11 人再点保存。',
    });
  }

  // 2. 生死之战（MOTS）防误选提示
  if (lineup.attitude === 'mots') {
    items.push({
      id: 'LINEUP_MOTS_WARNING',
      category: 'tactics',
      severity: 'critical',
      title: '注意：球队态度选了「生死之战」，普通联赛千万别用！',
      reason:
        '选生死之战虽然这一场拼得很猛，但踢完之后全队斗志（团队精神）会直接少一半，接下来好几周踢球都会明显变弱，只适合抢冠或保级最后决战。',
      actionHint: '把下方比赛态度下拉改回「普通比赛」；如果对面弱很多、稳赢，改选「轻松随意」还能白涨斗志。',
    });
  }

  // 3. 阵型熟练度提醒
  if (lineup.formationExperienceLevel !== null && lineup.formationExperienceLevel < 7) {
    items.push({
      id: 'LINEUP_FORMATION_EXP_LOW',
      category: 'tactics',
      severity: 'warning',
      title: `这套阵型（${lineup.formationText}）全队还不太熟（熟练度 ${lineup.formationExperienceText}）`,
      reason: '打不熟悉的阵型时，球员在场上容易走神配合失误，导致中场控制力下降。',
      actionHint: '平时尽量固定用同一套顺手的阵型，想换新阵型可以先在周中友谊赛多练几次。',
    });
  }

  // 4. 阵型是否对齐当前主训槽位
  if (state.trainingGoal === 'DEF' && lineup.defenderCount < 5) {
    items.push({
      id: 'LINEUP_TRAINING_SLOTS_DEF',
      category: 'training',
      severity: 'tip',
      title: `练防守小贴士：这场只摆了 ${lineup.defenderCount} 名后卫（最多可练 5 个）`,
      reason: '摆 5 后卫（比如 5-3-2）一场就能让 5 名年轻后卫同时涨球；少放几人就少练几个名额。',
      actionHint: '周中友谊赛尤其建议排满 5 名后卫，把训练名额吃满。',
    });
  } else if (state.trainingGoal === 'PM' && lineup.innerMidfielderCount < 3) {
    items.push({
      id: 'LINEUP_TRAINING_SLOTS_PM',
      category: 'training',
      severity: 'tip',
      title: `练组织小贴士：中前卫目前只放了 ${lineup.innerMidfielderCount}/3 人`,
      reason: '像 3-5-2 或 4-5-1 可以摆满 3 名中前卫 + 2 名边锋，组织训练效率最高。',
      actionHint: '如果阵容够用，尽量放满 3 位中前卫上场。',
    });
  } else if (state.trainingGoal === 'SCOR' && lineup.forwardCount < 3) {
    items.push({
      id: 'LINEUP_TRAINING_SLOTS_SCOR',
      category: 'training',
      severity: 'tip',
      title: `练前锋小贴士：前锋目前只放了 ${lineup.forwardCount}/3 人`,
      reason: '使用 3-4-3 或 4-3-3 可以让 3 名前锋同时吃满 100% 进球训练。',
      actionHint: '周中友谊赛可以放满 3 前锋（记住最多只能放 3 个哦）。',
    });
  }

  // 5. 最佳队长推荐
  if (auto?.bestCaptain) {
    items.push({
      id: 'LINEUP_BEST_CAPTAIN_HINT',
      category: 'tactics',
      severity: 'success',
      title: `最适合戴队长袖标的球员：${auto.bestCaptain.name}`,
      reason: `他的经验（${auto.bestCaptain.experience}）和领导力（${auto.bestCaptain.leadership}）搭配最好，能稳住全队场上发挥。`,
      actionHint: '如果他这场首发上场，把队长位置选给他就好。',
    });
  }

  return items;
}
