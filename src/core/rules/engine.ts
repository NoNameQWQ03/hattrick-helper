import type { DiagnosticItem, ManualRookieState } from '../types/domain';
import { evaluateLineupDiagnostics } from './lineup-rules';

const EXTENDED_TRAINING_CODES = new Set(['11', '12', '10', '6']);

/**
 * 新手陪伴式体检与待办规则引擎（纯函数）。
 * 用大白话解释原因，并给出明确可点击跳转的目标页面。
 */
export function evaluateRookieDiagnostics(
  state: ManualRookieState,
  currentPageType?: string
): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];
  const auto = state.autoSynced;

  // 0. 当前页面优先提醒（排阵页实时检验 / 转会市场买人指南）
  if (currentPageType === 'lineup' && auto?.lineupSnapshot) {
    items.push(...evaluateLineupDiagnostics(auto.lineupSnapshot, state));
  }

  if (currentPageType === 'transfer_search') {
    items.push({
      id: 'MARKET_ROOKIE_BUY_GUIDE',
      category: 'market',
      severity: state.weeklyCashEuro < 30000 ? 'critical' : 'tip',
      title:
        state.weeklyCashEuro < 30000
          ? '手头现金很紧，这段时间先别花钱买人'
          : '逛转会市场顺手参考：新手挑人 3 个小窍门',
      reason:
        '挑苗子优先看「17岁低天数 + 有特技」，刚买来的球员上场发挥略微吃亏，磨合几周就好；尽量避开 29 岁以上工资很高、准备走下坡路的老将。',
      actionHint: '搜出列表后，每名球员上方都会直接贴出年龄/周薪/体能小标签供参考。',
    });
  }

  // 1. 现金储备紧张提醒
  if (state.weeklyCashEuro < 0 || (state.weeklyCashEuro < 30000 && state.weeklyNetBalanceEuro < 0)) {
    items.push({
      id: 'SURVIVAL_BANKRUPTCY_RISK',
      category: 'survival',
      severity: 'critical',
      title:
        state.weeklyCashEuro < 0
          ? `球队现金变负了（约 €${state.weeklyCashEuro.toLocaleString()}），需要尽快省钱止血`
          : '现金已经低于 €30,000 且每周还在净亏损',
      reason:
        '欠债后银行每周会收一笔额外利息，越拖越难翻身。前期只要停掉不必要支出、慢慢卖掉练出来的小妖就能回血。',
      actionHint:
        '进财政页看看大头支出在哪：先别买人、别扩建球场，再把多余的老将和太贵的职员缩减一下。',
      targetRoute: '/Club/Finances/',
    });
  }

  // 2. 新手执照任务
  if (!state.newbieLicenseDone) {
    items.push({
      id: 'SURVIVAL_NEWBIE_LICENSE',
      category: 'survival',
      severity: 'warning',
      title: '看看「新手执照」任务领完奖励了吗？',
      reason: '新手执照相当于游戏的新手教程任务，做完能拿到很大一笔启动资金，前期非常关键。',
      actionHint: '去我的办公室/成就任务里扫一眼还有没有未领取奖励；如果早就做完了，点下面按钮消除提醒即可。',
      targetRoute: '/MyHattrick/Office/',
    });
  }

  // 3. 主训练项目是否专一
  if (auto?.trainingCode && EXTENDED_TRAINING_CODES.has(auto.trainingCode)) {
    items.push({
      id: 'TRAIN_EXTENDED_INEFFICIENT',
      category: 'training',
      severity: 'warning',
      title: `当前练「${auto.trainingLabel}」覆盖面太散，球员涨得会比较慢`,
      reason:
        '带“扩展/全队”字样的训练虽然大家都能蹭一点，但每人分到的经验很少，想快速练出值钱小妖，选单个纯项目（比如只练门将、防守或组织）划算得多。',
      actionHint: '点下方进训练页，把训练项目下拉改成单个纯主训后点「保存设置」。',
      targetRoute: '/Club/Training/Training.aspx',
    });
  } else if (state.trainingGoal === 'UNSET') {
    items.push({
      id: 'TRAIN_GOAL_UNSET',
      category: 'training',
      severity: 'warning',
      title: '还没定好这几个赛季要专心练哪个位置',
      reason: 'Hattrick 涨球需要按周慢慢攒，经常换训练项目会让年轻球员错过 17 岁黄金涨球期。',
      actionHint: '可以在「攻略」或「向导」里先选一个路线（新手最推荐从门将或防守起步）。',
      targetRoute: '/Club/Training/Training.aspx',
    });
  }

  // 4. 训练强度 100%
  if (state.trainingIntensityPct < 100) {
    items.push({
      id: 'TRAIN_INTENSITY_NOT_100',
      category: 'training',
      severity: 'critical',
      title: `训练水平只有 ${state.trainingIntensityPct}%，没拉满会白白慢一截`,
      reason: '训练水平低于 100% 相当于全队练球打折，正常发育期把它一直保持在 100% 就好。',
      actionHint: '点下方进训练页，把「训练水平」滑块拉到最右边 100%，别忘了点保存。',
      targetRoute: '/Club/Training/Training.aspx',
    });
  }

  // 5. 体能占比 10% - 15%
  if (state.staminaSharePct < 10 || state.staminaSharePct > 15) {
    items.push({
      id: 'TRAIN_STAMINA_OUT_OF_RANGE',
      category: 'training',
      severity: state.staminaSharePct >= 25 ? 'critical' : 'warning',
      title: `体能占比设成 ${state.staminaSharePct}% 了，建议调回 10%–12%`,
      reason:
        state.staminaSharePct < 10
          ? '体能分太少的话，球员踢到下半场会没力气掉评分。'
          : `现在每周分了 ${state.staminaSharePct}% 去练体能，留给主技能的时间只剩 ${100 - state.staminaSharePct}%，年轻人涨球会明显变慢。`,
      actionHint: '点下方进训练页，把「体能」滑块往左拉到 10%–12% 后点保存设置。',
      targetRoute: '/Club/Training/Training.aspx',
    });
  }

  // 6. 周中友谊赛检查
  if (!state.seniorFriendlyBookedThisWeek) {
    items.push({
      id: 'TRAIN_NO_FRIENDLY_BOOKED',
      category: 'training',
      severity: 'critical',
      title: '本周别忘了约一场周中友谊赛！',
      reason: '周末联赛练主力，周中友谊赛可以派另一批替补小妖上场——不约友谊赛等于每周直接少练一半人。',
      actionHint: '点下方进挑战页，加入友谊赛池或找支球队约一场即可（约好后点「我已约好」消除提示）。',
      targetRoute: '/Club/Challenges/',
    });
  }

  // 7. 职员省钱搭配检查
  if (state.headCoachLevel <= 3 && (state.assistantSum >= 8 || (auto?.psychologistLevel ?? 0) >= 3)) {
    items.push({
      id: 'STAFF_COST_INVERSION',
      category: 'staff',
      severity: 'critical',
      title: `职员搭配花了冤枉钱：主教练只有 ${state.headCoachLevel} 级，却留着太贵的助教/心理师`,
      reason:
        '5 级助教的周薪是 4 级的两倍，高级心理师也很贵。主教练才 2–3 级时配这么高助教既省不了多少周数、又猛烧现金。',
      actionHint: '点下方进职员页，先把多余的助教/3级以上心理师解雇（只留 2 个 4 级助教），省钱把主教练换到 4 级。',
      targetRoute: '/Club/Specialists/',
    });
  } else {
    if (state.headCoachLevel < 4) {
      items.push({
        id: 'STAFF_COACH_LEVEL_LOW',
        category: 'staff',
        severity: 'warning',
        title: `主教练目前是 ${state.headCoachLevel} 级，手头宽裕时建议换个 4 级教练`,
        reason: '4 级教练是新手最划算的档位，涨球速度比 2–3 级快很多，价格又不会像 5 级那么贵。',
        actionHint: '进职员页点「更换教练」，雇一位 4 级（领导力选低一点的普通教练就很便宜）。',
        targetRoute: '/Club/Specialists/',
      });
    }

    if (state.assistantSum < 8) {
      items.push({
        id: 'STAFF_ASSISTANT_SUBOPTIMAL',
        category: 'staff',
        severity: 'tip',
        title: `助理教练目前共 ${state.assistantSum} 级（建议逐渐配齐双 4 级 = 8 级）`,
        reason: '雇 2 名 4 级助理教练就能拿到很大比例的训练加速，而且周薪比双 5 级便宜一半。',
        actionHint: '进职员页慢慢雇满 2 位 4 级助教（签 16 周合同更省工资）。',
        targetRoute: '/Club/Specialists/',
      });
    }
  }

  if (state.assistantSum >= 6 && state.medicLevel < 4) {
    items.push({
      id: 'STAFF_MEDIC_NEEDED',
      category: 'staff',
      severity: 'warning',
      title: `队医只有 ${state.medicLevel} 级，建议配 1 名 4 级队医护航`,
      reason: '助教雇得高虽然训练快，但也更容易碰上球员训练受伤；配 4 级队医能保护主力苗子少伤停。',
      actionHint: '点下方进职员页，雇 1 名 4 级队医。',
      targetRoute: '/Club/Specialists/',
    });
  }

  // 8. 阵容人数过多提醒
  if ((auto?.squadCount ?? 0) > 26) {
    items.push({
      id: 'SQUAD_BLOATED_WAGES',
      category: 'survival',
      severity: 'warning',
      title: `一线队现在有 ${auto?.squadCount} 人，替补有点多、周薪白白流走了`,
      reason: '球队留 20–24 人踢两套阵容最合适，超过 26 人后多出来的老将或边缘替补踢不上球还每周领工资。',
      actionHint: '进球员页挑出年龄偏大、又吃不到训练的闲置球员挂牌卖掉减负。',
      targetRoute: '/Club/Players/',
    });
  }

  // 9. 青训营规则提醒
  if (state.youthAcademyActive) {
    const weeklyScoutCostEuro =
      state.youthScoutsCount === 3
        ? 20000
        : state.youthScoutsCount === 2
          ? 15000
          : state.youthScoutsCount === 1
            ? 10000
            : 0;

    if ((auto?.youthPromotableNames?.length ?? 0) > 0) {
      items.push({
        id: 'YOUTH_PROMOTE_READY_NOW',
        category: 'youth',
        severity: 'success',
        title: `好消息：青训营有 ${auto!.youthPromotableNames!.length} 名球员已经可以提拔进一队！`,
        reason: `名单：${auto!.youthPromotableNames!.join('、')}。满条件后早点提拔上来，年轻球员就能立刻进一队吃主力训练或卖钱。`,
        actionHint: '进青训球员页看一眼他们的属性，决定自己留着练还是挂牌出售。',
        targetRoute: '/Club/Players/YouthPlayers.aspx',
      });
    }

    if ((auto?.youthTopProspects?.length ?? 0) > 0) {
      const topSummary = auto!.youthTopProspects!
        .map((p) => `${p.name}(${p.ageLabel}·潜力${p.maxPotential}级)`)
        .join('、');
      items.push({
        id: 'YOUTH_TOP_PROSPECTS_DETECTED',
        category: 'youth',
        severity: 'tip',
        title: `重点盯防这些青训好苗子：${topSummary}`,
        reason: '潜力达到 6–8 级的小妖在青训营非常难得，比赛时优先围绕他们想练的项目安排位置。',
        actionHint: '青训联赛和 21 天一次的青训友谊赛，记得优先把他们排上首发踢满 90 分钟。',
        targetRoute: '/Club/Players/YouthPlayers.aspx',
      });
    }

    if (weeklyScoutCostEuro > 0 && (state.weeklyNetBalanceEuro < 0 || state.weeklyCashEuro < 0)) {
      items.push({
        id: 'YOUTH_FINANCE_STRAIN',
        category: 'youth',
        severity: 'warning',
        title: `青训 ${state.youthScoutsCount} 名球探每周要花约 €${weeklyScoutCostEuro.toLocaleString()}，有点加重亏损`,
        reason: '一线队正处于缺钱阶段，3 个球探每周开销不小，可以先降成 1 个球探把一队稳住。',
        actionHint: '进青训页面暂时辞掉多余球探，等一队赚钱稳住了再雇回来。',
        targetRoute: '/Club/Youth/',
      });
    }

    if (state.daysSinceLastYouthFriendly >= 21) {
      items.push({
        id: 'YOUTH_FRIENDLY_DUE',
        category: 'youth',
        severity: 'warning',
        title: '每 21 天一次的青训友谊赛已经冷却好了，快去约一场！',
        reason: '青训友谊赛能帮教练额外摸清小妖们的真实潜力上限，过期不踢很可惜。',
        actionHint: '点下方进青训挑战页随便约一场青训友谊赛。',
        targetRoute: '/Club/Challenges/YouthChallenges.aspx',
      });
    } else if (state.daysSinceLastYouthFriendly >= 18) {
      items.push({
        id: 'YOUTH_FRIENDLY_SOON',
        category: 'youth',
        severity: 'tip',
        title: `再过 ${21 - state.daysSinceLastYouthFriendly} 天就能踢下一场青训友谊赛`,
        reason: '可以提前想好到时要把哪几位高潜苗子放上对应位置测试未知潜力。',
        actionHint: '到时候去青训挑战页约一场即可。',
      });
    }
  }

  // 10. 球场扩建提醒
  if (auto?.stadiumUnderConstruction) {
    items.push({
      id: 'STADIUM_UNDER_CONSTRUCTION',
      category: 'stadium',
      severity: 'tip',
      title: '球场正在施工扩建中，完工前先不用管它',
      reason: '等新看台造好后观察几场晴天主场的上座率再做下一步打算。',
      actionHint: '平时攒钱、练好主力赢球就会自然带动球迷变多。',
    });
  } else if (state.recentSunnyHomeFullCount >= 2) {
    items.push({
      id: 'STADIUM_EXPANSION_READY',
      category: 'stadium',
      severity: 'tip',
      title: `最近已经有 ${state.recentSunnyHomeFullCount} 场主场快坐满了，可以考虑扩建球场赚门票`,
      reason: '坐满说明球场装不下球迷了；扩建按「63% 站席 : 25% 普通 : 10% 有顶 : 2% VIP」最合理。',
      actionHint: '点开本插件「计算器」可以直接算出每一项该加多少座。',
      targetRoute: '/Club/Stadium/',
    });
  } else {
    items.push({
      id: 'STADIUM_DO_NOT_EXPAND_EARLY',
      category: 'stadium',
      severity: 'success',
      title: '球场暂时不用急着扩建',
      reason: '没持续坐满之前扩大球场只会多交每周维护费；等晴天主场连续坐满 2–3 次再动手很稳妥。',
      actionHint: '先把资金省下来养球队和青训就好。',
    });
  }

  return items;
}
