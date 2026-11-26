import { parseSkillLevelText, parseSpecialtyText } from '../core/i18n/skills';
import type { ParsedSeniorPlayer, PlayerSkills } from '../core/types/domain';
import { parseAgeYearsDays, parseLocalizedInt, readHtBarLevel } from './parse-utils';

function readRowValueByLabel(table: Element | null, labels: string[]): string | null {
  if (!table) return null;
  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const cells = tr.querySelectorAll('td');
    if (cells.length < 2) continue;
    const key = cells[0]?.textContent?.trim() ?? '';
    if (labels.some((l) => key.includes(l))) {
      return cells[1]?.textContent?.trim() ?? null;
    }
  }
  return null;
}

function readSkillsFromCard(infoEl: Element): PlayerSkills {
  const get = (suffix: string) =>
    readHtBarLevel(infoEl.querySelector(`tr[id$="${suffix}"]`)) ?? 0;

  return {
    keeper: get('_trKeeper'),
    defending: get('_trDefender'),
    playmaking: get('_trPlaymaker'),
    winger: get('_trWinger'),
    passing: get('_trPasser'),
    scoring: get('_trScorer'),
    setPieces: get('_trKicker'),
  };
}

function readExperienceLeadershipLoyalty(container: Element): {
  experience: number;
  leadership: number;
  loyalty: number;
} {
  let experience = 0;
  let leadership = 0;
  let loyalty = 0;

  const skillLinks = Array.from(
    container.querySelectorAll<HTMLAnchorElement>('a[href*="AppDenominations.aspx?lt=skill"]')
  );
  if (skillLinks[0]) {
    const m = skillLinks[0].getAttribute('href')?.match(/ll=(\d+)/);
    experience = m?.[1]
      ? Number.parseInt(m[1], 10)
      : parseSkillLevelText(skillLinks[0].textContent ?? '') ?? 0;
  }
  if (skillLinks[1]) {
    const m = skillLinks[1].getAttribute('href')?.match(/ll=(\d+)/);
    loyalty = m?.[1]
      ? Number.parseInt(m[1], 10)
      : parseSkillLevelText(skillLinks[1].textContent ?? '') ?? 0;
  }

  const leaderLink = container.querySelector<HTMLAnchorElement>(
    'a[href*="AppDenominations.aspx?lt=leadership"]'
  );
  if (leaderLink) {
    const m = leaderLink.getAttribute('href')?.match(/ll=(\d+)/);
    leadership = m?.[1]
      ? Number.parseInt(m[1], 10)
      : parseSkillLevelText(leaderLink.textContent ?? '') ?? 0;
  }

  return { experience, leadership, loyalty };
}

/**
 * 解析一线队球员列表页 (/Club/Players/) 与单人详情页 (/Club/Players/Player.aspx)。
 * 基于实机验证 DOM：.teamphoto-player / #mainBody > .playerInfo + .ht-bar[level]。
 */
export function parseSeniorPlayersList(doc: Document, pageUrl = ''): ParsedSeniorPlayer[] {
  const cards = Array.from(doc.querySelectorAll('.playerInfo'));
  const results: ParsedSeniorPlayer[] = [];

  for (const infoEl of cards) {
    const keeperRow = infoEl.querySelector('tr[id$="_trKeeper"]');
    if (!keeperRow) continue;

    const outerCard =
      infoEl.closest('.teamphoto-player') ??
      infoEl.parentElement?.parentElement ??
      doc.querySelector('#mainBody') ??
      infoEl;

    const link =
      outerCard.querySelector<HTMLAnchorElement>('h3 a[href*="playerId="]') ??
      outerCard.querySelector<HTMLAnchorElement>('a[href*="Player.aspx?playerId="]');

    let playerId = 0;
    const href = link?.getAttribute('href') ?? '';
    const idMatch = href.match(/playerId=(\d+)/i);
    if (idMatch?.[1]) {
      playerId = Number.parseInt(idMatch[1], 10);
    } else if (pageUrl) {
      const urlMatch = pageUrl.match(/playerId=(\d+)/i);
      if (urlMatch?.[1]) playerId = Number.parseInt(urlMatch[1], 10);
    }

    const name =
      link?.getAttribute('title')?.trim() ||
      link?.textContent?.trim() ||
      outerCard.querySelector('h1')?.textContent?.trim() ||
      '未知球员';

    const infoTable = infoEl.querySelector('.transferPlayerInformation table');
    const ageText = readRowValueByLabel(infoTable, ['年龄', 'Age']);
    const age = parseAgeYearsDays(ageText) ?? { years: 0, days: 0 };

    const tsi = parseLocalizedInt(readRowValueByLabel(infoTable, ['TSI'])) ?? 0;
    const wageText = readRowValueByLabel(infoTable, ['工资', 'Wage']) ?? '';
    const weeklyWageLocal = parseLocalizedInt(wageText) ?? 0;
    const currencyLabel = wageText.includes('Yuan') ? 'Yuan' : wageText.includes('€') ? '€' : 'Local';

    const specText =
      infoEl.querySelector('tr[id$="_trSpeciality"] td:last-child')?.textContent?.trim() ?? '';
    const specialty = parseSpecialtyText(specText);

    const form = readHtBarLevel(infoEl.querySelector('tr[id$="_trForm"]')) ?? 0;
    const stamina = readHtBarLevel(infoEl.querySelector('tr[id$="_trStamina"]')) ?? 0;
    const skills = readSkillsFromCard(infoEl);
    const bio = readExperienceLeadershipLoyalty(outerCard);

    const ratingEl = infoEl.querySelector('hattrick-rating');
    const ratingVal = ratingEl?.getAttribute('rating');
    const lastRating = ratingVal ? Number.parseFloat(ratingVal) : undefined;
    const lastMatchPosition =
      infoEl.querySelector('.last_match_position')?.textContent?.replace(/[()]/g, '').trim() || undefined;

    results.push({
      playerId,
      name,
      ageYears: age.years,
      ageDays: age.days,
      tsi,
      weeklyWageLocal,
      currencyLabel,
      specialty,
      form,
      stamina,
      experience: bio.experience,
      leadership: bio.leadership,
      loyalty: bio.loyalty,
      skills,
      lastRating: Number.isFinite(lastRating) ? lastRating : undefined,
      lastMatchPosition,
    });
  }

  return results;
}
