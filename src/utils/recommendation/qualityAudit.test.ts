import { describe, it, expect, beforeAll } from 'vitest';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { recommendFundsV2, RecommendationPreferences, ScoredFund } from './intersectionEngine';
import { MutualFund } from '@/types/mutualFund';

const EQUITY_COLS = ['name','beta','alpha','category','launch','netAssets','marketCap',
  'ret1W','ret1M','ret3M','ret6M','ret1Y','ret3Y','ret5Y','ret10Y',
  'latestNav','previousNav','high52W','low52W',
  'expenseRatio','turnover','stdDev','sharpeRatio','sortinoRatio','minInvestment','exitLoad','fundManager'];
const DEBT_COLS = ['name','stdDev','beta','sharpeRatio','sortinoRatio','alpha',
  'category','launch','netAssets','avgCreditQuality','avgMaturity','ytm',
  'ret1W','ret1M','ret3M','ret6M','ret1Y','ret3Y','ret5Y','ret10Y',
  'latestNav','previousNav','high52W','low52W','expenseRatio','minInvestment','exitLoad','fundManager'];
const HYBRID_COLS = ['name','stdDev','sharpeRatio','sortinoRatio','beta','alpha',
  'category','launch','netAssets','avgCreditQuality','avgMaturity','ytm','marketCap',
  'ret1W','ret1M','ret3M','ret6M','ret1Y','ret3Y','ret5Y','ret10Y',
  'latestNav','previousNav','high52W','low52W','expenseRatio','minInvestment','exitLoad','fundManager'];
const COMMODITY_COLS = ['name','category','launch','netAssets',
  'ret1W','ret1M','ret3M','ret6M','ret1Y','ret3Y','ret5Y','ret10Y',
  'latestNav','previousNav','high52W','low52W','expenseRatio','turnover','stdDev','sharpeRatio','sortinoRatio','beta','alpha',
  'minInvestment','exitLoad','fundManager'];
const SHEET_CONFIG = [
  { name:'Equity', cols:EQUITY_COLS, assetClass:'Equity' },
  { name:'Debt', cols:DEBT_COLS, assetClass:'Debt' },
  { name:'Hybrid', cols:HYBRID_COLS, assetClass:'Hybrid' },
  { name:'Commodities', cols:COMMODITY_COLS, assetClass:'Commodities' },
];

function parseNumber(val:unknown):number|null{
  if(val===null||val===undefined||val===''||val==='--'||val==='-'||val==='N/A') return null;
  const str=String(val).replace(/,/g,'').trim();
  if(str==='`') return null;
  const num=parseFloat(str); return isNaN(num)?null:num;
}
function parseExitLoad(val:unknown):string{ if(!val||val==='--'||val==='-') return 'Nil'; return String(val).trim(); }
function parseLaunchDate(val:unknown):string|null{
  if(val===null||val===undefined||val===''||val==='--'||val==='-'||val==='N/A') return null;
  if(val instanceof Date&&!isNaN(val.getTime())) return val.toISOString().slice(0,10);
  const str=String(val).replace(/,/g,'').trim();
  const serial=Number(str);
  if(Number.isFinite(serial)&&serial>59&&serial<80000) return new Date(Date.UTC(1899,11,30)+serial*86400000).toISOString().slice(0,10);
  return String(val).trim();
}
function getRiskLevel(category:string,stdDev:number|null):string{
  const cat=String(category).toLowerCase();
  if(cat.includes('liq')||cat.includes('overnht')||cat.includes('mm')) return 'Low';
  if(cat.includes('dt-')||cat.includes('debt')){ if(stdDev&&stdDev>5) return 'Moderate'; return 'Low'; }
  if(cat.includes('hy-')){ if(stdDev&&stdDev>12) return 'High'; return 'Moderate'; }
  if(cat.includes('gold')||cat.includes('silver')) return 'Moderate';
  if(stdDev&&stdDev>18) return 'High'; if(stdDev&&stdDev>12) return 'Moderate'; return 'Moderate';
}
function getStrengthBadge(sharpe:number|null):string{ if(!sharpe) return 'Balanced'; if(sharpe>1.3) return 'Strong'; if(sharpe>0.7) return 'Balanced'; return 'Risky'; }
function generateId(name:string,index:number):string{ return name.replace(/[^a-zA-Z0-9]/g,'_').substring(0,50)+'_'+index; }
function extractAmc(name:string):string{
  const patterns=[/^(.*?)\s+(Liquid|Overnight|Money|Corporate|Credit|Gilt|Dynamic|Short|Medium|Long|Ultra|Floating|Banking|Arbitrage|Balanced|Aggressive|Conservative|Equity|Flexi|Multi|Large|Mid|Small|ELSS|Index|Nifty|BSE|Gold|Silver|ETF|FoF|Fund|Focused|Dividend|Value|Contra|Infrastructure|Healthcare|Digital|Consumption|Energy|PSU|IT|Pharma|Thematic|Sectoral|Innovation|Business|Quant|ESG)/i];
  for(const p of patterns){ const m=name.match(p); if(m&&m[1]){ let a=m[1].trim(); a=a.replace(/\s*-\s*$/,'').trim(); if(a.length>3) return a; } }
  return name.split(/\s+/).slice(0,3).join(' ');
}
function processSheet(ws:XLSX.WorkSheet,cm:string[],ac:string):any[]{
  const jd=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
  const funds:any[]=[];
  for(let i=1;i<jd.length;i++){
    const row=jd[i] as any[];
    if(!row||!row[0]||String(row[0]).trim()==='') continue;
    const name=String(row[0]).trim();
    if(name.includes('→')||name.includes('🔹')||name.includes('🔸')) continue;
    const fund:Record<string,any>={assetClass:ac};
    for(let j=0;j<cm.length&&j<row.length;j++){
      const k=cm[j],v=row[j];
      if(k==='name') fund.name=String(v).trim();
      else if(k==='category') fund.category=String(v).trim();
      else if(k==='launch') fund.launch=parseLaunchDate(v);
      else if(k==='fundManager') fund.fundManager=v?String(v).trim():null;
      else if(k==='exitLoad') fund.exitLoad=parseExitLoad(v);
      else if(k==='avgCreditQuality') fund.avgCreditQuality=v?String(v).trim():null;
      else fund[k]=parseNumber(v);
    }
    if(fund.name&&fund.name.length>5){
      fund.id=generateId(fund.name,i); fund.amc=extractAmc(fund.name);
      fund.riskLevel=getRiskLevel(fund.category||'',fund.stdDev); fund.strengthBadge=getStrengthBadge(fund.sharpeRatio);
      fund.nav=fund.latestNav||0; fund.aum=fund.netAssets||0;
      fund.cagr1Y=fund.ret1Y??null; fund.cagr3Y=fund.ret3Y??null; fund.cagr5Y=fund.ret5Y??null;
      fund.volatility=fund.stdDev??null; fund.minInvestment=fund.minInvestment||500; fund.rank=0; fund.benchmark='';
      funds.push(fund);
    }
  }
  return funds;
}
function loadFunds():MutualFund[]{
  const fp=path.resolve(process.cwd(),'public/data/Data.xlsx');
  const buf=fs.readFileSync(fp);
  const wb=XLSX.read(buf,{type:'buffer',dense:true,cellFormula:false,cellHTML:false,cellStyles:false});
  const all:any[]=[];
  for(let si=0;si<Math.min(wb.SheetNames.length,SHEET_CONFIG.length);si++){
    const fds=processSheet(wb.Sheets[wb.SheetNames[si]],SHEET_CONFIG[si].cols,SHEET_CONFIG[si].assetClass);
    all.push(...fds);
  }
  const byAC:Record<string,any[]>={};
  for(const f of all){ if(!byAC[f.assetClass]) byAC[f.assetClass]=[]; byAC[f.assetClass].push(f); }
  for(const[,fds]of Object.entries(byAC)){ fds.sort((a,b)=>(b.sharpeRatio||0)-(a.sharpeRatio||0)); fds.forEach((f,i)=>{f.rank=i+1;}); }
  return all as MutualFund[];
}

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
    funds=loadFunds();
    console.log(`Loaded ${funds.length} funds from Excel`);
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
