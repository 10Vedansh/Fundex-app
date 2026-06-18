import { MutualFund } from '@/types/mutualFund';
import { CategoryMedians } from './scoringEngineV3';
import { toCategoryCode } from './categoryMappings';

type ConfidenceLevel = 'high' | 'medium' | 'limited_history';

export interface ExplanationInput {
  fund: MutualFund;
  medians: Map<string, CategoryMedians>;
  categoryRelativeScore: number;
  confidenceLevel?: ConfidenceLevel;
  confidenceReason?: string;
}

function safeNum(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? null : n;
}

export function generateExplanations(input: ExplanationInput): string[] {
  const { fund, medians, categoryRelativeScore, confidenceLevel, confidenceReason } = input;
  const bullets: string[] = [];
  const cat = toCategoryCode(fund.category || '');
  const catMedian = medians.get(cat);

  // 1. Performance — CAGR vs category average
  const cagr = safeNum(fund.ret3Y ?? fund.cagr3Y);
  if (cagr !== null && catMedian?.cagr && catMedian.cagr > 0) {
    const diff = cagr - catMedian.cagr;
    if (diff > 0) {
      bullets.push(`3Y returns ${diff > 5 ? 'strongly outperform' : 'exceed'} category average by ${Math.abs(diff).toFixed(1)}%`);
    }
  }
  if (cagr !== null && categoryRelativeScore > 75) {
    bullets.push('Top-performing fund within its category');
  }

  // 2. Risk-adjusted — Sharpe vs category average
  const sharpe = safeNum(fund.sharpeRatio);
  if (sharpe !== null && catMedian?.sharpe && catMedian.sharpe > 0) {
    const sharpeDiff = sharpe - catMedian.sharpe;
    if (sharpeDiff > 0) {
      bullets.push('Strong risk-adjusted performance relative to peers');
    }
  }

  // 3. Risk — Volatility vs category average
  const vol = safeNum(fund.volatility) ?? safeNum(fund.stdDev);
  if (vol !== null && catMedian?.volatility && catMedian.volatility > 0) {
    if (vol < catMedian.volatility) {
      bullets.push('Lower volatility than similar funds in its category');
    }
  }
  if (vol !== null && vol < 5) {
    bullets.push('Stable performance with low volatility');
  }

  // 4. Cost — Expense vs category median
  const expense = safeNum(fund.expenseRatio);
  if (expense !== null && catMedian?.expense && catMedian.expense > 0) {
    if (expense < catMedian.expense) {
      const costLabel = expense < catMedian.expense * 0.7 ? 'significantly' : 'moderately';
      bullets.push(`Cost-efficient: expense ratio is ${costLabel} below category median`);
    }
  }

  // 5. Scale — AUM vs category median
  const aum = safeNum(fund.aum);
  if (aum !== null && aum > 0) {
    // AUM-based explanation uses global top-tier rather than category median
    // since aum distribution is skewed
    if (fund.aum !== null && typeof fund.aum === 'number' && fund.aum > 5000) {
      bullets.push('Large asset base reflects strong investor confidence');
    } else if (fund.aum !== null && typeof fund.aum === 'number' && fund.aum > 1000) {
      bullets.push('Healthy asset base indicates steady investor trust');
    }
  }

  // 6. Longevity — Fund age
  if (fund.launch) {
    const launchDate = new Date(String(fund.launch));
    const ageYears = (Date.now() - launchDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears > 10) {
      bullets.push('Long track record of performance across market cycles');
    } else if (ageYears > 5) {
      bullets.push('Established performance history through varying market conditions');
    }
  }

  // 7. Confidence
  if (confidenceLevel === 'high') {
    bullets.push('High confidence recommendation based on complete historical data');
  } else if (confidenceLevel === 'medium') {
    bullets.push('Supported by adequate historical performance data');
  } else if (confidenceLevel === 'limited_history') {
    bullets.push('Potentially promising but limited historical record');
  }

  // 8. Consistency tie-in (if available from scoring)
  if (cagr !== null) {
    const ret1M = safeNum(fund.ret1M);
    const ret3M = safeNum(fund.ret3M);
    const ret6M = safeNum(fund.ret6M);
    const periods = [ret1M, ret3M, ret6M].filter((v): v is number => v !== null);
    if (periods.length >= 2 && periods.every(r => r > 0)) {
      bullets.push('Consistent positive returns across recent time periods');
    }
  }

  // 9. Risk profile alignment
  const volScore = safeNum(fund.volatility) ?? safeNum(fund.stdDev);
  if (volScore !== null) {
    if (volScore < 4) bullets.push('Matches conservative risk profile with very low volatility');
    else if (volScore < 8) bullets.push('Suitable for moderate risk profile with controlled volatility');
    else if (volScore > 20) bullets.push('High growth potential aligned with aggressive risk profile');
  }

  // 10. Fund manager track record
  if (fund.fundManager && String(fund.fundManager).trim()) {
    bullets.push(`Managed by experienced fund management team`);
  }

  // 11. AUM stability indicator
  if (aum !== null && aum > 0) {
    if (aum < 100) {
      bullets.push('Small but nimble fund — monitor for AUM growth sustainability');
    } else if (aum > 10000) {
      bullets.push('Large AUM provides liquidity and institutional stability');
    }
  }

  // 12. Drawdown awareness
  const maxDD = fund.maxDrawdown !== undefined ? safeNum(fund.maxDrawdown) : null;
  if (maxDD !== null && maxDD < 10) {
    bullets.push('Historically limited downside with peak-to-trough recovery within acceptable range');
  }

  // 13. Goal-specific
  if (cat === 'EQ-ELSS') {
    bullets.push('Eligible for ₹1.5L tax deduction under Section 80C');
  }
  if (cat.startsWith('DT-') && cat !== 'DT-CR') {
    bullets.push('Debt allocation provides portfolio stability and regular income potential');
  }
  if (cat.startsWith('HY-')) {
    bullets.push('Balanced hybrid structure adjusts equity-debt exposure dynamically');
  }

  // Deduplicate (some conditions may overlap)
  const seen = new Set<string>();
  return bullets.filter(b => {
    if (seen.has(b)) return false;
    seen.add(b);
    return true;
  });
}
