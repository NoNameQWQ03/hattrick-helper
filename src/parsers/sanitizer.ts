import { detectHattrickRoute } from './router';

export interface SanitizedFixtureResult {
  filename: string;
  pageType: string;
  selectedContainer: string;
  html: string;
  byteLength: number;
}

const SENSITIVE_ATTRS = ['data-token', 'data-auth', 'data-session'];
const CANDIDATE_SELECTORS = [
  '#mainBody',
  '#content',
  '#aspnetForm',
  'main',
  '#page',
] as const;

function pickBestContentRoot(doc: Document): { element: HTMLElement; selectorLabel: string } {
  for (const selector of CANDIDATE_SELECTORS) {
    const el = doc.querySelector(selector);
    if (el instanceof HTMLElement && el.innerHTML.trim().length >= 500) {
      return { element: el, selectorLabel: selector };
    }
  }
  return { element: doc.body, selectorLabel: 'body' };
}

/**
 * Phase 0 脱敏 DOM 导出器（纯本地执行，不外发任何网络请求）：
 * 提取目标页面最完整的内容容器（避免命中空壳节点），移除所有 <script>、<iframe>、
 * ASP.NET 隐藏状态表单字段（如 __VIEWSTATE / __EVENTVALIDATION）、邮箱地址及本插件容器，
 * 生成可直接保存到 tests/fixtures/ 的脱敏 HTML 样本。
 */
export function buildSanitizedHtmlFixture(doc: Document, pageUrl: string): SanitizedFixtureResult {
  const route = detectHattrickRoute(pageUrl);
  const { element: rootTarget, selectorLabel } = pickBestContentRoot(doc);

  const clone = rootTarget.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll('script, iframe, noscript, style, ht-rookie-copilot, input[type="hidden"]')
    .forEach((el) => el.remove());

  const walker = doc.createTreeWalker(clone, 1 /* NodeFilter.SHOW_ELEMENT */);
  let node = walker.currentNode as HTMLElement | null;
  while (node) {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (
        name.startsWith('on') ||
        SENSITIVE_ATTRS.includes(name) ||
        (name === 'href' && attr.value.toLowerCase().includes('logout'))
      ) {
        node.removeAttribute(attr.name);
      }
    }
    node = walker.nextNode() as HTMLElement | null;
  }

  const rawHtml = clone.innerHTML
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/(token|session|auth)=([a-zA-Z0-9_-]{8,})/gi, '$1=[REDACTED]');

  const safeTitle = (doc.title || 'hattrick-page').replace(/[<>]/g, '');
  const timestamp = new Date().toISOString().slice(0, 10);
  const queryKeys = Object.keys(route.queryParams).join(',') || 'none';
  const filename = `fixture-${route.pageType}-${timestamp}.html`;

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <!-- Sanitized Hattrick DOM Fixture for HT Rookie Copilot Phase 1 Parser Tests -->
  <!-- RouteType: ${route.pageType} | Pathname: ${route.pathname} | QueryKeys: ${queryKeys} | Container: ${selectorLabel} -->
</head>
<body>
  <div id="htrc-fixture-root">
${rawHtml}
  </div>
</body>
</html>
`;

  return {
    filename,
    pageType: route.pageType,
    selectedContainer: selectorLabel,
    html,
    byteLength: new TextEncoder().encode(html).length,
  };
}
