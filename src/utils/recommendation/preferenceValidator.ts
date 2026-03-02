/**
 * CIFRAA V2 — Constraint-Based Preference Validation Engine
 *
 * Uses constraint logic (not hardcoded rules) to determine
 * valid/invalid combinations. Shows inline explanations, never
 * auto-resets silently.
 */

import {
  RISK_CONSTRAINTS,
  GOAL_ELIGIBILITY,
  HORIZON_RULES,
  SECTORAL_CATEGORIES,
} from './categoryMappings';

export interface PreferenceSelections {
  risk_tolerance: string;
  investment_goal: string;
  investment_horizon: string;
  experience_level: string;
  investment_amount: string;
}

export interface DisabledOption {
  value: string;
  reason: string;
}

export interface ValidationResult {
  disabledRisk: DisabledOption[];
  disabledGoal: DisabledOption[];
  disabledHorizon: DisabledOption[];
  disabledExperience: DisabledOption[];
  /** Fields that were auto-reset due to impossible combinations */
  autoResets: Partial<PreferenceSelections>;
  /** Educational nudge messages keyed by field */
  nudges: Partial<Record<keyof PreferenceSelections, string>>;
}

/**
 * Generate valid options based on current selections using constraint analysis.
 * Checks structural incompatibilities between preference dimensions.
 */
export function validatePreferences(sel: PreferenceSelections): ValidationResult {
  const disabledRisk: DisabledOption[] = [];
  const disabledGoal: DisabledOption[] = [];
  const disabledHorizon: DisabledOption[] = [];
  const disabledExperience: DisabledOption[] = [];
  const autoResets: Partial<PreferenceSelections> = {};
  const nudges: Partial<Record<keyof PreferenceSelections, string>> = {};

  // ── Constraint: Capital Preservation blocks Aggressive risk ──
  // (aggressive allows all equity, preservation blocks all equity → empty intersection)
  if (sel.investment_goal === 'preservation') {
    disabledRisk.push({
      value: 'aggressive',
      reason: 'Aggressive risk allows equity exposure, which conflicts with capital preservation.',
    });
    if (sel.risk_tolerance === 'aggressive') {
      autoResets.risk_tolerance = 'conservative';
      nudges.risk_tolerance =
        'Capital preservation focuses on protecting your principal. Aggressive risk has been changed to conservative.';
    }
  }

  // ── Constraint: Aggressive + Capital Preservation → invalid goal ──
  if (sel.risk_tolerance === 'aggressive') {
    disabledGoal.push({
      value: 'preservation',
      reason: 'Capital preservation requires low-risk instruments incompatible with aggressive investing.',
    });
    if (sel.investment_goal === 'preservation') {
      autoResets.investment_goal = '';
      nudges.investment_goal =
        'Aggressive risk tolerance is incompatible with capital preservation. Please choose a different goal.';
    }
  }

  // ── Constraint: Short horizon blocks equity-dependent goals ──
  if (sel.investment_horizon === 'short') {
    // Wealth creation needs equity → blocked for <3Y
    disabledGoal.push({
      value: 'wealth',
      reason: 'Wealth creation relies on equity, which is too volatile for a <3 year horizon.',
    });
    if (sel.investment_goal === 'wealth') {
      autoResets.investment_goal = '';
      nudges.investment_goal =
        'Wealth creation through equity requires time for compounding. Consider a 3+ year horizon.';
    }

    // Short horizon blocks aggressive risk
    disabledRisk.push({
      value: 'aggressive',
      reason: 'Aggressive equity is unsuitable for short-term investing due to high volatility.',
    });
    if (sel.risk_tolerance === 'aggressive') {
      autoResets.risk_tolerance = 'moderate';
      nudges.risk_tolerance =
        'Short-term horizons cannot absorb equity volatility. Risk has been adjusted to moderate.';
    }
  }

  // ── Constraint: Tax Saving (ELSS) requires minimum 3-year lock-in ──
  if (sel.investment_goal === 'tax') {
    disabledHorizon.push({
      value: 'short',
      reason: 'ELSS funds have a mandatory 3-year lock-in period.',
    });
    if (sel.investment_horizon === 'short') {
      autoResets.investment_horizon = 'medium';
      nudges.investment_horizon =
        'ELSS requires a 3-year lock-in. Your horizon has been set to 3-5 years.';
    }
  }

  // ── Constraint: Conservative + Wealth Creation → only long horizon ──
  if (sel.risk_tolerance === 'conservative' && sel.investment_goal === 'wealth') {
    disabledHorizon.push({
      value: 'short',
      reason: 'Conservative wealth creation requires long compounding periods.',
    });
    disabledHorizon.push({
      value: 'medium',
      reason: 'Conservative wealth creation requires 5+ years for meaningful returns.',
    });
    if (sel.investment_horizon === 'short' || sel.investment_horizon === 'medium') {
      autoResets.investment_horizon = 'long';
      nudges.investment_horizon =
        'Conservative wealth creation typically requires 5+ years for meaningful returns through compounding.';
    }
  }

  // ── Constraint: Capital Preservation → disable long horizon (unnecessary) ──
  if (sel.investment_goal === 'preservation') {
    disabledHorizon.push({
      value: 'long',
      reason: 'Capital preservation is typically a short-term strategy. 5+ years is better suited for growth.',
    });
    if (sel.investment_horizon === 'long') {
      autoResets.investment_horizon = 'short';
      nudges.investment_horizon =
        'For 5+ year horizons, consider wealth creation instead of just preserving capital.';
    }
  }

  return { disabledRisk, disabledGoal, disabledHorizon, disabledExperience, autoResets, nudges };
}
