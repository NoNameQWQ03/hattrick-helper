import type { ManualRookieState, UserSettings } from '../core/types/domain';

const SETTINGS_KEY = 'htrc_user_settings_v1';

export const DEFAULT_MANUAL_STATE: ManualRookieState = {
  newbieLicenseDone: false,
  trainingGoal: 'UNSET',
  trainingIntensityPct: 100,
  staminaSharePct: 10,
  seniorFriendlyBookedThisWeek: false,
  headCoachLevel: 3,
  assistantSum: 0,
  medicLevel: 0,
  weeklyCashEuro: 250000,
  weeklyNetBalanceEuro: 10000,
  youthAcademyActive: true,
  youthScoutsCount: 1,
  daysSinceLastYouthFriendly: 0,
  recentSunnyHomeFullCount: 0,
};

export const DEFAULT_SETTINGS: UserSettings = {
  language: 'zh-CN',
  foxtrickDetectedMode: 'auto',
  drawerCollapsed: false,
  showInPageGuides: true,
  activeTab: 'guide',
  manualState: DEFAULT_MANUAL_STATE,
  presetBackup: null,
  activePresetLabel: null,
};

export interface RookiePreset {
  id: 'rescue_gk' | 'def_532' | 'pm_352';
  label: string;
  description: string;
  patch: Partial<ManualRookieState>;
}

export const ROOKIE_PRESETS: readonly RookiePreset[] = [
  {
    id: 'rescue_gk',
    label: '[推荐起步] 财政止血 + 门将(GK)起步预设',
    description: '将插件目标设为 GK、目标体力基准 10%、强度 100%、建议教练4/助教8/队医4、青训球探降至1名控成本。',
    patch: {
      trainingGoal: 'GK',
      trainingIntensityPct: 100,
      staminaSharePct: 10,
      headCoachLevel: 4,
      assistantSum: 8,
      medicLevel: 4,
      youthScoutsCount: 1,
    },
  },
  {
    id: 'def_532',
    label: '[稳健练苗] 5 后卫防守流(DEF)预设',
    description: '将插件目标设为纯防守(DEF)、体力 11%、强度 100%、黄金职员 4+8+4，适合批量练 10 名年轻后卫苗子。',
    patch: {
      trainingGoal: 'DEF',
      trainingIntensityPct: 100,
      staminaSharePct: 11,
      headCoachLevel: 4,
      assistantSum: 8,
      medicLevel: 4,
    },
  },
  {
    id: 'pm_352',
    label: '[均衡联赛] 3-5-2 组织流(PM)预设',
    description: '将插件目标设为纯组织(PM)、体力 12%、强度 100%、黄金职员 4+8+4，兼顾联赛控球与中场升值。',
    patch: {
      trainingGoal: 'PM',
      trainingIntensityPct: 100,
      staminaSharePct: 12,
      headCoachLevel: 4,
      assistantSum: 8,
      medicLevel: 4,
    },
  },
] as const;

/**
 * 在应用预设前自动保存原始 manualState 快照，确保随时可一键还原。
 */
export function applyPresetWithBackup(
  current: UserSettings,
  preset: RookiePreset
): UserSettings {
  const backup = current.presetBackup ?? structuredClone(current.manualState);
  return {
    ...current,
    presetBackup: backup,
    activePresetLabel: preset.label,
    manualState: {
      ...current.manualState,
      ...preset.patch,
    },
  };
}

/**
 * 一键还原最近一次套用预设前的原始插件配置。
 */
export function restorePresetBackup(current: UserSettings): UserSettings {
  if (!current.presetBackup) return current;
  return {
    ...current,
    manualState: structuredClone(current.presetBackup),
    presetBackup: null,
    activePresetLabel: null,
  };
}

function mergeSettings(raw: Partial<UserSettings> | undefined): UserSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    manualState: {
      ...DEFAULT_MANUAL_STATE,
      ...(raw?.manualState ?? {}),
    },
    presetBackup: raw?.presetBackup
      ? { ...DEFAULT_MANUAL_STATE, ...raw.presetBackup }
      : null,
    activePresetLabel: raw?.activePresetLabel ?? null,
  };
}

export async function loadUserSettings(): Promise<UserSettings> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return mergeSettings(result[SETTINGS_KEY] as Partial<UserSettings> | undefined);
  }
  try {
    const text = globalThis.localStorage?.getItem(SETTINGS_KEY);
    return mergeSettings(text ? (JSON.parse(text) as Partial<UserSettings>) : undefined);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    return;
  }
  try {
    globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 忽略测试环境存储受限
  }
}
