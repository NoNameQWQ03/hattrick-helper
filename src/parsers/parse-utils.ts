/**
 * 解析包含 nbsp / 空格千分位分隔符的整数或负数（例如 "36 840 Yuan"、"-3 495 986 Yuan"）。
 */
export function parseLocalizedInt(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\u00a0\s,]/g, '');
  const match = cleaned.match(/-?\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 解析年龄文本（支持 "22 岁 又 14 天"、"16 岁又 109 天"、"22 years and 14 days"）。
 */
export function parseAgeYearsDays(raw: string | null | undefined): { years: number; days: number } | null {
  if (!raw) return null;
  const match = raw.match(/(\d+)\s*(?:岁|years?)\s*(?:又|and)?\s*(\d+)\s*(?:天|days?)/i);
  if (!match?.[1] || !match[2]) return null;
  return {
    years: Number.parseInt(match[1], 10),
    days: Number.parseInt(match[2], 10),
  };
}

/**
 * 从 Hattrick 技能条容器读取 .ht-bar 的 level 属性，兼容文本兜底。
 */
export function readHtBarLevel(row: Element | null): number | null {
  if (!row) return null;
  const bar = row.querySelector('.ht-bar');
  if (bar) {
    const rawLevel = bar.getAttribute('level');
    if (rawLevel !== null) {
      const n = Number.parseInt(rawLevel, 10);
      if (Number.isFinite(n)) return n;
    }
  }
  const denom = row.querySelector('.denominationNumber');
  if (denom) {
    const title = denom.getAttribute('title');
    if (title) {
      const m = title.match(/^(\d{1,2})\//);
      if (m?.[1]) return Number.parseInt(m[1], 10);
    }
    const n = parseLocalizedInt(denom.textContent);
    if (n !== null) return n;
  }
  return null;
}
