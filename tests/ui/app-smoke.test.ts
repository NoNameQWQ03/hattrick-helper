import { h, render } from 'preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/entrypoints/hattrick.content/App';

describe('ui/App Shadow DOM smoke test', () => {
  it('mounts cleanly in a ShadowRoot and renders the Guide & Presets tab by default', async () => {
    const host = document.createElement('ht-rookie-copilot');
    const shadow = host.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    shadow.appendChild(root);
    document.body.appendChild(host);

    render(h(App, { currentPageType: 'players_list', foxtrickDetected: false }), root);

    await new Promise((r) => setTimeout(r, 15));

    expect(shadow.textContent).toContain('帽子戏法小助手');
    expect(shadow.textContent).toContain('一键套用插件攻略预设');
    expect(shadow.textContent).toContain('针对你当前俱乐部的实操攻略手册');
    expect(shadow.textContent).toContain('YA: 已开启');

    // 点击“收起”后，抽屉应缩成悬浮条但仍保留“页内指引: 开”快捷开关
    const collapseBtn = Array.from(shadow.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '收起'
    );
    collapseBtn?.click();
    await new Promise((r) => setTimeout(r, 15));
    expect(shadow.textContent).toContain('页内指引: 开');
  });
});
