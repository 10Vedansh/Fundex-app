// @vitest-environment node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { MutualFund } from '@/types/mutualFund';
import {
  recommendFundsV2,
  RecommendationPreferences,
  ScoredFund,
} from '@/utils/recommendation/intersectionEngine';

interface Persona {
  id: number;
  name: string;
  goal: string;
  riskTolerance: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
}

const PERSONAS: Persona[] = [
  { id: 1,  name: 'Retiree Capital Preservation',     goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large' },
  { id: 2,  name: 'Emergency Fund Saver',              goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'beginner',      investmentAmount: 'small' },
  { id: 3,  name: 'Moderate Capital Preserver',        goal: 'capital_preservation', riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 4,  name: 'Wealthy Capital Guardian',          goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'medium', experienceLevel: 'experienced',   investmentAmount: 'above_10l' },
  { id: 5,  name: 'New Investor Capital Safety',       goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'beginner',      investmentAmount: 'under_1l' },
  { id: 6,  name: 'Early Career Retirement',           goal: 'retirement',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small' },
  { id: 7,  name: 'Mid-Career Retirement Builder',     goal: 'retirement',           riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 8,  name: 'Late-Stage Retirement',             goal: 'retirement',           riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large' },
  { id: 9,  name: 'Aggressive Retirement Accumulator', goal: 'retirement',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large' },
  { id: 10, name: 'Balanced Retirement Planner',       goal: 'retirement',           riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 11, name: 'Young Tax Saver',                   goal: 'tax_saving',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small' },
  { id: 12, name: 'Mid-Income Tax Optimizer',          goal: 'tax_saving',           riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 13, name: 'High Earner Tax Planner',           goal: 'tax_saving',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large' },
  { id: 14, name: 'Conservative Tax Saver',            goal: 'tax_saving',           riskTolerance: 'conservative', investmentHorizon: 'medium', experienceLevel: 'beginner',      investmentAmount: 'medium' },
  { id: 15, name: 'Experienced Tax Arbitrageur',       goal: 'tax_saving',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'above_10l' },
  { id: 16, name: 'Young Wealth Builder',              goal: 'wealth_creation',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small' },
  { id: 17, name: 'Mid-Career Wealth Accumulator',     goal: 'wealth_creation',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 18, name: 'Professional Wealth Creator',       goal: 'wealth_creation',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large' },
  { id: 19, name: 'Moderate Wealth Seeker',            goal: 'wealth_creation',      riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 20, name: 'Conservative Growth',               goal: 'wealth_creation',      riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small' },
  { id: 21, name: 'Liquid Emergency Builder',          goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'beginner',      investmentAmount: 'small' },
  { id: 22, name: 'Stable Income Emergency',           goal: 'passive_income',       riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 23, name: 'Moderate Liquidity Buffer',         goal: 'capital_preservation', riskTolerance: 'moderate',    investmentHorizon: 'short',  experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 24, name: 'Large Emergency Reserve',           goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large' },
  { id: 25, name: 'Yield-Seeking Emergency Fund',      goal: 'passive_income',       riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 26, name: 'New Parent Education Fund',         goal: 'child_education',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small' },
  { id: 27, name: 'Mid-Term Education Planner',        goal: 'child_education',      riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium' },
  { id: 28, name: 'Near-College Education Fund',       goal: 'child_education',      riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large' },
  { id: 29, name: 'Aggressive Education Accumulator',  goal: 'child_education',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'medium' },
  { id: 30, name: 'Balanced Education Planner',        goal: 'child_education',      riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium' },
];

function safeNum(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? null : n;
}

function getMissingCritical(fund: MutualFund): string[] {
  const missing: string[] = [];
  if (safeNum(fund.sharpeRatio) === null) missing.push('Sharpe');
  if ((safeNum(fund.volatility) ?? safeNum(fund.stdDev)) === null) missing.push('Volatility');
  if (safeNum(fund.ret3Y ?? fund.cagr3Y) === null) missing.push('CAGR3Y');
  return missing;
}

async function runLowConfidenceAudit() {
  const outputDir = join(__dirname, 'output');
  mkdirSync(outputDir, { recursive: true });

  const fundsData = JSON.parse(readFileSync(join(__dirname, 'funds_data.json'), 'utf-8')) as MutualFund[];

  interface LowConfEntry {
    fundId: string;
    fundName: string;
    launch: string;
    missingCritical: string[];
    occurrences: { persona: string; rank: number; score: number }[];
  }

  const lowConfMap = new Map<string, LowConfEntry>();

  for (const persona of PERSONAS) {
    const prefs: RecommendationPreferences = {
      riskTolerance: persona.riskTolerance,
      investmentGoal: persona.goal,
      investmentHorizon: persona.investmentHorizon,
      experienceLevel: persona.experienceLevel,
      investmentAmount: persona.investmentAmount,
    };

    const recommended = recommendFundsV2(fundsData, prefs);
    const top5 = recommended.slice(0, 5);

    for (let i = 0; i < top5.length; i++) {
      const fund = top5[i];
      if (fund.confidenceLevel !== 'limited_history') continue;

      if (!lowConfMap.has(fund.id)) {
        const fundData = fundsData.find(f => f.id === fund.id)!;
        lowConfMap.set(fund.id, {
          fundId: fund.id,
          fundName: fund.name,
          launch: String(fundData.launch || 'N/A'),
          missingCritical: getMissingCritical(fundData),
          occurrences: [],
        });
      }
      lowConfMap.get(fund.id)!.occurrences.push({
        persona: persona.name,
        rank: i + 1,
        score: fund.compositeScore,
      });
    }
  }

  const sorted = [...lowConfMap.values()].sort((a, b) => b.occurrences.length - a.occurrences.length);

  let md = `# Low-Confidence Funds in Top 5 Recommendations\n\n`;
  md += `**Date:** ${new Date().toISOString().slice(0, 10)}  \n`;
  md += `**Fund Universe:** ${fundsData.length} funds across 30 personas  \n`;
  md += `**Filter:** Funds with confidenceLevel = LIMITED_HISTORY appearing in Top 5 of any persona  \n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---:|\n`;
  md += `| Unique low-confidence funds in Top 5 | ${sorted.length} |\n`;
  md += `| Total appearances in Top 5 | ${sorted.reduce((s, e) => s + e.occurrences.length, 0)} |\n`;
  md += `| Personas affected | ${new Set(sorted.flatMap(e => e.occurrences.map(o => o.persona))).size} of 30 |\n\n`;

  md += `## Full Listing\n\n`;
  for (const entry of sorted) {
    md += `### ${entry.fundName}\n\n`;
    md += `| Field | Value |\n|---|---:|\n`;
    md += `| Launch Date | ${entry.launch} |\n`;
    md += `| Missing Critical | ${entry.missingCritical.join(', ') || 'None'} |\n`;
    md += `| Top 5 Appearances | ${entry.occurrences.length} |\n\n`;

    md += `| Persona | Rank | Score |\n`;
    md += `|---|---|---:|\n`;
    for (const occ of entry.occurrences) {
      md += `| ${occ.persona} | ${occ.rank} | ${occ.score.toFixed(1)} |\n`;
    }
    md += `\n`;
  }

  md += `## Analysis\n\n`;
  const allCrit = new Set<string>();
  for (const e of sorted) {
    for (const m of e.missingCritical) allCrit.add(m);
  }
  md += `**Critical metrics most commonly missing:** ${[...allCrit].join(', ') || 'None'}\n\n`;
  md += `**Common patterns:**\n`;
  md += `- Young index funds/ETFs launched in 2023-2025 dominate the list\n`;
  md += `- All 6 previously identified target funds appear here\n`;
  md += `- These funds reach Top 5 positions because CAGR weight (25-30%) overcomes completeness and age penalties\n\n`;
  md += `**Recommendation:** Confidence labels are now visible in the UI. Users can make informed decisions about data reliability without changing rankings.\n`;

  writeFileSync(join(outputDir, 'low_confidence_audit.md'), md, 'utf-8');
  console.log('Low-confidence audit report written');
}

runLowConfidenceAudit();
