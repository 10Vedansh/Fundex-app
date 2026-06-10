export interface InvestorProfile {
  investor_stage: string | null;
  primary_goal: string | null;
  investment_horizon: string | null;
  market_reaction: string | null;
  experience_level: string | null;
  existing_investments: string | null;
  emergency_fund: string | null;
}

export interface PersonaResult {
  name: string;
  explanation: string;
}

export const PERSONA_DEFINITIONS: Record<string, string> = {
  'Young Growth Investor': 'Focused on long-term wealth creation and comfortable with market volatility.',
  'Wealth Builder': 'Steadily building wealth through strategic equity allocation and disciplined investing.',
  'Long-Term Compounder': 'Harnessing the power of compounding over extended time horizons for maximum wealth accumulation.',
  'Retirement Planner': 'Methodically building a retirement corpus with a balanced approach to growth and safety.',
  'Income Seeker': 'Prioritizing regular, predictable income from investments with capital stability.',
  'Capital Preservation Investor': 'Focused on protecting principal capital with minimal risk exposure.',
  'Tax Saver': 'Optimizing tax efficiency through ELSS and other tax-advantaged investment vehicles.',
  'Family Goal Planner': 'Investing with a purpose — funding children\'s education and important family milestones.',
  'Conservative Investor': 'Prefers safety and stability over high returns, with a focus on capital protection.',
  'Balanced Investor': 'Seeks a balanced mix of growth and stability through diversified asset allocation.',
  'Aggressive Growth Investor': 'Pursuing maximum capital appreciation with a high tolerance for market volatility.',
  'Experienced Opportunistic Investor': 'Leveraging market experience to identify and capitalize on investment opportunities.',
};

export function determineInvestorPersona(profile: InvestorProfile): PersonaResult {
  const stage = (profile.investor_stage || '').toLowerCase();
  const goal = (profile.primary_goal || '').toLowerCase();
  const horizon = (profile.investment_horizon || '').toLowerCase();
  const reaction = (profile.market_reaction || '').toLowerCase();
  const experience = (profile.experience_level || '').toLowerCase();

  const isLongHorizon = horizon === '>10' || horizon === '5-10' || horizon === 'more than 10 years' || horizon === '5-10 years' || horizon === 'long';
  const isVeryLong = horizon === '>10' || horizon === 'more than 10 years' || horizon === 'long';
  const isShort = horizon === '<3' || horizon === 'less than 3 years' || horizon === 'short';
  const isAggressive = reaction === 'invest_more' || reaction === 'invest more at lower prices';
  const isModerate = reaction === 'wait' || reaction === 'wait for recovery';
  const isConservative = reaction === 'withdraw' || reaction === 'withdraw immediately';
  const isExperienced = experience === 'experienced' || experience === 'experienced investor';
  const isBeginner = experience === 'first_time' || experience === 'first-time investor';

  // 1. Capital Preservation Investor
  if (goal === 'capital_preservation') {
    return {
      name: 'Capital Preservation Investor',
      explanation: PERSONA_DEFINITIONS['Capital Preservation Investor'],
    };
  }

  // 2. Tax Saver
  if (goal === 'tax_saving') {
    return {
      name: 'Tax Saver',
      explanation: PERSONA_DEFINITIONS['Tax Saver'],
    };
  }

  // 3. Income Seeker (retired seeking income)
  if (goal === 'passive_income' && stage === 'retired') {
    return {
      name: 'Income Seeker',
      explanation: PERSONA_DEFINITIONS['Income Seeker'],
    };
  }

  // 4. Family Goal Planner
  if (goal === 'child_education' || goal === 'family goals') {
    return {
      name: 'Family Goal Planner',
      explanation: PERSONA_DEFINITIONS['Family Goal Planner'],
    };
  }

  // 5. Retirement Planner
  if (goal === 'retirement') {
    return {
      name: 'Retirement Planner',
      explanation: PERSONA_DEFINITIONS['Retirement Planner'],
    };
  }

  // 6. Young Growth Investor
  if ((stage === 'student' || stage === 'early_career') && goal === 'wealth_creation' && isAggressive) {
    return {
      name: 'Young Growth Investor',
      explanation: PERSONA_DEFINITIONS['Young Growth Investor'],
    };
  }

  // 7. Experienced Opportunistic Investor
  if (isExperienced && isAggressive && goal === 'wealth_creation') {
    return {
      name: 'Experienced Opportunistic Investor',
      explanation: PERSONA_DEFINITIONS['Experienced Opportunistic Investor'],
    };
  }

  // 8. Aggressive Growth Investor
  if (isAggressive && isLongHorizon) {
    return {
      name: 'Aggressive Growth Investor',
      explanation: PERSONA_DEFINITIONS['Aggressive Growth Investor'],
    };
  }

  // 9. Long-Term Compounder
  if (isVeryLong && (goal === 'wealth_creation' || goal === '')) {
    return {
      name: 'Long-Term Compounder',
      explanation: PERSONA_DEFINITIONS['Long-Term Compounder'],
    };
  }

  // 10. Wealth Builder
  if ((stage === 'mid_career' || stage === 'business_owner') && goal === 'wealth_creation') {
    return {
      name: 'Wealth Builder',
      explanation: PERSONA_DEFINITIONS['Wealth Builder'],
    };
  }

  // 11. Balanced Investor
  if (isModerate) {
    return {
      name: 'Balanced Investor',
      explanation: PERSONA_DEFINITIONS['Balanced Investor'],
    };
  }

  // 12. Conservative Investor
  if (isConservative || isBeginner) {
    return {
      name: 'Conservative Investor',
      explanation: PERSONA_DEFINITIONS['Conservative Investor'],
    };
  }

  // Default
  return {
    name: 'Balanced Investor',
    explanation: PERSONA_DEFINITIONS['Balanced Investor'],
  };
}
