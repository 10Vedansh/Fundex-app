// ─── Types ───

export interface ProfileState {
  investor_stage?: string | null;
  primary_goal?: string | null;
  investment_horizon?: string | null;
  market_reaction?: string | null;
  experience_level?: string | null;
  existing_investments?: string | null;
  emergency_fund?: string | null;
}

export interface OptionState {
  value: string;
  enabled: boolean;
  reasons: string[];
}

export type EngineField = 'riskTolerance' | 'investmentGoal' | 'horizon' | 'experience';

export type ConstraintResult = Record<EngineField, OptionState[]>;

export interface ValidationError {
  engineField: EngineField;
  value: string;
  reason: string;
}

// ─── Engine field definitions ───

interface EngineFieldDef {
  sourceField: keyof ProfileState;
  values: string[];
  mapping: Record<string, string>;
}

export const ENGINE_FIELDS: Record<EngineField, EngineFieldDef> = {
  riskTolerance: {
    sourceField: 'market_reaction',
    values: ['conservative', 'moderate', 'aggressive'],
    mapping: { withdraw: 'conservative', wait: 'moderate', invest_more: 'aggressive' },
  },
  investmentGoal: {
    sourceField: 'primary_goal',
    values: ['wealth', 'income', 'tax', 'preservation'],
    mapping: {
      wealth_creation: 'wealth',
      retirement: 'wealth',
      child_education: 'wealth',
      passive_income: 'income',
      tax_saving: 'tax',
      capital_preservation: 'preservation',
    },
  },
  horizon: {
    sourceField: 'investment_horizon',
    values: ['short', 'medium', 'long'],
    mapping: { '<3': 'short', '3-5': 'medium', '5-10': 'long', '>10': 'long' },
  },
  experience: {
    sourceField: 'experience_level',
    values: ['beginner', 'intermediate', 'experienced'],
    mapping: {
      first_time: 'beginner',
      some_experience: 'intermediate',
      experienced: 'experienced',
    },
  },
};

// ─── Rules — single source of truth ───

interface Rule {
  condition: { field: keyof ProfileState; value: string };
  then: {
    engineField: EngineField;
    values: string[];
    reason: string;
    soft?: boolean;
  }[];
}

const RULES: Rule[] = [
  // ── Goal ──
  {
    condition: { field: 'primary_goal', value: 'capital_preservation' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Capital preservation goals conflict with aggressive risk exposure',
      },
    ],
  },
  {
    condition: { field: 'primary_goal', value: 'passive_income' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Aggressive growth allocations may not suit regular income needs',
        soft: true,
      },
    ],
  },

  // ── Horizon ──
  {
    condition: { field: 'investment_horizon', value: '<3' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Short horizons (<3 years) cannot tolerate aggressive volatility',
      },
      {
        engineField: 'investmentGoal',
        values: ['wealth'],
        reason: 'Wealth creation requires a longer time horizon (5+ years)',
      },
    ],
  },
  {
    condition: { field: 'investment_horizon', value: '3-5' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Medium-term horizons (3-5 years) have limited recovery time for aggressive losses',
        soft: true,
      },
    ],
  },

  // ── Experience ──
  {
    condition: { field: 'experience_level', value: 'first_time' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Aggressive risk is not recommended for first-time investors',
      },
    ],
  },

  // ── Existing Investments (portfolio size) ──
  {
    condition: { field: 'existing_investments', value: 'none' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Starting from zero — aggressive risk is not advisable without an existing portfolio',
      },
    ],
  },

  // ── Liquidity (Emergency Fund) ──
  {
    condition: { field: 'emergency_fund', value: '<3_months' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Limited emergency savings (<3 months) cannot support aggressive risk',
      },
    ],
  },
  {
    condition: { field: 'emergency_fund', value: '3_6_months' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Moderate emergency savings (3-6 months) may still be strained by aggressive losses',
        soft: true,
      },
    ],
  },

  // ── Investor Stage ──
  {
    condition: { field: 'investor_stage', value: 'retired' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Retired investors rely on savings and cannot risk aggressive drawdowns',
      },
      {
        engineField: 'investmentGoal',
        values: ['wealth'],
        reason: 'Retirement stage favours income or preservation over wealth accumulation',
        soft: true,
      },
    ],
  },
  {
    condition: { field: 'investor_stage', value: 'student' },
    then: [
      {
        engineField: 'riskTolerance',
        values: ['aggressive'],
        reason: 'Students typically have limited capital and should avoid aggressive risk',
        soft: true,
      },
    ],
  },
];

// ─── Main constraint function ───

export function getAvailableOptions(profile: ProfileState): ConstraintResult {
  const result: ConstraintResult = {
    riskTolerance: ENGINE_FIELDS.riskTolerance.values.map((v) => ({
      value: v,
      enabled: true,
      reasons: [],
    })),
    investmentGoal: ENGINE_FIELDS.investmentGoal.values.map((v) => ({
      value: v,
      enabled: true,
      reasons: [],
    })),
    horizon: ENGINE_FIELDS.horizon.values.map((v) => ({
      value: v,
      enabled: true,
      reasons: [],
    })),
    experience: ENGINE_FIELDS.experience.values.map((v) => ({
      value: v,
      enabled: true,
      reasons: [],
    })),
  };

  for (const rule of RULES) {
    const profileValue = profile[rule.condition.field];
    if (profileValue === rule.condition.value) {
      for (const restriction of rule.then) {
        const fieldOptions = result[restriction.engineField];
        for (const opt of fieldOptions) {
          if (restriction.values.includes(opt.value)) {
            if (restriction.soft) {
              opt.reasons.push(restriction.reason);
            } else {
              opt.enabled = false;
              opt.reasons.push(restriction.reason);
            }
          }
        }
      }
    }
  }

  const disabledLog: string[] = [];
  for (const [ef, opts] of Object.entries(result)) {
    const disabled = opts.filter((o) => !o.enabled);
    if (disabled.length > 0) {
      disabledLog.push(`${ef}: [${disabled.map((o) => o.value).join(', ')}]`);
    }
  }
  if (disabledLog.length > 0) {
    console.log('[CONSTRAINT_ENGINE] Current Profile:', JSON.stringify(profile));
    console.log('[CONSTRAINT_ENGINE] Disabled Options:', disabledLog.join('; '));
  }

  return result;
}

// ─── Reverse-map: raw field + raw value → engine field + engine value ───

export function getEngineFieldForSourceField(
  sourceField: keyof ProfileState
): EngineField | null {
  for (const [ef, def] of Object.entries(ENGINE_FIELDS)) {
    if (def.sourceField === sourceField) return ef as EngineField;
  }
  return null;
}

export function getEngineValue(rawField: keyof ProfileState, rawValue: string): string | null {
  for (const def of Object.values(ENGINE_FIELDS)) {
    if (def.sourceField === rawField) {
      return def.mapping[rawValue] ?? null;
    }
  }
  return null;
}

// ─── Pre-save validator ───

export function validateProfile(profile: ProfileState): ValidationError[] {
  const errors: ValidationError[] = [];
  const constraints = getAvailableOptions(profile);

  for (const [engineField, options] of Object.entries(constraints)) {
    const ef = engineField as EngineField;
    const def = ENGINE_FIELDS[ef];
    const selectedRaw = profile[def.sourceField];
    if (!selectedRaw) continue;

    const derivedValue = def.mapping[selectedRaw];
    if (!derivedValue) continue;

    const option = options.find((o) => o.value === derivedValue);
    if (option && !option.enabled) {
      errors.push({
        engineField: ef,
        value: derivedValue,
        reason: option.reasons[0] || 'Invalid combination for selected answers',
      });
    }
  }

  return errors;
}

// ─── Raw-field availability (for direct UI consumption) ───

export interface RawOptionState {
  value: string;
  enabled: boolean;
  reasons: string[];
}

export function getRawFieldAvailability(
  profile: ProfileState
): Partial<Record<keyof ProfileState, RawOptionState[]>> {
  const constraints = getAvailableOptions(profile);
  const rawResult: Partial<Record<keyof ProfileState, RawOptionState[]>> = {};

  for (const [engineField, options] of Object.entries(constraints)) {
    const ef = engineField as EngineField;
    const def = ENGINE_FIELDS[ef];
    const disabledOptions = options.filter((o) => !o.enabled || o.reasons.length > 0);

    if (disabledOptions.length === 0) continue;

    for (const [rawValue, engineValue] of Object.entries(def.mapping)) {
      const disabledOpt = disabledOptions.find((o) => o.value === engineValue);
      if (disabledOpt) {
        if (!rawResult[def.sourceField]) rawResult[def.sourceField] = [];
        rawResult[def.sourceField]!.push({
          value: rawValue,
          enabled: disabledOpt.enabled,
          reasons: disabledOpt.reasons,
        });
      }
    }
  }

  return rawResult;
}
