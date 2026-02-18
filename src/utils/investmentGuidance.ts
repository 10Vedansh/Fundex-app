import { MutualFund, CATEGORY_LABELS } from '@/types/mutualFund';

interface InvestmentGuidance {
  whyInvest: string[];
  whyAvoid: string[];
}

export function generateInvestmentGuidance(fund: MutualFund, userRiskProfile?: string): InvestmentGuidance {
  const whyInvest: string[] = [];
  const whyAvoid: string[] = [];
  const cat = fund.category || '';
  const catLabel = CATEGORY_LABELS[cat] || fund.category;
  const riskProfile = (userRiskProfile || 'moderate').toLowerCase();

  // --- WHY INVEST ---

  // Returns-based
  if (fund.cagr1Y > 20) {
    whyInvest.push(`Delivered a strong ${fund.cagr1Y.toFixed(1)}% return in the last year, significantly outperforming fixed deposits and inflation`);
  } else if (fund.cagr1Y > 12) {
    whyInvest.push(`Generated ${fund.cagr1Y.toFixed(1)}% return over 1 year — a solid inflation-beating performance for ${catLabel} funds`);
  } else if (fund.cagr1Y > 0) {
    whyInvest.push(`Positive 1-year return of ${fund.cagr1Y.toFixed(1)}% indicates the fund is holding steady even in volatile markets`);
  }

  if (fund.cagr3Y > 15) {
    whyInvest.push(`Consistent 3-year CAGR of ${fund.cagr3Y.toFixed(1)}% shows sustained long-term wealth creation capability`);
  }

  if (fund.cagr5Y > 12) {
    whyInvest.push(`5-year CAGR of ${fund.cagr5Y.toFixed(1)}% demonstrates the fund's ability to compound wealth through multiple market cycles`);
  }

  // Risk-adjusted metrics
  if (fund.sharpeRatio > 1.5) {
    whyInvest.push(`Exceptional Sharpe ratio of ${fund.sharpeRatio.toFixed(2)} — this fund generates superior returns per unit of risk taken compared to peers`);
  } else if (fund.sharpeRatio > 1.0) {
    whyInvest.push(`Sharpe ratio of ${fund.sharpeRatio.toFixed(2)} indicates good risk-adjusted returns, meaning you're being fairly compensated for the risk`);
  }

  if (fund.alpha && fund.alpha > 2) {
    whyInvest.push(`Alpha of ${fund.alpha.toFixed(1)} means the fund manager is consistently adding value beyond what the benchmark delivers`);
  }

  if (fund.sortinoRatio && fund.sortinoRatio > 1.5) {
    whyInvest.push(`High Sortino ratio (${fund.sortinoRatio.toFixed(2)}) shows the fund minimizes downside risk while capturing upside — great for risk-conscious investors`);
  }

  // Cost efficiency
  if (fund.expenseRatio < 0.5) {
    whyInvest.push(`Ultra-low expense ratio of ${fund.expenseRatio.toFixed(2)}% ensures maximum returns reach your pocket instead of being eaten by fees`);
  } else if (fund.expenseRatio < 1.0) {
    whyInvest.push(`Competitive expense ratio of ${fund.expenseRatio.toFixed(2)}% keeps your long-term cost of ownership low compared to category average`);
  }

  // AUM and stability
  if (fund.aum > 10000) {
    whyInvest.push(`Large AUM of ₹${(fund.aum / 1000).toFixed(0)}K Cr provides liquidity confidence — you can enter/exit without impacting the NAV`);
  }

  // Category-specific
  if (cat.includes('ELSS')) {
    whyInvest.push(`Offers tax deduction up to ₹1.5 lakh under Section 80C with the shortest lock-in period (3 years) among tax-saving instruments`);
  }
  if (cat.includes('DIV')) {
    whyInvest.push(`Dividend yield strategy can provide periodic income, making it suitable if you need regular cash flow from your investments`);
  }
  if (cat.includes('FLX') || cat.includes('MLC')) {
    whyInvest.push(`Flexible mandate allows the fund manager to shift between large, mid, and small caps based on market conditions and valuations`);
  }
  if (cat.startsWith('DT-') && fund.volatility < 5) {
    whyInvest.push(`Low volatility of ${fund.volatility.toFixed(1)}% makes this an excellent parking option for short-term surplus funds or emergency corpus`);
  }

  // Beta
  if (fund.beta !== undefined && fund.beta < 0.8 && riskProfile === 'conservative') {
    whyInvest.push(`Beta of ${fund.beta.toFixed(2)} means this fund moves less than the market — ideal for your conservative risk profile`);
  }

  // --- WHY AVOID ---

  // Returns-based negatives
  if (fund.cagr1Y < 0) {
    whyAvoid.push(`Negative 1-year return of ${fund.cagr1Y.toFixed(1)}% — the fund has been losing money recently, and recovery timeline is uncertain`);
  } else if (fund.cagr1Y < 5 && cat.startsWith('EQ-')) {
    whyAvoid.push(`1-year return of only ${fund.cagr1Y.toFixed(1)}% for an equity fund underperforms even a savings account — the risk isn't being rewarded`);
  }

  if (fund.cagr3Y < 8 && cat.startsWith('EQ-')) {
    whyAvoid.push(`3-year CAGR of ${fund.cagr3Y.toFixed(1)}% for equity is below inflation-adjusted expectations — consider stronger alternatives in the ${catLabel} category`);
  }

  // High risk metrics
  if (fund.volatility > 25) {
    whyAvoid.push(`High volatility of ${fund.volatility.toFixed(1)}% means your investment could swing wildly — unsuitable if you can't handle 20-30% drawdowns`);
  } else if (fund.volatility > 18 && riskProfile === 'conservative') {
    whyAvoid.push(`Volatility of ${fund.volatility.toFixed(1)}% is too high for a conservative investor — you may panic-sell during corrections`);
  }

  if (fund.sharpeRatio < 0.5) {
    whyAvoid.push(`Low Sharpe ratio of ${fund.sharpeRatio.toFixed(2)} indicates poor risk-reward balance — you're taking significant risk for mediocre returns`);
  }

  // Expense ratio
  if (fund.expenseRatio > 2.0) {
    whyAvoid.push(`Expense ratio of ${fund.expenseRatio.toFixed(2)}% is above industry norms — over 10 years, this costs you lakhs in compounding losses`);
  } else if (fund.expenseRatio > 1.5 && cat.includes('INDEX')) {
    whyAvoid.push(`For an index fund, ${fund.expenseRatio.toFixed(2)}% expense ratio is unacceptably high — index funds should ideally be under 0.3%`);
  }

  // Beta-based
  if (fund.beta !== undefined && fund.beta > 1.3) {
    whyAvoid.push(`High beta of ${fund.beta.toFixed(2)} means this fund amplifies market crashes — in a 10% market fall, expect a ~${(10 * fund.beta).toFixed(0)}% decline`);
  }

  // Small AUM concern
  if (fund.aum < 500 && cat.startsWith('EQ-')) {
    whyAvoid.push(`Small AUM of ₹${fund.aum} Cr may lead to liquidity issues and higher impact cost during large redemptions`);
  }

  // Category-specific warnings
  if (cat.includes('SC') || cat.includes('SMALL')) {
    whyAvoid.push(`Small-cap funds require a minimum 5-7 year horizon — if you need money within 3 years, this is not the right choice`);
  }
  if (cat.includes('THEMATIC') || cat.includes('SA&T') || cat.includes('SECTORAL')) {
    whyAvoid.push(`Sectoral/thematic funds are concentrated bets — if the sector underperforms, there's no diversification to cushion losses`);
  }
  if (cat.includes('INTL')) {
    whyAvoid.push(`International funds carry currency risk and are subject to foreign tax regulations that can reduce effective returns`);
  }
  if (cat.includes('CR') || cat.includes('CREDIT')) {
    whyAvoid.push(`Credit risk funds invest in lower-rated bonds — default risk is real, as seen in past incidents with IL&FS and DHFL`);
  }

  // Risk profile mismatch
  if (riskProfile === 'conservative' && (cat.includes('SC') || cat.includes('THEMATIC') || cat.includes('SECTORAL'))) {
    whyAvoid.push(`This fund's risk level doesn't match your conservative profile — consider large-cap or debt alternatives for more stability`);
  }
  if (riskProfile === 'aggressive' && (cat.startsWith('DT-') || cat.includes('LIQ'))) {
    whyAvoid.push(`As an aggressive investor, this conservative fund will likely underperform your growth targets — consider equity alternatives`);
  }

  // StdDev
  if (fund.stdDev && fund.stdDev > 20) {
    whyAvoid.push(`Standard deviation of ${fund.stdDev.toFixed(1)} indicates highly unpredictable returns — not suitable for goal-based investing with fixed timelines`);
  }

  return {
    whyInvest: whyInvest.slice(0, 6),
    whyAvoid: whyAvoid.slice(0, 5),
  };
}
