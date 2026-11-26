import { describe, expect, it } from 'vitest';
import { evaluateClubGuard } from '../../src/parsers/club-guard';
import { parseFinancesPage } from '../../src/parsers/finances.parser';
import { parseMatchesPage } from '../../src/parsers/matches.parser';
import { syncCurrentPageToState } from '../../src/parsers/page-sync';
import { parseSeniorPlayersList } from '../../src/parsers/players-list.parser';
import { parseSpecialistsPage } from '../../src/parsers/specialists.parser';
import { parseStadiumPage } from '../../src/parsers/stadium.parser';
import { parseTrainingPage } from '../../src/parsers/training.parser';
import { parseYouthPlayersList } from '../../src/parsers/youth-players.parser';
import { DEFAULT_MANUAL_STATE } from '../../src/storage/settings';

describe('Phase 1 real DOM parsers', () => {
  it('enforces Club Guard and picks real club name from #teamLinks', () => {
    document.body.innerHTML = `
      <div id="teamLinks"><a href="/Club/?TeamID=1000001">Demo United FC</a></div>
      <div class="subMenu">
        <a href="/Club/?TeamID=1000001">球会</a>
      </div>
    `;
    const own = evaluateClubGuard(document, 'https://www84.hattrick.org/Club/Players/?TeamID=1000001');
    expect(own.ownTeamId).toBe(1000001);
    expect(own.ownTeamName).toBe('Demo United FC');
    expect(own.isOwnClub).toBe(true);

    const opp = evaluateClubGuard(document, 'https://www84.hattrick.org/Club/Players/?TeamID=999999');
    expect(opp.isOwnClub).toBe(false);
  });

  it('parses senior players list with official ht-bar levels and injects badges', () => {
    document.body.innerHTML = `
      <div class="subMenu"><a href="/Club/?TeamID=1000001">Demo United FC</a></div>
      <div class="teamphoto-player">
        <h3 class="float_left"><a href="/Club/Players/Player.aspx?playerId=5000001" title="Demo Forward">Demo Forward</a></h3>
        <div class="flex">
          <div class="flex-grow playerInfo">
            <div class="transferPlayerInformation"><table><tbody>
              <tr><td class="right">年龄</td><td colspan="2">22 岁 又 14 天</td></tr>
              <tr><td class="right">TSI</td><td colspan="2">9&nbsp;610</td></tr>
              <tr><td class="right">工资</td><td colspan="2">36&nbsp;840&nbsp;<span>Yuan/周</span></td></tr>
              <tr id="ctl00_trSpeciality"><td>特长</td><td>头球专家</td></tr>
              <tr id="ctl00_trForm"><td>状态</td><td><div class="ht-bar" level="3" max="8"></div><span class="denominationNumber">3</span></td></tr>
              <tr id="ctl00_trStamina"><td>体能</td><td><div class="ht-bar" level="9" max="9"></div><span class="denominationNumber">9</span></td></tr>
            </tbody></table></div>
            <div class="transferPlayerSkills"><table><tbody>
              <tr id="ctl00_trKeeper"><td>守门</td><td><div class="ht-bar" level="1" max="20"></div></td><td><span class="denominationNumber">1</span></td></tr>
              <tr id="ctl00_trDefender"><td>防守</td><td><div class="ht-bar" level="4" max="20"></div></td><td><span class="denominationNumber">4</span></td></tr>
              <tr id="ctl00_trPlaymaker"><td>组织</td><td><div class="ht-bar" level="4" max="20"></div></td><td><span class="denominationNumber">4</span></td></tr>
              <tr id="ctl00_trWinger"><td>边锋</td><td><div class="ht-bar" level="6" max="20"></div></td><td><span class="denominationNumber">6</span></td></tr>
              <tr id="ctl00_trPasser"><td>传球</td><td><div class="ht-bar" level="4" max="20"></div></td><td><span class="denominationNumber">4</span></td></tr>
              <tr id="ctl00_trScorer"><td>进球</td><td><div class="ht-bar" level="11" max="20"></div></td><td><span class="denominationNumber">11</span></td></tr>
              <tr id="ctl00_trKicker"><td>定位球</td><td><div class="ht-bar" level="7" max="20"></div></td><td><span class="denominationNumber">7</span></td></tr>
            </tbody></table></div>
            <hattrick-rating rating="4.5"></hattrick-rating>
          </div>
        </div>
      </div>
    `;

    const list = parseSeniorPlayersList(document);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      playerId: 5000001,
      name: 'Demo Forward',
      ageYears: 22,
      ageDays: 14,
      tsi: 9610,
      weeklyWageLocal: 36840,
      specialty: 'Head',
      form: 3,
      stamina: 9,
      skills: {
        keeper: 1,
        defending: 4,
        playmaking: 4,
        winger: 6,
        passing: 4,
        scoring: 11,
        setPieces: 7,
      },
    });

    const synced = syncCurrentPageToState(
      document,
      'https://www84.hattrick.org/Club/Players/?TeamID=1000001',
      DEFAULT_MANUAL_STATE,
      false
    );
    expect(synced.updated).toBe(true);
    expect(synced.nextState.autoSynced?.squadCount).toBe(1);
    expect(document.querySelectorAll('[data-htrc-badge]').length).toBeGreaterThan(0);
  });

  it('parses Angular training page, specialists, finances, stadium, matches, and youth players', () => {
    // 1. Training
    document.body.innerHTML = `
      <ht-training-new>
        <select>
          <option value="9">门将</option>
          <option value="11" selected>防守（门将、后卫和所有中场球员）</option>
        </select>
        <div><div>体能 <mat-slider><input type="range" value="50" /></mat-slider></div></div>
        <div><div>训练水平 <mat-slider><input type="range" value="100" /></mat-slider></div></div>
        <div><div>教练技能 2 <mat-slider><input type="range" value="2" /></mat-slider></div></div>
        <div><div>2 个助理教练级别 10 <mat-slider><input type="range" value="10" /></mat-slider></div></div>
        <table class="htbox-table"><tbody>
          <tr><td class="tr-preview-player"><a>A</a></td><td>90'</td></tr>
          <tr><td class="tr-preview-player"><a>B</a></td><td>无训练</td></tr>
        </tbody></table>
      </ht-training-new>
    `;
    const tr = parseTrainingPage(document);
    expect(tr?.trainingCode).toBe('11');
    expect(tr?.staminaSharePct).toBe(50);
    expect(tr?.trainingIntensityPct).toBe(100);
    expect(tr?.previewFull90Count).toBe(1);
    expect(tr?.previewZeroCount).toBe(1);

    // 2. Specialists
    document.body.innerHTML = `
      <div id="mainBody">
        <table>
          <tr><th>位置</th><th>作用</th><th>加成</th><th>聘请</th><th>总共(级别)</th><th>每周费用</th></tr>
          <tr><td>教练</td><td>训练速度</td><td>76%</td><td>1</td><td>2</td><td>25 000 Yuan</td></tr>
          <tr><td>助理教练</td><td>训练速度</td><td>+35%</td><td>2</td><td>10</td><td>326 400 Yuan</td></tr>
          <tr><td>队医</td><td>恢复速度</td><td>+80%</td><td>1</td><td>4</td><td>81 600 Yuan</td></tr>
          <tr><td>运动心理学家</td><td>团队精神</td><td>+0,5</td><td>1</td><td>5</td><td>163 200 Yuan</td></tr>
          <tr><td>总计</td><td></td><td></td><td></td><td></td><td>596 200 Yuan</td></tr>
        </table>
      </div>
    `;
    const sp = parseSpecialistsPage(document);
    expect(sp).toMatchObject({
      coachLevel: 2,
      assistantSum: 10,
      medicLevel: 4,
      psychologistLevel: 5,
      totalWeeklyCostLocal: 596200,
    });

    // 3. Finances (including nested outer layout row mirroring real Hattrick HTML)
    document.body.innerHTML = `
      <div id="mainBody">
        <h1>每周财政报告</h1>
        <table>
          <tr><td>现金:</td><td>-3 495 986 Yuan</td></tr>
          <tr>
            <td><table><tr><td>赞助商</td><td>840 000 Yuan</td></tr><tr><td>总收入</td><td>2 487 238 Yuan</td></tr></table></td>
            <td><table><tr><td>工资</td><td>528 520 Yuan</td></tr><tr><td>青年支出</td><td>200 000 Yuan</td></tr><tr><td>总支出</td><td>4 000 132 Yuan</td></tr></table></td>
          </tr>
          <tr><td>结存:</td><td>-2 083 217 Yuan</td></tr>
        </table>
      </div>
    `;
    const fin = parseFinancesPage(document);
    expect(fin?.cashBalanceLocal).toBe(-3495986);
    expect(fin?.youthExpensesLocal).toBe(200000);
    expect(fin?.totalIncomeLocal).toBe(2487238);
    expect(fin?.totalExpensesLocal).toBe(4000132);
    expect(fin?.expectedWeeklyNetLocal).toBe(2487238 - 4000132);
    expect(fin?.twoWeekBalanceLocal).toBe(-2083217);

    // 4. Stadium
    document.body.innerHTML = `
      <div id="mainBody">
        <table>
          <tr><td>上次改建</td><td>施工中</td></tr>
          <tr><td>总容量</td><td>17 575</td></tr>
          <tr><td>阶梯看台</td><td>10 125</td></tr>
          <tr><td>普通座位</td><td>3 000</td></tr>
          <tr><td>有顶座位</td><td>2 900</td></tr>
          <tr><td>贵宾包厢</td><td>1 550</td></tr>
        </table>
        <table>
          <tr><td><span id="ctl00_repPlayedMatches_ctl00">21-11</span></td><td></td><td>Match</td><td>17 138</td></tr>
        </table>
      </div>
    `;
    const st = parseStadiumPage(document, 'https://www84.hattrick.org/Club/Stadium/?stadiumId=3000001');
    expect(st?.totalCapacity).toBe(17575);
    expect(st?.underConstruction).toBe(true);
    expect(st?.recentHomeAttendances).toEqual([17138]);

    // 5. Matches (cup counts as midweek!)
    document.body.innerHTML = `
      <div id="mainBody">
        <table>
          <tr><td>即将进行的比赛</td></tr>
          <tr><td><img class="match-type-svg match-type-cup" title="东隅挑战者杯" /></td><td>02-12-2026 Rival City FC - Demo United FC</td></tr>
          <tr><td>已经进行的比赛</td></tr>
        </table>
      </div>
    `;
    const m = parseMatchesPage(document);
    expect(m?.midweekBookedThisWeek).toBe(true);

    // 6. Youth players
    document.body.innerHTML = `
      <div class="youthCard">
        <h3>小妖乙</h3>
        <p>17 岁又 10 天, 现在可以提拔到成年队了。</p>
        <div class="playerInfo">
          <div class="youthPlayerSkills">
            <table>
              <tr id="ctl00_trPlaymaking"><td>组织</td><td><div class="ht-bar" level="-1" cap="8"></div></td><td>?/8</td></tr>
            </table>
          </div>
        </div>
      </div>
    `;
    const yp = parseYouthPlayersList(document);
    expect(yp).toHaveLength(1);
    expect(yp[0]?.eligibleNow).toBe(true);
    expect(yp[0]?.highestKnownPotential).toBe(8);
  });
});
