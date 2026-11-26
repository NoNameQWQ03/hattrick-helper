import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { evaluateRookieDiagnostics } from '../../core/rules/engine';
import type { UserSettings } from '../../core/types/domain';
import { DEFAULT_SETTINGS, loadUserSettings } from '../../storage/settings';

function PopupApp() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    void loadUserSettings().then((s) => setSettings(s));
  }, []);

  const diagnostics = evaluateRookieDiagnostics(settings.manualState);
  const warnings = diagnostics.filter((d) => d.severity === 'critical' || d.severity === 'warning');

  return (
    <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
      <div
        style={{
          padding: '10px 12px',
          background: 'linear-gradient(180deg, #3c7b2c 0%, #27591b 100%)',
          color: '#ffffff',
          borderBottom: '2px solid #1c4412',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '14px' }}>帽子戏法小助手 (Hattrick Helper)</div>
        <div style={{ fontSize: '11px', color: '#dcf2d4' }}>
          只读辅助助手 · 安全防封号
        </div>
      </div>

      <div style={{ padding: '12px' }}>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #c3cebc',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '10px',
          }}
        >
          <div>当前主训方向：<strong>{settings.manualState.trainingGoal}</strong></div>
          <div>青训营状态：<strong>{settings.manualState.youthAcademyActive ? '已开启' : '未开启'}</strong></div>
          <div>待处理重点提示：<strong style={{ color: warnings.length > 0 ? '#b91c1c' : '#1f5316' }}>{warnings.length} 项</strong></div>
        </div>

        <div style={{ fontSize: '12px', color: '#384635' }}>
          打开任意 <code>hattrick.org</code> 游戏页面，点击右下角绿色 <strong>「HT 小助手」</strong> 按钮即可查看：
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            <li>第 1–5 步新手上手操作路线图</li>
            <li>11 人排阵直接标在球场上的点名提示</li>
            <li>训练/职员/青训页同步直贴指引与计算器</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

render(<PopupApp />, document.getElementById('app')!);
