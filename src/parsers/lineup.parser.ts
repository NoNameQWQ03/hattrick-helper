import { parseSkillLevelText } from '../core/i18n/skills';
import type { ParsedLineupData } from '../core/types/domain';

function countOccupied(root: Element, ids: number[]): number {
  let count = 0;
  for (const id of ids) {
    const slot = root.querySelector(`#position-${id}`);
    if (slot && slot.classList.contains('position-has-player')) {
      count += 1;
    }
  }
  return count;
}

/**
 * 解析比赛排阵页 (/Club/Matches/MatchOrder/) Angular <ht-matchorder> DOM。
 * 严格只读：绝不自动修改或提交比赛指示。
 */
export function parseLineupPage(doc: Document): ParsedLineupData | null {
  const root = doc.querySelector('ht-matchorder');
  if (!root) return null;

  const keeperCount = countOccupied(root, [100]);
  const defenderCount = countOccupied(root, [101, 102, 103, 104, 105]);
  const innerMidfielderCount = countOccupied(root, [107, 108, 109]);
  const wingerCount = countOccupied(root, [106, 110]);
  const forwardCount = countOccupied(root, [111, 112, 113]);
  const totalStarters =
    keeperCount + defenderCount + innerMidfielderCount + wingerCount + forwardCount;

  const formationEl = root.querySelector('.mo-formation-numbers');
  const formationText =
    formationEl?.textContent?.trim() ||
    `${defenderCount}-${innerMidfielderCount + wingerCount}-${forwardCount}`;

  const formationParentText = formationEl?.parentElement?.textContent ?? '';
  const expMatch = formationParentText.match(/[（(]([^）)]+)[）)]/);
  const formationExperienceText = expMatch?.[1]?.trim() ?? '';
  const formationExperienceLevel = formationExperienceText
    ? parseSkillLevelText(formationExperienceText)
    : null;

  const speechSelect = root.querySelector<HTMLSelectElement>('#mo-speechLevel');
  const speechVal = speechSelect?.value ?? '';
  const attitude: ParsedLineupData['attitude'] =
    speechVal === '1'
      ? 'mots'
      : speechVal === '-1'
        ? 'pic'
        : speechVal === '0'
          ? 'normal'
          : 'unknown';

  const tacticSelect = root.querySelector<HTMLSelectElement>('#mo-tacticType');
  const tacticCode = tacticSelect?.value ?? '0';
  const tacticLabel =
    tacticSelect?.options[tacticSelect.selectedIndex]?.text?.trim() ?? '常规';

  return {
    formationText,
    formationExperienceText,
    formationExperienceLevel,
    keeperCount,
    defenderCount,
    innerMidfielderCount,
    wingerCount,
    forwardCount,
    totalStarters,
    attitude,
    tacticCode,
    tacticLabel,
  };
}
