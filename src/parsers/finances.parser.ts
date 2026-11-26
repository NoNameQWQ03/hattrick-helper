import type { ParsedFinancesData } from '../core/types/domain';
import { parseLocalizedInt } from './parse-utils';

/**
 * 解析每周财政报告 (/Club/Finances/)。
 * 仅遍历叶子级 <tr>（不含嵌套表格），按标签首次出现优先提取“本周”预算与“2周结存”。
 */
export function parseFinancesPage(doc: Document): ParsedFinancesData | null {
  const root = doc.querySelector('#mainBody') ?? doc.querySelector('#content');
  if (!root) return null;

  const fullText = root.textContent ?? '';
  if (!fullText.includes('财政') && !fullText.toLowerCase().includes('finances')) {
    return null;
  }

  const currencyLabel = fullText.includes('Yuan') ? 'Yuan' : fullText.includes('€') ? '€' : 'Local';

  const firstValueMap = new Map<string, number>();
  for (const tr of Array.from(root.querySelectorAll('tr'))) {
    // 跳过包含子表格的外层排版行，防止抓混多个指标
    if (tr.querySelector('tr')) continue;

    const cells = Array.from(tr.children).filter(
      (el): el is HTMLTableCellElement => el.tagName === 'TD' || el.tagName === 'TH'
    );
    if (cells.length < 2) continue;

    for (let i = 0; i < cells.length - 1; i++) {
      const label = cells[i]?.textContent?.replace(/[:：\s]/g, '') ?? '';
      if (!label || /^\d/.test(label)) continue;

      let val: number | null = null;
      for (let j = i + 1; j < cells.length; j++) {
        const candidateText = cells[j]?.textContent?.trim() ?? '';
        if (!candidateText) continue;
        const parsed = parseLocalizedInt(candidateText);
        if (parsed !== null) {
          val = parsed;
        }
        break;
      }

      if (val !== null && !firstValueMap.has(label)) {
        firstValueMap.set(label, val);
      }
    }
  }

  const getExactOrIncludes = (keys: string[]) => {
    for (const k of keys) {
      if (firstValueMap.has(k)) return firstValueMap.get(k)!;
    }
    for (const k of keys) {
      for (const [label, val] of firstValueMap.entries()) {
        if (label.includes(k)) return val;
      }
    }
    return 0;
  };

  const cashBalanceLocal = getExactOrIncludes(['现金', 'Cash']);
  const sponsorIncomeLocal = getExactOrIncludes(['赞助商', 'Sponsors']);
  const weeklyWagesLocal = getExactOrIncludes(['工资', 'Wages']);
  const arenaMaintenanceLocal = getExactOrIncludes(['球场维护', 'ArenaMaintenance']);
  const arenaConstructionLocal = getExactOrIncludes(['球场建设', 'ArenaBuilding']);
  const staffExpensesLocal = getExactOrIncludes(['人员支出', 'Staff']);
  const youthExpensesLocal = getExactOrIncludes(['青年支出', 'Youth']);
  const interestLocal = getExactOrIncludes(['利息', 'Interest']);
  const totalIncomeLocal = getExactOrIncludes(['总收入', 'TotalIncome']);
  const totalExpensesLocal = getExactOrIncludes(['总支出', 'TotalExpenses']);
  const expectedWeeklyNetLocal = totalIncomeLocal - totalExpensesLocal;
  const twoWeekBalanceLocal = getExactOrIncludes(['结存', 'Total']);

  return {
    currencyLabel,
    cashBalanceLocal,
    weeklyWagesLocal,
    staffExpensesLocal,
    youthExpensesLocal,
    arenaMaintenanceLocal,
    arenaConstructionLocal,
    interestLocal,
    sponsorIncomeLocal,
    totalIncomeLocal,
    totalExpensesLocal,
    expectedWeeklyNetLocal,
    twoWeekBalanceLocal,
  };
}
