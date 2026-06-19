import { describe, it, expect, beforeAll } from 'vitest';
import { recommendFundsV2, RecommendationPreferences, ScoredFund } from './intersectionEngine';
import { MutualFund } from '@/types/mutualFund';
import { MOCK_FUNDS } from './mockFundUniverse';

interface ProfileResult {
  label:string;
  prefs:RecommendationPreferences;
  recommendations:ScoredFund[];
  catBreak:Record<string,number>;
  acPct:Record<string,string>;
  avgCagr:number;
  avgVol:number;
  avgScore:number;
  maxAmc:number;
  flags:string[];
}

function getAC(cat:string):string{
  if(!cat) return 'Unknown';
  const c=cat.trim();
  if(c.startsWith('EQ-')||c==='Equity') return 'Equity';
  if(c.startsWith('DT-')||c.startsWith('Debt')) return 'Debt';
  if(c.startsWith('HY-')||c.startsWith('Hybrid')) return 'Hybrid';
  if(c==='Gold-Funds'||c.startsWith('Commodity')) return 'Commodity';
  if(c==='Index') return 'Equity';
  return 'Other';
}

const PROFILES:{label:string;prefs:RecommendationPreferences}[]=[
  {label:'Beginner Conservative',prefs:{riskTolerance:'conservative',investmentGoal:'capital_preservation',investmentHorizon:'short',experienceLevel:'beginner',investmentAmount:'medium'}},
  {label:'Beginner Moderate',prefs:{riskTolerance:'moderate',investmentGoal:'wealth_creation',investmentHorizon:'medium',experienceLevel:'beginner',investmentAmount:'medium'}},
  {label:'Beginner Aggressive',prefs:{riskTolerance:'aggressive',investmentGoal:'wealth_creation',investmentHorizon:'long',experienceLevel:'beginner',investmentAmount:'medium'}},
  {label:'Intermediate Conservative',prefs:{riskTolerance:'conservative',investmentGoal:'capital_preservation',investmentHorizon:'short',experienceLevel:'intermediate',investmentAmount:'medium'}},
  {label:'Intermediate Moderate',prefs:{riskTolerance:'moderate',investmentGoal:'wealth_creation',investmentHorizon:'medium',experienceLevel:'intermediate',investmentAmount:'medium'}},
  {label:'Intermediate Aggressive',prefs:{riskTolerance:'aggressive',investmentGoal:'wealth_creation',investmentHorizon:'long',experienceLevel:'intermediate',investmentAmount:'medium'}},
  {label:'Advanced Conservative',prefs:{riskTolerance:'conservative',investmentGoal:'capital_preservation',investmentHorizon:'short',experienceLevel:'advanced',investmentAmount:'medium'}},
  {label:'Advanced Moderate',prefs:{riskTolerance:'moderate',investmentGoal:'wealth_creation',investmentHorizon:'medium',experienceLevel:'advanced',investmentAmount:'medium'}},
  {label:'Advanced Aggressive',prefs:{riskTolerance:'aggressive',investmentGoal:'wealth_creation',investmentHorizon:'long',experienceLevel:'advanced',investmentAmount:'medium'}},
  {label:'Advanced Aggressive + Tech',prefs:{riskTolerance:'aggressive',investmentGoal:'wealth_creation',investmentHorizon:'long',experienceLevel:'advanced',investmentAmount:'large'}},
];

describe('Recommendation Quality Audit',()=>{
  let funds:MutualFund[];
  let results:ProfileResult[];

  beforeAll(()=>{
    funds=MOCK_FUNDS;
    console.log(`Loaded ${funds.length} funds for quality audit`);
  });

  it('runs 10 profiles and outputs audit',()=>{
    results=[];

    for(const p of PROFILES){
      const recs=recommendFundsV2(funds,p.prefs);
      
      const catBreak:Record<string,number>={};
      const acCounts:Record<string,number>={};
      const amcCounts:Record<string,number>={};
      let tc=0,cc=0,tv=0,vc=0,ts=0;

      for(const f of recs){
        const cat=(f as any).category||'Unknown';
        catBreak[cat]=(catBreak[cat]||0)+1;
        const ac=getAC(cat); acCounts[ac]=(acCounts[ac]||0)+1;
        
        const cagr=(f as any).cagr1Y??(f as any).ret1Y;
        if(cagr!==null&&cagr!==undefined){ tc+=Number(cagr); cc++; }
        const vol=f.volatility??(f as any).stdDev;
        if(vol!==null&&vol!==undefined){ tv+=Number(vol); vc++; }
        ts+=f.compositeScore;
        const amc=(f as any).amc||'unknown'; amcCounts[amc]=(amcCounts[amc]||0)+1;
      }

      const total=recs.length;
      const acPct:Record<string,string>={};
      for(const[k,v]of Object.entries(acCounts)) acPct[k]=((v/total)*100).toFixed(0)+'%';
      const avgCagr=cc>0?(tc/cc):0;
      const avgVol=vc>0?(tv/vc):0;
      const avgScore=total>0?(ts/total):0;
      const maxAmc=Math.max(...Object.values(amcCounts),0);

      const flags:string[]=[];
      const lowP=p.label.toLowerCase();
      if(lowP.includes('conservative')&&(acCounts['Equity']||0)>2) flags.push(`${acCounts['Equity']||0} equity funds`);
      if(lowP.includes('aggressive')&&!lowP.includes('conserv')&&(acCounts['Debt']||0)>3) flags.push(`${acCounts['Debt']||0} debt funds`);
      if(recs.length<5) flags.push(`only ${recs.length} recs`);
      if(maxAmc>2) flags.push(`AMC conc: max=${maxAmc}`);
      if(recs.some(f=>{const c=(f as any).category;return c&&(c==='Unknown'||c==='Other - Unclassified');})) flags.push('uncategorized fund');
      // Check moderate profiles have debt/hybrid
      if(lowP.includes('moderate')&&parseInt(acPct['Debt']||'0')===0&&parseInt(acPct['Hybrid']||'0')===0) flags.push('ZERO debt/hybrid - all equity');

      results.push({label:p.label,prefs:p.prefs,recommendations:recs,catBreak,acPct,avgCagr,avgVol,avgScore,maxAmc,flags});
    }

    // Summary table
    console.log('\n'+'='.repeat(130));
    console.log('RECOMMENDATION QUALITY AUDIT');
    console.log('='.repeat(130));
    console.log(`${'PROFILE'.padEnd(30)} ${'#F'.padEnd(4)} ${'CAGR%'.padEnd(8)} ${'Vol%'.padEnd(8)} ${'Score'.padEnd(8)} ${'Eq%'.padEnd(6)} ${'Debt%'.padEnd(7)} ${'Hyb%'.padEnd(7)} ${'Flags'}`);
    console.log('-'.repeat(130));
    for(const r of results){
      const eq=r.acPct['Equity']||'0%', dt=r.acPct['Debt']||'0%', hy=r.acPct['Hybrid']||'0%';
      const fg=r.flags.length>0?`⚠${r.flags.join(';')}`:'✅';
      console.log(`${r.label.padEnd(30)} ${String(r.recommendations.length).padEnd(4)} ${r.avgCagr.toFixed(1).padEnd(8)} ${r.avgVol.toFixed(1).padEnd(8)} ${r.avgScore.toFixed(1).padEnd(8)} ${eq.padEnd(6)} ${dt.padEnd(7)} ${hy.padEnd(7)} ${fg}`);
    }

    // Detail per profile (show moderate first)
    for(const r of results){
      if(!r.label.toLowerCase().includes('moderate')) continue;
      console.log(`\n${'─'.repeat(100)}`);
      console.log(`PROFILE: ${r.label}`);
      console.log(`  Asset Mix: ${Object.entries(r.acPct).map(([k,v])=>`${k}:${v}`).join(', ')}`);
      console.log(`  Avg CAGR: ${r.avgCagr.toFixed(1)}% | Avg Vol: ${r.avgVol.toFixed(1)}% | Avg Score: ${r.avgScore.toFixed(1)}`);
      if(r.flags.length>0) console.log(`  ⚠ FLAGS: ${r.flags.join('; ')}`);
      console.log(`  Categories:`);
      const sc=Object.entries(r.catBreak).sort((a,b)=>b[1]-a[1]);
      for(const[cat,cnt]of sc) console.log(`    ${cat}: ${cnt}`);
      console.log(`  Top funds:`);
      r.recommendations.slice(0,4).forEach((f,i)=>{
        const cat=(f as any).category||'?';
        const cagr=(f as any).cagr1Y??(f as any).ret1Y;
        const vol=f.volatility??(f as any).stdDev;
        const n=(f as any).name||'?';
        console.log(`    ${i+1}. ${n.substring(0,50)} [${cat}] CAGR=${cagr!==null?cagr.toFixed(1):'N/A'} Vol=${vol!==null?vol.toFixed(1):'N/A'} Score=${f.compositeScore.toFixed(1)}`);
      });
    }

    // Quality Assessment
    console.log('\n\n'+'='.repeat(130));
    console.log('PRODUCTION READINESS ASSESSMENT');
    console.log('='.repeat(130));

    const allFlags=results.flatMap(r=>r.flags);
    let qScore=100;
    if(allFlags.length>0){
      qScore-=allFlags.length*10;
      console.log(`\n⚠ ${allFlags.length} quality flags found`);
      for(const r of results.filter(r=>r.flags.length>0)){
        console.log(`  ${r.label}: ${r.flags.join('; ')}`);
      }
    } else console.log('\n✅ No quality flags');

    console.log(`\n✅ ${new Set(results.flatMap(r=>r.recommendations.map(f=>f.id))).size} unique funds across ${results.length} profiles`);

    expect(results.length).toBe(10);
    for(const r of results){
      expect(r.recommendations.length).toBeGreaterThanOrEqual(3);
      if(r.label.toLowerCase().includes('moderate')){
        expect(r.flags.some(f=>f.includes('ZERO debt/hybrid'))).toBeFalsy();
      }
    }
  });
});
