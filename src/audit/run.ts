// @vitest-environment node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { MutualFund } from '@/types/mutualFund';
import { recommendFundsV2, RecommendationPreferences, ScoredFund } from '@/utils/recommendation/intersectionEngine';

// ── Types ──

interface Persona {
  id: number;
  name: string;
  goal: string;
  riskTolerance: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
  description: string;
}

interface PersonaResult {
  persona: Persona;
  funds: ScoredFund[];
  fallbackActivated: boolean;
}

// ── 30 Personas ──

const PERSONAS: Persona[] = [
  // Capital Preservation (5)
  { id: 1,  name: 'Retiree Capital Preservation',     goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large',        description: 'Retired, needs capital safety, short horizon' },
  { id: 2,  name: 'Emergency Fund Saver',              goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'beginner',      investmentAmount: 'small',        description: 'Building emergency corpus, minimal risk' },
  { id: 3,  name: 'Moderate Capital Preserver',        goal: 'capital_preservation', riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Some flexibility for slightly higher returns' },
  { id: 4,  name: 'Wealthy Capital Guardian',          goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'medium', experienceLevel: 'experienced',   investmentAmount: 'above_10l',    description: 'Large corpus preservation, moderate horizon' },
  { id: 5,  name: 'New Investor Capital Safety',       goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'beginner',      investmentAmount: 'under_1l',     description: 'First-time investor, safety first' },

  // Retirement Planning (5)
  { id: 6,  name: 'Early Career Retirement',           goal: 'retirement',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: 'Young, long runway, can take risk' },
  { id: 7,  name: 'Mid-Career Retirement Builder',     goal: 'retirement',           riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Building retirement corpus steadily' },
  { id: 8,  name: 'Late-Stage Retirement',             goal: 'retirement',           riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large',        description: 'Close to retirement, capital preservation focus' },
  { id: 9,  name: 'Aggressive Retirement Accumulator', goal: 'retirement',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large',        description: 'High risk tolerance, long horizon, experienced' },
  { id: 10, name: 'Balanced Retirement Planner',       goal: 'retirement',           riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Moderate approach to retirement' },

  // Tax Saving (5)
  { id: 11, name: 'Young Tax Saver',                   goal: 'tax_saving',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: 'First job, wants to save tax under 80C' },
  { id: 12, name: 'Mid-Income Tax Optimizer',          goal: 'tax_saving',           riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Regular tax planning with ELSS' },
  { id: 13, name: 'High Earner Tax Planner',           goal: 'tax_saving',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large',        description: 'Maximizing tax benefit with aggressive allocation' },
  { id: 14, name: 'Conservative Tax Saver',            goal: 'tax_saving',           riskTolerance: 'conservative', investmentHorizon: 'medium', experienceLevel: 'beginner',      investmentAmount: 'medium',       description: 'Wants tax savings with minimal volatility' },
  { id: 15, name: 'Experienced Tax Arbitrageur',       goal: 'tax_saving',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'above_10l',    description: 'Using ELSS for both tax saving and wealth creation' },

  // Wealth Creation (5)
  { id: 16, name: 'Young Wealth Builder',              goal: 'wealth_creation',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: 'Early career, starting investment journey' },
  { id: 17, name: 'Mid-Career Wealth Accumulator',     goal: 'wealth_creation',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Regular investor seeking alpha' },
  { id: 18, name: 'Professional Wealth Creator',       goal: 'wealth_creation',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large',        description: 'High net worth, aggressive allocation' },
  { id: 19, name: 'Moderate Wealth Seeker',            goal: 'wealth_creation',      riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Balanced approach to wealth creation' },
  { id: 20, name: 'Conservative Growth',               goal: 'wealth_creation',      riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: 'Cautious investor seeking long-term growth' },

  // Emergency Fund (5)
  { id: 21, name: 'Liquid Emergency Builder',          goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'beginner',      investmentAmount: 'small',        description: 'Building 3-month emergency corpus' },
  { id: 22, name: 'Stable Income Emergency',           goal: 'passive_income',       riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Emergency fund with modest income' },
  { id: 23, name: 'Moderate Liquidity Buffer',         goal: 'capital_preservation', riskTolerance: 'moderate',    investmentHorizon: 'short',  experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Emergency fund with some flex for returns' },
  { id: 24, name: 'Large Emergency Reserve',           goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large',        description: '6+ months emergency fund in safe instruments' },
  { id: 25, name: 'Yield-Seeking Emergency Fund',      goal: 'passive_income',       riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Emergency fund optimized for small yield' },

  // Child Education (5)
  { id: 26, name: 'New Parent Education Fund',         goal: 'child_education',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: '18-year horizon for child education' },
  { id: 27, name: 'Mid-Term Education Planner',        goal: 'child_education',      riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '10-year horizon, tapering risk' },
  { id: 28, name: 'Near-College Education Fund',       goal: 'child_education',      riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large',        description: 'Child nearing college, capital protection' },
  { id: 29, name: 'Aggressive Education Accumulator',  goal: 'child_education',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'medium',       description: 'Long horizon, experienced, maximizing corpus' },
  { id: 30, name: 'Balanced Education Planner',        goal: 'child_education',      riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Steady approach to education funding' },
];

// ── Helpers ──

function countNullFields(fund: ScoredFund): number {
  let n = 0;
  if (fund.sharpeRatio == null) n++;
  if (fund.sortinoRatio == null) n++;
  if (fund.volatility == null && fund.stdDev == null) n++;
  if (fund.cagr3Y == null && fund.ret3Y == null) n++;
  return n;
}

function assetClass(cat: string): string {
  if (cat.startsWith('EQ-') || cat === 'Equity') return 'Equity';
  if (cat.startsWith('DT-') || cat === 'Debt') return 'Debt';
  if (cat.startsWith('HY-') || cat === 'Hybrid') return 'Hybrid';
  if (cat.startsWith('Gold') || cat.startsWith('Silver')) return 'Commodities';
  return 'Other';
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    'EQ-LC': 'Large Cap', 'EQ-MC': 'Mid Cap', 'EQ-SC': 'Small Cap',
    'EQ-L&MC': 'Large & Mid Cap', 'EQ-MLC': 'Multi Cap', 'EQ-FLX': 'Flexi Cap',
    'EQ-VAL': 'Value', 'EQ-Quant': 'Quant', 'EQ-ELSS': 'ELSS',
    'EQ-DIV Y': 'Dividend Yield', 'EQ-BANK': 'Banking', 'EQ-IT': 'IT',
    'EQ-Pharma': 'Pharma', 'EQ-INFRA': 'Infra', 'EQ-PSU': 'PSU',
    'EQ-Energy': 'Energy', 'EQ-Consumption': 'Consumption', 'EQ-THEMATIC': 'Thematic',
    'EQ-SA&T': 'Sectoral', 'EQ-TBC': 'Business Cycle', 'EQ-Manufacturing': 'Mfg',
    'EQ-Innovation': 'Innovation',
    'DT-LIQ': 'Liquid', 'DT-USD': 'Ultra Short', 'DT-SD': 'Short Duration',
    'DT-MD': 'Medium Duration', 'DT-LONG D': 'Long Duration',
    'DT-M to LD': 'Med-Long', 'DT-CB': 'Corp Bond', 'DT-CR': 'Credit Risk',
    'DT-GL': 'Gilt', 'DT-DB': 'Dynamic Bond', 'DT-OVERNHT': 'Overnight',
    'DT-MM': 'Money Market', 'DT-LD': 'Low Duration',
    'DT-BK & PSU': 'Banking & PSU', 'DT-Floater': 'Floating Rate',
    'DT-TM': 'Target Maturity',
    'HY-AH': 'Agg Hybrid', 'HY-CH': 'Cons Hybrid', 'HY-DAA': 'Bal Advantage',
    'HY-AR': 'Arbitrage', 'HY-MAA': 'Multi Asset', 'HY-EQ S': 'Equity Savings',
    'HY-BH': 'Bal Hybrid', 'HY-IPA': 'Inc+Arbitrage',
    'Gold-Funds': 'Gold', 'Silver-Funds': 'Silver',
    'Equity': 'Equity', 'Debt': 'Debt', 'Hybrid': 'Hybrid',
  };
  return labels[cat] || cat;
}

// ── Main Audit ──

async function runAudit() {
  const outputDir = join(__dirname, '../../reports/recommendation-engine');
  mkdirSync(outputDir, { recursive: true });

  // Load fund data
  const fundsData = JSON.parse(readFileSync(join(__dirname, 'funds_data.json'), 'utf-8')) as MutualFund[];
  console.log(`Loaded ${fundsData.length} funds for audit`);

  // Run recommendations for each persona
  const results: PersonaResult[] = [];
  const globalResults: Record<string, { count: number; totalScore: number }> = {};
  const categoryResults: Record<string, { count: number; byProfile: Record<string, number> }> = {};
  const assetClassResults: Record<string, { count: number; byProfile: Record<string, number> }> = {};
  const duplicateMap: Record<string, { count: number; personas: string[] }> = {};
  const missingMetricFunds: { fundId: string; fundName: string; persona: string; score: number; nullFields: number }[] = [];

  for (const persona of PERSONAS) {
    const prefs: RecommendationPreferences = {
      riskTolerance: persona.riskTolerance,
      investmentGoal: persona.goal,
      investmentHorizon: persona.investmentHorizon,
      experienceLevel: persona.experienceLevel,
      investmentAmount: persona.investmentAmount,
    };

    try {
      const recommended = recommendFundsV2(fundsData, prefs);
      const top10 = recommended.slice(0, 10);

      results.push({ persona, funds: top10, fallbackActivated: recommended.length > 0 && recommended.length < 10 });

      // Track global fund frequency
      for (const fund of top10) {
        if (!globalResults[fund.id]) {
          globalResults[fund.id] = { count: 0, totalScore: 0 };
        }
        globalResults[fund.id].count++;
        globalResults[fund.id].totalScore += fund.compositeScore;

        // Track duplicates across personas
        if (!duplicateMap[fund.id]) {
          duplicateMap[fund.id] = { count: 0, personas: [] };
        }
        duplicateMap[fund.id].count++;
        duplicateMap[fund.id].personas.push(persona.name);
      }

      // Track categories
      const seenCats = new Set<string>();
      for (const fund of top10) {
        const cat = fund.category || 'Unknown';
        if (!seenCats.has(cat)) {
          seenCats.add(cat);
          if (!categoryResults[cat]) {
            categoryResults[cat] = { count: 0, byProfile: {} };
          }
          categoryResults[cat].count++;
          if (!categoryResults[cat].byProfile[persona.goal]) {
            categoryResults[cat].byProfile[persona.goal] = 0;
          }
          categoryResults[cat].byProfile[persona.goal]++;
        }

        // Track asset classes
        const ac = assetClass(cat);
        if (!assetClassResults[ac]) {
          assetClassResults[ac] = { count: 0, byProfile: {} };
        }
        assetClassResults[ac].count++;
        if (!assetClassResults[ac].byProfile[persona.goal]) {
          assetClassResults[ac].byProfile[persona.goal] = 0;
        }
        assetClassResults[ac].byProfile[persona.goal]++;

        // Track missing metric funds
        const nulls = countNullFields(fund);
        if (nulls > 0) {
          missingMetricFunds.push({
            fundId: fund.id,
            fundName: fund.name,
            persona: persona.name,
            score: fund.compositeScore,
            nullFields: nulls,
          });
        }
      }

      console.log(`Persona ${persona.id}: ${persona.name} — ${top10.length} funds returned`);
    } catch (err) {
      console.error(`Persona ${persona.id}: ${persona.name} — ERROR: ${err}`);
      results.push({ persona, funds: [], fallbackActivated: true });
    }
  }

  // ── Generate CSV ──
  let csv = 'persona_id,persona_name,goal,risk,horizon,experience,amount';
  csv += ',rank,fund_id,fund_name,category,asset_class,score,match_level,sharpe,sortino,cagr3y,volatility,null_fields,confidence_level,confidence_reason\n';

  for (const r of results) {
    for (let i = 0; i < r.funds.length; i++) {
      const f = r.funds[i];
      csv += `${r.persona.id},"${r.persona.name}","${r.persona.goal}","${r.persona.riskTolerance}","${r.persona.investmentHorizon}","${r.persona.experienceLevel}","${r.persona.investmentAmount}"`;
      csv += `,${i + 1},"${f.id}","${f.name.replace(/"/g, '""')}","${f.category || ''}","${assetClass(f.category || '')}",${f.compositeScore},"${f.matchLevel}",${f.sharpeRatio ?? ''},${f.sortinoRatio ?? ''},${f.cagr3Y ?? ''},${f.volatility ?? ''},${countNullFields(f)},"${f.confidenceLevel || ''}","${(f.confidenceReason || '').replace(/"/g, '""')}"\n`;
    }
    if (r.funds.length === 0) {
      csv += `${r.persona.id},"${r.persona.name}","${r.persona.goal}","${r.persona.riskTolerance}","${r.persona.investmentHorizon}","${r.persona.experienceLevel}","${r.persona.investmentAmount}"`;
      csv += `,0,"NO_FUNDS","","","",0,"",,,,,0,,,\n`;
    }
  }

  writeFileSync(join(outputDir, 'persona_recommendations.csv'), csv, 'utf-8');
  console.log('CSV written');

  // ── Generate Markdown Report ──
  const sortedFunds = Object.entries(globalResults).sort((a, b) => b[1].count - a[1].count);
  const sortedCats = Object.entries(categoryResults).sort((a, b) => b[1].count - a[1].count);
  const sortedACs = Object.entries(assetClassResults).sort((a, b) => b[1].count - a[1].count);
  const sortedDupes = Object.entries(duplicateMap).filter(([, v]) => v.count > 5).sort((a, b) => b[1].count - a[1].count);

  let md = `# CIFRAA Recommendation Engine — Audit Report\n\n`;
  md += `**Date:** ${new Date().toISOString().slice(0, 10)}  \n`;
  md += `**Fund Universe:** ${fundsData.length} funds across 30 personas  \n\n`;

  md += `## 1. Most Frequently Recommended Funds\n\n`;
  md += `| Fund Name | Category | Appearances | Avg Score |\n`;
  md += `|---|---|---|---:|\n`;
  for (const [id, v] of sortedFunds.slice(0, 20)) {
    const fund = fundsData.find(f => f.id === id);
    if (fund) {
      md += `| ${fund.name} | ${fund.category || ''} | ${v.count} | ${(v.totalScore / v.count).toFixed(1)} |\n`;
    }
  }

  md += `\n## 2. Most Frequently Recommended Categories\n\n`;
  md += `| Category | Label | Appearances |\n`;
  md += `|---|---|---:|\n`;
  for (const [cat, v] of sortedCats.slice(0, 20)) {
    md += `| ${cat} | ${categoryLabel(cat)} | ${v.count} |\n`;
  }

  md += `\n## 3. Category Distribution by Profile Type\n\n`;
  const goals = [...new Set(PERSONAS.map(p => p.goal))];
  md += `| Category | ${goals.join(' | ')} | Total |\n`;
  md += `|${goals.map(() => '---').join('|')}|:---|\n`;
  for (const [cat, v] of sortedCats.slice(0, 25)) {
    const row = goals.map(g => v.byProfile[g] || 0).join(' | ');
    md += `| ${cat} | ${row} | ${v.count} |\n`;
  }

  md += `\n## 4. Asset Allocation Patterns\n\n`;
  md += `| Asset Class | ${goals.join(' | ')} | Total |\n`;
  md += `|${goals.map(() => '---').join('|')}|:---|\n`;
  for (const [ac, v] of sortedACs) {
    const row = goals.map(g => v.byProfile[g] || 0).join(' | ');
    md += `| ${ac} | ${row} | ${v.count} |\n`;
  }

  md += `\n## 5. Duplicate Recommendation Analysis\n\n`;
  md += `Funds appearing in 6+ personas:\n\n`;
  md += `| Fund Name | Category | Appearances | Personas |\n`;
  md += `|---|---|---:|---|\n`;
  for (const [id, v] of sortedDupes) {
    const fund = fundsData.find(f => f.id === id);
    if (fund) {
      const personas = [...new Set(v.personas)].slice(0, 5).join(', ');
      const remaining = [...new Set(v.personas)].length - 5;
      md += `| ${fund.name} | ${fund.category || ''} | ${v.count} | ${personas}${remaining > 0 ? ` +${remaining} more` : ''} |\n`;
    }
  }

  md += `\n## 6. Funds with Missing Metrics in Top 10\n\n`;
  const nullSummary = missingMetricFunds.reduce((acc, f) => {
    const key = f.fundId;
    if (!acc[key]) acc[key] = { fundName: f.fundName, count: 0, maxNulls: 0, maxScore: 0, personas: new Set<string>() };
    acc[key].count++;
    acc[key].maxNulls = Math.max(acc[key].maxNulls, f.nullFields);
    acc[key].maxScore = Math.max(acc[key].maxScore, f.score);
    acc[key].personas.add(f.persona);
    return acc;
  }, {} as Record<string, { fundName: string; count: number; maxNulls: number; maxScore: number; personas: Set<string> }>);

  const sortedNulls = Object.entries(nullSummary).sort((a, b) => b[1].count - a[1].count);
  if (sortedNulls.length > 0) {
    md += `| Fund Name | Missing Fields | Appearances | Max Score | Personas (sample) |\n`;
    md += `|---|---|---:|---:|---|\n`;
    for (const [id, v] of sortedNulls.slice(0, 20)) {
      const sample = [...v.personas].slice(0, 3).join(', ');
      md += `| ${v.fundName} | ${v.maxNulls} | ${v.count} | ${v.maxScore.toFixed(1)} | ${sample} |\n`;
    }
  } else {
    md += `No funds with missing metrics appeared in the top 10. ✅\n`;
  }

  md += `\n## 7. Flagged Issues\n\n`;

  // Issue A: Over-concentration in one category
  md += `### A. Category Over-Concentration\n\n`;
  const topCatPct = (sortedCats[0][1].count / (results.length * 10)) * 100;
  if (topCatPct > 30) {
    md += `⚠️ **WARNING:** Top category "${sortedCats[0][0]}" appears in ${sortedCats[0][1].count} of ${results.length * 10} slots (${topCatPct.toFixed(1)}%). This may indicate over-concentration.\n\n`;
  } else {
    md += `✅ Top category "${sortedCats[0][0]}" appears in ${sortedCats[0][1].count} of ${results.length * 10} slots (${topCatPct.toFixed(1)}%). Acceptable.\n\n`;
  }

  // Issue B: Same recommendations across unrelated profiles
  md += `### B. Cross-Profile Overlap\n\n`;
  const veryDupes = sortedDupes.length;
  md += `${veryDupes} funds appear in 6+ personas. `;
  if (veryDupes > 3) {
    md += `⚠️ High overlap — engine may not differentiate well between different profiles.\n`;
  } else {
    md += `✅ Overlap is within acceptable range.\n`;
  }
  md += `\n`;

  // Issue C: Young funds ranking highly
  md += `### C. Young Funds in Top Ranks\n\n`;
  const youngFunds: { fundName: string; launch: string; persona: string; rank: number; score: number }[] = [];
  for (const r of results) {
    for (let i = 0; i < r.funds.length; i++) {
      const f = r.funds[i];
      if (f.launch) {
        const launchDate = new Date(String(f.launch));
        const ageYears = (Date.now() - launchDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (ageYears < 1.5) {
          youngFunds.push({ fundName: f.name, launch: String(f.launch), persona: r.persona.name, rank: i + 1, score: f.compositeScore });
        }
      }
    }
  }
  if (youngFunds.length > 0) {
    md += `⚠️ **${youngFunds.length} instances** of funds < 18 months old appearing in top 10:\n\n`;
    md += `| Fund | Launch | Persona | Rank | Score |\n`;
    md += `|---|---|---|---:|---:|\n`;
    for (const yf of youngFunds) {
      md += `| ${yf.fundName} | ${yf.launch} | ${yf.persona} | ${yf.rank} | ${yf.score} |\n`;
    }
  } else {
    md += `✅ No funds under 18 months old appeared in top 10.\n`;
  }
  md += `\n`;

  // Issue D: Missing-metric funds in top ranks
  md += `### D. Missing-Metric Funds in Top Ranks\n\n`;
  const nullInTop3 = missingMetricFunds.filter(f => {
    const personaResult = results.find(r => r.persona.name === f.persona);
    if (!personaResult) return false;
    const rank = personaResult.funds.findIndex(ff => ff.id === f.fundId);
    return rank >= 0 && rank < 3;
  });
  if (nullInTop3.length > 0) {
    md += `⚠️ **${nullInTop3.length} instances** of funds with missing metrics ranking in top 3:\n\n`;
    md += `| Fund | Persona | Null Fields | Score |\n`;
    md += `|---|---|---:|---:|\n`;
    for (const nf of [...new Set(nullInTop3.map(f => f.fundId))].map(id => nullInTop3.find(f => f.fundId === id)!).slice(0, 10)) {
      md += `| ${nf.fundName} | ${nf.persona} | ${nf.nullFields} | ${nf.score} |\n`;
    }
  } else {
    md += `✅ No funds with missing metrics ranked in the top 3.\n`;
  }
  md += `\n`;

  // Fallback analysis
  md += `### E. Fallback Activation\n\n`;
  const fallbackCount = results.filter(r => r.funds.length > 0 && r.funds[0]?.matchLevel !== 'high' && r.funds.length < 10).length;
  if (fallbackCount > 0) {
    const totalFundsInResults = results.reduce((s, r) => s + r.funds.length, 0);
    md += `ℹ️ **${fallbackCount} of 30 personas** produced fewer than 10 recommendations (total: ${totalFundsInResults} funds across all personas).\n\n`;
  } else {
    md += `✅ All 30 personas received 10 recommendations.\n`;
  }

  // Check which personas returned 0 funds
  const zeroResults = results.filter(r => r.funds.length === 0);
  if (zeroResults.length > 0) {
    md += `\n⚠️ **${zeroResults.length} personas returned zero funds:**\n`;
    for (const zr of zeroResults) {
      md += `- ${zr.persona.name} (${zr.persona.goal}, ${zr.persona.riskTolerance})\n`;
    }
    md += `\n`;
  }

  md += `\n## 8. Scoring Engine Improvement Opportunities\n\n`;

  const improvements: string[] = [];

  // Check category diversity
  if (topCatPct > 30) {
    improvements.push(`Reduce Sortino/Sharpe weight for top-performing categories to increase category diversity (top category "${sortedCats[0][0]}" has ${topCatPct.toFixed(0)}% share).`);
  }

  // Check duplicate funds
  if (sortedDupes.length > 3) {
    improvements.push(`Introduce a "novelty bonus" or per-persona diversity constraint to reduce fund overlap across unrelated profiles (${sortedDupes.length} funds appear in 6+ personas).`);
  }

  // Check young funds
  if (youngFunds.length > 0) {
    improvements.push(`Add a launch-date recency penalty (e.g., multiply score by 0.85 for funds < 2 years old) to prevent young funds from ranking too highly.`);
  }

  // Check completeness penalty efficacy
  const maxDupNulls = sortedNulls.length > 0 ? sortedNulls[0][1].maxNulls : 0;
  if (maxDupNulls > 0) {
    improvements.push(`Strengthen the completeness penalty: current 5%/null may be insufficient. Consider 10%/null or a hard floor that prevents funds with 3+ nulls from scoring above 50.`);
  }

  // Check asset class distribution
  const eqPct = (sortedACs.find(a => a[0] === 'Equity')?.[1].count || 0) / (results.length * 10) * 100;
  const dtPct = (sortedACs.find(a => a[0] === 'Debt')?.[1].count || 0) / (results.length * 10) * 100;
  if (eqPct > 70) {
    improvements.push(`Rebalance allocation models to reduce equity dominance (${eqPct.toFixed(0)}% equity across all recommendations). Increase debt/hybrid targets for relevant goals.`);
  }
  if (dtPct < 5) {
    improvements.push(`Debt funds are under-represented (${dtPct.toFixed(1)}% of recommendations). Consider adding debt options to more allocation models.`);
  }

  // Check fallback activation
  if (fallbackCount > 0) {
    improvements.push(`Investigate why ${fallbackCount} personas received fewer than 10 recommendations. This may indicate overly restrictive goal/risk filters for certain combinations.`);
  }

  // Check for goal-category mismatch
  for (const g of goals) {
    const goalPersonas = results.filter(r => r.persona.goal === g);
    const goalFunds = goalPersonas.flatMap(r => r.funds);
    const goalCats = [...new Set(goalFunds.map(f => f.category || ''))];
    const expectedPrefixes: Record<string, string[]> = {
      capital_preservation: ['DT-', 'HY-CH', 'HY-AR', 'HY-EQ S'],
      retirement: ['EQ-', 'HY-', 'DT-'],
      tax_saving: ['EQ-ELSS'],
      wealth_creation: ['EQ-'],
      passive_income: ['DT-', 'HY-CH', 'HY-AR', 'HY-EQ S', 'HY-IPA'],
      child_education: ['EQ-', 'HY-'],
    };
    const expected = expectedPrefixes[g] || [];
    const unexpected = goalCats.filter(c => !expected.some(p => c.startsWith(p)));
    if (unexpected.length > 0 && g !== 'wealth_creation') {
      improvements.push(`Goal "${g}" received unexpected categories: ${unexpected.join(', ')}. Check if fallback is bypassing goal eligibility filters.`);
    }
  }

  // Bonuses & Conservatism
  improvements.push('Evaluate adding a "fund age" stability bonus for funds with 5+ year track record (reduces recency bias).');
  improvements.push('Consider goal-specific CAGR targets instead of global normalization — global normalization may over-weight funds in high-return periods (e.g., gold/silver spikes).');
  improvements.push('Add a Category Diversity Score that rewards multi-category portfolios (complements the existing AMC concentration cap).');
  improvements.push('Review the minimum Sharpe filter for passive_income goal (currently 1.5) — this may exclude many valid debt funds.');
  improvements.push('Explore an "information ratio" or "alpha consistency" component to reward funds that consistently beat their benchmark.');

  for (let i = 0; i < Math.min(improvements.length, 10); i++) {
    md += `${i + 1}. ${improvements[i]}\n`;
  }

  writeFileSync(join(outputDir, 'audit_report.md'), md, 'utf-8');
  console.log('Markdown report written');

  // ── Executive Summary ──
  const zeroCount = results.filter(r => r.funds.length === 0).length;
  const totalRecommendations = results.reduce((s, r) => s + r.funds.length, 0);
  const avgPerPersona = (totalRecommendations / results.length).toFixed(1);
  const uniqueFunds = new Set(results.flatMap(r => r.funds.map(f => f.id))).size;

  const filterLevels = results.flatMap(r => r.funds);
  const highCount = filterLevels.filter(f => f.matchLevel === 'high').length;
  const mediumCount = filterLevels.filter(f => f.matchLevel === 'medium').length;
  const lowCount = filterLevels.filter(f => f.matchLevel === 'low').length;

  let exec = `# CIFRAA Recommendation Engine — Executive Summary\n\n`;
  exec += `**Audit Date:** ${new Date().toISOString().slice(0, 10)}  \n`;
  exec += `**Fund Universe:** ${fundsData.length}  \n`;
  exec += `**Personas Tested:** 30  \n\n`;

  exec += `## Key Metrics\n\n`;
  exec += `| Metric | Value |\n`;
  exec += `|---|---:|\n`;
  exec += `| Total recommendations generated | ${totalRecommendations} |\n`;
  exec += `| Avg recommendations per persona | ${avgPerPersona} |\n`;
  exec += `| Unique funds recommended | ${uniqueFunds} |\n`;
  exec += `| Personas with 0 results | ${zeroCount} |\n`;
  exec += `| High-match recommendations | ${highCount} |\n`;
  exec += `| Medium-match recommendations | ${mediumCount} |\n`;
  exec += `| Low-match recommendations | ${lowCount} |\n`;

  exec += `\n## Top 5 Most Recommended Funds\n\n`;
  exec += `| Fund | Appearances | Avg Score |\n`;
  exec += `|---|---:|---:|\n`;
  for (const [id, v] of sortedFunds.slice(0, 5)) {
    const fund = fundsData.find(f => f.id === id);
    if (fund) {
      exec += `| ${fund.name} | ${v.count} | ${(v.totalScore / v.count).toFixed(1)} |\n`;
    }
  }

  exec += `\n## Asset Class Distribution\n\n`;
  exec += `| Asset Class | Count | Percentage |\n`;
  exec += `|---|---:|---:|\n`;
  for (const [ac, v] of sortedACs) {
    exec += `| ${ac} | ${v.count} | ${(v.count / totalRecommendations * 100).toFixed(1)}% |\n`;
  }

  exec += `\n## Flagged Issues\n\n`;
  exec += `1. **Overlap:** ${sortedDupes.length} funds appear in 6+ personas.\n`;
  exec += `2. **Young funds:** ${youngFunds.length} instances of funds < 18 months old in top 10.\n`;
  exec += `3. **Missing metrics:** ${nullInTop3.length} funds with null fields in top 3 ranks.\n`;
  exec += `4. **Concentration:** Top category "${sortedCats[0][0]}" has ${topCatPct.toFixed(1)}% share.\n`;

  exec += `\n## Top 10 Improvement Opportunities\n\n`;
  for (let i = 0; i < Math.min(improvements.length, 10); i++) {
    exec += `${i + 1}. ${improvements[i]}\n`;
  }

  exec += `\n## Report Files\n\n`;
  exec += `- Full report: \`reports/recommendation-engine/audit_report.md\`\n`;
  exec += `- Raw data: \`reports/recommendation-engine/persona_recommendations.csv\`\n`;
  exec += `- This summary: \`reports/recommendation-engine/executive_summary.md\`\n`;

  writeFileSync(join(outputDir, 'executive_summary.md'), exec, 'utf-8');
  console.log('Executive summary written');
  console.log('Audit complete!');
}

runAudit();
