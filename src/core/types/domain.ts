export type TrainingGoal = 'UNSET' | 'GK' | 'DEF' | 'PM' | 'WING' | 'SCOR' | 'PASS';

export type SkillKey =
  | 'keeper'
  | 'defending'
  | 'playmaking'
  | 'winger'
  | 'passing'
  | 'scoring'
  | 'setPieces';

export type SpecialtyType =
  | 'Head'
  | 'Quick'
  | 'Technical'
  | 'Powerful'
  | 'Unpredictable'
  | 'Support'
  | 'Resilient'
  | null;

export type Severity = 'critical' | 'warning' | 'tip' | 'success';

export type HattrickPageType =
  | 'home'
  | 'club_overview'
  | 'players_list'
  | 'player_detail'
  | 'training'
  | 'staff'
  | 'lineup'
  | 'matches'
  | 'arena'
  | 'economy'
  | 'youth_overview'
  | 'youth_players'
  | 'youth_training'
  | 'youth_matches'
  | 'transfer_search'
  | 'unknown';

export interface PlayerSkills {
  keeper: number;
  defending: number;
  playmaking: number;
  winger: number;
  passing: number;
  scoring: number;
  setPieces: number;
}

export interface ParsedSeniorPlayer {
  playerId: number;
  name: string;
  ageYears: number;
  ageDays: number;
  tsi: number;
  weeklyWageLocal: number;
  currencyLabel: string;
  specialty: SpecialtyType;
  form: number;
  stamina: number;
  experience: number;
  leadership: number;
  loyalty: number;
  skills: PlayerSkills;
  lastRating?: number;
  lastMatchPosition?: string;
}

export interface ParsedLineupData {
  formationText: string;
  formationExperienceText: string;
  formationExperienceLevel: number | null;
  keeperCount: number;
  defenderCount: number;
  innerMidfielderCount: number;
  wingerCount: number;
  forwardCount: number;
  totalStarters: number;
  attitude: 'normal' | 'pic' | 'mots' | 'unknown';
  tacticCode: string;
  tacticLabel: string;
}

export interface ParsedYouthSkill {
  current: number | null; // -1 or null if unknown
  maxPotential: number | null;
}

export interface ParsedYouthPlayer {
  youthId: number;
  name: string;
  ageYears: number;
  ageDays: number;
  eligibleNow: boolean;
  daysUntilPromotion: number;
  specialty: SpecialtyType;
  skills: Partial<Record<SkillKey, ParsedYouthSkill>>;
  highestKnownPotential: number;
}

export interface ParsedTrainingData {
  trainingCode: string;
  trainingLabel: string;
  mappedGoal: TrainingGoal | 'EXTENDED_DEF' | 'EXTENDED_WING' | 'EXTENDED_PASS' | 'SHOOTING' | 'SP';
  staminaSharePct: number;
  trainingIntensityPct: number;
  coachLevelFromPage?: number;
  assistantSumFromPage?: number;
  previewFull90Count: number;
  previewZeroCount: number;
  matchesCount: number;
}

export interface ParsedSpecialistsData {
  coachCount: number;
  coachLevel: number;
  coachWeeklyCostLocal: number;
  assistantCount: number;
  assistantSum: number;
  assistantWeeklyCostLocal: number;
  medicCount: number;
  medicLevel: number;
  medicWeeklyCostLocal: number;
  psychologistCount: number;
  psychologistLevel: number;
  psychologistWeeklyCostLocal: number;
  totalWeeklyCostLocal: number;
}

export interface ParsedFinancesData {
  currencyLabel: string;
  cashBalanceLocal: number;
  weeklyWagesLocal: number;
  staffExpensesLocal: number;
  youthExpensesLocal: number;
  arenaMaintenanceLocal: number;
  arenaConstructionLocal: number;
  interestLocal: number;
  sponsorIncomeLocal: number;
  totalIncomeLocal: number;
  totalExpensesLocal: number;
  expectedWeeklyNetLocal: number;
  twoWeekBalanceLocal: number;
}

export interface ParsedStadiumData {
  stadiumId: number;
  totalCapacity: number;
  terraces: number;
  basic: number;
  roof: number;
  vip: number;
  underConstruction: boolean;
  recentHomeAttendances: number[];
}

export interface ParsedMatchesData {
  midweekBookedThisWeek: boolean;
  upcomingMatchLabels: string[];
}

export interface ClubRecord {
  clubId: number;
  clubName: string;
  leagueCountry: string;
  currencyCode: string;
  currencyRateToEuro: number;
  trainingFocusGoal: TrainingGoal;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerSnapshotRecord {
  id?: number;
  clubId: number;
  playerId: number;
  htSeason: number;
  htWeek: number;
  capturedAt: number;
  name: string;
  ageYears: number;
  ageDays: number;
  specialty: SpecialtyType;
  tsi: number;
  weeklyWageBase: number;
  form: number;
  stamina: number;
  experience: number;
  leadership: number;
  skills: PlayerSkills;
}

export interface ObservedMatchRecord {
  matchId: number;
  clubId: number;
  matchType: 'league' | 'cup' | 'friendly' | 'qualifier' | 'other';
  matchDateIso: string;
  htSeason: number;
  htWeek: number;
  isHomeMatch: boolean;
  weather: 'sunny' | 'partly_cloudy' | 'overcast' | 'rainy' | 'unknown';
  attendanceTotal?: number;
  arenaCapacityAtTime?: number;
  attitude?: 'normal' | 'pic' | 'mots' | 'unknown';
  formationUsed?: string;
  playerMinutes: Array<{
    playerId: number;
    positionSlot: string;
    minutesPlayed: number;
  }>;
}

export interface WeeklyAuditRecord {
  id: string;
  clubId: number;
  htSeason: number;
  htWeek: number;
  cashBalanceBase: number;
  weeklyWageTotalBase: number;
  sponsorIncomeBase: number;
  headCoachLevel: number;
  headCoachLeadership: number;
  assistantLevelsSum: number;
  medicLevel: number;
  trainingType: TrainingGoal;
  trainingIntensityPct: number;
  staminaSharePct: number;
  friendlyBooked: boolean;
  youthAcademyEnabled: boolean;
  youthScoutsCount: 0 | 1 | 2 | 3;
  youthFriendlyDaysSinceLast: number;
  updatedAt: number;
}

export interface YouthProspectRecord {
  youthId: number;
  clubId: number;
  name: string;
  ageYears: number;
  ageDays: number;
  daysInAcademy: number;
  specialty: SpecialtyType;
  skillsKnown: Partial<Record<SkillKey, { current?: number; maxPotential?: number }>>;
  lastUpdatedAt: number;
}

export interface DiagnosticItem {
  id: string;
  category: 'survival' | 'training' | 'staff' | 'tactics' | 'youth' | 'stadium' | 'market';
  severity: Severity;
  title: string;
  reason: string;
  actionHint: string;
  targetRoute?: string;
}

export interface AutoSyncedSummary {
  ownTeamId?: number;
  clubName?: string;
  currencyLabel?: string;
  currencyPerEuro?: number;
  squadCount?: number;
  highAgePlayerCount?: number;
  lowStaminaStarterCount?: number;
  trainingCode?: string;
  trainingLabel?: string;
  previewFull90Count?: number;
  previewZeroCount?: number;
  psychologistLevel?: number;
  staffWeeklyCostLocal?: number;
  playerWagesWeeklyLocal?: number;
  youthExpensesWeeklyLocal?: number;
  interestWeeklyLocal?: number;
  twoWeekBalanceLocal?: number;
  stadiumUnderConstruction?: boolean;
  stadiumCapacity?: number;
  stadiumLayout?: { terraces: number; basic: number; roof: number; vip: number };
  bestCaptain?: { id: number; name: string; experience: number; leadership: number; teamXpScore: number };
  squadRoster?: CompactSquadPlayer[];
  lineupSnapshot?: ParsedLineupData;
  snapshotCountTotal?: number;
  youthCount?: number;
  youthPromotableNames?: string[];
  youthTopProspects?: Array<{ name: string; ageLabel: string; maxPotential: number }>;
  syncedPages: Partial<Record<HattrickPageType, number>>;
}

export interface CompactSquadPlayer {
  playerId: number;
  name: string;
  ageYears: number;
  stamina: number;
  form: number;
  specialty: SpecialtyType;
  skills: PlayerSkills;
}

export interface LineupSlotRecommendation {
  slotId: number;
  roleZh: string;
  playerId: number;
  playerName: string;
  shortName: string;
  reason: string;
  isTraineeSlot: boolean;
}

export interface ManualRookieState {
  newbieLicenseDone: boolean;
  trainingGoal: TrainingGoal;
  trainingIntensityPct: number;
  staminaSharePct: number;
  seniorFriendlyBookedThisWeek: boolean;
  headCoachLevel: number;
  assistantSum: number;
  medicLevel: number;
  weeklyCashEuro: number;
  weeklyNetBalanceEuro: number;
  youthAcademyActive: boolean;
  youthScoutsCount: 0 | 1 | 2 | 3;
  daysSinceLastYouthFriendly: number;
  recentSunnyHomeFullCount: number;
  autoSynced?: AutoSyncedSummary;
}

export interface UserSettings {
  language: 'zh-CN' | 'en';
  foxtrickDetectedMode: 'auto' | 'force_standalone' | 'force_coexist';
  drawerCollapsed: boolean;
  showInPageGuides: boolean;
  activeTab: 'guide' | 'advisor' | 'checklist' | 'calculators' | 'capture';
  manualState: ManualRookieState;
  presetBackup?: ManualRookieState | null;
  activePresetLabel?: string | null;
}
