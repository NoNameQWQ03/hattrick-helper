import { recommendLineupPlan } from '../../../core/math/lineup-planner';
import type { HattrickPageType, ManualRookieState, UserSettings } from '../../../core/types/domain';
import { ROOKIE_PRESETS, type RookiePreset } from '../../../storage/settings';

interface GuideTabProps {
  settings: UserSettings;
  onApplyPreset: (preset: RookiePreset) => void;
  onRestorePreset: () => void;
}

const ONBOARDING_PAGES: Array<{ key: HattrickPageType; label: string; path: string; needsTeamId: boolean }> = [
  { key: 'players_list', label: '球员页', path: '/Club/Players/', needsTeamId: true },
  { key: 'economy', label: '财政页', path: '/Club/Finances/', needsTeamId: true },
  { key: 'staff', label: '职员页', path: '/Club/Specialists/', needsTeamId: true },
  { key: 'training', label: '训练页', path: '/Club/Training/Training.aspx', needsTeamId: true },
  { key: 'matches', label: '赛程页', path: '/Club/Matches/', needsTeamId: true },
  { key: 'youth_players', label: '青训页', path: '/Club/Players/YouthPlayers.aspx', needsTeamId: false },
];

function openClubPage(pathSuffix: string, ownTeamId?: number) {
  const base = window.location.origin;
  const separator = pathSuffix.includes('?') ? '&' : '?';
  const url = ownTeamId
    ? `${base}${pathSuffix}${separator}teamId=${ownTeamId}`
    : `${base}${pathSuffix}`;
  window.location.href = url;
}

export function GuideTab({ settings, onApplyPreset, onRestorePreset }: GuideTabProps) {
  const { manualState, presetBackup, activePresetLabel, showInPageGuides } = settings;
  const auto = manualState.autoSynced;
  const teamId = auto?.ownTeamId;
  const syncedPages = auto?.syncedPages ?? {};
  const syncedDoneCount = ONBOARDING_PAGES.filter((p) => Boolean(syncedPages[p.key])).length;

  const lineupPlan =
    auto?.squadRoster && auto.squadRoster.length > 0
      ? recommendLineupPlan(auto.squadRoster, manualState.trainingGoal)
      : null;

  return (
    <>
      <div class="htrc-card">
        <h4>第 1 步：点开这几页读取本队状态（已同步 {syncedDoneCount}/{ONBOARDING_PAGES.length}）</h4>
        <div class="htrc-muted" style={{ marginBottom: '6px' }}>
          依次打开下面页面即可自动采集数据（点「收起」面板时，网页上的指引贴纸依然会保留）：
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {ONBOARDING_PAGES.map((item) => {
            const done = Boolean(syncedPages[item.key]);
            return (
              <button
                key={item.key}
                class="htrc-icon-btn"
                style={{
                  background: done ? '#eef7ec' : '#fef9eb',
                  color: done ? '#1e5316' : '#784b00',
                  borderColor: done ? '#79b36b' : '#d6a449',
                }}
                onClick={() => openClubPage(item.path, item.needsTeamId ? teamId : undefined)}
              >
                {done ? '✓ ' : '查看 '}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div class="htrc-card">
        <h4>第 2 步：一键套用插件攻略预设（可随时还原）</h4>
        <div class="htrc-muted" style={{ marginBottom: '6px' }}>
          先选定你的主力训练流派（当前页内指引：{showInPageGuides ? '开启' : '已关闭'}）。游戏内保存/解雇仍由你本人确认，确保账号安全。
        </div>

        {activePresetLabel && (
          <div class="htrc-alert tip" style={{ marginBottom: '8px' }}>
            <div class="htrc-alert-title">当前已选方案：{activePresetLabel}</div>
            <div class="htrc-muted">若需恢复切换前的插件参数，点击下方「还原自动配置」。</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {ROOKIE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              class="htrc-btn secondary"
              style={{ textAlign: 'left' }}
              onClick={() => onApplyPreset(preset)}
              title={preset.description}
            >
              <div>{preset.label}</div>
              <div style={{ fontSize: '11px', color: '#5b6a57', fontWeight: 400, marginTop: '2px' }}>
                {preset.description}
              </div>
            </button>
          ))}

          {presetBackup && (
            <button
              class="htrc-btn"
              style={{
                background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
                borderColor: '#92400e',
              }}
              onClick={onRestorePreset}
            >
              还原自动配置（恢复套用预设前的参数）
            </button>
          )}
        </div>
      </div>

      <div class="htrc-card">
        <h4>针对你当前俱乐部的实操攻略手册</h4>

        <div class="htrc-alert critical" style={{ marginBottom: '8px' }}>
          <div class="htrc-alert-title">
            第 3 步：财政止血与职员调整（当前：{manualState.weeklyCashEuro < 0 ? `负现金约 €${manualState.weeklyCashEuro.toLocaleString()}` : `现金约 €${manualState.weeklyCashEuro.toLocaleString()}`}）
          </div>
          <div style={{ fontSize: '12px', marginBottom: '6px' }}>
            1. 停止购买高薪老将，暂缓球场扩建。<br />
            2. 一线队保持 <strong>20–24 人</strong>（目前 {auto?.squadCount ?? '未知'} 人），闲置老将/替补挂牌卖出。<br />
            3. 进入职员页对照指引卡片，手动配成 <strong>4级教练 + 双4级助教(合计8级) + 4级队医</strong>，心理师降至 0–1 级。
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button class="htrc-icon-btn" onClick={() => openClubPage('/Club/Finances/', teamId)}>
              1. 财政页
            </button>
            <button class="htrc-icon-btn" onClick={() => openClubPage('/Club/Specialists/', teamId)}>
              2. 职员页
            </button>
            <button class="htrc-icon-btn" onClick={() => openClubPage('/Club/Players/', teamId)}>
              3. 球员页
            </button>
          </div>
        </div>

        <div class="htrc-alert warning" style={{ marginBottom: '8px' }}>
          <div class="htrc-alert-title">
            第 4 步：调整训练页（当前体力 {manualState.staminaSharePct}% / 强度 {manualState.trainingIntensityPct}%）
          </div>
          <div style={{ fontSize: '12px', marginBottom: '6px' }}>
            1. <strong>训练水平拉满 100%</strong>，<strong>体力占比设为 10%–12%</strong>。<br />
            2. 下拉选择<strong>单一纯主训</strong>（勿选带“扩展”字样的扩散训练）。<br />
            3. 调整完后点击页面上的 <strong>「保存设置」</strong> 按钮。
          </div>
          <button class="htrc-icon-btn" onClick={() => openClubPage('/Club/Training/Training.aspx', teamId)}>
            前往训练页调整 -&gt;
          </button>
        </div>

        <div class="htrc-alert tip" style={{ marginBottom: '8px' }}>
          <div class="htrc-alert-title">第 5 步：排阵 11 人首发表 &amp; 周中友谊赛</div>
          {lineupPlan ? (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11.5px', marginBottom: '4px', color: '#183650' }}>
                推荐阵型：<strong>{lineupPlan.formationName}</strong>（收起本面板进排阵页后，场上位置与右侧名单仍会贴着提示）
              </div>
              <div style={{ maxHeight: '190px', overflowY: 'auto' }}>
                <table class="htrc-table">
                  <thead>
                    <tr>
                      <th>位置</th>
                      <th>推荐球员</th>
                      <th>依据</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineupPlan.assignments.map((slot) => (
                      <tr key={slot.slotId} class={slot.isTraineeSlot ? 'is-trainee' : ''}>
                        <td>
                          <strong>{slot.roleZh}</strong>
                          {slot.isTraineeSlot ? ' [训]' : ''}
                        </td>
                        <td>{slot.playerName}</td>
                        <td class="htrc-muted">{slot.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', marginBottom: '6px' }}>
              先点击「第 1 步 → 球员页」读取一次名单，这里会立刻生成 11 人对号入座排阵表。
            </div>
          )}
          <div style={{ fontSize: '12px', marginBottom: '6px' }}>
            1. 普通联赛选 <strong>「普通比赛」</strong>（打弱旅可选 <strong>「轻松随意」</strong>），慎用生死之战。<br />
            2. 严守阵型底线：后卫≤5、中前卫≤3、前锋≤3、总人数≥9，否则当周训练作废。<br />
            3. 在赛程页确认约好<strong>周中友谊赛</strong>，让二线苗子打满 90 分钟。
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button class="htrc-icon-btn" onClick={() => openClubPage('/Club/Matches/', teamId)}>
              前往赛程 / 排阵页 -&gt;
            </button>
            {!lineupPlan && (
              <button class="htrc-icon-btn" onClick={() => openClubPage('/Club/Players/', teamId)}>
                去球员页生成名单 -&gt;
              </button>
            )}
          </div>
        </div>

        <div class="htrc-alert success">
          <div class="htrc-alert-title">日常维护：青训营与球场扩建要点</div>
          <div style={{ fontSize: '12px', marginBottom: '6px' }}>
            • 青训提拔必须同时满足 <strong>17 岁 0 天 且 入营满 112 天</strong>。<br />
            • 每 <strong>21 天</strong> 可约一次青训友谊赛，用于测高潜苗子的未知潜力。<br />
            • 晴天主场未连续 2–3 次坐满 96%+ 前勿扩建；扩建按 <strong>63% 站席 : 25% 普通 : 10% 有顶 : 2% VIP</strong>。
          </div>
          <button class="htrc-icon-btn" onClick={() => openClubPage('/Club/Players/YouthPlayers.aspx')}>
            查看青训球员 -&gt;
          </button>
        </div>
      </div>
    </>
  );
}
