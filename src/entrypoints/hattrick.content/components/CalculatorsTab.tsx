import { useEffect, useState } from 'preact/hooks';
import { SKILL_LEVELS } from '../../../core/i18n/skills';
import {
  calculateStadiumExpansion,
  calculateStaminaFactor,
  calculateYouthPromotionStatus,
  estimateTrainingWeeksPerLevel,
} from '../../../core/math/formulas';
import type { ManualRookieState, TrainingGoal } from '../../../core/types/domain';

interface CalculatorsTabProps {
  manualState: ManualRookieState;
}

export function CalculatorsTab({ manualState }: CalculatorsTabProps) {
  // 1. 训练周数估算
  const [trainSkillType, setTrainSkillType] = useState<Exclude<TrainingGoal, 'UNSET'>>(
    manualState.trainingGoal === 'UNSET' ? 'GK' : manualState.trainingGoal
  );
  const [skillLevel, setSkillLevel] = useState(6);
  const [playerAge, setPlayerAge] = useState(17);

  const trainEst = estimateTrainingWeeksPerLevel({
    trainingType: trainSkillType,
    currentSkillLevel: skillLevel,
    ageYears: playerAge,
    coachLevel: manualState.headCoachLevel,
    assistantSum: manualState.assistantSum,
    staminaSharePct: manualState.staminaSharePct,
    intensityPct: manualState.trainingIntensityPct,
  });

  // 2. 青训提拔倒计时
  const [yAgeYears, setYAgeYears] = useState(16);
  const [yAgeDays, setYAgeDays] = useState(80);
  const [yStayDays, setYStayDays] = useState(90);
  const promoCheck = calculateYouthPromotionStatus(yAgeYears, yAgeDays, yStayDays);

  // 3. 球场 63/25/10/2 扩建计算（若已同步球场页则自动预填当前看台数据）
  const syncedLayout = manualState.autoSynced?.stadiumLayout;
  const [curT, setCurT] = useState(syncedLayout?.terraces ?? 8000);
  const [curB, setCurB] = useState(syncedLayout?.basic ?? 3000);
  const [curR, setCurR] = useState(syncedLayout?.roof ?? 1000);
  const [curV, setCurV] = useState(syncedLayout?.vip ?? 0);
  const syncedTotal = syncedLayout
    ? syncedLayout.terraces + syncedLayout.basic + syncedLayout.roof + syncedLayout.vip
    : 12000;
  const [targetCap, setTargetCap] = useState(Math.max(18000, syncedTotal + 3000));

  useEffect(() => {
    if (!syncedLayout) return;
    setCurT(syncedLayout.terraces);
    setCurB(syncedLayout.basic);
    setCurR(syncedLayout.roof);
    setCurV(syncedLayout.vip);
    const total = syncedLayout.terraces + syncedLayout.basic + syncedLayout.roof + syncedLayout.vip;
    setTargetCap(total + 3000);
  }, [
    syncedLayout?.terraces,
    syncedLayout?.basic,
    syncedLayout?.roof,
    syncedLayout?.vip,
  ]);

  const arenaPlan = calculateStadiumExpansion(
    { terraces: curT, basic: curB, roof: curR, vip: curV },
    targetCap
  );

  // 4. 体力续航参考
  const [staminaLv, setStaminaLv] = useState(6);
  const staminaPct = Math.round(calculateStaminaFactor(staminaLv) * 100);
  const auto = manualState.autoSynced;

  return (
    <>
      <div class="htrc-card">
        <h4>1. 训练升星周数预估（基于 1–5 级教练配置）</h4>
        <div class="htrc-field-grid">
          <label class="htrc-field">
            <span>训练类型</span>
            <select
              value={trainSkillType}
              onChange={(e) =>
                setTrainSkillType(e.currentTarget.value as Exclude<TrainingGoal, 'UNSET'>)
              }
            >
              <option value="GK">守门员 (GK)</option>
              <option value="DEF">防守 (DEF)</option>
              <option value="WING">边锋 (WING)</option>
              <option value="PM">组织 (PM)</option>
              <option value="SCOR">进球 (SCOR)</option>
              <option value="PASS">传球 (PASS)</option>
            </select>
          </label>
          <label class="htrc-field">
            <span>球员年龄（岁）</span>
            <input
              type="number"
              min={17}
              max={32}
              value={playerAge}
              onInput={(e) => setPlayerAge(Number(e.currentTarget.value) || 17)}
            />
          </label>
          <label class="htrc-field">
            <span>当前技能等级</span>
            <input
              type="number"
              min={1}
              max={18}
              value={skillLevel}
              onInput={(e) => setSkillLevel(Number(e.currentTarget.value) || 6)}
            />
          </label>
          <div class="htrc-field">
            <span>预计升一级耗时</span>
            <div style={{ fontWeight: 700, color: '#1e5c15', paddingTop: '5px' }}>
              约 {trainEst.minWeeks} – {trainEst.maxWeeks} 周
            </div>
          </div>
        </div>
        <div class="htrc-muted" style={{ marginTop: '6px' }}>{trainEst.efficiencyNote}</div>
      </div>

      <div class="htrc-card">
        <h4>2. 青训提拔窗口计算（17岁0天 且 满112天）</h4>
        <div class="htrc-field-grid">
          <label class="htrc-field">
            <span>青训年龄（岁）</span>
            <input
              type="number"
              min={15}
              max={19}
              value={yAgeYears}
              onInput={(e) => setYAgeYears(Number(e.currentTarget.value) || 16)}
            />
          </label>
          <label class="htrc-field">
            <span>青训年龄（天 0–111）</span>
            <input
              type="number"
              min={0}
              max={111}
              value={yAgeDays}
              onInput={(e) => setYAgeDays(Number(e.currentTarget.value) || 0)}
            />
          </label>
          <label class="htrc-field">
            <span>已入营天数</span>
            <input
              type="number"
              min={0}
              max={400}
              value={yStayDays}
              onInput={(e) => setYStayDays(Number(e.currentTarget.value) || 0)}
            />
          </label>
          <div class="htrc-field">
            <span>距离可提拔一线队</span>
            <div style={{ fontWeight: 700, color: promoCheck.eligibleNow ? '#1e5c15' : '#9a5806', paddingTop: '5px' }}>
              {promoCheck.eligibleNow ? '已满足，可立即提拔！' : `还差 ${promoCheck.daysRemaining} 天`}
            </div>
          </div>
        </div>
      </div>

      <div class="htrc-card">
        <h4>3. 球场扩建 63/25/10/2 施工计算器</h4>
        <div class="htrc-field-grid">
          <label class="htrc-field">
            <span>现有站席 (63%)</span>
            <input type="number" value={curT} onInput={(e) => setCurT(Number(e.currentTarget.value) || 0)} />
          </label>
          <label class="htrc-field">
            <span>现有普通席 (25%)</span>
            <input type="number" value={curB} onInput={(e) => setCurB(Number(e.currentTarget.value) || 0)} />
          </label>
          <label class="htrc-field">
            <span>现有有顶席 (10%)</span>
            <input type="number" value={curR} onInput={(e) => setCurR(Number(e.currentTarget.value) || 0)} />
          </label>
          <label class="htrc-field">
            <span>现有VIP包厢 (2%)</span>
            <input type="number" value={curV} onInput={(e) => setCurV(Number(e.currentTarget.value) || 0)} />
          </label>
          <label class="htrc-field">
            <span>目标总容量（当前 {arenaPlan.currentTotal}）</span>
            <input
              type="number"
              value={targetCap}
              onInput={(e) => setTargetCap(Number(e.currentTarget.value) || arenaPlan.currentTotal)}
            />
          </label>
          <div class="htrc-field">
            <span>总需新增座位</span>
            <div style={{ fontWeight: 700, color: '#1d4ed8', paddingTop: '5px' }}>
              +{arenaPlan.totalAddedSeats} 座
            </div>
          </div>
        </div>
        <div class="htrc-muted" style={{ marginTop: '6px' }}>
          建议施工增量：站席 +{arenaPlan.deltaToAdd.terraces} / 普通 +{arenaPlan.deltaToAdd.basic} / 有顶 +
          {arenaPlan.deltaToAdd.roof} / VIP +{arenaPlan.deltaToAdd.vip}
        </div>
      </div>

      <div class="htrc-card">
        <h4>4. 球员体力续航系数 & 0–20 技能速查表</h4>
        <div class="htrc-field" style={{ marginBottom: '8px' }}>
          <span>输入体力等级 (1–9) 查看比赛续航表现因子</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min={1}
              max={9}
              value={staminaLv}
              onInput={(e) => setStaminaLv(Number(e.currentTarget.value) || 6)}
              style={{ width: '70px' }}
            />
            <span>
              续航系数：<strong>{staminaPct}%</strong>
              {staminaLv < 6 ? '（偏低，下半场易滑坡）' : '（较稳健）'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
          {SKILL_LEVELS.map((s) => (
            <div key={s.level} class="htrc-skill-row">
              <span>
                <strong style={{ color: s.colorHex }}>{s.level}</strong> {s.zhCN}
              </span>
              <span class="htrc-muted">{s.en}</span>
            </div>
          ))}
        </div>
      </div>

      <div class="htrc-card">
        <h4>5. 队长推荐 &amp; 跨周成长快照统计</h4>
        <div class="htrc-muted">
          最佳队长人选：
          <strong>
            {auto?.bestCaptain
              ? `${auto.bestCaptain.name}（经验 ${auto.bestCaptain.experience} / 领导力 ${auto.bestCaptain.leadership}）`
              : '访问一次「一线队球员」页面自动算得'}
          </strong>
        </div>
        <div class="htrc-muted" style={{ marginTop: '4px' }}>
          已留存球员成长快照：<strong>{auto?.snapshotCountTotal ?? 0} 条</strong>（每周自动对比 TSI 与升星变化）
        </div>
      </div>
    </>
  );
}
