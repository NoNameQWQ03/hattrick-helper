import type { ParsedStadiumData } from '../core/types/domain';
import { parseLocalizedInt } from './parse-utils';

/**
 * 解析球场页面 (/Club/Stadium/)。
 */
export function parseStadiumPage(doc: Document, pageUrl: string): ParsedStadiumData | null {
  const root = doc.querySelector('#mainBody') ?? doc.querySelector('#content');
  if (!root) return null;

  let stadiumId = 0;
  try {
    const u = new URL(pageUrl);
    const idVal = u.searchParams.get('stadiumId') ?? u.searchParams.get('ArenaID');
    if (idVal) stadiumId = Number.parseInt(idVal, 10) || 0;
  } catch {
    // ignore
  }

  // 首个主球场表格（排除青年球场）
  const firstTable = root.querySelector('table');
  if (!firstTable) return null;

  let totalCapacity = 0;
  let terraces = 0;
  let basic = 0;
  let roof = 0;
  let vip = 0;
  let underConstruction = false;

  for (const tr of Array.from(firstTable.querySelectorAll('tr'))) {
    const cells = tr.querySelectorAll('td');
    if (cells.length < 2) continue;
    const label = cells[0]?.textContent?.trim() ?? '';
    const rawVal = cells[1]?.textContent?.trim() ?? '';

    if (label.includes('上次改建') && rawVal.includes('施工中')) {
      underConstruction = true;
    } else if (label.includes('总容量') || label.toLowerCase().includes('total capacity')) {
      totalCapacity = parseLocalizedInt(rawVal) ?? 0;
    } else if (label.includes('阶梯看台') || label.toLowerCase().includes('terraces')) {
      terraces = parseLocalizedInt(rawVal) ?? 0;
    } else if (label.includes('普通座位') || label.toLowerCase().includes('basic')) {
      basic = parseLocalizedInt(rawVal) ?? 0;
    } else if (label.includes('有顶座位') || label.toLowerCase().includes('roof')) {
      roof = parseLocalizedInt(rawVal) ?? 0;
    } else if (label.includes('贵宾包厢') || label.toLowerCase().includes('vip')) {
      vip = parseLocalizedInt(rawVal) ?? 0;
    }
  }

  if (root.textContent?.includes('施工中')) {
    underConstruction = true;
  }

  const recentHomeAttendances: number[] = [];
  const attendanceSpans = Array.from(
    root.querySelectorAll('span[id*="repPlayedMatches"]')
  );
  for (const span of attendanceSpans) {
    const tr = span.closest('tr');
    if (!tr) continue;
    const cells = Array.from(tr.querySelectorAll('td'));
    if (cells.length >= 4) {
      const att = parseLocalizedInt(cells[3]?.textContent);
      if (att !== null && att > 0) recentHomeAttendances.push(att);
    }
  }

  return {
    stadiumId,
    totalCapacity,
    terraces,
    basic,
    roof,
    vip,
    underConstruction,
    recentHomeAttendances,
  };
}
