import type { AnalyticsHolding } from '@/components/dashboard/PortfolioAnalytics';

export interface HealthFactor {
  score: number;
  max: number;
  label: string;
}

export interface PortfolioHealthScore {
  score: number;
  max: number;
  label: string;
  factors: {
    diversification: HealthFactor;
    amcConcentration: HealthFactor;
    assetAllocation: HealthFactor;
    riskBalance: HealthFactor;
  };
}

export interface Insight {
  type: 'positive' | 'warning' | 'negative';
  icon: string;
  message: string;
}

export interface ReviewResult {
  healthScore: PortfolioHealthScore;
  insights: Insight[];
  strengths: string[];
  risks: string[];
  summary: string;
}

function getCategoryAssetClass(category: string): string {
  if (!category) return 'Other';
  const uc = category.trim().toUpperCase();
  if (uc.startsWith('EQ-') || uc === 'EQUITY') return 'Equity';
  if (uc.startsWith('DT-') || uc === 'DEBT') return 'Debt';
  if (uc.startsWith('HY-') || uc === 'HYBRID') return 'Hybrid';
  if (uc === 'GOLD-FUNDS' || uc === 'SILVER-FUNDS') return 'Commodities';
  return 'Other';
}

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${Math.round(value).toLocaleString()}`;
}

function getHealthLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Healthy';
  if (score >= 60) return 'Moderate';
  return 'Needs Attention';
}

export function runPortfolioReview(holdings: AnalyticsHolding[]): ReviewResult | null {
  if (holdings.length === 0) return null;

  const total = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
  const profitLoss = total - totalInvested;
  const returnPercent = totalInvested > 0 ? ((total - totalInvested) / totalInvested) * 100 : 0;

  // --- AMC Groups ---
  const amcGroups: Record<string, number> = {};
  holdings.forEach((h) => {
    const amc = h.amc || 'Unknown';
    amcGroups[amc] = (amcGroups[amc] || 0) + h.currentValue;
  });
  const amcCount = Object.keys(amcGroups).length;
  const topAmcPct = total > 0 ? Math.max(...Object.values(amcGroups).map((v) => (v / total) * 100)) : 0;

  // --- Asset Class Groups ---
  const assetGroups: Record<string, number> = {};
  holdings.forEach((h) => {
    const ac = h.assetClass || getCategoryAssetClass(h.category);
    assetGroups[ac] = (assetGroups[ac] || 0) + h.currentValue;
  });
  const assetClassCount = Object.keys(assetGroups).length;
  const equityPct = total > 0 ? ((assetGroups['Equity'] || 0) / total) * 100 : 0;
  const debtPct = total > 0 ? ((assetGroups['Debt'] || 0) / total) * 100 : 0;
  const hybridPct = total > 0 ? ((assetGroups['Hybrid'] || 0) / total) * 100 : 0;

  // --- Risk Groups ---
  const riskGroups: Record<string, number> = {};
  holdings.forEach((h) => {
    const rl = h.riskLevel || 'Moderate';
    riskGroups[rl] = (riskGroups[rl] || 0) + h.currentValue;
  });
  const lowRiskPct = total > 0 ? ((riskGroups['Low'] || 0) / total) * 100 : 0;
  const moderateRiskPct = total > 0 ? ((riskGroups['Moderate'] || 0) / total) * 100 : 0;
  const highRiskPct = total > 0 ? ((riskGroups['High'] || 0) / total) * 100 : 0;

  // --- Categories ---
  const categories = new Set(holdings.map((h) => h.category).filter(Boolean));
  const categoryCount = categories.size;

  // ===== HEALTH SCORE =====

  // Diversification factor (40%)
  const fundCountScore = holdings.length >= 10 ? 40 : holdings.length >= 7 ? 30 : holdings.length >= 4 ? 20 : holdings.length >= 2 ? 10 : 0;
  const catSpreadScore = categoryCount >= 5 ? 40 : categoryCount >= 3 ? 25 : categoryCount >= 2 ? 10 : 0;
  const assetSpreadScore = assetClassCount >= 3 ? 20 : assetClassCount === 2 ? 10 : 0;
  const diversificationScore = Math.round((fundCountScore + catSpreadScore + assetSpreadScore) * 0.4);

  // AMC Concentration factor (20%)
  let amcFactorScore = 0;
  if (amcCount >= 5) amcFactorScore = 100;
  else if (amcCount >= 3) amcFactorScore = 80;
  else if (amcCount === 2) amcFactorScore = 50;
  else amcFactorScore = 20;
  if (topAmcPct > 50) amcFactorScore = Math.round(amcFactorScore * 0.3);
  else if (topAmcPct > 40) amcFactorScore = Math.round(amcFactorScore * 0.5);
  else if (topAmcPct > 30) amcFactorScore = Math.round(amcFactorScore * 0.7);
  const amcScore = Math.round(amcFactorScore * 0.2);

  // Asset Allocation factor (20%)
  let allocScore = 0;
  if (assetClassCount >= 3) allocScore = 100;
  else if (assetClassCount === 2) allocScore = 70;
  else allocScore = 40;
  if (equityPct > 90) allocScore = Math.round(allocScore * 0.4);
  else if (equityPct > 80) allocScore = Math.round(allocScore * 0.6);
  else if (equityPct > 70) allocScore = Math.round(allocScore * 0.8);
  const assetAllocScore = Math.round(allocScore * 0.2);

  // Risk Balance factor (20%)
  let riskScore = 0;
  if (highRiskPct > 60) riskScore = 20;
  else if (highRiskPct > 40) riskScore = 40;
  else if (highRiskPct > 20) riskScore = 60;
  else riskScore = 90;
  if (lowRiskPct > 80) riskScore = Math.round(riskScore * 0.6);
  else if (lowRiskPct > 60) riskScore = Math.round(riskScore * 0.8);
  const riskBalanceScore = Math.round(riskScore * 0.2);

  const totalScore = Math.min(100, diversificationScore + amcScore + assetAllocScore + riskBalanceScore);
  const healthLabel = getHealthLabel(totalScore);

  // ===== INSIGHTS =====
  const insights: Insight[] = [];

  if (holdings.length >= 5) {
    insights.push({ type: 'positive', icon: 'thumbs-up', message: `Well diversified across ${holdings.length} funds` });
  } else if (holdings.length === 1) {
    insights.push({ type: 'negative', icon: 'alert-triangle', message: 'Portfolio contains only 1 fund — consider adding more funds to reduce dependency' });
  } else {
    insights.push({ type: 'warning', icon: 'info', message: `Only ${holdings.length} funds in portfolio — more funds can improve diversification` });
  }

  if (equityPct > 80) {
    insights.push({ type: 'warning', icon: 'trending-up', message: `Equity exposure at ${equityPct.toFixed(0)}% — high market-linked risk for short-term goals` });
  } else if (equityPct >= 60) {
    insights.push({ type: 'positive', icon: 'thumbs-up', message: `Healthy equity allocation of ${equityPct.toFixed(0)}% suitable for long-term growth` });
  } else if (equityPct < 20) {
    insights.push({ type: 'warning', icon: 'info', message: `Equity exposure only ${equityPct.toFixed(0)}% — may limit long-term growth potential` });
  }

  if (debtPct > 50) {
    insights.push({ type: 'info', icon: 'shield', message: `Significant debt allocation of ${debtPct.toFixed(0)}% provides stability but limits growth` });
  }

  if (topAmcPct > 40) {
    insights.push({ type: 'negative', icon: 'alert-triangle', message: `Single AMC concentration at ${topAmcPct.toFixed(0)}% — high exposure to one fund house` });
  } else if (topAmcPct < 25 && amcCount >= 3) {
    insights.push({ type: 'positive', icon: 'thumbs-up', message: `Well diversified across ${amcCount} AMCs with no single concentration` });
  }

  if (categoryCount >= 5) {
    insights.push({ type: 'positive', icon: 'thumbs-up', message: `Healthy mix of ${categoryCount} fund categories providing style diversification` });
  } else if (categoryCount <= 2) {
    insights.push({ type: 'warning', icon: 'info', message: `Only ${categoryCount} fund categories — consider adding different category exposures` });
  }

  if (assetClassCount >= 3) {
    insights.push({ type: 'positive', icon: 'thumbs-up', message: `Multi-asset allocation across ${assetClassCount} asset classes reduces overall volatility` });
  } else if (assetClassCount === 1) {
    insights.push({ type: 'warning', icon: 'alert-triangle', message: `Entire portfolio is in one asset class — no cross-asset diversification` });
  }

  if (highRiskPct <= 20 && moderateRiskPct <= 60) {
    insights.push({ type: 'positive', icon: 'thumbs-up', message: 'Portfolio risk profile is balanced with controlled high-risk exposure' });
  } else if (highRiskPct > 50) {
    insights.push({ type: 'negative', icon: 'alert-triangle', message: `High-risk funds dominate at ${highRiskPct.toFixed(0)}% of portfolio — review risk tolerance alignment` });
  }

  if (profitLoss > 0) {
    insights.push({ type: 'positive', icon: 'trending-up', message: `Portfolio in profit by ${formatCurrency(profitLoss)} (${returnPercent.toFixed(1)}% return)` });
  } else if (profitLoss < 0) {
    insights.push({ type: 'warning', icon: 'trending-down', message: `Portfolio in loss by ${formatCurrency(Math.abs(profitLoss))} (${returnPercent.toFixed(1)}% return)` });
  }

  if (holdings.length >= 10) {
    insights.push({ type: 'positive', icon: 'thumbs-up', message: `Large portfolio with ${holdings.length} funds — excellent granularity` });
  }

  // ===== STRENGTHS =====
  const strengths: string[] = [];

  if (topAmcPct < 25) strengths.push('Low AMC concentration across multiple fund houses');
  if (holdings.length >= 5) strengths.push('Good fund count for adequate diversification');
  if (assetClassCount >= 2) strengths.push(`Multi-asset exposure across ${assetClassCount} asset classes`);
  if (categoryCount >= 4) strengths.push(`Broad category spread across ${categoryCount} fund categories`);
  if (highRiskPct <= 20) strengths.push('Conservative risk profile with limited high-risk exposure');
  if (equityPct >= 40 && equityPct <= 80) strengths.push('Balanced equity-debt mix suitable for long-term wealth creation');
  if (profitLoss > 0) strengths.push('Portfolio generating positive returns above invested capital');
  if (returnPercent > 12) strengths.push('Strong portfolio return outperforming inflation');
  if (holdings.length >= 3 && topAmcPct < 30) strengths.push('Good spread across AMCs reducing fund house concentration risk');
  if (moderateRiskPct >= 40 && highRiskPct <= 30) strengths.push('Well-calibrated risk profile aligned with moderate risk appetite');

  // ===== RISKS =====
  const risks: string[] = [];

  if (equityPct > 80) risks.push('High equity exposure increases portfolio volatility');
  if (debtPct > 60) risks.push('High debt allocation may limit long-term inflation-adjusted returns');
  if (holdings.length === 1) risks.push('Single fund dependency creates concentration risk');
  if (topAmcPct > 40) risks.push(`Concentration risk with ${Object.keys(amcGroups).find(k => (amcGroups[k] / total) * 100 === topAmcPct)} at ${topAmcPct.toFixed(0)}% of portfolio`);
  if (highRiskPct > 50) risks.push('Aggressive risk profile may lead to significant short-term drawdowns');
  if (assetClassCount === 1) risks.push('No cross-asset diversification — entire portfolio in one asset class');
  if (categoryCount <= 2) risks.push('Limited category diversity may lead to style concentration');
  if (profitLoss < 0) risks.push('Portfolio currently underperforming — review fund selection and market conditions');
  if (holdings.length >= 15) risks.push('Portfolio may be over-diversified — consider consolidating overlapping funds');
  if (equityPct < 15 && totalInvested > 0) risks.push('Very low equity allocation may not generate sufficient long-term returns');

  // ===== SUMMARY =====
  const riskDesc = highRiskPct > 50 ? 'aggressive' : highRiskPct > 20 ? 'moderate' : 'conservative';
  const perfDesc = profitLoss > 0
    ? `generating a profit of ${formatCurrency(profitLoss)} (${returnPercent.toFixed(1)}% return)`
    : profitLoss < 0
      ? `currently showing a loss of ${formatCurrency(Math.abs(profitLoss))} (${returnPercent.toFixed(1)}% return)`
      : 'breaking even';

  const amcDesc = amcCount === 1
    ? `all managed by a single AMC`
    : `spread across ${amcCount} AMCs`;

  const categoryDesc = categoryCount <= 2
    ? `across ${categoryCount} fund categories`
    : `across ${categoryCount} fund categories`;

  const equityDesc = equityPct > 80
    ? `Equity-heavy at ${equityPct.toFixed(0)}%, the portfolio targets aggressive growth.`
    : equityPct >= 40
      ? `With ${equityPct.toFixed(0)}% in equity, the portfolio has a balanced growth orientation.`
      : equityPct > 0
        ? `With only ${equityPct.toFixed(0)}% in equity, the portfolio is conservatively positioned.`
        : 'The portfolio has no equity exposure.';

  const summary = `Your portfolio contains ${holdings.length} fund${holdings.length > 1 ? 's' : ''} ${amcDesc}, ${categoryDesc} with a ${riskDesc} risk profile. ${equityDesc} It is currently ${perfDesc}.${strengths.length > 0 ? ` Key strengths include ${strengths.slice(0, 2).join(' and ').toLowerCase()}.` : ''}${risks.length > 0 ? ` Areas to watch: ${risks.slice(0, 2).join('; ').toLowerCase()}.` : ''}`;

  return {
    healthScore: {
      score: totalScore,
      max: 100,
      label: healthLabel,
      factors: {
        diversification: { score: diversificationScore, max: 40, label: 'Diversification' },
        amcConcentration: { score: amcScore, max: 20, label: 'AMC Concentration' },
        assetAllocation: { score: assetAllocScore, max: 20, label: 'Asset Allocation' },
        riskBalance: { score: riskBalanceScore, max: 20, label: 'Risk Balance' },
      },
    },
    insights: insights.slice(0, 10),
    strengths: strengths.slice(0, 5),
    risks: risks.slice(0, 5),
    summary,
  };
}
