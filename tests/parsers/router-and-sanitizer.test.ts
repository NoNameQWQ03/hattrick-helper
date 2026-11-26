import { describe, expect, it } from 'vitest';
import { detectHattrickRoute } from '../../src/parsers/router';
import { buildSanitizedHtmlFixture } from '../../src/parsers/sanitizer';

describe('parsers/router & sanitizer', () => {
  it('detects core hattrick.org page routes including /zh/ and Youth precedence cleanly', () => {
    expect(detectHattrickRoute('https://www.hattrick.org/zh/').pageType).toBe('home');
    expect(detectHattrickRoute('https://www.hattrick.org/zh/Default.aspx').pageType).toBe('home');
    expect(detectHattrickRoute('https://www84.hattrick.org/MyHattrick/Office/').pageType).toBe('home');
    expect(
      detectHattrickRoute('https://www.hattrick.org/zh/Club/Matches/Match.aspx?matchID=7000001').pageType
    ).toBe('matches');
    expect(detectHattrickRoute('https://www84.hattrick.org/Club/Players/?TeamID=1000001').pageType).toBe(
      'players_list'
    );
    expect(
      detectHattrickRoute('https://www84.hattrick.org/Club/Players/YouthPlayers.aspx?YouthTeamID=2000001').pageType
    ).toBe('youth_players');
    expect(
      detectHattrickRoute('https://www84.hattrick.org/Club/Training/YouthTraining.aspx?YouthTeamID=2000001').pageType
    ).toBe('youth_training');
    expect(
      detectHattrickRoute('https://www84.hattrick.org/Club/Specialists/?teamId=1000001').pageType
    ).toBe('staff');
    expect(
      detectHattrickRoute('https://www84.hattrick.org/Club/Stadium/?stadiumId=3000001').pageType
    ).toBe('arena');
    expect(
      detectHattrickRoute('https://www84.hattrick.org/Club/ArenaHub/').pageType
    ).toBe('unknown');
    expect(
      detectHattrickRoute('https://www84.hattrick.org/Club/Finances/?TeamID=1000001').pageType
    ).toBe('economy');
    expect(
      detectHattrickRoute('https://www.hattrick.org/Club/Players/Player.aspx?playerId=456').pageType
    ).toBe('player_detail');
    expect(detectHattrickRoute('https://www.hattrick.org/Club/Training/Training.aspx').pageType).toBe(
      'training'
    );
    expect(detectHattrickRoute('https://www.hattrick.org/World/Transfers/').pageType).toBe(
      'transfer_search'
    );
  });

  it('sanitizes scripts, hidden ASP.NET fields, emails, tokens, and copilot host node', () => {
    document.body.innerHTML = `
      <div id="mainBody">
        <input type="hidden" name="__VIEWSTATE" value="SECRET_VIEWSTATE" />
        <script>alert('xss')</script>
        <p>经理邮箱: rookie@example.com</p>
        <a href="/Club/?token=supersecrettoken123">link</a>
        <table class="playerList"><tr><td>张三</td><td>良好 (7)</td></tr></table>
      </div>
      <ht-rookie-copilot></ht-rookie-copilot>
    `;

    const res = buildSanitizedHtmlFixture(
      document,
      'https://www.hattrick.org/Club/Players/?TeamID=999'
    );

    expect(res.pageType).toBe('players_list');
    expect(res.filename).toContain('fixture-players_list-');
    expect(res.html).not.toContain('SECRET_VIEWSTATE');
    expect(res.html).not.toContain('alert(');
    expect(res.html).not.toContain('rookie@example.com');
    expect(res.html).not.toContain('supersecrettoken123');
    expect(res.html).not.toContain('<ht-rookie-copilot');
    expect(res.html).toContain('张三');
    expect(res.html).toContain('良好 (7)');
  });

  it('falls back to doc.body if #mainBody is empty shell', () => {
    document.body.innerHTML = `
      <div id="mainBody"></div>
      <div id="realContent">${'<p>球员列表行内容占位</p>'.repeat(40)}</div>
    `;

    const res = buildSanitizedHtmlFixture(document, 'https://www.hattrick.org/MyHattrick/');
    expect(res.selectedContainer).toBe('body');
    expect(res.html).toContain('球员列表行内容占位');
  });
});
