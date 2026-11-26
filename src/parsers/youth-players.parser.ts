import { parseSpecialtyText } from '../core/i18n/skills';
import type { ParsedYouthPlayer, ParsedYouthSkill, SkillKey } from '../core/types/domain';
import { parseAgeYearsDays } from './parse-utils';

const YOUTH_SKILL_ROWS: Array<{ suffix: string; key: SkillKey }> = [
  { suffix: '_trKeeper', key: 'keeper' },
  { suffix: '_trDefender', key: 'defending' },
  { suffix: '_trPlaymaking', key: 'playmaking' },
  { suffix: '_trWinger', key: 'winger' },
  { suffix: '_trPasser', key: 'passing' },
  { suffix: '_trScoring', key: 'scoring' },
  { suffix: '_trKicker', key: 'setPieces' },
];

function parseYouthSkillRow(tr: Element | null): ParsedYouthSkill | null {
  if (!tr) return null;
  const bar = tr.querySelector('.ht-bar');
  const ratioText = tr.querySelector('td:last-child')?.textContent?.trim() ?? '';

  let current: number | null = null;
  let maxPotential: number | null = null;

  if (bar) {
    const lv = Number.parseInt(bar.getAttribute('level') ?? '-1', 10);
    const cap = Number.parseInt(bar.getAttribute('cap') ?? '-1', 10);
    const maxAttr = Number.parseInt(bar.getAttribute('max') ?? '-1', 10);
    if (Number.isFinite(lv) && lv >= 0) current = lv;
    if (Number.isFinite(cap) && cap >= 0) {
      maxPotential = cap;
    } else if (current !== null && Number.isFinite(maxAttr) && maxAttr >= 0 && ratioText.includes('/')) {
      // 当已测满上限如 "2/2" 或 "4/4" 时，读取比例文本右侧上限
      const [, right] = ratioText.split('/');
      const rightNum = right ? Number.parseInt(right, 10) : NaN;
      if (Number.isFinite(rightNum)) maxPotential = rightNum;
    }
  }

  if (ratioText.includes('/')) {
    const [left, right] = ratioText.split('/');
    if (current === null && left && left !== '?') {
      const n = Number.parseInt(left, 10);
      if (Number.isFinite(n)) current = n;
    }
    if (maxPotential === null && right && right !== '?') {
      const n = Number.parseInt(right, 10);
      if (Number.isFinite(n)) maxPotential = n;
    }
  }

  return current === null && maxPotential === null ? null : { current, maxPotential };
}

/**
 * 解析青年队球员列表 (/Club/Players/YouthPlayers.aspx)。
 */
export function parseYouthPlayersList(doc: Document): ParsedYouthPlayer[] {
  const cards = Array.from(doc.querySelectorAll('.playerInfo'));
  const results: ParsedYouthPlayer[] = [];

  for (const infoEl of cards) {
    if (!infoEl.querySelector('.youthPlayerSkills')) continue;

    const outerCard = infoEl.parentElement?.parentElement ?? infoEl;
    const fullText = outerCard.textContent ?? '';

    const link = outerCard.querySelector<HTMLAnchorElement>('a[href*="YouthPlayerID="], a[href*="playerId="]');
    const href = link?.getAttribute('href') ?? '';
    const idMatch = href.match(/(?:YouthPlayerID|playerId)=(\d+)/i);
    const youthId = idMatch?.[1] ? Number.parseInt(idMatch[1], 10) : results.length + 1;

    // 尝试提取姓名（优先链接，否则取首行非空文本）
    const firstNonEmptyLine = fullText
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.includes('岁'));
    const rawName = link?.textContent?.trim() || firstNonEmptyLine || `青训球员 #${youthId}`;
    const name = rawName.replace(/\s+/g, ' ').trim();

    const age = parseAgeYearsDays(fullText) ?? { years: 16, days: 0 };

    const eligibleNow =
      fullText.includes('现在可以提拔到成年队了') ||
      fullText.toLowerCase().includes('can be promoted now');

    let daysUntilPromotion = eligibleNow ? 0 : 999;
    if (!eligibleNow) {
      const promoMatch = fullText.match(/可在\s*(\d+)\s*天后获得提拔|promoted in\s*(\d+)\s*days/i);
      const daysVal = promoMatch?.[1] ?? promoMatch?.[2];
      if (daysVal) daysUntilPromotion = Number.parseInt(daysVal, 10);
    }

    let specialty = null;
    const specMatch = fullText.match(/特长\s+([^\n\r]+)/);
    if (specMatch?.[1]) {
      specialty = parseSpecialtyText(specMatch[1]);
    }

    const skills: Partial<Record<SkillKey, ParsedYouthSkill>> = {};
    let highestKnownPotential = 0;

    for (const rowDef of YOUTH_SKILL_ROWS) {
      const tr = infoEl.querySelector(`tr[id$="${rowDef.suffix}"]`);
      const parsed = parseYouthSkillRow(tr);
      if (parsed) {
        skills[rowDef.key] = parsed;
        if (parsed.maxPotential !== null && parsed.maxPotential > highestKnownPotential) {
          highestKnownPotential = parsed.maxPotential;
        }
        if (parsed.current !== null && parsed.current > highestKnownPotential) {
          highestKnownPotential = parsed.current;
        }
      }
    }

    results.push({
      youthId,
      name,
      ageYears: age.years,
      ageDays: age.days,
      eligibleNow,
      daysUntilPromotion,
      specialty,
      skills,
      highestKnownPotential,
    });
  }

  return results;
}
