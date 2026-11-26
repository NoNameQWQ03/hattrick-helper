import { useState } from 'preact/hooks';
import {
  TRAINING_PATH_PROFILES,
  recommendTrainingPath,
} from '../../../core/rules/training-advisor';
import type { ManualRookieState, TrainingGoal } from '../../../core/types/domain';

interface AdvisorTabProps {
  manualState: ManualRookieState;
  onSelectTrainingGoal: (goal: TrainingGoal) => void;
}

export function AdvisorTab({ manualState, onSelectTrainingGoal }: AdvisorTabProps) {
  const [preference, setPreference] = useState<'fast_cash' | 'balanced_league' | 'long_term_cycle'>(
    'fast_cash'
  );

  const recommendation = recommendTrainingPath({
    weeklyCashEuro: manualState.weeklyCashEuro,
    weeklyNetBalanceEuro: manualState.weeklyNetBalanceEuro,
    youthAcademyActive: manualState.youthAcademyActive,
    preference,
  });

  return (
    <>
      <div class="htrc-card">
        <h4>开局训练路线诊断向导</h4>
        <div class="htrc-muted" style={{ marginBottom: '8px' }}>
          你已开启青训营（YA）且尚未锁死主训方向。选定一种风格，查看最适合新手的路线：
        </div>
        <div class="htrc-field" style={{ marginBottom: '8px' }}>
          <label>你的当前诉求偏好</label>
          <select
            value={preference}
            onChange={(e) =>
              setPreference(
                (e.currentTarget.value as 'fast_cash' | 'balanced_league' | 'long_term_cycle')
              )
            }
          >
            <option value="fast_cash">快速回笼资金 + 养得起青训营（最稳妥）</option>
            <option value="balanced_league">联赛控球赢球体验均衡</option>
            <option value="long_term_cycle">多苗子长线滚雪球（10个训练位）</option>
          </select>
        </div>

        <div class="htrc-alert tip">
          <div class="htrc-alert-title">首选推荐：{recommendation.primaryPick.nameZh}</div>
          <div style={{ fontSize: '12px', marginBottom: '6px' }}>{recommendation.summaryReason}</div>
          <div class="htrc-muted">备选推荐：{recommendation.runnerUp.nameZh}</div>
        </div>
      </div>

      {TRAINING_PATH_PROFILES.map((profile) => {
        const isSelected = manualState.trainingGoal === profile.goal;
        return (
          <div key={profile.goal} class="htrc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h4 style={{ margin: 0 }}>{profile.nameZh}</h4>
              <span class="htrc-tag">新手适配 {'★'.repeat(profile.rookieFitScore)}</span>
            </div>
            <div class="htrc-muted" style={{ marginBottom: '4px' }}>
              训练位：{profile.traineeSlotsPerWeek}
            </div>
            <div class="htrc-muted" style={{ marginBottom: '4px' }}>
              17岁速度：{profile.weeklySpeed17yo} · 阵型：{profile.typicalFormations.join(' / ')}
            </div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>{profile.whyChoose}</div>
            <div style={{ fontSize: '11.5px', color: '#9a5806', fontWeight: 600, marginBottom: '4px' }}>
              避坑：{profile.watchOut}
            </div>
            <div style={{ fontSize: '11.5px', color: '#1f5e16', fontWeight: 600, marginBottom: '8px' }}>
              青训联动：{profile.yaSynergyTip}
            </div>
            <button
              class={isSelected ? 'htrc-btn secondary' : 'htrc-btn'}
              onClick={() => onSelectTrainingGoal(profile.goal)}
            >
              {isSelected ? '✓ 已锁定为当前主训目标' : `锁定 ${profile.goal} 为主训方向`}
            </button>
          </div>
        );
      })}
    </>
  );
}
