import { h, render } from 'preact';
import { detectHattrickRoute } from '../../parsers/router';
import { App } from './App';
import shadowStyles from './styles.css?inline';

const HOST_TAG = 'ht-rookie-copilot';

function detectFoxtrickPresence(doc: Document): boolean {
  return Boolean(
    doc.querySelector('[class*="ft_"], [id^="ft_"], .foxtrick, #foxtrick-prefs-link')
  );
}

function mountCopilot() {
  if (document.querySelector(HOST_TAG)) return;

  const host = document.createElement(HOST_TAG);
  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = shadowStyles;
  shadow.appendChild(styleEl);

  const mountRoot = document.createElement('div');
  shadow.appendChild(mountRoot);
  document.body.appendChild(host);

  let lastHref = window.location.href;
  let syncTick = 0;

  const renderApp = () => {
    lastHref = window.location.href;
    const route = detectHattrickRoute(lastHref);
    const foxtrickDetected = detectFoxtrickPresence(document);
    render(
      h(App, { currentPageType: route.pageType, foxtrickDetected, syncTick }),
      mountRoot
    );
  };

  renderApp();

  const isOwnBadgeNode = (n: Node): boolean =>
    n instanceof Element && n.hasAttribute('data-htrc-badge');

  const isForeignMutation = (m: MutationRecord): boolean => {
    if (m.target instanceof Element && (m.target.closest(HOST_TAG) || isOwnBadgeNode(m.target))) {
      return false;
    }
    const touched = [...Array.from(m.addedNodes), ...Array.from(m.removedNodes)];
    return touched.some((n) => !isOwnBadgeNode(n));
  };

  // 兼容 ASP.NET 局部刷新（如转会搜索结果更新）与排阵拖拽事件（防抖 250ms，且过滤插件自身徽章变更）
  let timer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver((mutations) => {
    const needsReattach = !document.querySelector(HOST_TAG);
    const urlChanged = window.location.href !== lastHref;
    const currentType = detectHattrickRoute(window.location.href).pageType;
    const isDynamicSubtree =
      (currentType === 'lineup' || currentType === 'transfer_search') &&
      mutations.some(isForeignMutation);

    if (!needsReattach && !urlChanged && !isDynamicSubtree) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (!document.querySelector(HOST_TAG)) {
        document.body.appendChild(host);
      }
      if (isDynamicSubtree) syncTick += 1;
      renderApp();
    }, 250);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', renderApp);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountCopilot, { once: true });
} else {
  mountCopilot();
}
