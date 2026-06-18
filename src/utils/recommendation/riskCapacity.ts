/**
 * CIFRAA Risk Capacity Engine
 *
 * Computes a risk capacity score (1–5) based on extended user profile.
 * Final risk = MIN(user selected risk, capacity).
 */

export interface RiskCapacityInputs {
  occupation?: string | null;
  incomeStability?: string | null;
  monthlyEmis?: number | null;
  dependents?: number | null;
  hasInsurance?: boolean | null;
  existingInvestments?: string | null;
}

export interface RiskCapacityResult {
  capacityScore: number; // 1-5
  capacityLabel: string;
  adjustedRiskLevel: string; // conservative | moderate | aggressive
  wasAdjusted: boolean;
  reasons: string[];
}

const OCCUPATION_SCORES: Record<string, number> = {
  salaried: 4,
  business_owner: 3,
  freelancer: 2,
  student: 1,
  retired: 2,
  homemaker: 1,
};

const INCOME_STABILITY_SCORES: Record<string, number> = {
  very_stable: 5,
  stable: 4,
  moderate: 3,
  variable: 2,
  unstable: 1,
};

const EXISTING_INVESTMENT_SCORES: Record<string, number> = {
  none: 1,
  fd_only: 2,
  mixed: 3,
  diversified: 4,
  advanced: 5,
};

const RISK_LEVEL_TO_NUMERIC: Record<string, number> = {
  conservative: 2,
  moderate: 3,
  aggressive: 5,
};

const NUMERIC_TO_RISK_LEVEL: [number, string][] = [
  [2, 'conservative'],
  [3.5, 'moderate'],
  [5, 'aggressive'],
];

function numericToRiskLevel(score: number): string {
  if (score <= 2) return 'conservative';
  if (score <= 3.5) return 'moderate';
  return 'aggressive';
}

export function computeRiskCapacity(
  inputs: RiskCapacityInputs,
  selectedRisk: string,
): RiskCapacityResult {
  const reasons: string[] = [];
  let totalScore = 0;
  let factors = 0;

  // Occupation (weight: 20%)
  const occScore = OCCUPATION_SCORES[inputs.occupation || ''] ?? 3;
  totalScore += occScore * 0.20;
  factors++;
  if (occScore <= 2) reasons.push('Income source limits risk capacity');

  // Income stability (weight: 25%)
  const incScore = INCOME_STABILITY_SCORES[inputs.incomeStability || ''] ?? 3;
  totalScore += incScore * 0.25;
  factors++;
  if (incScore <= 2) reasons.push('Variable income suggests lower risk tolerance');

  // EMIs (weight: 15%)
  const emis = inputs.monthlyEmis ?? 0;
  const emiScore = emis > 50000 ? 1 : emis > 20000 ? 2 : emis > 5000 ? 3 : emis > 0 ? 4 : 5;
  totalScore += emiScore * 0.15;
  factors++;
  if (emiScore <= 2) reasons.push('High EMI obligations reduce investable surplus');

  // Dependents (weight: 15%)
  const deps = inputs.dependents ?? 0;
  const depScore = deps > 4 ? 1 : deps > 2 ? 2 : deps > 0 ? 3 : 5;
  totalScore += depScore * 0.15;
  factors++;
  if (deps > 2) reasons.push('Multiple dependents require conservative allocation');

  // Insurance (weight: 10%)
  const insScore = inputs.hasInsurance ? 5 : 1;
  totalScore += insScore * 0.10;
  factors++;
  if (!inputs.hasInsurance) reasons.push('No insurance coverage — protect capital first');

  // Existing investments (weight: 15%)
  const invScore = EXISTING_INVESTMENT_SCORES[inputs.existingInvestments || ''] ?? 2;
  totalScore += invScore * 0.15;
  factors++;
  if (invScore >= 4) reasons.push('Diversified portfolio supports higher risk');

  // Normalize to 1-5
  const rawCapacity = Math.round(totalScore * 10) / 10;
  const capacityScore = Math.max(1, Math.min(5, Math.round(rawCapacity)));

  // Determine capacity-based risk level
  const capacityRiskLevel = numericToRiskLevel(capacityScore);

  // Final risk = MIN(selected, capacity)
  const selectedNumeric = RISK_LEVEL_TO_NUMERIC[selectedRisk] ?? 3;
  const capacityNumeric = capacityScore;
  const finalNumeric = Math.min(selectedNumeric, capacityNumeric);
  const adjustedRiskLevel = numericToRiskLevel(finalNumeric);
  const wasAdjusted = adjustedRiskLevel !== selectedRisk;

  if (wasAdjusted) {
    reasons.push(`Risk adjusted from ${selectedRisk} to ${adjustedRiskLevel} based on your financial profile`);
  }

  const capacityLabels = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];

  return {
    capacityScore,
    capacityLabel: capacityLabels[capacityScore - 1] || 'Moderate',
    adjustedRiskLevel,
    wasAdjusted,
    reasons,
  };
}

/** Equity allocation based on final risk score */
export function getEquityAllocation(riskScore: number): number {
  switch (riskScore) {
    case 1: return 20;
    case 2: return 35;
    case 3: return 60;
    case 4: return 80;
    case 5: return 95;
    default: return 60;
  }
}

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

  return { riskTolerance, score: finalScore, reasons };
}
