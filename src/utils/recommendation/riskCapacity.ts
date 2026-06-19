/**
 * Multi-factor risk derivation — combines ALL available profile signals
 * instead of relying on a single question (market_reaction).
 *
 * Factors:
 *   - Market reaction (risk attitude): 30%
 *   - Life stage (capacity): 20%
 *   - Emergency fund (liquidity buffer): 15%
 *   - Existing investments (experience): 15%
 *   - Dependents indicator (responsibility): 10%
 *   - Investment horizon (time to recover): 10%
 */
export function deriveRiskFromProfile(profile: {
  market_reaction?: string | null;
  investor_stage?: string | null;
  emergency_fund?: string | null;
  existing_investments?: string | null;
  investment_horizon?: string | null;
  dependents?: number | null;
  primary_goal?: string | null;
}): { riskTolerance: string; score: number; reasons: string[] } {
  let totalScore = 0;
  const reasons: string[] = [];

  // 1. Market reaction (30%) — revealed risk attitude
  const reactionScores: Record<string, number> = {
    withdraw: 1, wait: 3, invest_more: 5,
  };
  const reaction = profile.market_reaction || '';
  const reactionScore = reactionScores[reaction] ?? 3;
  totalScore += reactionScore * 0.30;
  if (reaction === 'withdraw') reasons.push('You prefer to cut losses quickly — conservative positioning');
  if (reaction === 'invest_more') reasons.push('You see dips as buying opportunities — higher risk capacity');

  // 2. Life stage (20%) — financial capacity and responsibilities
  const stageScores: Record<string, number> = {
    student: 3, early_career: 4, mid_career: 3,
    business_owner: 4, retired: 1,
  };
  const stage = profile.investor_stage || '';
  const stageScore = stageScores[stage] ?? 3;
  totalScore += stageScore * 0.20;
  if (stage === 'retired') reasons.push('Retired — capital preservation prioritized');

  // 3. Emergency fund (15%) — liquidity buffer for risk
  const emergencyScores: Record<string, number> = {
    '<3_months': 1, '3_6_months': 3, '>6_months': 5,
  };
  const emergency = profile.emergency_fund || '';
  const emergencyScore = emergencyScores[emergency] ?? 3;
  totalScore += emergencyScore * 0.15;
  if (emergency === '<3_months') reasons.push('Limited emergency savings limits risk capacity');

  // 4. Existing investments (15%) — portfolio experience
  const existingScores: Record<string, number> = {
    none: 1, under_5l: 2, '5l_25l': 3, '25l_plus': 5,
  };
  const existing = profile.existing_investments || '';
  const existingScore = existingScores[existing] ?? 2;
  totalScore += existingScore * 0.15;
  if (existingScore >= 4) reasons.push('Significant existing portfolio supports higher risk');

  // 5. Dependents (10%) — financial responsibility
  const deps = profile.dependents ?? 0;
  const depScore = deps > 2 ? 1 : deps > 0 ? 3 : 5;
  totalScore += depScore * 0.10;

  // 6. Investment horizon (10%) — recovery time
  const horizonScores: Record<string, number> = {
    short: 1, medium: 3, long: 5,
  };
  const horizon = profile.investment_horizon || '';
  const horizonScore = horizonScores[horizon] ?? 3;
  totalScore += horizonScore * 0.10;

  // Convert to 1-5 scale
  const finalScore = Math.max(1, Math.min(5, Math.round(totalScore)));

  // Map to risk level
  let riskTolerance: string;
  if (finalScore <= 2) {
    riskTolerance = 'conservative';
    reasons.push('Overall: Conservative profile — prioritize capital safety');
  } else if (finalScore <= 3.5) {
    riskTolerance = 'moderate';
    reasons.push('Overall: Moderate profile — balanced growth and stability');
  } else {
    riskTolerance = 'aggressive';
    reasons.push('Overall: Aggressive profile — pursuing maximum long-term growth');
  }

  // Goal-based risk cap: primary_goal overrides the raw score when
  // the goal demands lower risk than the user's financial capacity alone suggests.
  const goal = profile.primary_goal || '';
  if (goal === 'retirement' && (riskTolerance === 'aggressive')) {
    riskTolerance = 'moderate';
    reasons.push('Risk capped at moderate: retirement goal prioritizes stability over growth');
  }
  if (goal === 'capital_preservation' && (riskTolerance === 'aggressive' || riskTolerance === 'moderate')) {
    riskTolerance = 'conservative';
    reasons.push('Risk capped at conservative: capital preservation goal protects principal');
  }

  return { riskTolerance, score: finalScore, reasons };
}
