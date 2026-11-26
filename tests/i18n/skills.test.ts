import { describe, expect, it } from 'vitest';
import { getSkillMeta, parseSkillLevelText, parseSpecialtyText } from '../../src/core/i18n/skills';

describe('i18n/skills', () => {
  it('parses numeric brackets, English, and official Simplified Chinese skill labels', () => {
    expect(parseSkillLevelText('稳定 (7)')).toBe(7);
    expect(parseSkillLevelText('13/20')).toBe(13);
    expect(parseSkillLevelText('Passable (6)')).toBe(6);
    expect(parseSkillLevelText('Solid')).toBe(7);
    expect(parseSkillLevelText('独步天下')).toBe(13);
    expect(parseSkillLevelText('辉煌')).toBe(11);
    expect(parseSkillLevelText('中下')).toBe(5);
    expect(parseSkillLevelText('及格')).toBe(6);
    expect(parseSkillLevelText('')).toBeNull();
  });

  it('parses official Simplified Chinese specialty labels', () => {
    expect(parseSpecialtyText('头球专家')).toBe('Head');
    expect(parseSpecialtyText('速度')).toBe('Quick');
    expect(parseSpecialtyText('技术')).toBe('Technical');
    expect(parseSpecialtyText('力量')).toBe('Powerful');
    expect(parseSpecialtyText('不可预测')).toBe('Unpredictable');
    expect(parseSpecialtyText('支援型')).toBe('Support');
    expect(parseSpecialtyText('-')).toBeNull();
  });

  it('clamps out-of-range skill metadata safely', () => {
    expect(getSkillMeta(-3).level).toBe(0);
    expect(getSkillMeta(25).level).toBe(20);
    expect(getSkillMeta(7).en).toBe('Solid');
    expect(getSkillMeta(13).zhCN).toBe('独步天下');
  });
});
