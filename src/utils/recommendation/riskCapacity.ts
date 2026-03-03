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
