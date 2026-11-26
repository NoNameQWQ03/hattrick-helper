export interface ClubGuardResult {
  ownTeamId: number | null;
  ownTeamName: string | null;
  viewedTeamId: number | null;
  isOwnClub: boolean;
}

/**
 * 识别当前登录用户自己的俱乐部 ID 与名称，并与页面 URL 所属球队对比。
 * 优先从顶部 #teamLinks 读取真实俱乐部名称（避免误取侧边栏“球会”导航文字）。
 */
export function evaluateClubGuard(doc: Document, pageUrl: string): ClubGuardResult {
  const headerLink = doc.querySelector<HTMLAnchorElement>('#teamLinks a[href*="/Club/?TeamID="]');
  const fallbackLink =
    doc.querySelector<HTMLAnchorElement>('.subMenu a[href*="/Club/?TeamID="]') ??
    doc.querySelector<HTMLAnchorElement>('#menu a[href*="/Club/?TeamID="]') ??
    doc.querySelector<HTMLAnchorElement>('a[href*="/Club/Players/?TeamID="]');

  const targetLink = headerLink ?? fallbackLink;

  let ownTeamId: number | null = null;
  let ownTeamName: string | null = null;

  if (targetLink) {
    const href = targetLink.getAttribute('href') ?? '';
    const match = href.match(/[?&]TeamID=(\d+)/i);
    if (match?.[1]) {
      ownTeamId = Number.parseInt(match[1], 10);
      const rawName = targetLink.textContent?.trim() || '';
      if (rawName && rawName !== '球会' && rawName.toLowerCase() !== 'club') {
        ownTeamName = rawName;
      }
    }
  }

  let viewedTeamId: number | null = null;
  try {
    const parsed = new URL(pageUrl);
    for (const [k, v] of parsed.searchParams.entries()) {
      if (k.toLowerCase() === 'teamid' || k.toLowerCase() === 'seniorteamid') {
        const n = Number.parseInt(v, 10);
        if (Number.isFinite(n)) {
          viewedTeamId = n;
          break;
        }
      }
    }
  } catch {
    // 忽略无效 URL
  }

  const isOwnClub = Boolean(
    ownTeamId && (viewedTeamId === null || viewedTeamId === ownTeamId)
  );

  return { ownTeamId, ownTeamName, viewedTeamId, isOwnClub };
}
