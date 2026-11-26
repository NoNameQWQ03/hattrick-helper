import type { SpecialtyType } from '../types/domain';

export interface SkillLevelMeta {
  level: number;
  en: string;
  zhCN: string;
  zhAliases: string[];
  colorHex: string;
  tierLabel: string;
}

/**
 * Hattrick 0-20 技能等级标准化词典。
 * 简体中文主标签已对齐 hattrick.org 实机官方中文译名（如：0=无、5=中下、7=稳定、9=强大、11=辉煌、12=神妙、13=独步天下、14=神秘莫测）。
 */
export const SKILL_LEVELS: readonly SkillLevelMeta[] = [
  { level: 0, en: 'Non-existent', zhCN: '无', zhAliases: ['无', '不存在'], colorHex: '#64748b', tierLabel: '无能力' },
  { level: 1, en: 'Disastrous', zhCN: '极其糟糕', zhAliases: ['极其糟糕', '灾难'], colorHex: '#64748b', tierLabel: '极低' },
  { level: 2, en: 'Wretched', zhCN: '糟糕', zhAliases: ['糟糕', '极差'], colorHex: '#78716c', tierLabel: '极低' },
  { level: 3, en: 'Poor', zhCN: '差', zhAliases: ['差'], colorHex: '#a16207', tierLabel: '低阶' },
  { level: 4, en: 'Weak', zhCN: '弱', zhAliases: ['弱'], colorHex: '#ca8a04', tierLabel: '低阶' },
  { level: 5, en: 'Inadequate', zhCN: '中下', zhAliases: ['中下', '不足', '欠佳', '一般'], colorHex: '#eab308', tierLabel: '过渡' },
  { level: 6, en: 'Passable', zhCN: '及格', zhAliases: ['及格'], colorHex: '#84cc16', tierLabel: '入门可用' },
  { level: 7, en: 'Solid', zhCN: '稳定', zhAliases: ['稳定', '良好', '稳固'], colorHex: '#22c55e', tierLabel: '主力起步' },
  { level: 8, en: 'Excellent', zhCN: '优秀', zhAliases: ['优秀'], colorHex: '#10b981', tierLabel: '骨干' },
  { level: 9, en: 'Formidable', zhCN: '强大', zhAliases: ['强大', '强力'], colorHex: '#14b8a6', tierLabel: '准核心' },
  { level: 10, en: 'Outstanding', zhCN: '杰出', zhAliases: ['杰出'], colorHex: '#06b6d4', tierLabel: '核心' },
  { level: 11, en: 'Brilliant', zhCN: '辉煌', zhAliases: ['辉煌', '卓越', '非凡'], colorHex: '#0ea5e9', tierLabel: '高阶' },
  { level: 12, en: 'Magnificent', zhCN: '神妙', zhAliases: ['神妙', '惊人', '壮丽'], colorHex: '#3b82f6', tierLabel: '强援' },
  { level: 13, en: 'World Class', zhCN: '独步天下', zhAliases: ['独步天下', '世界级'], colorHex: '#6366f1', tierLabel: '球星' },
  { level: 14, en: 'Supernatural', zhCN: '神秘莫测', zhAliases: ['神秘莫测', '超凡', '超自然'], colorHex: '#8b5cf6', tierLabel: '巨星' },
  { level: 15, en: 'Titanic', zhCN: '威力无边', zhAliases: ['威力无边', '泰坦'], colorHex: '#a855f7', tierLabel: '顶级' },
  { level: 16, en: 'Extra-terrestrial', zhCN: '外星人', zhAliases: ['外星人'], colorHex: '#d946ef', tierLabel: '超神' },
  { level: 17, en: 'Mythical', zhCN: '神话', zhAliases: ['神话'], colorHex: '#ec4899', tierLabel: '国脚级' },
  { level: 18, en: 'Magical', zhCN: '魔幻', zhAliases: ['魔幻'], colorHex: '#f43f5e', tierLabel: '传奇' },
  { level: 19, en: 'Utopian', zhCN: '乌托邦', zhAliases: ['乌托邦'], colorHex: '#ef4444', tierLabel: '殿堂' },
  { level: 20, en: 'Divine', zhCN: '神级', zhAliases: ['神级', '圣洁'], colorHex: '#f59e0b', tierLabel: '巅峰' },
] as const;

export function getSkillMeta(level: number): SkillLevelMeta {
  const clamped = Math.max(0, Math.min(20, Math.round(level)));
  return SKILL_LEVELS[clamped] ?? SKILL_LEVELS[0]!;
}

/**
 * 支持从文本（如 "稳定 (7)"、"13/20"、"独步天下"、"Solid"）解析出标准 0-20 整数等级。
 */
export function parseSkillLevelText(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const slashMatch = trimmed.match(/^(\d{1,2})\s*\/\s*\d{1,2}$/);
  if (slashMatch?.[1]) {
    const num = Number.parseInt(slashMatch[1], 10);
    if (num >= 0 && num <= 25) return num;
  }

  const numMatch = trimmed.match(/(?:^|\(|\[|\s)(\d{1,2})(?:\)|\]|$)/);
  if (numMatch?.[1]) {
    const num = Number.parseInt(numMatch[1], 10);
    if (num >= 0 && num <= 25) return num;
  }

  const normalized = trimmed.toLowerCase();
  for (const item of SKILL_LEVELS) {
    if (item.en.toLowerCase() === normalized) {
      return item.level;
    }
    if (item.zhCN === trimmed || item.zhAliases.includes(trimmed)) {
      return item.level;
    }
  }
  // 回退子串匹配（按词条长度降序避免“糟糕”误撞“极其糟糕”）
  const byLen = [...SKILL_LEVELS].sort((a, b) => b.zhCN.length - a.zhCN.length);
  for (const item of byLen) {
    if (item.zhCN.length > 1 && trimmed.includes(item.zhCN)) {
      return item.level;
    }
    if (item.zhAliases.some((alias) => alias.length > 1 && trimmed.includes(alias))) {
      return item.level;
    }
  }
  return null;
}

export function parseSpecialtyText(raw: string): SpecialtyType {
  const s = raw.trim();
  if (!s || s === '-' || s === '无') return null;
  const lower = s.toLowerCase();
  if (s.includes('头球') || lower.includes('head')) return 'Head';
  if (s.includes('速度') || s.includes('快速') || lower.includes('quick')) return 'Quick';
  if (s.includes('技术') || lower.includes('technical')) return 'Technical';
  if (s.includes('力量') || s.includes('强壮') || lower.includes('powerful')) return 'Powerful';
  if (s.includes('不可预测') || lower.includes('unpredictable')) return 'Unpredictable';
  if (s.includes('支援') || s.includes('辅助') || lower.includes('support')) return 'Support';
  if (s.includes('恢复') || s.includes('坚韧') || lower.includes('resilient') || lower.includes('regainer')) {
    return 'Resilient';
  }
  return null;
}

export interface SpecialtyGuide {
  type: Exclude<SpecialtyType, null>;
  zhCN: string;
  bestPositions: string;
  weatherEffect: string;
  tacticalNote: string;
}

export const SPECIALTY_GUIDES: readonly SpecialtyGuide[] = [
  {
    type: 'Head',
    zhCN: '头球专家 (Head)',
    bestPositions: '中场核心 / 前锋 / 中卫',
    weatherEffect: '无天气惩罚',
    tacticalNote: '定位球与边路传中强力得分手，同时克制对方“技术型”前锋；新手极推荐优先留下的万金油特技。',
  },
  {
    type: 'Quick',
    zhCN: '速度 (Quick)',
    bestPositions: '边锋 / 前锋 / 门将(新)',
    weatherEffect: '暴晒/高温或雨天可能触发体力/状态负面影响',
    tacticalNote: '能凭空跑出单刀破门机会；青训/一线队“速度门将”还能降低对手反击成功率。',
  },
  {
    type: 'Technical',
    zhCN: '技术 (Technical)',
    bestPositions: '组织型前锋(TDF) / 边锋',
    weatherEffect: '晴天加成；雨天评分受损',
    tacticalNote: '对位没有头球专家防守者时有惊喜，但遇对方“头球专家”中卫容易被压制。',
  },
  {
    type: 'Powerful',
    zhCN: '力量 (Powerful)',
    bestPositions: '防守型中场(PDIM) / 中卫 / 前锋',
    weatherEffect: '雨天加成；大晴天体力消耗更快',
    tacticalNote: '强壮防守型中场(PDIM)能逼抢对方进攻机会，前锋也可拼抢二次进攻。',
  },
  {
    type: 'Unpredictable',
    zhCN: '不可预测 (Unpredictable)',
    bestPositions: '边锋 / 前锋 / 中场（需高传球/高防守托底）',
    weatherEffect: '无天气惩罚',
    tacticalNote: '双刃剑：高传球时可送出神仙直塞，但如果作为后防线且防守/经验不足，可能失误送对手大礼。',
  },
  {
    type: 'Support',
    zhCN: '支援型 (Support)',
    bestPositions: '副手/团队型球员',
    weatherEffect: '无天气惩罚',
    tacticalNote: '牺牲少量个人直接特技，在场上为队友创造额外辅助加成。',
  },
  {
    type: 'Resilient',
    zhCN: '恢复能力强 (Resilient)',
    bestPositions: '全位置通用',
    weatherEffect: '无天气惩罚',
    tacticalNote: '显著加快受伤后的恢复速度，对高助教配置下的核心主力十分省心。',
  },
] as const;
