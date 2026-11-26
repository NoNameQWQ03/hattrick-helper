import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  ClubRecord,
  ObservedMatchRecord,
  PlayerSnapshotRecord,
  WeeklyAuditRecord,
  YouthProspectRecord,
} from '../core/types/domain';

interface HtRookieCopilotDB extends DBSchema {
  clubs: {
    key: number;
    value: ClubRecord;
  };
  players_snapshots: {
    key: number;
    value: PlayerSnapshotRecord;
    indexes: {
      by_club_week: [number, number, number];
      by_player: number;
    };
  };
  matches_observed: {
    key: number;
    value: ObservedMatchRecord;
    indexes: {
      by_club: number;
    };
  };
  club_weekly_audits: {
    key: string;
    value: WeeklyAuditRecord;
    indexes: {
      by_club: number;
    };
  };
  youth_prospects: {
    key: number;
    value: YouthProspectRecord;
    indexes: {
      by_club: number;
    };
  };
}

const DB_NAME = 'ht_rookie_copilot_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<HtRookieCopilotDB>> | null = null;

export function getCopilotDb(): Promise<IDBPDatabase<HtRookieCopilotDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HtRookieCopilotDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('clubs')) {
          db.createObjectStore('clubs', { keyPath: 'clubId' });
        }
        if (!db.objectStoreNames.contains('players_snapshots')) {
          const store = db.createObjectStore('players_snapshots', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by_club_week', ['clubId', 'htSeason', 'htWeek']);
          store.createIndex('by_player', 'playerId');
        }
        if (!db.objectStoreNames.contains('matches_observed')) {
          const store = db.createObjectStore('matches_observed', { keyPath: 'matchId' });
          store.createIndex('by_club', 'clubId');
        }
        if (!db.objectStoreNames.contains('club_weekly_audits')) {
          const store = db.createObjectStore('club_weekly_audits', { keyPath: 'id' });
          store.createIndex('by_club', 'clubId');
        }
        if (!db.objectStoreNames.contains('youth_prospects')) {
          const store = db.createObjectStore('youth_prospects', { keyPath: 'youthId' });
          store.createIndex('by_club', 'clubId');
        }
      },
    });
  }
  return dbPromise;
}

export interface BackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  clubs: ClubRecord[];
  playersSnapshots: PlayerSnapshotRecord[];
  matchesObserved: ObservedMatchRecord[];
  weeklyAudits: WeeklyAuditRecord[];
  youthProspects: YouthProspectRecord[];
}

export async function exportDatabaseBackup(): Promise<BackupPayload> {
  const db = await getCopilotDb();
  const [clubs, playersSnapshots, matchesObserved, weeklyAudits, youthProspects] = await Promise.all([
    db.getAll('clubs'),
    db.getAll('players_snapshots'),
    db.getAll('matches_observed'),
    db.getAll('club_weekly_audits'),
    db.getAll('youth_prospects'),
  ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    clubs,
    playersSnapshots,
    matchesObserved,
    weeklyAudits,
    youthProspects,
  };
}

export function validateBackupPayload(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('无效的备份文件格式：根节点必须为 JSON 对象');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    throw new Error('不支持的备份版本');
  }
  const requiredArrays = [
    'clubs',
    'playersSnapshots',
    'matchesObserved',
    'weeklyAudits',
    'youthProspects',
  ] as const;

  for (const key of requiredArrays) {
    if (!Array.isArray(obj[key])) {
      throw new Error(`备份数据缺少有效数组字段: ${key}`);
    }
  }
  return obj as unknown as BackupPayload;
}

export async function importDatabaseBackup(raw: unknown): Promise<{ counts: Record<string, number> }> {
  const payload = validateBackupPayload(raw);
  const db = await getCopilotDb();
  const tx = db.transaction(
    ['clubs', 'players_snapshots', 'matches_observed', 'club_weekly_audits', 'youth_prospects'],
    'readwrite'
  );

  for (const c of payload.clubs) await tx.objectStore('clubs').put(c);
  for (const s of payload.playersSnapshots) await tx.objectStore('players_snapshots').put(s);
  for (const m of payload.matchesObserved) await tx.objectStore('matches_observed').put(m);
  for (const a of payload.weeklyAudits) await tx.objectStore('club_weekly_audits').put(a);
  for (const y of payload.youthProspects) await tx.objectStore('youth_prospects').put(y);

  await tx.done;

  return {
    counts: {
      clubs: payload.clubs.length,
      playersSnapshots: payload.playersSnapshots.length,
      matchesObserved: payload.matchesObserved.length,
      weeklyAudits: payload.weeklyAudits.length,
      youthProspects: payload.youthProspects.length,
    },
  };
}
