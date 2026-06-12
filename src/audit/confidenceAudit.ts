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
  computeConfidence,
} from '@/utils/recommendation/intersectionEngine';

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

const PERSONAS: Persona[] = [
  { id: 1,  name: 'Retiree Capital Preservation',     goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large',        description: '' },
  { id: 2,  name: 'Emergency Fund Saver',              goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'beginner',      investmentAmount: 'small',        description: '' },
  { id: 3,  name: 'Moderate Capital Preserver',        goal: 'capital_preservation', riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 4,  name: 'Wealthy Capital Guardian',          goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'medium', experienceLevel: 'experienced',   investmentAmount: 'above_10l',    description: '' },
  { id: 5,  name: 'New Investor Capital Safety',       goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'beginner',      investmentAmount: 'under_1l',     description: '' },
  { id: 6,  name: 'Early Career Retirement',           goal: 'retirement',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: '' },
  { id: 7,  name: 'Mid-Career Retirement Builder',     goal: 'retirement',           riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 8,  name: 'Late-Stage Retirement',             goal: 'retirement',           riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large',        description: '' },
  { id: 9,  name: 'Aggressive Retirement Accumulator', goal: 'retirement',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large',        description: '' },
  { id: 10, name: 'Balanced Retirement Planner',       goal: 'retirement',           riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 11, name: 'Young Tax Saver',                   goal: 'tax_saving',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: '' },
  { id: 12, name: 'Mid-Income Tax Optimizer',          goal: 'tax_saving',           riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 13, name: 'High Earner Tax Planner',           goal: 'tax_saving',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large',        description: '' },
  { id: 14, name: 'Conservative Tax Saver',            goal: 'tax_saving',           riskTolerance: 'conservative', investmentHorizon: 'medium', experienceLevel: 'beginner',      investmentAmount: 'medium',       description: '' },
  { id: 15, name: 'Experienced Tax Arbitrageur',       goal: 'tax_saving',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'above_10l',    description: '' },
  { id: 16, name: 'Young Wealth Builder',              goal: 'wealth_creation',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: '' },
  { id: 17, name: 'Mid-Career Wealth Accumulator',     goal: 'wealth_creation',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 18, name: 'Professional Wealth Creator',       goal: 'wealth_creation',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large',        description: '' },
  { id: 19, name: 'Moderate Wealth Seeker',            goal: 'wealth_creation',      riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 20, name: 'Conservative Growth',               goal: 'wealth_creation',      riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: '' },
  { id: 21, name: 'Liquid Emergency Builder',          goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'beginner',      investmentAmount: 'small',        description: '' },
  { id: 22, name: 'Stable Income Emergency',           goal: 'passive_income',       riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 23, name: 'Moderate Liquidity Buffer',         goal: 'capital_preservation', riskTolerance: 'moderate',    investmentHorizon: 'short',  experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 24, name: 'Large Emergency Reserve',           goal: 'capital_preservation', riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large',        description: '' },
  { id: 25, name: 'Yield-Seeking Emergency Fund',      goal: 'passive_income',       riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 26, name: 'New Parent Education Fund',         goal: 'child_education',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: '' },
  { id: 27, name: 'Mid-Term Education Planner',        goal: 'child_education',      riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
  { id: 28, name: 'Near-College Education Fund',       goal: 'child_education',      riskTolerance: 'conservative', investmentHorizon: 'short',  experienceLevel: 'experienced',   investmentAmount: 'large',        description: '' },
  { id: 29, name: 'Aggressive Education Accumulator',  goal: 'child_education',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'medium',       description: '' },
  { id: 30, name: 'Balanced Education Planner',        goal: 'child_education',      riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '' },
];

function safeNum(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? null : n;
}

function countNullFields(fund: ScoredFund): number {
  let n = 0;
  if (fund.sharpeRatio == null) n++;
  if (fund.sortinoRatio == null) n++;
  if (fund.volatility == null && fund.stdDev == null) n++;
  if (fund.cagr3Y == null && fund.ret3Y == null) n++;
  return n;
}

async function runConfidenceAudit() {
  const outputDir = join(__dirname, 'output');
  mkdirSync(outputDir, { recursive: true });

  const fundsData = JSON.parse(readFileSync(join(__dirname, 'funds_data.json'), 'utf-8')) as MutualFund[];

  // Collect all recommendations with confidence data
  interface ConfidenceEntry {
    fundId: string;
    fundName: string;
    confidenceLevel: string;
    confidenceReason: string;
    launch: string;
    missingCritical: string[];
    score: number;
    personas: { name: string; rank: number }[];
    appearances: number;
  }

  const confidenceMap = new Map<string, ConfidenceEntry>();

  for (const persona of PERSONAS) {
    const prefs: RecommendationPreferences = {
      riskTolerance: persona.riskTolerance,
      investmentGoal: persona.goal,
      investmentHorizon: persona.investmentHorizon,
      experienceLevel: persona.experienceLevel,
      investmentAmount: persona.investmentAmount,
    };

    const recommended = recommendFundsV2(fundsData, prefs);

    for (let i = 0; i < recommended.length; i++) {
      const fund = recommended[i];
      if (!confidenceMap.has(fund.id)) {
        const fundData = fundsData.find(f => f.id === fund.id)!;
        const missingCrit: string[] = [];
        if (safeNum(fund.sharpeRatio) === null) missingCrit.push('Sharpe');
        if ((safeNum(fund.volatility) ?? safeNum(fund.stdDev)) === null) missingCrit.push('Volatility');
        if (safeNum(fund.ret3Y ?? fund.cagr3Y) === null) missingCrit.push('CAGR');
        confidenceMap.set(fund.id, {
          fundId: fund.id,
          fundName: fund.name,
          confidenceLevel: fund.confidenceLevel || 'unknown',
          confidenceReason: fund.confidenceReason || '',
          launch: String(fundData.launch || 'N/A'),
          missingCritical: missingCrit,
          score: fund.compositeScore,
          personas: [],
          appearances: 0,
        });
      }
      const entry = confidenceMap.get(fund.id)!;
      entry.appearances++;
      entry.personas.push({ name: persona.name, rank: i + 1 });
    }
  }

  // Sort by confidence level (lowest first), then by score ascending
  const sorted = [...confidenceMap.values()].sort((a, b) => {
    const order = { limited_history: 0, medium: 1, high: 2, unknown: 3 };
    const diff = (order[a.confidenceLevel as keyof typeof order] ?? 0) - (order[b.confidenceLevel as keyof typeof order] ?? 0);
    if (diff !== 0) return diff;
    return a.score - b.score;
  });

  const lowestConfidence = sorted.filter(e => e.confidenceLevel === 'limited_history').slice(0, 20);

  let md = `# Confidence Audit Report\n\n`;
  md += `**Date:** ${new Date().toISOString().slice(0, 10)}  \n`;
  md += `**Fund Universe:** ${fundsData.length} funds across 30 personas  \n\n`;

  md += `## Confidence Distribution\n\n`;
  const highCount = sorted.filter(e => e.confidenceLevel === 'high').length;
  const medCount = sorted.filter(e => e.confidenceLevel === 'medium').length;
  const limitedCount = sorted.filter(e => e.confidenceLevel === 'limited_history').length;
  md += `| Confidence Level | Unique Funds | % of Unique Funds |\n`;
  md += `|---|---:|---:|\n`;
  md += `| High | ${highCount} | ${(highCount / sorted.length * 100).toFixed(1)}% |\n`;
  md += `| Medium | ${medCount} | ${(medCount / sorted.length * 100).toFixed(1)}% |\n`;
  md += `| Limited History | ${limitedCount} | ${(limitedCount / sorted.length * 100).toFixed(1)}% |\n\n`;

  // Top 20 lowest confidence
  md += `## Top 20 Lowest-Confidence Funds (Limited History)\n\n`;
  md += `| # | Fund Name | Confidence | Launch | Missing Critical | Score | Appearances | Personas (sample) |\n`;
  md += `|---|---|---|---|---|---:|---:|---|\n`;

  for (let i = 0; i < lowestConfidence.length; i++) {
    const entry = lowestConfidence[i];
    const samplePersonas = [...new Set(entry.personas.map(p => p.name))].slice(0, 3).join(', ');
    const remaining = [...new Set(entry.personas.map(p => p.name))].length - 3;
    md += `| ${i + 1} | ${entry.fundName} | ${entry.confidenceLevel} | ${entry.launch} | ${entry.missingCritical.join(', ') || 'None'} | ${entry.score.toFixed(1)} | ${entry.appearances} | ${samplePersonas}${remaining > 0 ? ` +${remaining} more` : ''} |\n`;
  }

  // Persona-level detail
  md += `\n## Detailed Persona Breakdown (Lowest-Confidence Funds)\n\n`;
  for (const entry of lowestConfidence) {
    md += `### ${entry.fundName}\n\n`;
    md += `| Field | Value |\n|---|---:|\n`;
    md += `| Confidence | ${entry.confidenceLevel} |\n`;
    md += `| Launch | ${entry.launch} |\n`;
    md += `| Missing Critical | ${entry.missingCritical.join(', ') || 'None'} |\n`;
    md += `| Max Score | ${entry.score} |\n`;
    md += `| Appearances | ${entry.appearances} |\n\n`;
    md += `| Persona | Rank | Score |\n`;
    md += `|---|---|---:|\n`;
    for (const p of entry.personas) {
      md += `| ${p.name} | ${p.rank} | ${entry.score} |\n`;
    }
    md += `\n`;
  }

  // Summary analysis
  md += `## Analysis\n\n`;
  md += `### Why Low-Confidence Funds Appear\n\n`;
  md += `Low-confidence funds (limited_history) appear because:\n\n`;
  md += `1. **Young funds (< 3 years)** still get scored and ranked by the same engine. The age penalty (×0.70–0.85) is insufficient to push them below complete, older funds when their CAGR is exceptional.\n\n`;
  md += `2. **Index ETFs and new fund launches** often have missing Sharpe, Sortino, and Volatility data because they haven't accumulated enough history for these metrics to be calculated.\n\n`;
  md += `3. **The completeness penalty (15% per critical null)** is applied after CAGR weighting, but CAGR weight (25-30%) can still dominate when the fund has strong 1Y/3Y returns.\n\n`;
  md += `### Confidence Scoring Impact\n\n`;
  md += `Confidence scoring does **not** change rankings. It provides transparency to end users about data reliability. The engine currently treats missing data as neutral (expense, AUM) or beneficial (volatility → perfect score), which is the root cause of low-confidence funds appearing in top ranks.\n\n`;
  md += `**${limitedCount} unique funds** (${(limitedCount / sorted.length * 100).toFixed(1)}%) across all recommendations have limited history confidence. These are concentrated in index/ETF categories and recently launched active funds.\n`;

  writeFileSync(join(outputDir, 'confidence_audit_report.md'), md, 'utf-8');
  console.log('Confidence audit report written');
}

runConfidenceAudit();
