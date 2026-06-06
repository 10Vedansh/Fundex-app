import { MutualFund, SECTOR_COLORS } from '@/types/mutualFund';

export interface StockHolding {
  name: string;
  sector: string;
  percentage: number;
}

export interface AssetSplit {
  type: string;
  percentage: number;
  color: string;
}

export interface SectorSplit {
  sector: string;
  percentage: number;
  color: string;
}

// Realistic stock pools by category
const EQUITY_LARGE_CAP_STOCKS: StockHolding[] = [
  { name: 'HDFC Bank Ltd', sector: 'Financial Services', percentage: 9.2 },
  { name: 'Reliance Industries Ltd', sector: 'Oil & Gas', percentage: 8.5 },
  { name: 'ICICI Bank Ltd', sector: 'Financial Services', percentage: 7.1 },
  { name: 'Infosys Ltd', sector: 'Information Technology', percentage: 6.8 },
  { name: 'TCS Ltd', sector: 'Information Technology', percentage: 5.9 },
  { name: 'Bharti Airtel Ltd', sector: 'Telecommunication', percentage: 4.3 },
  { name: 'ITC Ltd', sector: 'FMCG', percentage: 4.1 },
  { name: 'Kotak Mahindra Bank Ltd', sector: 'Financial Services', percentage: 3.8 },
  { name: 'Larsen & Toubro Ltd', sector: 'Construction', percentage: 3.5 },
  { name: 'Axis Bank Ltd', sector: 'Financial Services', percentage: 3.2 },
  { name: 'State Bank of India', sector: 'Financial Services', percentage: 3.0 },
  { name: 'HUL Ltd', sector: 'FMCG', percentage: 2.8 },
  { name: 'Bajaj Finance Ltd', sector: 'Financial Services', percentage: 2.6 },
  { name: 'Sun Pharma Industries', sector: 'Healthcare', percentage: 2.4 },
  { name: 'Maruti Suzuki India Ltd', sector: 'Automobile', percentage: 2.2 },
];

const EQUITY_MID_CAP_STOCKS: StockHolding[] = [
  { name: 'Persistent Systems Ltd', sector: 'Information Technology', percentage: 5.8 },
  { name: 'Tube Investments of India', sector: 'Capital Goods', percentage: 5.2 },
  { name: 'Max Healthcare Institute', sector: 'Healthcare', percentage: 4.9 },
  { name: 'Oberoi Realty Ltd', sector: 'Real Estate', percentage: 4.5 },
  { name: 'Coforge Ltd', sector: 'Information Technology', percentage: 4.2 },
  { name: 'The Federal Bank Ltd', sector: 'Financial Services', percentage: 3.9 },
  { name: 'Sundaram Finance Ltd', sector: 'Financial Services', percentage: 3.6 },
  { name: 'Voltas Ltd', sector: 'Consumer Durables', percentage: 3.4 },
  { name: 'Indian Hotels Co Ltd', sector: 'Services', percentage: 3.1 },
  { name: 'Supreme Industries Ltd', sector: 'Capital Goods', percentage: 2.9 },
  { name: 'Cummins India Ltd', sector: 'Capital Goods', percentage: 2.7 },
  { name: 'Astral Ltd', sector: 'Capital Goods', percentage: 2.5 },
  { name: 'Mphasis Ltd', sector: 'Information Technology', percentage: 2.3 },
  { name: 'CG Power & Industrial', sector: 'Capital Goods', percentage: 2.1 },
  { name: 'Bharat Forge Ltd', sector: 'Automobile', percentage: 1.9 },
];

const EQUITY_SMALL_CAP_STOCKS: StockHolding[] = [
  { name: 'Cyient Ltd', sector: 'Information Technology', percentage: 4.5 },
  { name: 'KPIT Technologies Ltd', sector: 'Information Technology', percentage: 4.2 },
  { name: 'Kaynes Technology India', sector: 'Capital Goods', percentage: 3.9 },
  { name: 'Praj Industries Ltd', sector: 'Capital Goods', percentage: 3.6 },
  { name: 'Ratnamani Metals & Tubes', sector: 'Metals & Mining', percentage: 3.3 },
  { name: 'Elgi Equipments Ltd', sector: 'Capital Goods', percentage: 3.1 },
  { name: 'eClerx Services Ltd', sector: 'Information Technology', percentage: 2.9 },
  { name: 'Laurus Labs Ltd', sector: 'Healthcare', percentage: 2.7 },
  { name: 'Radico Khaitan Ltd', sector: 'FMCG', percentage: 2.5 },
  { name: 'Triveni Turbine Ltd', sector: 'Capital Goods', percentage: 2.3 },
  { name: 'Ami Organics Ltd', sector: 'Chemicals', percentage: 2.1 },
  { name: 'Deepak Nitrite Ltd', sector: 'Chemicals', percentage: 2.0 },
  { name: 'Navin Fluorine Intl Ltd', sector: 'Chemicals', percentage: 1.8 },
  { name: 'CDSL Ltd', sector: 'Financial Services', percentage: 1.7 },
  { name: 'Data Patterns India Ltd', sector: 'Capital Goods', percentage: 1.6 },
];

const BANKING_STOCKS: StockHolding[] = [
  { name: 'HDFC Bank Ltd', sector: 'Financial Services', percentage: 15.2 },
  { name: 'ICICI Bank Ltd', sector: 'Financial Services', percentage: 12.8 },
  { name: 'State Bank of India', sector: 'Financial Services', percentage: 10.1 },
  { name: 'Kotak Mahindra Bank Ltd', sector: 'Financial Services', percentage: 8.5 },
  { name: 'Axis Bank Ltd', sector: 'Financial Services', percentage: 7.3 },
  { name: 'Bajaj Finance Ltd', sector: 'Financial Services', percentage: 6.1 },
  { name: 'IndusInd Bank Ltd', sector: 'Financial Services', percentage: 4.8 },
  { name: 'Bajaj Finserv Ltd', sector: 'Financial Services', percentage: 4.2 },
  { name: 'SBI Life Insurance Co', sector: 'Financial Services', percentage: 3.6 },
  { name: 'HDFC Life Insurance Co', sector: 'Financial Services', percentage: 3.1 },
  { name: 'ICICI Prudential Life', sector: 'Financial Services', percentage: 2.7 },
  { name: 'Cholamandalam Inv & Fin', sector: 'Financial Services', percentage: 2.4 },
];

const IT_STOCKS: StockHolding[] = [
  { name: 'Infosys Ltd', sector: 'Information Technology', percentage: 18.5 },
  { name: 'TCS Ltd', sector: 'Information Technology', percentage: 16.2 },
  { name: 'HCL Technologies Ltd', sector: 'Information Technology', percentage: 10.8 },
  { name: 'Wipro Ltd', sector: 'Information Technology', percentage: 8.5 },
  { name: 'Tech Mahindra Ltd', sector: 'Information Technology', percentage: 7.1 },
  { name: 'LTIMindtree Ltd', sector: 'Information Technology', percentage: 5.8 },
  { name: 'Persistent Systems Ltd', sector: 'Information Technology', percentage: 4.5 },
  { name: 'Coforge Ltd', sector: 'Information Technology', percentage: 3.9 },
  { name: 'Mphasis Ltd', sector: 'Information Technology', percentage: 3.2 },
  { name: 'KPIT Technologies Ltd', sector: 'Information Technology', percentage: 2.8 },
];

const PHARMA_STOCKS: StockHolding[] = [
  { name: 'Sun Pharma Industries', sector: 'Healthcare', percentage: 14.8 },
  { name: 'Dr Reddys Laboratories', sector: 'Healthcare', percentage: 11.5 },
  { name: 'Cipla Ltd', sector: 'Healthcare', percentage: 9.8 },
  { name: 'Divi\'s Laboratories Ltd', sector: 'Healthcare', percentage: 8.2 },
  { name: 'Apollo Hospitals Ent', sector: 'Healthcare', percentage: 7.1 },
  { name: 'Max Healthcare Institute', sector: 'Healthcare', percentage: 5.9 },
  { name: 'Torrent Pharmaceuticals', sector: 'Healthcare', percentage: 5.2 },
  { name: 'Lupin Ltd', sector: 'Healthcare', percentage: 4.5 },
  { name: 'Aurobindo Pharma Ltd', sector: 'Healthcare', percentage: 3.8 },
  { name: 'Biocon Ltd', sector: 'Healthcare', percentage: 3.2 },
];

const DEBT_HOLDINGS: StockHolding[] = [
  { name: '7.26% GOI 2033', sector: 'Government Securities', percentage: 18.5 },
  { name: '7.18% GOI 2037', sector: 'Government Securities', percentage: 12.3 },
  { name: '7.06% GOI 2028', sector: 'Government Securities', percentage: 9.8 },
  { name: 'HDFC Bank CD', sector: 'Certificate of Deposit', percentage: 7.5 },
  { name: 'REC Ltd NCD 8.2%', sector: 'Corporate Bonds', percentage: 6.8 },
  { name: 'PFC Ltd NCD 7.9%', sector: 'Corporate Bonds', percentage: 5.9 },
  { name: 'NABARD Bond 7.45%', sector: 'Government Agency', percentage: 5.2 },
  { name: 'SBI CP 91 Days', sector: 'Commercial Paper', percentage: 4.8 },
  { name: 'ICICI Bank NCD 7.8%', sector: 'Corporate Bonds', percentage: 4.1 },
  { name: 'Axis Bank CD', sector: 'Certificate of Deposit', percentage: 3.5 },
  { name: 'NHAI Bond 7.25%', sector: 'Government Agency', percentage: 3.2 },
  { name: 'LIC Housing Finance NCD', sector: 'Corporate Bonds', percentage: 2.9 },
  { name: 'CBLO/Tri-Party Repo', sector: 'Cash Equivalent', percentage: 8.5 },
  { name: 'Net Current Assets', sector: 'Cash & Others', percentage: 7.0 },
];

const HYBRID_STOCKS: StockHolding[] = [
  { name: 'HDFC Bank Ltd', sector: 'Financial Services', percentage: 6.2 },
  { name: 'ICICI Bank Ltd', sector: 'Financial Services', percentage: 5.1 },
  { name: 'Infosys Ltd', sector: 'Information Technology', percentage: 4.5 },
  { name: 'Reliance Industries Ltd', sector: 'Oil & Gas', percentage: 4.2 },
  { name: 'TCS Ltd', sector: 'Information Technology', percentage: 3.8 },
  { name: '7.26% GOI 2033', sector: 'Government Securities', percentage: 8.5 },
  { name: '7.18% GOI 2037', sector: 'Government Securities', percentage: 6.2 },
  { name: 'REC Ltd NCD 8.2%', sector: 'Corporate Bonds', percentage: 4.5 },
  { name: 'PFC Ltd NCD 7.9%', sector: 'Corporate Bonds', percentage: 3.8 },
  { name: 'Bharti Airtel Ltd', sector: 'Telecommunication', percentage: 3.1 },
  { name: 'ITC Ltd', sector: 'FMCG', percentage: 2.8 },
  { name: 'L&T Ltd', sector: 'Construction', percentage: 2.5 },
  { name: 'CBLO/Tri-Party Repo', sector: 'Cash Equivalent', percentage: 5.2 },
  { name: 'Net Current Assets', sector: 'Cash & Others', percentage: 4.5 },
];

// Use fund's name/category to pick appropriate stock pool and add variation using a seed
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

export function getHoldingsForFund(fund: MutualFund): StockHolding[] {
  const cat = fund.category?.toUpperCase() || '';
  const rng = seededRandom(fund.id + fund.name);

  let basePool: StockHolding[];
  
  if (cat.includes('BANK') || cat.includes('FIN')) {
    basePool = BANKING_STOCKS;
  } else if (cat.includes('IT') || cat.includes('TECH')) {
    basePool = IT_STOCKS;
  } else if (cat.includes('PHARMA') || cat.includes('HEALTH')) {
    basePool = PHARMA_STOCKS;
  } else if (cat.startsWith('DT-') || cat === 'DEBT' || cat.includes('LIQ') || cat.includes('GILT') || cat.includes('BOND') || cat.includes('OVERNHT') || cat.includes('MM')) {
    basePool = DEBT_HOLDINGS;
  } else if (cat.startsWith('HY-') || cat === 'HYBRID') {
    basePool = HYBRID_STOCKS;
  } else if (cat.includes('SC') || cat.includes('SMALL')) {
    basePool = EQUITY_SMALL_CAP_STOCKS;
  } else if (cat.includes('MC') || cat.includes('MID')) {
    basePool = EQUITY_MID_CAP_STOCKS;
  } else {
    basePool = EQUITY_LARGE_CAP_STOCKS;
  }

  // Add slight variation based on fund seed
  return basePool.map(h => ({
    ...h,
    percentage: Math.max(0.5, h.percentage + (rng() - 0.5) * 2),
  })).sort((a, b) => b.percentage - a.percentage);
}

export function getAssetSplit(fund: MutualFund): AssetSplit[] {
  const cat = fund.category?.toUpperCase() || '';
  
  if (cat.startsWith('DT-') || cat === 'DEBT' || cat.includes('LIQ') || cat.includes('GILT') || cat.includes('BOND') || cat.includes('OVERNHT') || cat.includes('MM')) {
    return [
      { type: 'Debt', percentage: 85.2, color: 'hsl(142, 71%, 45%)' },
      { type: 'Cash & Equivalents', percentage: 12.3, color: 'hsl(200, 98%, 39%)' },
      { type: 'Equity', percentage: 2.5, color: 'hsl(217, 91%, 60%)' },
    ];
  }
  
  if (cat.startsWith('HY-')) {
    if (cat.includes('AH') || cat.includes('AGGRESSIVE')) {
      return [
        { type: 'Equity', percentage: 68.5, color: 'hsl(217, 91%, 60%)' },
        { type: 'Debt', percentage: 25.8, color: 'hsl(142, 71%, 45%)' },
        { type: 'Cash & Equivalents', percentage: 5.7, color: 'hsl(200, 98%, 39%)' },
      ];
    }
    if (cat.includes('CH') || cat.includes('CONSERVATIVE')) {
      return [
        { type: 'Debt', percentage: 72.3, color: 'hsl(142, 71%, 45%)' },
        { type: 'Equity', percentage: 22.1, color: 'hsl(217, 91%, 60%)' },
        { type: 'Cash & Equivalents', percentage: 5.6, color: 'hsl(200, 98%, 39%)' },
      ];
    }
    if (cat.includes('AR')) {
      return [
        { type: 'Equity', percentage: 52.8, color: 'hsl(217, 91%, 60%)' },
        { type: 'Debt', percentage: 38.5, color: 'hsl(142, 71%, 45%)' },
        { type: 'Cash & Equivalents', percentage: 8.7, color: 'hsl(200, 98%, 39%)' },
      ];
    }
    return [
      { type: 'Equity', percentage: 55.2, color: 'hsl(217, 91%, 60%)' },
      { type: 'Debt', percentage: 35.6, color: 'hsl(142, 71%, 45%)' },
      { type: 'Cash & Equivalents', percentage: 9.2, color: 'hsl(200, 98%, 39%)' },
    ];
  }
  
  // Equity funds
  return [
    { type: 'Equity', percentage: 96.3, color: 'hsl(217, 91%, 60%)' },
    { type: 'Cash & Equivalents', percentage: 3.2, color: 'hsl(200, 98%, 39%)' },
    { type: 'Debt', percentage: 0.5, color: 'hsl(142, 71%, 45%)' },
  ];
}

export function getSectorSplit(fund: MutualFund): SectorSplit[] {
  const holdings = getHoldingsForFund(fund);
  const sectorMap: Record<string, number> = {};
  
  holdings.forEach(h => {
    sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.percentage;
  });
  
  return Object.entries(sectorMap)
    .map(([sector, percentage], i) => ({
      sector,
      percentage: Math.round(percentage * 10) / 10,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
    }))
    .sort((a, b) => b.percentage - a.percentage);
}
