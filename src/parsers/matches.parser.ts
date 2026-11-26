import type { ParsedMatchesData } from '../core/types/domain';

/**
 * 解析赛程页 (/Club/Matches/)，识别本周是否已安排一线队友谊赛或杯赛（均算入周中训练槽位）。
 */
export function parseMatchesPage(doc: Document): ParsedMatchesData | null {
  const root = doc.querySelector('#mainBody') ?? doc.querySelector('#content');
  if (!root) return null;

  const rows = Array.from(root.querySelectorAll('tr'));
  let inUpcomingSection = false;
  let midweekBookedThisWeek = false;
  const upcomingMatchLabels: string[] = [];

  for (const tr of rows) {
    const text = tr.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (!text) continue;

    if (text.includes('即将进行的比赛') || text.toLowerCase().includes('upcoming matches')) {
      inUpcomingSection = true;
      continue;
    }
    if (text.includes('已经进行的比赛') || text.toLowerCase().includes('played matches')) {
      break;
    }
    if (!inUpcomingSection) continue;

    const img = tr.querySelector('img');
    const imgClass = img?.className ?? '';
    const imgTitle = img?.getAttribute('title') ?? '';

    if (imgClass || imgTitle) {
      upcomingMatchLabels.push(`${imgTitle}: ${text}`);
      if (
        imgClass.includes('match-type-friendly') ||
        imgClass.includes('match-type-cup') ||
        imgTitle.includes('友谊赛') ||
        imgTitle.includes('杯')
      ) {
        midweekBookedThisWeek = true;
      }
    }
  }

  return {
    midweekBookedThisWeek,
    upcomingMatchLabels,
  };
}
