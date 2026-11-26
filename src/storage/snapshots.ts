import { getWeekBucketKey } from '../core/math/sublevel';
import type { ParsedSeniorPlayer, PlayerSnapshotRecord } from '../core/types/domain';
import { getCopilotDb } from './db';

/**
 * 保存本队球员本周快照（同一自然周同一球员只保留/更新最新一条，避免刷屏）。
 * 并返回“上一次不同周次”的快照映射表，用于实时展示成长对比。
 */
export async function syncPlayerSnapshotsToIdb(
  clubId: number,
  players: ParsedSeniorPlayer[],
  currencyPerEuro = 10
): Promise<{
  previousByPlayerId: Map<number, PlayerSnapshotRecord>;
  totalSnapshots: number;
}> {
  const previousByPlayerId = new Map<number, PlayerSnapshotRecord>();
  if (typeof indexedDB === 'undefined' || players.length === 0) {
    return { previousByPlayerId, totalSnapshots: 0 };
  }

  const db = await getCopilotDb();
  const { htSeason, htWeek } = getWeekBucketKey();
  const now = Date.now();

  // 先读取每个球员历史快照（找出早于本周的最新记录作对比，以及本周是否已有记录可更新）
  const readTx = db.transaction('players_snapshots', 'readonly');
  const playerIdx = readTx.store.index('by_player');
  const existingThisWeekId = new Map<number, number>();

  for (const p of players) {
    if (!p.playerId) continue;
    const history = await playerIdx.getAll(p.playerId);
    const sameClub = history
      .filter((r) => r.clubId === clubId)
      .sort((a, b) => b.capturedAt - a.capturedAt);

    for (const rec of sameClub) {
      if (rec.htSeason === htSeason && rec.htWeek === htWeek) {
        if (rec.id !== undefined) existingThisWeekId.set(p.playerId, rec.id);
      } else if (!previousByPlayerId.has(p.playerId)) {
        previousByPlayerId.set(p.playerId, rec);
      }
    }
  }
  await readTx.done;

  const writeTx = db.transaction('players_snapshots', 'readwrite');
  for (const p of players) {
    if (!p.playerId) continue;
    const existingId = existingThisWeekId.get(p.playerId);
    const record: PlayerSnapshotRecord = {
      ...(existingId !== undefined ? { id: existingId } : {}),
      clubId,
      playerId: p.playerId,
      htSeason,
      htWeek,
      capturedAt: now,
      name: p.name,
      ageYears: p.ageYears,
      ageDays: p.ageDays,
      specialty: p.specialty,
      tsi: p.tsi,
      weeklyWageBase: Math.round(p.weeklyWageLocal / Math.max(1, currencyPerEuro)),
      form: p.form,
      stamina: p.stamina,
      experience: p.experience,
      leadership: p.leadership,
      skills: p.skills,
    };
    await writeTx.store.put(record);
  }
  await writeTx.done;

  const totalSnapshots = await db.count('players_snapshots');
  return { previousByPlayerId, totalSnapshots };
}
