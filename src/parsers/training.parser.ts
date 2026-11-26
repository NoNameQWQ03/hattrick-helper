import type { ParsedTrainingData } from '../core/types/domain';
import { parseLocalizedInt } from './parse-utils';

const TRAINING_CODE_MAP: Record<
  string,
  ParsedTrainingData['mappedGoal']
> = {
  '9': 'GK',
  '3': 'DEF',
  '8': 'PM',
  '5': 'WING',
  '7': 'PASS',
  '4': 'SCOR',
  '2': 'SP',
  '11': 'EXTENDED_DEF',
  '12': 'EXTENDED_WING',
  '10': 'EXTENDED_PASS',
  '6': 'SHOOTING',
};

function findSliderValueByKeyword(root: Element, keywords: string[]): number | null {
  for (const slider of Array.from(root.querySelectorAll('mat-slider'))) {
    const containerText = slider.parentElement?.parentElement?.textContent ?? '';
    if (keywords.some((kw) => containerText.includes(kw))) {
      const input = slider.querySelector<HTMLInputElement>('input[type="range"]');
      if (input) {
        const val = parseLocalizedInt(input.value || input.getAttribute('value'));
        if (val !== null) return val;
      }
    }
  }
  return null;
}

/**
 * 解析训练设置与训练预览页 (/Club/Training/Training.aspx)。
 */
export function parseTrainingPage(doc: Document): ParsedTrainingData | null {
  const root = doc.querySelector('ht-training-new') ?? doc.querySelector('#content');
  if (!root) return null;

  const select = root.querySelector<HTMLSelectElement>('select');
  const trainingCode = select?.value ?? '';
  const trainingLabel = select?.options[select.selectedIndex]?.text?.trim() ?? '';
  const mappedGoal = TRAINING_CODE_MAP[trainingCode] ?? 'UNSET';

  const staminaFromKeyword = findSliderValueByKeyword(root, ['体能', 'Stamina']);
  const intensityFromKeyword = findSliderValueByKeyword(root, ['训练水平', 'Training intensity']);

  const rangeInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[type="range"]')
  );
  const staminaSharePct =
    staminaFromKeyword ?? parseLocalizedInt(rangeInputs[0]?.value) ?? 10;
  const trainingIntensityPct =
    intensityFromKeyword ?? parseLocalizedInt(rangeInputs[1]?.value) ?? 100;

  const coachLevelFromPage = findSliderValueByKeyword(root, ['教练技能', 'Coach skill']) ?? undefined;
  const assistantSumFromPage = findSliderValueByKeyword(root, ['助理教练', 'Assistant']) ?? undefined;

  let previewFull90Count = 0;
  let previewZeroCount = 0;
  const previewRows = Array.from(root.querySelectorAll('table.htbox-table tbody tr'));
  for (const tr of previewRows) {
    const lastCell = tr.querySelector('td:last-child')?.textContent?.trim() ?? '';
    if (lastCell.includes("90'") || lastCell.includes('100%')) {
      previewFull90Count += 1;
    } else if (lastCell.includes('无训练') || lastCell.includes('No training')) {
      previewZeroCount += 1;
    }
  }

  const matchesCount = root.querySelectorAll('ht-legacy-match-row').length;

  return {
    trainingCode,
    trainingLabel,
    mappedGoal,
    staminaSharePct,
    trainingIntensityPct,
    coachLevelFromPage,
    assistantSumFromPage,
    previewFull90Count,
    previewZeroCount,
    matchesCount,
  };
}
