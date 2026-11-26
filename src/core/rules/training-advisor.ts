import type { TrainingGoal } from '../types/domain';

export interface TrainingPathProfile {
  goal: Exclude<TrainingGoal, 'UNSET' | 'PASS'>;
  nameZh: string;
  rookieFitScore: number; // 1..5 stars
  traineeSlotsPerWeek: string;
  typicalFormations: string[];
  weeklySpeed17yo: string;
  startupBudgetNeed: string;
  whyChoose: string;
  watchOut: string;
  yaSynergyTip: string;
}

export const TRAINING_PATH_PROFILES: readonly TrainingPathProfile[] = [
  {
    goal: 'GK',
    nameZh: '守门员（Goalkeeping）',
    rookieFitScore: 5,
    traineeSlotsPerWeek: '2 名（联赛 1 名 + 周中友谊赛 1 名）',
    typicalFormations: ['4-4-2', '3-5-2', '任意阵型（不受阵型限制！）'],
    weeklySpeed17yo: '最快（5→8级约 1.5–2.5 周/级）',
    startupBudgetNeed: '极低（仅需买 1–2 名 17 岁可造门将苗子）',
    whyChoose:
      '全游戏练级最快、资金回笼最迅速的新手神线！不限制场上阵型，你可以同时在友谊赛和联赛自由磨合 3-5-2 / 4-4-2 等主力阵型；因为你已开启青训营（YA），练门将几乎不和青训开支抢资金。',
    watchOut:
      '只能同时练 2 名球员，一旦其中一人受伤且没替补会亏半周槽位；记得保留 1 名及格+的替补/轮换门将。',
    yaSynergyTip: '若青训营刷出有“快速(Quick)”特技的门将苗子（2022+更新特性）极其保值！',
  },
  {
    goal: 'DEF',
    nameZh: '防守（Defending）',
    rookieFitScore: 4,
    traineeSlotsPerWeek: '最多 10 名（两场各打 5 后卫：3 中卫 + 2 边卫）',
    typicalFormations: ['5-3-2', '5-4-1', '5-2-3'],
    weeklySpeed17yo: '较快（5→8级约 2.5–3.5 周/级）',
    startupBudgetNeed: '中等（需凑齐 8–10 名年轻后卫苗子，可先从本队现有年轻球员+低价17岁起步）',
    whyChoose:
      '训练名额全游戏最多（10 个坑位！），稳步提升防线不丢球，适合喜欢打反击（CA）或稳扎稳打长期滚雪球的新手。',
    watchOut:
      '5 后卫阵型中场天然偏弱，联赛前期可能会控球不足；必须保证每周友谊赛都打 5 后卫且不超单线人数上限。',
    yaSynergyTip: '青训营里若有高防守潜力+头球/不可预测以外的稳健后卫，17岁提拔可直接无缝进一线队吃训练。',
  },
  {
    goal: 'PM',
    nameZh: '组织进攻（Playmaking）',
    rookieFitScore: 4,
    traineeSlotsPerWeek: '最多 6 名全速（中前卫 IM×3×2）+ 4 名半速（边锋 W×2×2）',
    typicalFormations: ['3-5-2', '4-5-1', '2-5-3'],
    weeklySpeed17yo: '中等（5→8级约 3.5–4.5 周/级）',
    startupBudgetNeed: '中高（中场苗子抢手，带“头球/强壮”特技的 17 岁苗子略贵）',
    whyChoose:
      '得中场者得控球权，是 Hattrick 最主流的战术核心路线；3-5-2 也是最均衡、最容易在低级别联赛赢球攒球迷情绪的阵型。',
    watchOut:
      '中场训练周期明显比门将/防守慢，且边锋位只拿 50% 组织训练；资金偏紧时不要硬追高价全能小妖，优先挑带特技的单/双技能 17 岁苗子。',
    yaSynergyTip: '配合 Uncle Mish 风格思路，青训出的 17 岁头球/强壮中场苗子留在自己手里练性价比极高。',
  },
  {
    goal: 'SCOR',
    nameZh: '进球（Scoring）',
    rookieFitScore: 4,
    traineeSlotsPerWeek: '最多 6 名（两场各上 3 前锋）',
    typicalFormations: ['3-4-3', '4-3-3', '2-5-3'],
    weeklySpeed17yo: '偏慢（5→8级约 4.0–5.0 周/级）',
    startupBudgetNeed: '中等（需 6 名年轻前锋，前锋成品在转会市场溢价较高）',
    whyChoose:
      '成品前锋在转会市场非常抢手，适合喜欢进攻打法且青训刚好出了前锋好苗子的玩家。',
    watchOut:
      '千万注意：单场最多只能排 **3 名前锋**，如果不小心摆成 4 前锋属于非法阵型，会直接清空本周全队训练！',
    yaSynergyTip: '青训重点留带“快速(Quick) / 头球(Head) / 技术(Technical)”的前锋苗子。',
  },
  {
    goal: 'WING',
    nameZh: '边锋突破（Winger）',
    rookieFitScore: 3,
    traineeSlotsPerWeek: '4 名全速（边锋×2×2）+ 4 名半速（边卫×2×2）',
    typicalFormations: ['3-5-2', '4-4-2', '4-5-1'],
    weeklySpeed17yo: '较快（5→8级约 2.5–3.5 周/级）',
    startupBudgetNeed: '较低（只需 4 个全速主力坑位）',
    whyChoose:
      '速度仅次于门将，且边卫也能吃到 50% 边锋训练，非常适合“先练半年边锋打边路突破，再转组织/传球”的双修思路。',
    watchOut:
      '纯边锋如果缺少组织/传球副技能，后期在转会市场卖价上限不如中场和前锋亮眼。',
    yaSynergyTip: '青训刷出“快速(Quick)”边锋时是最好的练级载体。',
  },
] as const;

export interface TrainingAdviceRecommendation {
  primaryPick: TrainingPathProfile;
  runnerUp: TrainingPathProfile;
  summaryReason: string;
}

/**
 * 结合玩家当前现金流和已开启 YA 的情况，给出量身定制的开局训练推荐。
 */
export function recommendTrainingPath(params: {
  weeklyCashEuro: number;
  weeklyNetBalanceEuro: number;
  youthAcademyActive: boolean;
  preference: 'fast_cash' | 'balanced_league' | 'long_term_cycle';
}): TrainingAdviceRecommendation {
  const gk = TRAINING_PATH_PROFILES.find((p) => p.goal === 'GK')!;
  const def = TRAINING_PATH_PROFILES.find((p) => p.goal === 'DEF')!;
  const pm = TRAINING_PATH_PROFILES.find((p) => p.goal === 'PM')!;
  const scor = TRAINING_PATH_PROFILES.find((p) => p.goal === 'SCOR')!;

  if (params.preference === 'fast_cash' || params.weeklyNetBalanceEuro < 5000 || params.weeklyCashEuro < 150000) {
    return {
      primaryPick: gk,
      runnerUp: def,
      summaryReason: params.youthAcademyActive
        ? '你已开启青训营（每周固定支出 €10k–€20k），当前现金流容错率偏紧，最稳妥的是选【守门员 GK】快速赚取第一桶金（仅需 2 个苗子、回笼最快、不锁阵型）。'
        : '当前资金偏紧，【守门员 GK】启动成本最低、出货最快，是新手最不易破产的起步路线。',
    };
  }

  if (params.preference === 'long_term_cycle') {
    return {
      primaryPick: def,
      runnerUp: pm,
      summaryReason:
        '【防守】拥有全场最多的 10 个全速训练位，最适合批量养 17 岁苗子打好底座后转型组织或卖人滚雪球；若你更看重联赛赢球体验，则选【组织进攻】。',
    };
  }

  return {
    primaryPick: pm,
    runnerUp: scor,
    summaryReason:
      '你的资金允许兼顾买苗与青训开销，选【组织进攻（配合 3-5-2）】能在联赛拿控球赢球，同时中场成品保值率极高；若偏好 3 前锋进攻流可考虑【进球】。',
  };
}
