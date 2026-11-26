import { findBestCaptain } from '../core/math/formulas';
import { compareWithPreviousSnapshot, type SnapshotDiffSummary } from '../core/math/sublevel';
import type { AutoSyncedSummary, ManualRookieState, TrainingGoal } from '../core/types/domain';
import { syncPlayerSnapshotsToIdb } from '../storage/snapshots';
import {
  clearAllCoachMarks,
  injectLineupCoachMarks,
  injectSeniorPlayerBadges,
  injectSpecialistsCoachMarks,
  injectTrainingCoachMarks,
  injectTransferRadarBadges,
  injectYouthPlayerBadges,
} from '../ui/BadgeInjector';
import { evaluateClubGuard } from './club-guard';
import { parseFinancesPage } from './finances.parser';
import { parseLineupPage } from './lineup.parser';
import { parseMatchesPage } from './matches.parser';
import { parseSeniorPlayersList } from './players-list.parser';
import { detectHattrickRoute } from './router';
import { parseSpecialistsPage } from './specialists.parser';
import { parseStadiumPage } from './stadium.parser';
import { parseTrainingPage } from './training.parser';
import { parseYouthPlayersList } from './youth-players.parser';

function mapExtendedTrainingToGoal(mapped: string, currentGoal: TrainingGoal): TrainingGoal {
  if (
    mapped === 'GK' ||
    mapped === 'DEF' ||
    mapped === 'PM' ||
    mapped === 'WING' ||
    mapped === 'SCOR' ||
    mapped === 'PASS'
  ) {
    return mapped;
  }
  if (mapped === 'EXTENDED_DEF') return 'DEF';
  if (mapped === 'EXTENDED_WING') return 'WING';
  if (mapped === 'EXTENDED_PASS') return 'PASS';
  return currentGoal;
}

/**
 * 在当前浏览页上被动读取 DOM，校验 Club Guard 后同步本队最新状态并注入页内轻量徽章。
 * 严格零网络请求、零自动点击。
 */
export function syncCurrentPageToState(
  doc: Document,
  pageUrl: string,
  currentState: ManualRookieState,
  foxtrickDetected: boolean,
  onAsyncSnapshotComplete?: (patchedState: ManualRookieState) => void,
  showCoachMarks = true
): { nextState: ManualRookieState; updated: boolean; pageType: string } {
  const route = detectHattrickRoute(pageUrl);
  const guard = evaluateClubGuard(doc, pageUrl);

  const prevAuto: AutoSyncedSummary = currentState.autoSynced ?? { syncedPages: {} };
  const nextAuto: AutoSyncedSummary = {
    ...prevAuto,
    ownTeamId: guard.ownTeamId ?? prevAuto.ownTeamId,
    clubName: guard.ownTeamName ?? prevAuto.clubName,
    syncedPages: { ...prevAuto.syncedPages },
  };
  let nextState: ManualRookieState = {
    ...currentState,
    autoSynced: nextAuto,
  };
  let updated = false;

  const allowPersistOwn = guard.isOwnClub || route.pageType === 'youth_players';

  if (route.pageType === 'players_list' || route.pageType === 'player_detail') {
    const players = parseSeniorPlayersList(doc, pageUrl);
    if (players.length > 0) {
      if (allowPersistOwn) {
        injectSeniorPlayerBadges(doc, players, foxtrickDetected);
        if (route.pageType === 'players_list') {
          nextAuto.squadCount = players.length;
          nextAuto.highAgePlayerCount = players.filter((p) => p.ageYears >= 30).length;
          nextAuto.lowStaminaStarterCount = players.filter(
            (p) => p.lastRating !== undefined && p.stamina > 0 && p.stamina < 6
          ).length;
          nextAuto.squadRoster = players.map((p) => ({
            playerId: p.playerId,
            name: p.name,
            ageYears: p.ageYears,
            stamina: p.stamina,
            form: p.form,
            specialty: p.specialty,
            skills: p.skills,
          }));

          const captainResult = findBestCaptain(
            players
              .filter((p) => p.experience > 0 || p.leadership > 0)
              .map((p) => ({
                id: p.playerId,
                name: p.name,
                experience: p.experience,
                leadership: p.leadership,
              }))
          );
          if (captainResult.best) {
            nextAuto.bestCaptain = {
              id: captainResult.best.id,
              name: captainResult.best.name,
              experience: captainResult.best.experience,
              leadership: captainResult.best.leadership,
              teamXpScore: captainResult.teamExperience,
            };
          }
        }
        nextAuto.currencyLabel = players[0]?.currencyLabel ?? nextAuto.currencyLabel;
        nextAuto.syncedPages[route.pageType] = Date.now();
        updated = true;

        // 异步写入 IndexedDB 跨周快照并在完成后叠加升星/TSI变化趋势徽章
        const clubIdForDb = guard.ownTeamId ?? nextAuto.ownTeamId ?? 0;
        if (clubIdForDb > 0) {
          void syncPlayerSnapshotsToIdb(
            clubIdForDb,
            players,
            nextAuto.currencyPerEuro ?? (nextAuto.currencyLabel === 'Yuan' ? 10 : 1)
          ).then(({ previousByPlayerId, totalSnapshots }) => {
            const diffs = new Map<number, SnapshotDiffSummary>();
            for (const p of players) {
              diffs.set(
                p.playerId,
                compareWithPreviousSnapshot(p, previousByPlayerId.get(p.playerId))
              );
            }
            injectSeniorPlayerBadges(doc, players, foxtrickDetected, diffs);
            if (onAsyncSnapshotComplete && totalSnapshots > 0) {
              onAsyncSnapshotComplete({
                ...nextState,
                autoSynced: {
                  ...(nextState.autoSynced ?? { syncedPages: {} }),
                  snapshotCountTotal: totalSnapshots,
                },
              });
            }
          });
        }
      } else {
        // 正在查看其他球队的球员/详情页 -> 启动只读买人雷达徽章，绝不写入本队库
        injectTransferRadarBadges(
          doc,
          players,
          foxtrickDetected,
          nextAuto.currencyPerEuro ?? 10
        );
      }
    }
  } else if (route.pageType === 'transfer_search') {
    const players = parseSeniorPlayersList(doc, pageUrl);
    if (players.length > 0) {
      injectTransferRadarBadges(
        doc,
        players,
        foxtrickDetected,
        nextAuto.currencyPerEuro ?? 10
      );
    }
  } else if (route.pageType === 'lineup' && allowPersistOwn) {
    const lineup = parseLineupPage(doc);
    if (lineup) {
      nextAuto.lineupSnapshot = lineup;
      nextAuto.syncedPages.lineup = Date.now();
      updated = true;
      if (showCoachMarks) {
        injectLineupCoachMarks(doc, lineup, nextState);
      } else {
        clearAllCoachMarks(doc);
      }
    }
  } else if (route.pageType === 'training' && allowPersistOwn) {
    const parsed = parseTrainingPage(doc);
    if (parsed) {
      nextAuto.trainingCode = parsed.trainingCode;
      nextAuto.trainingLabel = parsed.trainingLabel;
      nextAuto.previewFull90Count = parsed.previewFull90Count;
      nextAuto.previewZeroCount = parsed.previewZeroCount;
      nextAuto.syncedPages.training = Date.now();

      nextState = {
        ...nextState,
        trainingGoal: mapExtendedTrainingToGoal(parsed.mappedGoal, currentState.trainingGoal),
        trainingIntensityPct: parsed.trainingIntensityPct,
        staminaSharePct: parsed.staminaSharePct,
        autoSynced: nextAuto,
      };
      updated = true;
      if (showCoachMarks) {
        injectTrainingCoachMarks(doc, parsed);
      } else {
        clearAllCoachMarks(doc);
      }
    }
  } else if (route.pageType === 'staff' && allowPersistOwn) {
    const parsed = parseSpecialistsPage(doc);
    if (parsed) {
      nextAuto.psychologistLevel = parsed.psychologistLevel;
      nextAuto.staffWeeklyCostLocal = parsed.totalWeeklyCostLocal;
      nextAuto.syncedPages.staff = Date.now();

      nextState = {
        ...nextState,
        headCoachLevel: parsed.coachLevel || currentState.headCoachLevel,
        assistantSum: parsed.assistantSum,
        medicLevel: parsed.medicLevel,
        autoSynced: nextAuto,
      };
      updated = true;
      if (showCoachMarks) {
        injectSpecialistsCoachMarks(doc, parsed);
      } else {
        clearAllCoachMarks(doc);
      }
    }
  } else if (route.pageType === 'economy' && allowPersistOwn) {
    const parsed = parseFinancesPage(doc);
    if (parsed) {
      const perEuro = parsed.currencyLabel === 'Yuan' ? 10 : 1;
      nextAuto.currencyLabel = parsed.currencyLabel;
      nextAuto.currencyPerEuro = perEuro;
      nextAuto.playerWagesWeeklyLocal = parsed.weeklyWagesLocal;
      nextAuto.youthExpensesWeeklyLocal = parsed.youthExpensesLocal;
      nextAuto.interestWeeklyLocal = parsed.interestLocal;
      nextAuto.twoWeekBalanceLocal = parsed.twoWeekBalanceLocal;
      nextAuto.syncedPages.economy = Date.now();

      const youthEuro = Math.round(parsed.youthExpensesLocal / perEuro);
      const inferredScouts: 0 | 1 | 2 | 3 =
        youthEuro >= 18000 ? 3 : youthEuro >= 13000 ? 2 : youthEuro >= 8000 ? 1 : 0;

      nextState = {
        ...nextState,
        weeklyCashEuro: Math.round(parsed.cashBalanceLocal / perEuro),
        weeklyNetBalanceEuro: Math.round(parsed.expectedWeeklyNetLocal / perEuro),
        youthAcademyActive: parsed.youthExpensesLocal > 0 || currentState.youthAcademyActive,
        youthScoutsCount: inferredScouts,
        autoSynced: nextAuto,
      };
      updated = true;
    }
  } else if (route.pageType === 'arena' && allowPersistOwn) {
    const parsed = parseStadiumPage(doc, pageUrl);
    if (parsed) {
      nextAuto.stadiumCapacity = parsed.totalCapacity;
      nextAuto.stadiumUnderConstruction = parsed.underConstruction;
      nextAuto.stadiumLayout = {
        terraces: parsed.terraces,
        basic: parsed.basic,
        roof: parsed.roof,
        vip: parsed.vip,
      };
      nextAuto.syncedPages.arena = Date.now();

      const fullMatches =
        parsed.totalCapacity > 0
          ? parsed.recentHomeAttendances.filter((a) => a / parsed.totalCapacity >= 0.96).length
          : 0;

      nextState = {
        ...nextState,
        recentSunnyHomeFullCount: fullMatches,
        autoSynced: nextAuto,
      };
      updated = true;
    }
  } else if (route.pageType === 'matches' && allowPersistOwn) {
    const parsed = parseMatchesPage(doc);
    if (parsed) {
      nextAuto.syncedPages.matches = Date.now();
      nextState = {
        ...nextState,
        seniorFriendlyBookedThisWeek: parsed.midweekBookedThisWeek,
        autoSynced: nextAuto,
      };
      updated = true;
    }
  } else if (route.pageType === 'youth_players') {
    const youthList = parseYouthPlayersList(doc);
    if (youthList.length > 0) {
      injectYouthPlayerBadges(doc, youthList, showCoachMarks);
      nextAuto.youthCount = youthList.length;
      nextAuto.youthPromotableNames = youthList.filter((y) => y.eligibleNow).map((y) => y.name);
      nextAuto.youthTopProspects = youthList
        .filter((y) => y.highestKnownPotential >= 6)
        .sort((a, b) => b.highestKnownPotential - a.highestKnownPotential)
        .slice(0, 5)
        .map((y) => ({
          name: y.name,
          ageLabel: `${y.ageYears}岁${y.ageDays}天`,
          maxPotential: y.highestKnownPotential,
        }));
      nextAuto.syncedPages.youth_players = Date.now();
      nextState = {
        ...nextState,
        youthAcademyActive: true,
        autoSynced: nextAuto,
      };
      updated = true;
    }
  }

  if (!showCoachMarks) {
    clearAllCoachMarks(doc);
  }

  return { nextState, updated, pageType: route.pageType };
}
