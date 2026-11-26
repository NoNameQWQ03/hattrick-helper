import { describe, expect, it } from 'vitest';
import {
  applyPresetWithBackup,
  DEFAULT_SETTINGS,
  restorePresetBackup,
  ROOKIE_PRESETS,
} from '../../src/storage/settings';
import {
  clearAllCoachMarks,
  injectLineupCoachMarks,
  injectSpecialistsCoachMarks,
  injectTrainingCoachMarks,
} from '../../src/ui/BadgeInjector';

describe('Guide presets, restore backup, and read-only coach marks', () => {
  it('applies a preset with backup and restores exact original state on undo', () => {
    const original = {
      ...DEFAULT_SETTINGS,
      manualState: {
        ...DEFAULT_SETTINGS.manualState,
        trainingGoal: 'UNSET' as const,
        staminaSharePct: 50,
        headCoachLevel: 2,
        assistantSum: 10,
        youthScoutsCount: 3 as const,
      },
    };

    const gkPreset = ROOKIE_PRESETS.find((p) => p.id === 'rescue_gk')!;
    const afterPreset = applyPresetWithBackup(original, gkPreset);

    expect(afterPreset.manualState.trainingGoal).toBe('GK');
    expect(afterPreset.manualState.staminaSharePct).toBe(10);
    expect(afterPreset.manualState.youthScoutsCount).toBe(1);
    expect(afterPreset.presetBackup).toEqual(original.manualState);
    expect(afterPreset.activePresetLabel).toBe(gkPreset.label);

    // 连续切换第二个预设时，应保留最早原始备份而非被覆盖
    const defPreset = ROOKIE_PRESETS.find((p) => p.id === 'def_532')!;
    const afterSecond = applyPresetWithBackup(afterPreset, defPreset);
    expect(afterSecond.manualState.trainingGoal).toBe('DEF');
    expect(afterSecond.presetBackup).toEqual(original.manualState);

    // 还原按钮应 100% 恢复最初状态并清理备份标记
    const restored = restorePresetBackup(afterSecond);
    expect(restored.manualState).toEqual(original.manualState);
    expect(restored.presetBackup).toBeNull();
    expect(restored.activePresetLabel).toBeNull();
  });

  it('injects read-only coach marks on Training & MatchOrder without mutating form inputs', () => {
    document.body.innerHTML = `
      <ht-training-new>
        <div><select><option value="11" selected>防守（扩展）</option></select></div>
        <div><div>体能 <mat-slider><input type="range" value="50" /></mat-slider></div></div>
        <div><div>训练水平 <mat-slider><input type="range" value="90" /></mat-slider></div></div>
        <div><button>保存设置</button></div>
      </ht-training-new>
    `;

    injectTrainingCoachMarks(document, {
      trainingCode: '11',
      trainingLabel: '防守（扩展）',
      mappedGoal: 'EXTENDED_DEF',
      staminaSharePct: 50,
      trainingIntensityPct: 90,
      previewFull90Count: 8,
      previewZeroCount: 2,
      matchesCount: 2,
    });

    const badges = Array.from(document.querySelectorAll('[data-htrc-badge]')).map((b) => b.textContent);
    expect(badges.some((t) => t?.includes('训练设置小助手'))).toBe(true);
    expect(badges.some((t) => t?.includes('扩散训练效率较低'))).toBe(true);
    expect(badges.some((t) => t?.includes('10%–12%'))).toBe(true);
    expect(badges.some((t) => t?.includes('拉满至 100%'))).toBe(true);
    expect(badges.some((t) => t?.includes('点此保存'))).toBe(true);
    // 严格校验未篡改宿主页表单原生值
    expect(document.querySelector<HTMLSelectElement>('select')?.value).toBe('11');
    expect(document.querySelectorAll<HTMLInputElement>('input[type="range"]')[0]?.value).toBe('50');

    // Lineup MOTS + 11-slot overlays + sidebar list highlights + bilingual player name matching
    document.body.innerHTML = `
      <ht-matchorder>
        <div><span class="mo-formation-numbers">3-4-3</span></div>
        <div><select id="mo-speechLevel"><option value="1" selected>生死之战</option></select></div>
        <div id="position-100" class="position-has-player"><span id="player-position-100">贤维 (Xianwei)</span></div>
        <div id="position-101"></div>
        <div id="position-102"></div>
        <div id="position-103"></div>
        <div id="position-104"></div>
        <div id="position-105"></div>
        <div id="position-107"></div>
        <div id="position-108"></div>
        <div id="position-109"></div>
        <div id="position-111"></div>
        <div id="position-112"></div>
        <div class="mo-list">
          <div class="cdk-drag player">张 贤维 (Xianwei)</div>
          <div class="cdk-drag player" id="list-trainee-1">Trainee 1</div>
        </div>
      </ht-matchorder>
    `;
    const sampleState = {
      ...DEFAULT_SETTINGS.manualState,
      trainingGoal: 'DEF' as const,
      autoSynced: {
        syncedPages: {},
        squadRoster: [
          {
            playerId: 1,
            name: '张 贤维 (Xianwei)',
            ageYears: 27,
            stamina: 7,
            form: 7,
            specialty: null,
            skills: { keeper: 8, defending: 2, playmaking: 2, winger: 1, passing: 2, scoring: 1, setPieces: 4 },
          },
          ...Array.from({ length: 10 }, (_, idx) => ({
            playerId: idx + 10,
            name: `Trainee ${idx + 1}`,
            ageYears: 19,
            stamina: 7,
            form: 6,
            specialty: null,
            skills: { keeper: 1, defending: 6, playmaking: 5, winger: 5, passing: 4, scoring: 5, setPieces: 2 },
          })),
        ],
      },
    };
    injectLineupCoachMarks(
      document,
      {
        formationText: '3-4-3',
        formationExperienceText: '杰出',
        formationExperienceLevel: 10,
        keeperCount: 1,
        defenderCount: 3,
        innerMidfielderCount: 2,
        wingerCount: 2,
        forwardCount: 3,
        totalStarters: 11,
        attitude: 'mots',
        tacticCode: '0',
        tacticLabel: '常规',
      },
      sampleState
    );

    const lineupBadges = Array.from(document.querySelectorAll('[data-htrc-badge]')).map(
      (b) => b.textContent
    );
    expect(lineupBadges.some((t) => t?.includes('排阵分步小助手'))).toBe(true);
    expect(lineupBadges.some((t) => t?.includes('生死之战'))).toBe(true);
    // 确保不再向固定高度的 .mo-formation-numbers 父条里强插标签导致被下方栏裁切遮挡
    expect(document.querySelector('.mo-formation-numbers')?.parentElement?.querySelector('[data-htrc-coachmark]')).toBeNull();
    expect(document.querySelector('#position-100')?.textContent).toContain('✅');
    expect(document.querySelector('#position-101')?.textContent).toContain('👉 放:');
    expect(document.querySelector('#list-trainee-1')?.textContent).toContain('🎯 拖去→');
    expect(document.querySelector<HTMLSelectElement>('#mo-speechLevel')?.value).toBe('1');

    // Clear all coach marks when drawer collapses or guides toggled off
    clearAllCoachMarks(document);
    expect(document.querySelectorAll('[data-htrc-coachmark]').length).toBe(0);
  });

  it('injects specialists cost-cutting coach marks and supports clearAllCoachMarks', () => {
    document.body.innerHTML = `
      <div id="content">
        <a href="/Club/Training/ChangeCoach.aspx">更换教练</a>
        <table>
          <tr><th>助理教练</th><td>2</td><td>10</td><td>36000</td></tr>
          <tr><th>运动心理学家</th><td>1</td><td>5</td><td>18000</td></tr>
          <tr><th>队医</th><td>1</td><td>2</td><td>3600</td></tr>
        </table>
      </div>
    `;

    injectSpecialistsCoachMarks(document, {
      coachCount: 1,
      coachLevel: 3,
      coachWeeklyCostLocal: 0,
      assistantCount: 2,
      assistantSum: 10,
      assistantWeeklyCostLocal: 36000,
      medicCount: 1,
      medicLevel: 2,
      medicWeeklyCostLocal: 3600,
      psychologistCount: 1,
      psychologistLevel: 5,
      psychologistWeeklyCostLocal: 18000,
      totalWeeklyCostLocal: 57600,
    });

    const texts = Array.from(document.querySelectorAll('[data-htrc-coachmark]')).map(
      (el) => el.textContent
    );
    expect(texts.some((t) => t?.includes('职员省钱小助手'))).toBe(true);
    expect(texts.some((t) => t?.includes('4级(普通)教练'))).toBe(true);
    expect(texts.some((t) => t?.includes('合计8级'))).toBe(true);
    expect(texts.some((t) => t?.includes('心理师过贵'))).toBe(true);
    expect(texts.some((t) => t?.includes('4 级队医'))).toBe(true);

    clearAllCoachMarks(document);
    expect(document.querySelectorAll('[data-htrc-coachmark]').length).toBe(0);
  });
});
