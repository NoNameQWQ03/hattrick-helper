import { describe, expect, it } from 'vitest';
import { compareWithPreviousSnapshot } from '../../src/core/math/sublevel';
import { evaluateLineupDiagnostics } from '../../src/core/rules/lineup-rules';
import { evaluateRookieDiagnostics } from '../../src/core/rules/engine';
import type { ParsedSeniorPlayer, PlayerSnapshotRecord } from '../../src/core/types/domain';
import { parseLineupPage } from '../../src/parsers/lineup.parser';
import { parseSeniorPlayersList } from '../../src/parsers/players-list.parser';
import { syncCurrentPageToState } from '../../src/parsers/page-sync';
import { DEFAULT_MANUAL_STATE } from '../../src/storage/settings';
import { injectTransferRadarBadges } from '../../src/ui/BadgeInjector';

describe('Phase 2: lineup rules, snapshot sublevel diffs, and transfer radar', () => {
  it('parses MatchOrder <ht-matchorder> and detects MOTS + illegal formation risks', () => {
    document.body.innerHTML = `
      <ht-matchorder>
        <div>
          <span class="mo-formation-numbers">3-4-3</span> (杰出)
        </div>
        <select id="mo-tacticType">
          <option value="1" selected>全场压迫</option>
        </select>
        <select id="mo-speechLevel">
          <option value="0">普通比赛</option>
          <option value="1" selected>生死之战</option>
        </select>
        <div id="position-100" class="position position-100 position-keeper position-has-player"></div>
        <div id="position-102" class="position position-102 position-defence position-has-player"></div>
        <div id="position-103" class="position position-103 position-defence position-has-player"></div>
        <div id="position-104" class="position position-104 position-defence position-has-player"></div>
        <div id="position-106" class="position position-106 position-midfield position-has-player"></div>
        <div id="position-107" class="position position-107 position-midfield position-has-player"></div>
        <div id="position-109" class="position position-109 position-midfield position-has-player"></div>
        <div id="position-110" class="position position-110 position-midfield position-has-player"></div>
        <div id="position-111" class="position position-111 position-attack position-has-player"></div>
        <div id="position-112" class="position position-112 position-attack position-has-player"></div>
        <div id="position-113" class="position position-113 position-attack position-has-player"></div>
      </ht-matchorder>
    `;

    const lineup = parseLineupPage(document);
    expect(lineup).not.toBeNull();
    expect(lineup?.formationText).toBe('3-4-3');
    expect(lineup?.formationExperienceLevel).toBe(10);
    expect(lineup?.attitude).toBe('mots');
    expect(lineup?.totalStarters).toBe(11);

    const alerts = evaluateLineupDiagnostics(lineup!, {
      ...DEFAULT_MANUAL_STATE,
      trainingGoal: 'DEF',
      autoSynced: {
        bestCaptain: { id: 10, name: '老队长', experience: 10, leadership: 7, teamXpScore: 7.2 },
        syncedPages: {},
      },
    });
    const ids = alerts.map((a) => a.id);
    expect(ids).toContain('LINEUP_MOTS_WARNING');
    expect(ids).toContain('LINEUP_TRAINING_SLOTS_DEF');
    expect(ids).toContain('LINEUP_BEST_CAPTAIN_HINT');
    expect(ids).not.toContain('LINEUP_ILLEGAL_FORMATION_RISK');

    // 少于9人且无门将 -> 触发非法阵型红警
    document.querySelector('#position-100')?.classList.remove('position-has-player');
    document.querySelector('#position-102')?.classList.remove('position-has-player');
    document.querySelector('#position-103')?.classList.remove('position-has-player');
    const illegal = parseLineupPage(document)!;
    const illegalAlerts = evaluateLineupDiagnostics(illegal, DEFAULT_MANUAL_STATE);
    expect(illegalAlerts.map((a) => a.id)).toContain('LINEUP_ILLEGAL_FORMATION_RISK');
  });

  it('compares snapshots to detect TSI growth and skill pops', () => {
    const prev: PlayerSnapshotRecord = {
      clubId: 1,
      playerId: 101,
      htSeason: 2026,
      htWeek: 46,
      capturedAt: 1000,
      name: '小妖',
      ageYears: 17,
      ageDays: 20,
      specialty: 'Head',
      tsi: 800,
      weeklyWageBase: 300,
      form: 6,
      stamina: 6,
      experience: 1,
      leadership: 4,
      skills: {
        keeper: 1,
        defending: 6,
        playmaking: 4,
        winger: 3,
        passing: 4,
        scoring: 3,
        setPieces: 2,
      },
    };
    const curr: ParsedSeniorPlayer = {
      playerId: 101,
      name: '小妖',
      ageYears: 17,
      ageDays: 27,
      tsi: 1250,
      weeklyWageLocal: 3000,
      currencyLabel: 'Yuan',
      specialty: 'Head',
      form: 6,
      stamina: 6,
      experience: 1,
      leadership: 4,
      loyalty: 20,
      skills: {
        ...prev.skills,
        defending: 7,
      },
    };

    const diffPop = compareWithPreviousSnapshot(curr, prev);
    expect(diffPop.poppedSkills).toEqual([{ skill: 'defending', from: 6, to: 7 }]);
    expect(diffPop.trendBadge).toContain('防守6→7');

    const diffTsiOnly = compareWithPreviousSnapshot(
      { ...curr, skills: prev.skills },
      prev
    );
    expect(diffTsiOnly.trendBadge).toContain('TSI +450');
  });

  it('extracts experience/leadership and injects transfer radar badges without polluting own club', () => {
    document.body.innerHTML = `
      <div id="teamLinks"><a href="/Club/?TeamID=1000001">Demo United FC</a></div>
      <div class="teamphoto-player">
        <h3><a href="/Club/Players/Player.aspx?playerId=777" title="老将陷阱">老将陷阱</a></h3>
        <p>拥有 <a href="/Help/Rules/AppDenominations.aspx?lt=skill&ll=12#skill">神妙</a> 经验和 <a href="/Help/Rules/AppDenominations.aspx?lt=leadership&ll=6#leadership">及格</a> 领导能力</p>
        <div class="flex"><div class="playerInfo">
          <div class="transferPlayerInformation"><table><tbody>
            <tr><td>年龄</td><td>33 岁 又 10 天</td></tr>
            <tr><td>TSI</td><td>1 200</td></tr>
            <tr><td>工资</td><td>250 000 Yuan/周</td></tr>
            <tr id="ctl00_trSpeciality"><td>特长</td><td>-</td></tr>
            <tr id="ctl00_trForm"><td>状态</td><td><div class="ht-bar" level="5"></div></td></tr>
            <tr id="ctl00_trStamina"><td>体能</td><td><div class="ht-bar" level="4"></div></td></tr>
          </tbody></table></div>
          <div class="transferPlayerSkills"><table><tbody>
            <tr id="ctl00_trKeeper"><td>守门</td><td><div class="ht-bar" level="1"></div></td></tr>
            <tr id="ctl00_trDefender"><td>防守</td><td><div class="ht-bar" level="8"></div></td></tr>
            <tr id="ctl00_trPlaymaker"><td>组织</td><td><div class="ht-bar" level="4"></div></td></tr>
            <tr id="ctl00_trWinger"><td>边锋</td><td><div class="ht-bar" level="3"></div></td></tr>
            <tr id="ctl00_trPasser"><td>传球</td><td><div class="ht-bar" level="3"></div></td></tr>
            <tr id="ctl00_trScorer"><td>进球</td><td><div class="ht-bar" level="2"></div></td></tr>
            <tr id="ctl00_trKicker"><td>定位球</td><td><div class="ht-bar" level="2"></div></td></tr>
          </tbody></table></div>
        </div></div>
      </div>
    `;

    const players = parseSeniorPlayersList(document);
    expect(players[0]?.experience).toBe(12);
    expect(players[0]?.leadership).toBe(6);

    // 查看他人转会挂牌页：不应更新本队状态，应注入买人防坑徽章
    const res = syncCurrentPageToState(
      document,
      'https://www84.hattrick.org/World/Transfers/',
      DEFAULT_MANUAL_STATE,
      false
    );
    expect(res.updated).toBe(false);
    injectTransferRadarBadges(document, players, false, 10);
    const badgeTexts = Array.from(document.querySelectorAll('[data-htrc-badge]')).map(
      (b) => b.textContent
    );
    expect(badgeTexts.some((t) => t?.includes('高龄(33岁)'))).toBe(true);
    expect(badgeTexts.some((t) => t?.includes('高周薪'))).toBe(true);

    const marketTips = evaluateRookieDiagnostics(DEFAULT_MANUAL_STATE, 'transfer_search');
    expect(marketTips.map((m) => m.id)).toContain('MARKET_ROOKIE_BUY_GUIDE');
  });
});
