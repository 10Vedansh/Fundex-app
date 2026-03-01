/**
 * Preference Conflict Validation Engine
 *
 * Returns which options should be disabled for each preference dimension
 * based on the current selections. Also auto-resets conflicting values.
 */

export interface PreferenceSelections {
  risk_tolerance: string;
  investment_goal: string;
  investment_horizon: string;
  experience_level: string;
  investment_amount: string;
}

export interface ValidationResult {
  disabledRisk: string[];
  disabledGoal: string[];
  disabledHorizon: string[];
  disabledExperience: string[];
  /** Fields that were auto-reset due to conflicts */
  autoResets: Partial<PreferenceSelections>;
  /** Educational nudge messages keyed by field */
  nudges: Partial<Record<keyof PreferenceSelections, string>>;
}

export function validatePreferences(sel: PreferenceSelections): ValidationResult {
  const disabledRisk: string[] = [];
  const disabledGoal: string[] = [];
  const disabledHorizon: string[] = [];
  const disabledExperience: string[] = [];
  const autoResets: Partial<PreferenceSelections> = {};
  const nudges: Partial<Record<keyof PreferenceSelections, string>> = {};

  // ── Rule 1: Conservative + Wealth Creation → only 5+ Years allowed ──
  if (sel.risk_tolerance === 'conservative' && sel.investment_goal === 'wealth') {
    disabledHorizon.push('short', 'medium');
    if (sel.investment_horizon === 'short' || sel.investment_horizon === 'medium') {
      autoResets.investment_horizon = 'long';
    }
    nudges.investment_horizon =
      'Conservative wealth creation typically requires a longer horizon (5+ years) to achieve meaningful returns through compounding.';
  }

  // ── Rule 2: Tax Saving → disable <3 Years ──
  if (sel.investment_goal === 'tax') {
    disabledHorizon.push('short');
    if (sel.investment_horizon === 'short') {
      autoResets.investment_horizon = 'medium';
    }
    nudges.investment_horizon =
      'ELSS funds have a mandatory 3-year lock-in. Short-term horizon is not applicable.';
  }

  // ── Rule 3: Capital Preservation → disable Aggressive risk & 5+ Years ──
  if (sel.investment_goal === 'preservation') {
    disabledRisk.push('aggressive');
    disabledHorizon.push('long');
    if (sel.risk_tolerance === 'aggressive') {
      autoResets.risk_tolerance = 'conservative';
    }
    if (sel.investment_horizon === 'long') {
      autoResets.investment_horizon = 'short';
    }
    nudges.risk_tolerance =
      'Capital preservation focuses on protecting your principal. Aggressive risk exposure contradicts this goal.';
  }

  // ── Rule 4: Aggressive + Capital Preservation → invalid, auto-reset goal ──
  if (sel.risk_tolerance === 'aggressive' && sel.investment_goal === 'preservation') {
    autoResets.investment_goal = '';
    disabledGoal.push('preservation');
    nudges.investment_goal =
      'Aggressive risk tolerance is incompatible with capital preservation. Please choose a different goal.';
  }

  // ── Rule 5: Wealth Creation + <3 Years → disable ──
  if (sel.investment_goal === 'wealth') {
    disabledHorizon.push('short');
    if (sel.investment_horizon === 'short') {
      autoResets.investment_horizon = 'medium';
    }
    if (sel.investment_horizon === 'short') {
      nudges.investment_horizon =
        'Wealth creation through equity requires time for compounding. A 3+ year horizon is recommended.';
    }
  }

  return { disabledRisk, disabledGoal, disabledHorizon, disabledExperience, autoResets, nudges };
}
