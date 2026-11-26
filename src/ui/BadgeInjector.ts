import { getSkillMeta } from '../core/i18n/skills';
import { calculateStaminaFactor } from '../core/math/formulas';
import { recommendLineupPlan } from '../core/math/lineup-planner';
import type { SnapshotDiffSummary } from '../core/math/sublevel';
import type {
  ManualRookieState,
  ParsedLineupData,
  ParsedSeniorPlayer,
  ParsedSpecialistsData,
  ParsedTrainingData,
  ParsedYouthPlayer,
} from '../core/types/domain';

const BADGE_ATTR = 'data-htrc-badge';
const COACHMARK_ATTR = 'data-htrc-coachmark';

function clearExistingBadges(root: ParentNode) {
  root.querySelectorAll(`[${BADGE_ATTR}]`).forEach((el) => el.remove());
}

/**
 * 清除页面中所有“打开面板才显示”的傻瓜指引牌（保留球员技能条染色等基础徽章）。
 */
export function clearAllCoachMarks(doc: Document): void {
  doc.querySelectorAll(`[${COACHMARK_ATTR}]`).forEach((el) => el.remove());
}

function createBadge(text: string, bg: string, border: string, color = '#f8fafc'): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute(BADGE_ATTR, '1');
  span.textContent = text;
  span.style.cssText = `
    display: inline-block;
    margin-left: 6px;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: Verdana, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.4;
    background: ${bg};
    border: 1px solid ${border};
    color: ${color};
    vertical-align: middle;
  `;
  return span;
}

function createCoachMark(
  text: string,
  bg: string,
  border: string,
  color = '#f8fafc',
  title?: string
): HTMLSpanElement {
  const span = createBadge(text, bg, border, color);
  span.setAttribute(COACHMARK_ATTR, '1');
  span.style.pointerEvents = 'none';
  if (title) span.title = title;
  return span;
}

interface StepBannerLine {
  text: string;
  tone?: 'ok' | 'warn' | 'action';
}

function createStepBanner(
  doc: Document,
  title: string,
  lines: StepBannerLine[]
): HTMLDivElement {
  const box = doc.createElement('div');
  box.setAttribute(BADGE_ATTR, '1');
  box.setAttribute(COACHMARK_ATTR, '1');
  box.style.cssText = `
    margin: 6px 0 8px 0;
    border-radius: 2px;
    background: #ffffff;
    border: 1px solid #9db093;
    color: #222222;
    font-family: Tahoma, Verdana, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
    font-size: 12px;
    line-height: 1.45;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    pointer-events: none;
  `;

  const heading = doc.createElement('div');
  heading.textContent = title;
  heading.style.cssText = `
    font-weight: 700;
    background: linear-gradient(180deg, #5d8f3c 0%, #447329 100%);
    color: #ffffff;
    padding: 4px 10px;
    font-size: 12px;
    border-bottom: 1px solid #32591d;
  `;
  box.appendChild(heading);

  const body = doc.createElement('div');
  body.style.cssText = 'padding: 6px 10px; background: #fbfcfa;';
  for (const item of lines) {
    const row = doc.createElement('div');
    row.textContent = item.text;
    const toneColor =
      item.tone === 'ok' ? '#1f5e16' : item.tone === 'warn' ? '#9f1d1d' : '#7a4a06';
    row.style.cssText = `color: ${toneColor}; font-weight: 600; margin-top: 2px;`;
    body.appendChild(row);
  }
  box.appendChild(body);

  return box;
}

function colorizeSkillBars(infoEl: Element, foxtrickDetected: boolean) {
  if (foxtrickDetected) return;
  for (const row of Array.from(infoEl.querySelectorAll('tr[id*="_tr"]'))) {
    const bar = row.querySelector<HTMLElement>('.ht-bar');
    const numSpan = row.querySelector<HTMLElement>('.denominationNumber');
    if (!bar || !numSpan) continue;
    const lv = Number.parseInt(bar.getAttribute('level') ?? '0', 10);
    if (lv >= 6) {
      const meta = getSkillMeta(lv);
      numSpan.style.color = meta.colorHex;
      numSpan.style.fontWeight = '700';
    }
  }
}

/**
 * 为本队一线队球员列表/详情页注入只读新手解读标签与跨周快照趋势。
 */
export function injectSeniorPlayerBadges(
  doc: Document,
  players: ParsedSeniorPlayer[],
  foxtrickDetected: boolean,
  diffsByPlayerId?: Map<number, SnapshotDiffSummary>
): void {
  const cards = Array.from(doc.querySelectorAll('.playerInfo')).filter((el) =>
    Boolean(el.querySelector('tr[id$="_trKeeper"]'))
  );

  cards.forEach((infoEl, idx) => {
    const player = players[idx];
    if (!player) return;

    const outerCard =
      infoEl.closest('.teamphoto-player') ??
      infoEl.parentElement?.parentElement ??
      doc.querySelector('#mainBody') ??
      infoEl;
    clearExistingBadges(outerCard);

    const header = outerCard.querySelector('h3') ?? outerCard.querySelector('h1') ?? infoEl;
    const staminaPct = Math.round(calculateStaminaFactor(player.stamina) * 100);

    if (player.ageYears <= 21) {
      header.appendChild(createBadge('年轻苗子', '#14532d', '#22c55e', '#dcfce7'));
    } else if (player.ageYears >= 31) {
      header.appendChild(createBadge('高龄注意衰退/周薪', '#7c2d12', '#f97316', '#ffedd5'));
    }

    if (player.stamina > 0 && player.stamina < 6) {
      header.appendChild(
        createBadge(`体能偏低(续航${staminaPct}%)`, '#7f1d1d', '#ef4444', '#fee2e2')
      );
    } else if (player.stamina >= 6) {
      header.appendChild(createBadge(`续航${staminaPct}%`, '#1e293b', '#475569', '#cbd5e1'));
    }

    const diff = diffsByPlayerId?.get(player.playerId);
    if (diff?.trendBadge) {
      const isPop = diff.poppedSkills.length > 0;
      header.appendChild(
        createBadge(
          diff.trendBadge,
          isPop ? '#1e3a8a' : '#0f172a',
          isPop ? '#38bdf8' : '#22c55e',
          isPop ? '#e0f2fe' : '#86efac'
        )
      );
    }

    colorizeSkillBars(infoEl, foxtrickDetected);
  });
}

/**
 * 为转会市场结果页 / 外队球员页注入「新手买人防坑雷达」徽章。
 */
export function injectTransferRadarBadges(
  doc: Document,
  players: ParsedSeniorPlayer[],
  foxtrickDetected: boolean,
  currencyPerEuro = 10
): void {
  const cards = Array.from(doc.querySelectorAll('.playerInfo')).filter((el) =>
    Boolean(el.querySelector('tr[id$="_trKeeper"]'))
  );

  cards.forEach((infoEl, idx) => {
    const player = players[idx];
    if (!player) return;

    const outerCard =
      infoEl.closest('.teamphoto-player') ??
      infoEl.parentElement?.parentElement ??
      doc.querySelector('#mainBody') ??
      infoEl;
    clearExistingBadges(outerCard);

    const header = outerCard.querySelector('h3') ?? outerCard.querySelector('h1') ?? infoEl;
    const staminaPct = Math.round(calculateStaminaFactor(player.stamina) * 100);
    const wageEuro = Math.round(player.weeklyWageLocal / Math.max(1, currencyPerEuro));

    if (player.ageYears === 17 && player.ageDays <= 60) {
      header.appendChild(
        createBadge(`🌱 17岁低天数(${player.ageDays}天)黄金苗`, '#14532d', '#22c55e', '#dcfce7')
      );
    } else if (player.ageYears <= 19) {
      header.appendChild(createBadge(`年轻可训(${player.ageYears}岁)`, '#14532d', '#4ade80', '#dcfce7'));
    } else if (player.ageYears >= 29) {
      header.appendChild(
        createBadge(`⚠️ 高龄(${player.ageYears}岁)衰退+难转手`, '#7f1d1d', '#ef4444', '#fee2e2')
      );
    }

    if (wageEuro >= 15000) {
      header.appendChild(
        createBadge(`💸 高周薪(约€${wageEuro.toLocaleString()}/周)`, '#7c2d12', '#f97316', '#ffedd5')
      );
    }

    if (player.stamina > 0 && player.stamina < 6) {
      header.appendChild(
        createBadge(`⚠️ 体能偏低(${staminaPct}%)`, '#78350f', '#f59e0b', '#fef3c7')
      );
    }

    colorizeSkillBars(infoEl, foxtrickDetected);
  });
}

/**
 * 为青训球员列表注入提拔状态与潜力高光徽章。
 */
export function injectYouthPlayerBadges(
  doc: Document,
  youthPlayers: ParsedYouthPlayer[],
  showCoachMarks = true
): void {
  const cards = Array.from(doc.querySelectorAll('.playerInfo')).filter((el) =>
    Boolean(el.querySelector('.youthPlayerSkills'))
  );

  cards.forEach((infoEl, idx) => {
    const yp = youthPlayers[idx];
    if (!yp) return;

    clearExistingBadges(infoEl);

    const targetAnchor = infoEl.querySelector('.youthPlayerSkills') ?? infoEl;
    const barWrap = document.createElement('div');
    barWrap.setAttribute(BADGE_ATTR, '1');
    barWrap.style.cssText = 'margin: 0 0 6px 0; display: flex; flex-wrap: wrap; gap: 6px;';

    if (yp.eligibleNow) {
      barWrap.appendChild(createBadge('🎉 可立即提拔成年队', '#14532d', '#22c55e', '#dcfce7'));
      if (showCoachMarks) {
        barWrap.appendChild(
          createCoachMark('👉 点下方“提拔”即可转入成年队', '#1e3a8a', '#38bdf8', '#e0f2fe')
        );
      }
    } else if (yp.daysUntilPromotion < 999) {
      barWrap.appendChild(
        createBadge(`⏳ 距提拔 ${yp.daysUntilPromotion} 天`, '#1e293b', '#475569', '#cbd5e1')
      );
    }

    if (yp.highestKnownPotential >= 7) {
      barWrap.appendChild(
        createBadge(`⭐ 高潜苗子(${yp.highestKnownPotential}级)`, '#1e3a8a', '#38bdf8', '#e0f2fe')
      );
      if (showCoachMarks && !yp.eligibleNow) {
        barWrap.appendChild(
          createCoachMark('👉 下场青训赛首发测其余未知潜力', '#312e81', '#818cf8', '#e0e7ff')
        );
      }
    } else if (yp.highestKnownPotential >= 6) {
      barWrap.appendChild(
        createBadge(`可造之材(${yp.highestKnownPotential}级)`, '#365314', '#84cc16', '#ecfccb')
      );
    }

    targetAnchor.parentElement?.insertBefore(barWrap, targetAnchor);
  });
}

/**
 * 为训练页面注入只读操作指引牌（提示推荐的体力/强度/单一主训/保存按钮，绝不自动修改表单值）。
 */
export function injectTrainingCoachMarks(doc: Document, parsed: ParsedTrainingData): void {
  const root = doc.querySelector('ht-training-new') ?? doc.querySelector('#content');
  if (!root) return;
  clearExistingBadges(root);

  const isExtended = new Set(['11', '12', '10', '6']).has(parsed.trainingCode);
  const badStamina = parsed.staminaSharePct < 10 || parsed.staminaSharePct > 15;
  const badIntensity = parsed.trainingIntensityPct < 100;

  const bannerLines: StepBannerLine[] = [
    isExtended
      ? {
          text: `第1步 主训项目：⚠️ 当前是扩散训「${parsed.trainingLabel || parsed.trainingCode}」，建议下拉改选单一纯主训（门将 / 防守 / 组织）`,
          tone: 'warn',
        }
      : {
          text: `第1步 主训项目：✅ 已是「${parsed.trainingLabel || parsed.trainingCode}」`,
          tone: 'ok',
        },
    badStamina
      ? {
          text: `第2步 体能占比：👉 把「体能」滑块拉到 10%–12%（当前 ${parsed.staminaSharePct}% 会拖慢涨球）`,
          tone: 'warn',
        }
      : {
          text: `第2步 体能占比：✅ 当前 ${parsed.staminaSharePct}% 达标`,
          tone: 'ok',
        },
    badIntensity
      ? {
          text: `第3步 训练水平：👉 把「训练水平」滑块拉满到 100%（当前 ${parsed.trainingIntensityPct}%）`,
          tone: 'warn',
        }
      : {
          text: '第3步 训练水平：✅ 已拉满 100%',
          tone: 'ok',
        },
  ];
  if (isExtended || badStamina || badIntensity) {
    bannerLines.push({
      text: '第4步 保存生效：👆 调完上方滑块/下拉后，点击页面里的「保存设置」按钮！',
      tone: 'action',
    });
  } else {
    bannerLines.push({
      text: '✅ 本页训练参数全部达标，无需再改！',
      tone: 'ok',
    });
  }
  root.prepend(createStepBanner(doc, '训练设置小助手（只读提示）', bannerLines));

  const select = root.querySelector('select');
  if (select && isExtended) {
    const badge = createCoachMark(
      '💡 新手指引：扩散训练效率较低，建议改选单一纯主训（如 门将 / 防守 / 组织）后点保存',
      '#78350f',
      '#f59e0b',
      '#fef3c7'
    );
    badge.style.display = 'table';
    badge.style.margin = '4px 0 0 0';
    select.parentElement?.appendChild(badge);
  }

  for (const slider of Array.from(root.querySelectorAll('mat-slider'))) {
    const text = slider.parentElement?.parentElement?.textContent ?? '';
    if ((text.includes('体能') || text.includes('Stamina')) && badStamina) {
      const badge = createCoachMark(
        `👉 建议手动调至 10%–12%（当前 ${parsed.staminaSharePct}% 过高会拖慢主技能）`,
        '#7f1d1d',
        '#ef4444',
        '#fee2e2'
      );
      badge.style.display = 'table';
      badge.style.margin = '4px 0 0 0';
      slider.parentElement?.appendChild(badge);
    } else if ((text.includes('训练水平') || text.includes('Training intensity')) && badIntensity) {
      const badge = createCoachMark(
        `👉 建议手动拉满至 100%（当前 ${parsed.trainingIntensityPct}%）`,
        '#7f1d1d',
        '#ef4444',
        '#fee2e2'
      );
      badge.style.display = 'table';
      badge.style.margin = '4px 0 0 0';
      slider.parentElement?.appendChild(badge);
    }
  }

  const saveBtn = Array.from(root.querySelectorAll('button, ht-button')).find((el) => {
    const label = el.textContent?.trim() ?? '';
    return label.includes('保存') || /\bsave\b/i.test(label);
  });
  if (saveBtn?.parentElement && !saveBtn.parentElement.querySelector(`[${COACHMARK_ATTR}]`)) {
    const badge = createCoachMark('👆 调好上方主训/体力/强度后点此保存', '#1e3a8a', '#38bdf8', '#e0f2fe');
    badge.style.display = 'table';
    badge.style.margin = '4px 0 0 0';
    saveBtn.parentElement.appendChild(badge);
  }
}

function extractPlayerMatchTokens(fullName: string, shortName: string): string[] {
  const tokens = new Set<string>();
  const rawLower = fullName.trim().toLowerCase();
  if (rawLower.length >= 2) tokens.add(rawLower);

  const parenMatches = Array.from(fullName.matchAll(/\(([^)]+)\)/g));
  for (const m of parenMatches) {
    const inner = m[1]?.trim().toLowerCase();
    if (inner && inner.length >= 2) tokens.add(inner);
  }

  const cleanFull = fullName.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (cleanFull.length >= 2) tokens.add(cleanFull);

  const words = cleanFull.split(/\s+/).filter((t) => t.length >= 2);
  const surname = words[words.length - 1];
  if (surname && surname.length >= 2) tokens.add(surname);

  const cleanShort = shortName.replace(/\([^)]*\)/g, '').trim().toLowerCase();
  if (cleanShort.length >= 2) tokens.add(cleanShort);

  return Array.from(tokens);
}

function textMatchesPlayerTokens(text: string, tokens: string[]): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized) return false;
  return tokens.some((token) => normalized.includes(token));
}

function slotMatchesRecommendedPlayer(slotEl: Element, slotId: number, fullName: string, shortName: string): boolean {
  if (!slotEl.classList.contains('position-has-player')) return false;
  const occupiedEl =
    slotEl.ownerDocument.querySelector(`#player-position-${slotId}`) ?? slotEl;
  const occupiedText = occupiedEl.textContent ?? '';
  return textMatchesPlayerTokens(occupiedText, extractPlayerMatchTokens(fullName, shortName));
}

/**
 * 为排阵页面注入只读操作指引牌（分步导航条 / MOTS / 非法阵型 / 最佳队长 / 11 槽位贴纸 / 列表找人高亮，绝不自动改选指示）。
 */
export function injectLineupCoachMarks(
  doc: Document,
  lineup: ParsedLineupData,
  state: ManualRookieState
): void {
  const root = doc.querySelector('ht-matchorder');
  if (!root) return;
  clearExistingBadges(root);

  const illegalFormation =
    lineup.totalStarters < 9 ||
    lineup.keeperCount === 0 ||
    lineup.defenderCount > 5 ||
    lineup.innerMidfielderCount > 3 ||
    lineup.forwardCount > 3;

  // 不向 .mo-formation-numbers 等固定高度绿条里追加叠层标签（防止被下方栏遮挡裁切）；
  // 所有阵型/队长/非法阵型提示统一放入顶部正常流式向导盒内完整展示。
  const speech = root.querySelector('#mo-speechLevel');
  if (speech && lineup.attitude === 'mots') {
    const speechWarn = createCoachMark(
      '⚠️ 慎用生死之战',
      '#7f1d1d',
      '#ef4444',
      '#fee2e2',
      '普通联赛慎用「生死之战」！建议手动改回「普通比赛」或「轻松随意」'
    );
    speechWarn.style.whiteSpace = 'nowrap';
    speech.parentElement?.appendChild(speechWarn);
  }

  const roster = state.autoSynced?.squadRoster;
  const plan = roster && roster.length > 0 ? recommendLineupPlan(roster, state.trainingGoal) : null;
  if (!plan) {
    const fallbackLines: StepBannerLine[] = [
      {
        text: '第1步 先看人名推荐：点开抽屉「攻略」→「第1步 -> 球员页」逛一圈，回到此页就会在 11 个位置直接写好「👉 放:某人」。',
        tone: 'action',
      },
      lineup.attitude === 'mots'
        ? { text: '第2步 比赛态度：⚠️ 普通联赛慎用「生死之战」，建议改回「普通比赛」！', tone: 'warn' }
        : { text: '第2步 比赛态度：✅ 保持「普通比赛」（稳赢弱旅可选「轻松随意」）', tone: 'ok' },
      illegalFormation
        ? { text: '第3步 阵型检查：🚨 当前不足9人或单线超限，本周训练会作废，请补齐合法阵型后保存！', tone: 'warn' }
        : { text: '第3步 确认无误后点击页面保存按钮即可。', tone: 'ok' },
    ];
    if (state.autoSynced?.bestCaptain) {
      fallbackLines.push({
        text: `👑 最佳队长推荐：${state.autoSynced.bestCaptain.name}`,
        tone: 'ok',
      });
    }
    root.prepend(createStepBanner(doc, '排阵分步小助手（只读提示）', fallbackLines));
    return;
  }

  let placedCount = 0;
  const pendingSlots: typeof plan.assignments = [];

  for (const slot of plan.assignments) {
    const slotEl = root.querySelector(`#position-${slot.slotId}`);
    const alreadyPlaced = slotEl
      ? slotMatchesRecommendedPlayer(slotEl, slot.slotId, slot.playerName, slot.shortName)
      : false;

    if (alreadyPlaced) {
      placedCount += 1;
    } else {
      pendingSlots.push(slot);
    }

    if (!slotEl) continue;

    const pill = alreadyPlaced
      ? createCoachMark(
          `✅ ${slot.shortName}`,
          '#14532d',
          '#22c55e',
          '#dcfce7',
          `${slot.roleZh}：已就位 ${slot.playerName}（${slot.reason}）`
        )
      : createCoachMark(
          `👉 放:${slot.shortName}`,
          slot.isTraineeSlot ? '#1e3a8a' : '#78350f',
          slot.isTraineeSlot ? '#38bdf8' : '#f59e0b',
          '#f8fafc',
          `${slot.roleZh}：建议手动放入 ${slot.playerName}（${slot.reason}）`
        );
    pill.style.cssText = `
      position: absolute;
      top: 1px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 30;
      display: block;
      max-width: 98%;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
      padding: 0 4px;
      border-radius: 3px;
      font-family: Tahoma, Verdana, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
      font-size: 9.5px;
      font-weight: 700;
      line-height: 1.3;
      white-space: nowrap;
      pointer-events: none;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
      background: ${alreadyPlaced ? '#27591b' : slot.isTraineeSlot ? '#1e4b8f' : '#8c5206'};
      border: 1px solid ${alreadyPlaced ? '#61aa4b' : slot.isTraineeSlot ? '#6096de' : '#d89b2c'};
      color: #ffffff;
    `;
    slotEl.appendChild(pill);
  }

  // 在右侧待选球员列表/替补卡片里给尚未就位的推荐球员贴上「🎯 拖去→位置」标签
  if (pendingSlots.length > 0) {
    const pendingWithTokens = pendingSlots.map((slot) => ({
      slot,
      tokens: extractPlayerMatchTokens(slot.playerName, slot.shortName),
    }));
    const listPlayers = Array.from(root.querySelectorAll('.cdk-drag.player')).filter(
      (el) => !/^player-position-\d+$/.test(el.id)
    );
    for (const playerEl of listPlayers) {
      if (playerEl.querySelector(`[${COACHMARK_ATTR}]`)) continue;
      const cardText = playerEl.textContent ?? '';
      const matched = pendingWithTokens.find((item) => textMatchesPlayerTokens(cardText, item.tokens));
      if (!matched) continue;
      const { slot } = matched;
      const listTag = createCoachMark(
        `🎯 拖去→${slot.roleZh}`,
        slot.isTraineeSlot ? '#1e4b8f' : '#8c5206',
        slot.isTraineeSlot ? '#6096de' : '#d89b2c',
        '#ffffff',
        `推荐放到【${slot.roleZh}】${slot.reason}`
      );
      listTag.style.fontSize = '10px';
      listTag.style.padding = '0 4px';
      listTag.style.marginLeft = '4px';
      listTag.style.whiteSpace = 'nowrap';
      playerEl.appendChild(listTag);
    }
  }

  const nextThreeText = pendingSlots
    .slice(0, 3)
    .map((s) => `把【${s.shortName}】拖到【${s.roleZh}】`)
    .join('、');

  const lineupBannerLines: StepBannerLine[] = [
    pendingSlots.length === 0
      ? {
          text: `第1步 拖人摆阵（${plan.formationName}）：✅ ${placedCount}/${plan.assignments.length} 人已全部就位！`,
          tone: 'ok',
        }
      : {
          text: `第1步 拖人摆阵（${plan.formationName}，已就位 ${placedCount}/${plan.assignments.length}）：👉 下一步先 ${nextThreeText}${pendingSlots.length > 3 ? ` 等共 ${pendingSlots.length} 人` : ''}（看右侧列表里的 🎯 标签直接拖过来）`,
          tone: 'action',
        },
    lineup.attitude === 'mots'
      ? {
          text: '第2步 比赛态度：⚠️ 普通联赛切忌选「生死之战」！请手动改回「普通比赛」（遇到弱旅选「轻松随意」）',
          tone: 'warn',
        }
      : {
          text: '第2步 比赛态度：✅ 正常（普通联赛选「普通比赛」；打明显弱旅选「轻松随意」攒士气）',
          tone: 'ok',
        },
    illegalFormation
      ? {
          text: '第3步 提交前检查：🚨 目前场上有非法人数或不满9人风险，请拖满 11 人后再点保存！',
          tone: 'warn',
        }
      : {
          text: state.autoSynced?.bestCaptain
            ? `第3步 队长与保存：👑 队长推荐选「${state.autoSynced.bestCaptain.name}」，确认后别忘了点页面保存！`
            : '第3步 队长与保存：确认无误后点击页面保存按钮！',
          tone: pendingSlots.length === 0 ? 'ok' : 'action',
        },
  ];

  root.prepend(createStepBanner(doc, '排阵分步小助手（只读提示）', lineupBannerLines));
}

/**
 * 为职员页面 (/Club/Specialists/) 注入只读降本与换帅建议牌。
 */
export function injectSpecialistsCoachMarks(doc: Document, parsed: ParsedSpecialistsData): void {
  const root = doc.querySelector('#mainBody') ?? doc.querySelector('#content');
  if (!root) return;
  clearExistingBadges(root);

  const bannerLines: StepBannerLine[] = [
    parsed.coachLevel > 0 && parsed.coachLevel < 4
      ? {
          text: `1. 主教练：👉 当前 ${parsed.coachLevel} 级训练偏慢，建议点下方「更换教练」升到 4 级(普通)教练`,
          tone: 'warn',
        }
      : {
          text: `1. 主教练：✅ 当前 ${parsed.coachLevel} 级达标`,
          tone: 'ok',
        },
    parsed.assistantSum > 8
      ? {
          text: `2. 助理教练：👉 当前合计 ${parsed.assistantSum} 级偏烧钱，建议手动降为双 4 级（合计 8 级）省薪`,
          tone: 'warn',
        }
      : {
          text: `2. 助理教练：✅ 当前合计 ${parsed.assistantSum} 级（经济合理）`,
          tone: 'ok',
        },
    parsed.psychologistLevel >= 3
      ? {
          text: `3. 运动心理学家：💸 当前 ${parsed.psychologistLevel} 级每周开销过高，新手攒钱期建议降到 0–1 级`,
          tone: 'warn',
        }
      : {
          text: `3. 运动心理学家：✅ 当前 ${parsed.psychologistLevel} 级（无多余烧钱）`,
          tone: 'ok',
        },
    parsed.medicLevel < 4
      ? {
          text: `4. 队医：👉 建议保持 4 级防主力长期伤停（当前 ${parsed.medicLevel} 级）`,
          tone: 'action',
        }
      : {
          text: `4. 队医：✅ 当前 ${parsed.medicLevel} 级达标`,
          tone: 'ok',
        },
  ];
  root.prepend(createStepBanner(doc, '职员省钱小助手（推荐：4级教练 + 双4助教 + 4级队医）', bannerLines));

  if (parsed.coachLevel > 0 && parsed.coachLevel < 4) {
    const coachLink = root.querySelector('a[href*="ChangeCoach.aspx"]');
    coachLink?.parentElement?.appendChild(
      createCoachMark(
        `👉 建议更换为「4级(普通)教练」（当前 ${parsed.coachLevel} 级太慢）`,
        '#7f1d1d',
        '#ef4444',
        '#fee2e2'
      )
    );
  }

  for (const tr of Array.from(root.querySelectorAll('table tr'))) {
    const firstCell = tr.querySelector('td, th');
    if (!firstCell) continue;
    const roleText = firstCell.textContent ?? '';

    if ((roleText.includes('助理教练') || /assistant/i.test(roleText)) && parsed.assistantSum > 8) {
      firstCell.appendChild(
        createCoachMark(
          `👉 当前合计 ${parsed.assistantSum} 级偏烧钱，建议降为双4级(合计8级)`,
          '#78350f',
          '#f59e0b',
          '#fef3c7'
        )
      );
    } else if (
      (roleText.includes('心理') || /psychologist/i.test(roleText)) &&
      parsed.psychologistLevel >= 3
    ) {
      firstCell.appendChild(
        createCoachMark(
          `💸 ${parsed.psychologistLevel} 级心理师过贵，新手攒钱期建议降到 0–1 级`,
          '#7f1d1d',
          '#ef4444',
          '#fee2e2'
        )
      );
    } else if (
      (roleText.includes('队医') || /medic/i.test(roleText)) &&
      parsed.medicLevel < 4
    ) {
      firstCell.appendChild(
        createCoachMark(
          `👉 建议配置 4 级队医防主力长期伤停（当前 ${parsed.medicLevel} 级）`,
          '#78350f',
          '#f59e0b',
          '#fef3c7'
        )
      );
    }
  }
}
