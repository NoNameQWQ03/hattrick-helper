import type { ParsedSpecialistsData } from '../core/types/domain';
import { parseLocalizedInt } from './parse-utils';

/**
 * 解析职员页面 (/Club/Specialists/) 概述表格。
 */
export function parseSpecialistsPage(doc: Document): ParsedSpecialistsData | null {
  const root = doc.querySelector('#mainBody') ?? doc.querySelector('#content');
  if (!root) return null;

  const tables = Array.from(root.querySelectorAll('table'));
  let overviewTable: HTMLTableElement | null = null;
  for (const t of tables) {
    const headerText = t.textContent ?? '';
    if (
      (headerText.includes('总共(级别)') || headerText.includes('Total (level)')) &&
      (headerText.includes('每周费用') || headerText.includes('Weekly cost'))
    ) {
      overviewTable = t;
      break;
    }
  }

  if (!overviewTable) return null;

  const data: ParsedSpecialistsData = {
    coachCount: 0,
    coachLevel: 0,
    coachWeeklyCostLocal: 0,
    assistantCount: 0,
    assistantSum: 0,
    assistantWeeklyCostLocal: 0,
    medicCount: 0,
    medicLevel: 0,
    medicWeeklyCostLocal: 0,
    psychologistCount: 0,
    psychologistLevel: 0,
    psychologistWeeklyCostLocal: 0,
    totalWeeklyCostLocal: 0,
  };

  for (const tr of Array.from(overviewTable.querySelectorAll('tr'))) {
    const cells = Array.from(tr.querySelectorAll('td, th')).map((c) => c.textContent?.trim() ?? '');
    if (cells.length < 4) continue;

    const role = cells[0] ?? '';
    // 概述表列：位置 | 作用 | 加成值 | 聘请 | 总共(级别) | 每周费用
    const count = parseLocalizedInt(cells[cells.length - 3]) ?? 0;
    const totalLevel = parseLocalizedInt(cells[cells.length - 2]) ?? 0;
    const weeklyCost = parseLocalizedInt(cells[cells.length - 1]) ?? 0;

    if (role.includes('助理教练') || role.toLowerCase().includes('assistant')) {
      data.assistantCount = count;
      data.assistantSum = totalLevel;
      data.assistantWeeklyCostLocal = weeklyCost;
    } else if (role.includes('教练') || role.toLowerCase().includes('coach')) {
      data.coachCount = count;
      data.coachLevel = totalLevel;
      data.coachWeeklyCostLocal = weeklyCost;
    } else if (role.includes('队医') || role.toLowerCase().includes('medic')) {
      data.medicCount = count;
      data.medicLevel = totalLevel;
      data.medicWeeklyCostLocal = weeklyCost;
    } else if (role.includes('心理') || role.toLowerCase().includes('psychologist')) {
      data.psychologistCount = count;
      data.psychologistLevel = totalLevel;
      data.psychologistWeeklyCostLocal = weeklyCost;
    } else if (role.includes('总计') || role.toLowerCase().includes('total')) {
      data.totalWeeklyCostLocal = parseLocalizedInt(cells[cells.length - 1]) ?? 0;
    }
  }

  if (data.totalWeeklyCostLocal === 0) {
    data.totalWeeklyCostLocal =
      data.coachWeeklyCostLocal +
      data.assistantWeeklyCostLocal +
      data.medicWeeklyCostLocal +
      data.psychologistWeeklyCostLocal;
  }

  return data;
}
