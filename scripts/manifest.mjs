export function createManifest(target) {
  const base = {
    manifest_version: 3,
    name: '帽子戏法小助手 (Hattrick Helper)',
    version: '0.1.0',
    description:
      '零后台抓包、零自动化代操、纯本地运行的 Hattrick 简体中文新手陪伴小助手与分步引导插件。',
    permissions: ['storage'],
    icons: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    action: {
      default_title: '帽子戏法小助手',
      default_popup: 'popup.html',
      default_icon: {
        '16': 'icons/icon-16.png',
        '48': 'icons/icon-48.png',
      },
    },
    background:
      target === 'firefox'
        ? { scripts: ['background.js'], type: 'module' }
        : { service_worker: 'background.js', type: 'module' },
    content_scripts: [
      {
        matches: ['https://*.hattrick.org/*', 'http://*.hattrick.org/*'],
        js: ['content.js'],
        run_at: 'document_idle',
      },
    ],
  };

  if (target === 'firefox') {
    base.browser_specific_settings = {
      gecko: {
        id: 'hattrick-helper@community.invalid',
        strict_min_version: '115.0',
      },
    };
  }

  return base;
}
