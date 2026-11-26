import { useEffect, useState } from 'preact/hooks';
import { evaluateRookieDiagnostics } from '../../core/rules/engine';
import type { ManualRookieState, TrainingGoal, UserSettings } from '../../core/types/domain';
import { syncCurrentPageToState } from '../../parsers/page-sync';
import {
  applyPresetWithBackup,
  DEFAULT_SETTINGS,
  loadUserSettings,
  restorePresetBackup,
  type RookiePreset,
  saveUserSettings,
} from '../../storage/settings';
import { clearAllCoachMarks } from '../../ui/BadgeInjector';
import { AdvisorTab } from './components/AdvisorTab';
import { CalculatorsTab } from './components/CalculatorsTab';
import { CaptureTab } from './components/CaptureTab';
import { ChecklistTab } from './components/ChecklistTab';
import { GuideTab } from './components/GuideTab';

interface AppProps {
  currentPageType: string;
  foxtrickDetected: boolean;
  syncTick?: number;
}

const PAGE_LABEL_ZH: Record<string, string> = {
  home: '我的办公室',
  club_overview: '俱乐部概览',
  players_list: '一线队球员',
  player_detail: '球员详情',
  training: '训练设置',
  staff: '职员团队',
  economy: '财政报告',
  arena: '球场',
  matches: '赛程',
  lineup: '排阵页',
  youth_players: '青训球员',
  transfer_search: '转会市场',
  unknown: '其他页面',
};

export function App({ currentPageType, foxtrickDetected, syncTick = 0 }: AppProps) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let latestSettings = DEFAULT_SETTINGS;

    const runSync = (baseSettings: UserSettings) => {
      const showGuides = baseSettings.showInPageGuides;
      const res = syncCurrentPageToState(
        document,
        window.location.href,
        baseSettings.manualState,
        foxtrickDetected,
        (patchedState) => {
          if (!active) return;
          const nextWithDb: UserSettings = { ...latestSettings, manualState: patchedState };
          latestSettings = nextWithDb;
          setSettings(nextWithDb);
          void saveUserSettings(nextWithDb);
        },
        showGuides
      );
      if (res.updated) {
        const merged: UserSettings = { ...baseSettings, manualState: res.nextState };
        latestSettings = merged;
        setSettings(merged);
        void saveUserSettings(merged);
        return merged;
      }
      latestSettings = baseSettings;
      setSettings(baseSettings);
      return baseSettings;
    };

    const handleInteractiveChange = () => {
      if (!active || (currentPageType !== 'lineup' && currentPageType !== 'training')) return;
      runSync(latestSettings);
    };

    void loadUserSettings().then((loaded) => {
      if (!active) return;
      const afterFirst = runSync(loaded);
      if (
        currentPageType === 'training' ||
        currentPageType === 'lineup' ||
        currentPageType === 'unknown'
      ) {
        retryTimer = setTimeout(() => {
          if (active) runSync(afterFirst);
        }, 900);
      }
    });

    if (currentPageType === 'lineup' || currentPageType === 'training') {
      document.addEventListener('change', handleInteractiveChange);
    }

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (currentPageType === 'lineup' || currentPageType === 'training') {
        document.removeEventListener('change', handleInteractiveChange);
      }
    };
  }, [currentPageType, foxtrickDetected, syncTick]);

  function persist(next: UserSettings) {
    const prevGuides = settings.showInPageGuides;
    const nextGuides = next.showInPageGuides;
    let finalNext = next;

    if (!nextGuides) {
      clearAllCoachMarks(document);
    } else if (!prevGuides || next.manualState.trainingGoal !== settings.manualState.trainingGoal) {
      const res = syncCurrentPageToState(
        document,
        window.location.href,
        next.manualState,
        foxtrickDetected,
        undefined,
        true
      );
      if (res.updated) {
        finalNext = { ...next, manualState: res.nextState };
      }
    }

    setSettings(finalNext);
    void saveUserSettings(finalNext);
  }

  function updateManualState(patch: Partial<ManualRookieState>) {
    persist({
      ...settings,
      manualState: {
        ...settings.manualState,
        ...patch,
      },
    });
  }

  function handleSelectTrainingGoal(goal: TrainingGoal) {
    persist({
      ...settings,
      activeTab: 'checklist',
      manualState: {
        ...settings.manualState,
        trainingGoal: goal,
      },
    });
  }

  function handleApplyPreset(preset: RookiePreset) {
    persist(applyPresetWithBackup(settings, preset));
  }

  function handleRestorePreset() {
    persist(restorePresetBackup(settings));
  }

  const diagnostics = evaluateRookieDiagnostics(settings.manualState, currentPageType);
  const criticalCount = diagnostics.filter(
    (d) => d.severity === 'critical' || d.severity === 'warning'
  ).length;
  const clubTitle = settings.manualState.autoSynced?.clubName;

  const pageLabel = PAGE_LABEL_ZH[currentPageType] ?? currentPageType;

  if (settings.drawerCollapsed) {
    return (
      <div class="htrc-pill-bar">
        <button
          class="htrc-pill"
          onClick={() => persist({ ...settings, drawerCollapsed: false })}
          title="展开帽子戏法小助手"
        >
          <span>HT 小助手</span>
          {criticalCount > 0 && <span class="htrc-pill-badge">{criticalCount} 项待办</span>}
        </button>
        <button
          class="htrc-pill secondary"
          onClick={() => persist({ ...settings, showInPageGuides: !settings.showInPageGuides })}
          title="开关网页上的排阵/训练/职员贴纸指引"
        >
          {settings.showInPageGuides ? '页内指引: 开' : '页内指引: 关'}
        </button>
      </div>
    );
  }

  return (
    <aside class="htrc-drawer" aria-label="帽子戏法小助手">
      <header class="htrc-header">
        <div>
          <div class="htrc-title">帽子戏法小助手</div>
          <div class="htrc-subtitle">
            {clubTitle ? `${clubTitle} · ` : ''}{pageLabel}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button
            class="htrc-icon-btn"
            onClick={() => persist({ ...settings, showInPageGuides: !settings.showInPageGuides })}
            title="开启后会在排阵/训练/职员页对应操作位置直接贴出指引标签（收起面板后依然保留）"
          >
            {settings.showInPageGuides ? '页内指引: 开' : '页内指引: 关'}
          </button>
          <button
            class="htrc-icon-btn"
            onClick={() => persist({ ...settings, drawerCollapsed: true })}
            title="收起面板，保留网页内贴纸指引"
          >
            收起
          </button>
        </div>
      </header>

      <nav class="htrc-tabs">
        <button
          class={`htrc-tab ${settings.activeTab === 'guide' ? 'active' : ''}`}
          onClick={() => persist({ ...settings, activeTab: 'guide' })}
        >
          攻略
        </button>
        <button
          class={`htrc-tab ${settings.activeTab === 'advisor' ? 'active' : ''}`}
          onClick={() => persist({ ...settings, activeTab: 'advisor' })}
        >
          向导
        </button>
        <button
          class={`htrc-tab ${settings.activeTab === 'checklist' ? 'active' : ''}`}
          onClick={() => persist({ ...settings, activeTab: 'checklist' })}
        >
          待办({criticalCount})
        </button>
        <button
          class={`htrc-tab ${settings.activeTab === 'calculators' ? 'active' : ''}`}
          onClick={() => persist({ ...settings, activeTab: 'calculators' })}
        >
          计算器
        </button>
        <button
          class={`htrc-tab ${settings.activeTab === 'capture' ? 'active' : ''}`}
          onClick={() => persist({ ...settings, activeTab: 'capture' })}
        >
          同步
        </button>
      </nav>

      <main class="htrc-body">
        {settings.activeTab === 'guide' && (
          <GuideTab
            settings={settings}
            onApplyPreset={handleApplyPreset}
            onRestorePreset={handleRestorePreset}
          />
        )}
        {settings.activeTab === 'advisor' && (
          <AdvisorTab
            manualState={settings.manualState}
            onSelectTrainingGoal={handleSelectTrainingGoal}
          />
        )}
        {settings.activeTab === 'checklist' && (
          <ChecklistTab
            manualState={settings.manualState}
            currentPageType={currentPageType}
            onUpdateState={updateManualState}
          />
        )}
        {settings.activeTab === 'calculators' && (
          <CalculatorsTab manualState={settings.manualState} />
        )}
        {settings.activeTab === 'capture' && (
          <CaptureTab
            currentPageType={currentPageType}
            foxtrickDetected={foxtrickDetected}
            settings={settings}
          />
        )}
      </main>

      <footer class="htrc-footer">
        <span>目标方向: {settings.manualState.trainingGoal}</span>
        <span>
          {settings.activePresetLabel ? '预设已生效(可还原)' : `YA: ${settings.manualState.youthAcademyActive ? '已开启' : '未开启'}`}
        </span>
      </footer>
    </aside>
  );
}
