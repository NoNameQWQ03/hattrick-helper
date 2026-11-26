/**
 * MV3 Service Worker（严格零抓包合规实现）
 * 不发任何外部或 Hattrick HTTP 请求，仅处理扩展安装初始化与状态日志。
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.info('[Hattrick Helper] 帽子戏法小助手已就绪（纯本地只读模式）');
  }
});
