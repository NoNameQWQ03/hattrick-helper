import type { HattrickPageType } from '../core/types/domain';

export interface RouteMatch {
  pageType: HattrickPageType;
  pathname: string;
  queryParams: Record<string, string>;
}

/**
 * 识别 *.hattrick.org 当前页面路由。
 * 基于实机验证路径结构：优先匹配 Youth 子页面，再匹配一线队、职员(/Club/Specialists)、球场(/Club/Stadium)、财政(/Club/Finances)。
 */
export function detectHattrickRoute(urlString: string): RouteMatch {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { pageType: 'unknown', pathname: '', queryParams: {} };
  }

  const pathname = parsed.pathname;
  const normalizedPath = (
    pathname.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/|$)/i, '') || '/'
  ).toLowerCase();

  const queryParams: Record<string, string> = {};
  let hasYouthQueryParam = false;
  parsed.searchParams.forEach((value, key) => {
    queryParams[key] = value;
    if (key.toLowerCase() === 'youthteamid') {
      hasYouthQueryParam = true;
    }
  });

  let pageType: HattrickPageType = 'unknown';

  // 1. 青训营相关路由优先判定（避免被 /Club/Players、/Club/Training 截胡）
  if (normalizedPath.includes('/club/players/youthplayers')) {
    pageType = 'youth_players';
  } else if (normalizedPath.includes('/club/training/youthtraining')) {
    pageType = 'youth_training';
  } else if (
    (normalizedPath.includes('/club/matches') && hasYouthQueryParam) ||
    normalizedPath.includes('/club/challenges/youthchallenges')
  ) {
    pageType = 'youth_matches';
  } else if (normalizedPath.includes('/club/youth')) {
    pageType = 'youth_overview';
  } else if (normalizedPath.includes('/club/players/player')) {
    pageType = 'player_detail';
  } else if (normalizedPath.includes('/club/players')) {
    pageType = 'players_list';
  } else if (normalizedPath.includes('/club/training')) {
    pageType = 'training';
  } else if (
    normalizedPath.includes('/club/specialists') ||
    normalizedPath.includes('/club/staff')
  ) {
    pageType = 'staff';
  } else if (
    normalizedPath.includes('/club/matches/matchorder') ||
    normalizedPath.includes('/lineup')
  ) {
    pageType = 'lineup';
  } else if (normalizedPath.includes('/club/matches')) {
    pageType = 'matches';
  } else if (
    normalizedPath.includes('/club/stadium') ||
    (normalizedPath.includes('/club/arena') && !normalizedPath.includes('/club/arenahub'))
  ) {
    pageType = 'arena';
  } else if (
    normalizedPath.includes('/club/finances') ||
    normalizedPath.includes('/club/economy')
  ) {
    pageType = 'economy';
  } else if (normalizedPath.includes('/world/transfers')) {
    pageType = 'transfer_search';
  } else if (
    normalizedPath === '/club/' ||
    normalizedPath === '/club' ||
    normalizedPath.includes('/club/default')
  ) {
    pageType = 'club_overview';
  } else if (
    normalizedPath === '/' ||
    normalizedPath === '/default.aspx' ||
    normalizedPath.startsWith('/myhattrick/office')
  ) {
    pageType = 'home';
  }

  return { pageType, pathname, queryParams };
}
