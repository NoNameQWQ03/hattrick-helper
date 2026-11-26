import { useState } from 'preact/hooks';
import { evaluateRookieDiagnostics } from '../../../core/rules/engine';
import type { DiagnosticItem, ManualRookieState, TrainingGoal } from '../../../core/types/domain';

interface ChecklistTabProps {
  manualState: ManualRookieState;
  currentPageType: string;
  onUpdateState: (patch: Partial<ManualRookieState>) => void;
}

function openClubPage(pathSuffix: string, ownTeamId?: number) {
  const base = window.location.origin;
  const separator = pathSuffix.includes('?') ? '&' : '?';
  window.location.href = ownTeamId
    ? `${base}${pathSuffix}${separator}teamId=${ownTeamId}`
    : `${base}${pathSuffix}`;
}

export function ChecklistTab({ manualState, currentPageType, onUpdateState }: ChecklistTabProps) {
  const [showManualSim, setShowManualSim] = useState(false);
  const [showOkTips, setShowOkTips] = useState(false);

  const diagnostics = evaluateRookieDiagnostics(manualState, currentPageType);
  const urgentItems = diagnostics.filter(
    (d) => d.severity === 'critical' || d.severity === 'warning'
  );
  const infoItems = diagnostics.filter(
    (d) => d.severity === 'tip' || d.severity === 'success'
  );

  const teamId = manualState.autoSynced?.ownTeamId;
  const syncedPages = manualState.autoSynced?.syncedPages ?? {};
  const pageLabels: Array<[keyof typeof syncedPages, string]> = [
    ['players_list', '球员'],
    ['training', '训练'],
    ['staff', '职员'],
    ['economy', '财政'],
    ['arena', '球场'],
    ['matches', '赛程'],
    ['lineup', '排阵'],
    ['youth_players', '青训'],
  ];

  function renderQuickConfirm(item: DiagnosticItem) {
    if (item.id === 'SURVIVAL_NEWBIE_LICENSE') {
      return (
        <button
          class="htrc-icon-btn"
          onClick={() => onUpdateState({ newbieLicenseDone: true })}
        >
          ✓ 我已做完执照，不再提醒
        </button>
      );
    }
    if (item.id === 'TRAIN_NO_FRIENDLY_BOOKED') {
      return (
        <button
          class="htrc-icon-btn"
          onClick={() => onUpdateState({ seniorFriendlyBookedThisWeek: true })}
        >
          ✓ 我已约好，本周不再提醒
        </button>
      );
    }
    return null;
  }

  function renderDiagnosticCard(item: DiagnosticItem) {
    const isYouthRoute = item.targetRoute?.toLowerCase().includes('youth');
    return (
      <div key={item.id} class={`htrc-alert ${item.severity}`}>
        <div class="htrc-alert-title">{item.title}</div>
        <div style={{ fontSize: '12px', marginBottom: '4px' }}>{item.reason}</div>
        <div style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: item.targetRoute ? '6px' : '0' }}>
          怎么改：{item.actionHint}
        </div>
        {(item.targetRoute || item.id === 'SURVIVAL_NEWBIE_LICENSE' || item.id === 'TRAIN_NO_FRIENDLY_BOOKED') && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
            {item.targetRoute && (
              <button
                class="htrc-btn"
                style={{ padding: '4px 9px', fontSize: '11.5px' }}
                onClick={() => openClubPage(item.targetRoute!, isYouthRoute ? undefined : teamId)}
              >
                去这个页面处理 -&gt;
              </button>
            )}
            {renderQuickConfirm(item)}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div class="htrc-card">
        <h4>今日俱乐部待办与健康体检</h4>
        {urgentItems.length > 0 ? (
          <div class="htrc-alert warning" style={{ marginBottom: '6px' }}>
            <div class="htrc-alert-title">
              当前有 {urgentItems.length} 项需要留意，按下面卡片点按钮去调好就行
            </div>
            <div class="htrc-muted">
              无需自己填表——平时逛过一次页面会自动读取最新状态；每条都标明了去哪里改。
            </div>
          </div>
        ) : (
          <div class="htrc-alert success" style={{ marginBottom: '6px' }}>
            <div class="htrc-alert-title">太棒了！目前核心设置全部健康</div>
            <div class="htrc-muted">
              没有高风险遗漏，照常排好首发、约好友谊赛等比赛日即可。
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {pageLabels.map(([key, label]) => {
            const done = Boolean(syncedPages[key]);
            return (
              <span
                key={key}
                class="htrc-tag"
                style={{
                  borderColor: done ? '#458e34' : '#c2ceba',
                  background: done ? '#eef7ec' : '#f6f8f3',
                  color: done ? '#1e5316' : '#5b6a57',
                }}
              >
                {done ? '✓' : '○'} {label}
              </span>
            );
          })}
        </div>
      </div>

      {urgentItems.map(renderDiagnosticCard)}

      {infoItems.length > 0 && (
        <div class="htrc-card">
          <h4>贴心小提醒与已达标项目（{infoItems.length} 项）</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showOkTips ? '8px' : '0' }}>
            <span class="htrc-muted">包含已过关的好习惯、重点苗子追踪与球场提醒</span>
            <button
              class="htrc-icon-btn"
              onClick={() => setShowOkTips(!showOkTips)}
            >
              {showOkTips ? '收起' : '展开查看'}
            </button>
          </div>
          {showOkTips && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {infoItems.map(renderDiagnosticCard)}
            </div>
          )}
        </div>
      )}

      <div class="htrc-card">
        <h4>手动模拟试算（进阶 · 平时不用改）</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showManualSim ? '8px' : '0' }}>
          <span class="htrc-muted">通常由游戏页面自动更新，如需手动测试不同数字可展开调整</span>
          <button
            class="htrc-icon-btn"
            onClick={() => setShowManualSim(!showManualSim)}
          >
            {showManualSim ? '收起参数' : '展开试算'}
          </button>
        </div>

        {showManualSim && (
          <>
            <div class="htrc-field-grid">
              <label class="htrc-field">
                <span>主训练方向</span>
                <select
                  value={manualState.trainingGoal}
                  onChange={(e) => onUpdateState({ trainingGoal: e.currentTarget.value as TrainingGoal })}
                >
                  <option value="UNSET">尚未决定</option>
                  <option value="GK">守门员 (GK)</option>
                  <option value="DEF">防守 (DEF)</option>
                  <option value="PM">组织 (PM)</option>
                  <option value="SCOR">进球 (SCOR)</option>
                  <option value="WING">边锋 (WING)</option>
                </select>
              </label>

              <label class="htrc-field">
                <span>主教练等级 (1–5)</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={manualState.headCoachLevel}
                  onInput={(e) =>
                    onUpdateState({ headCoachLevel: Number(e.currentTarget.value) || 1 })
                  }
                />
              </label>

              <label class="htrc-field">
                <span>训练强度 (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={manualState.trainingIntensityPct}
                  onInput={(e) =>
                    onUpdateState({ trainingIntensityPct: Number(e.currentTarget.value) || 0 })
                  }
                />
              </label>

              <label class="htrc-field">
                <span>体能占比 (%)</span>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={manualState.staminaSharePct}
                  onInput={(e) =>
                    onUpdateState({ staminaSharePct: Number(e.currentTarget.value) || 10 })
                  }
                />
              </label>

              <label class="htrc-field">
                <span>助教等级总和 (0–10)</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={manualState.assistantSum}
                  onInput={(e) =>
                    onUpdateState({ assistantSum: Number(e.currentTarget.value) || 0 })
                  }
                />
              </label>

              <label class="htrc-field">
                <span>队医等级 (0–5)</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={manualState.medicLevel}
                  onInput={(e) =>
                    onUpdateState({ medicLevel: Number(e.currentTarget.value) || 0 })
                  }
                />
              </label>

              <label class="htrc-field">
                <span>青训球探数量 (0–3)</span>
                <select
                  value={manualState.youthScoutsCount}
                  onChange={(e) =>
                    onUpdateState({
                      youthScoutsCount: Number(e.currentTarget.value) as 0 | 1 | 2 | 3,
                    })
                  }
                >
                  <option value={0}>0 名（未雇球探）</option>
                  <option value={1}>1 名（€10,000/周）</option>
                  <option value={2}>2 名（€15,000/周）</option>
                  <option value={3}>3 名（€20,000/周）</option>
                </select>
              </label>

              <label class="htrc-field">
                <span>距上次青训友谊赛(天)</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={manualState.daysSinceLastYouthFriendly}
                  onInput={(e) =>
                    onUpdateState({
                      daysSinceLastYouthFriendly: Number(e.currentTarget.value) || 0,
                    })
                  }
                />
              </label>

              <label class="htrc-field">
                <span>可用现金 (€折算)</span>
                <input
                  type="number"
                  value={manualState.weeklyCashEuro}
                  onInput={(e) =>
                    onUpdateState({ weeklyCashEuro: Number(e.currentTarget.value) || 0 })
                  }
                />
              </label>

              <label class="htrc-field">
                <span>两周预计净盈亏 (€)</span>
                <input
                  type="number"
                  value={manualState.weeklyNetBalanceEuro}
                  onInput={(e) =>
                    onUpdateState({ weeklyNetBalanceEuro: Number(e.currentTarget.value) || 0 })
                  }
                />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', fontSize: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={manualState.newbieLicenseDone}
                  onChange={(e) =>
                    onUpdateState({ newbieLicenseDone: e.currentTarget.checked })
                  }
                />
                已完成全部「新手执照（Newbie License）」任务
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={manualState.seniorFriendlyBookedThisWeek}
                  onChange={(e) =>
                    onUpdateState({ seniorFriendlyBookedThisWeek: e.currentTarget.checked })
                  }
                />
                本周一线队「周中友谊赛」已约好
              </label>
            </div>
          </>
        )}
      </div>
    </>
  );
}
