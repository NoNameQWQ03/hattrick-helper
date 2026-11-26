import { useState } from 'preact/hooks';
import type { HattrickPageType, UserSettings } from '../../../core/types/domain';
import { exportDatabaseBackup, importDatabaseBackup } from '../../../storage/db';

interface CaptureTabProps {
  currentPageType: string;
  foxtrickDetected: boolean;
  settings: UserSettings;
}

interface SyncTargetItem {
  key: HattrickPageType;
  label: string;
  desc: string;
  path: string;
  needsTeamId?: boolean;
}

const SYNC_TARGETS: SyncTargetItem[] = [
  {
    key: 'players_list',
    label: '1. 一线队球员列表',
    desc: '生成 11 人排阵点名、队长推荐与跨周成长快照',
    path: '/Club/Players/',
    needsTeamId: true,
  },
  {
    key: 'economy',
    label: '2. 俱乐部财政页',
    desc: '核对每周现金流与赞助净盈亏',
    path: '/Club/Finances/',
    needsTeamId: true,
  },
  {
    key: 'staff',
    label: '3. 职员团队页',
    desc: '识别主帅、助教、队医与心理师性价比',
    path: '/Club/Specialists/',
    needsTeamId: true,
  },
  {
    key: 'training',
    label: '4. 训练设置页',
    desc: '读取当前主训项目、体力与强度',
    path: '/Club/Training/Training.aspx',
    needsTeamId: true,
  },
  {
    key: 'matches',
    label: '5. 赛程页',
    desc: '检查本周周中友谊赛是否已约好',
    path: '/Club/Matches/',
    needsTeamId: true,
  },
  {
    key: 'arena',
    label: '6. 球场页',
    desc: '自动填入看台数据计算 63/25/10/2 扩建配比',
    path: '/Club/Stadium/',
    needsTeamId: true,
  },
  {
    key: 'youth_players',
    label: '7. 青训球员列表',
    desc: '标记 17 岁可提拔与待测潜力苗子',
    path: '/Club/Players/YouthPlayers.aspx',
    needsTeamId: false,
  },
];

function openClubPage(pathSuffix: string, ownTeamId?: number) {
  const base = window.location.origin;
  const separator = pathSuffix.includes('?') ? '&' : '?';
  window.location.href = ownTeamId
    ? `${base}${pathSuffix}${separator}teamId=${ownTeamId}`
    : `${base}${pathSuffix}`;
}

export function CaptureTab({ currentPageType, foxtrickDetected, settings }: CaptureTabProps) {
  const [statusMsg, setStatusMsg] = useState<string>('');
  const auto = settings.manualState.autoSynced;
  const syncedPages = auto?.syncedPages ?? {};
  const teamId = auto?.ownTeamId;
  const syncedCount = SYNC_TARGETS.filter((t) => Boolean(syncedPages[t.key])).length;

  async function handleExportBackup() {
    const data = await exportDatabaseBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `htrc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('本地历史数据备份已下载。');
  }

  async function handleImportBackup(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importDatabaseBackup(JSON.parse(text));
      setStatusMsg(`恢复成功：俱乐部 ${res.counts.clubs} 条，成长快照 ${res.counts.playersSnapshots} 条。`);
    } catch (err) {
      setStatusMsg(`恢复失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      input.value = '';
    }
  }

  return (
    <>
      <div class="htrc-card">
        <h4>球队数据同步进度（已同步 {syncedCount}/{SYNC_TARGETS.length} 页）</h4>
        <div class="htrc-muted" style={{ marginBottom: '8px' }}>
          无需导入文件——你正常打开下面这些页面时，助手会自动读取并保存最新数据。未同步的页面可点右侧按钮直接跳过去刷一遍：
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {SYNC_TARGETS.map((item) => {
            const done = Boolean(syncedPages[item.key]);
            return (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '3px',
                  border: `1px solid ${done ? '#b5d5ae' : '#d6dfd0'}`,
                  background: done ? '#f1f8ef' : '#f8faf6',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: done ? '#1e5316' : '#243022' }}>
                    {done ? '✓ ' : '○ '}
                    {item.label}
                  </div>
                  <div class="htrc-muted">{item.desc}</div>
                </div>
                <button
                  class="htrc-icon-btn"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={() => openClubPage(item.path, item.needsTeamId ? teamId : undefined)}
                >
                  {done ? '再去看看' : '去同步 ->'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div class="htrc-card">
        <h4>换电脑 / 清缓存备份（可选）</h4>
        <div class="htrc-muted" style={{ marginBottom: '8px' }}>
          跨周成长快照共 <strong>{auto?.snapshotCountTotal ?? 0}</strong> 条，全部存在本地浏览器。换设备前可导出备份：
          <br />
          当前页：<strong>{currentPageType}</strong> · Foxtrick：
          <strong>{foxtrickDetected ? '已共存' : '未启用'}</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button class="htrc-btn secondary" onClick={() => void handleExportBackup()}>
            导出记录备份 (.json)
          </button>
          <label class="htrc-btn secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
            恢复记录备份
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => void handleImportBackup(e)}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {statusMsg && (
        <div class="htrc-alert success">
          <div style={{ fontSize: '12px' }}>{statusMsg}</div>
        </div>
      )}
    </>
  );
}
