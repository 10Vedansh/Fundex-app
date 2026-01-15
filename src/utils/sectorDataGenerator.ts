import { FundSectorData, SECTOR_COLORS, MutualFund } from '@/types/mutualFund';

// Extended sector list for more diversity
const EQUITY_SECTORS = [
  'Financial Services',
  'Information Technology',
  'BFSI',
  'Pharma & Healthcare',
  'Consumer Goods',
  'Automobile',
  'Oil & Gas',
  'Capital Goods',
  'Metals & Mining',
  'Chemicals',
  'Infrastructure',
  'FMCG',
  'Energy',
  'Telecom',
  'Real Estate',
  'Cement & Construction',
  'Textiles',
  'Media & Entertainment',
];

const DEBT_SECTORS = [
  'Government Securities',
  'Corporate Bonds',
  'AAA Rated',
  'AA+ Rated',
  'AA Rated',
  'PSU Bonds',
  'State Development Loans',
  'Treasury Bills',
  'Commercial Paper',
  'Certificate of Deposits',
];

// Seeded random number generator for consistent sector data per fund
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return function() {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateSectorPercentages(sectorCount: number, random: () => number): number[] {
  const percentages: number[] = [];
  let remaining = 100;
  
  for (let i = 0; i < sectorCount - 1; i++) {
    const maxAllocation = Math.min(remaining - (sectorCount - i - 1) * 2, 40);
    const minAllocation = 5;
    const allocation = minAllocation + random() * (maxAllocation - minAllocation);
    const rounded = Math.round(allocation * 10) / 10;
    percentages.push(rounded);
    remaining -= rounded;
  }
  
  // Last sector gets the remaining
  percentages.push(Math.round(remaining * 10) / 10);
  
  // Sort descending
  return percentages.sort((a, b) => b - a);
}

export function generateFundSectorData(fund: MutualFund): FundSectorData {
  const random = seededRandom(fund.id + fund.name);
  
  let sectorPool: string[];
  let sectorCount: number;
  
  switch (fund.category) {
    case 'Debt':
    case 'Liquid':
      sectorPool = DEBT_SECTORS;
      sectorCount = 5 + Math.floor(random() * 3); // 5-7 sectors
      break;
    case 'Hybrid':
      // Mix of equity and debt
      sectorPool = ['Equity Holdings', 'Debt Holdings', 'Cash & Equivalents', 'Government Securities', 'Corporate Bonds'];
      sectorCount = 4 + Math.floor(random() * 2); // 4-5 sectors
      break;
    case 'Index':
      // Index funds follow benchmark weights
      sectorPool = ['Financial Services', 'IT', 'Oil & Gas', 'Consumer Goods', 'Automobile', 'Pharma', 'Metals', 'Others'];
      sectorCount = 6 + Math.floor(random() * 3); // 6-8 sectors
      break;
    default: // Equity
      sectorPool = EQUITY_SECTORS;
      sectorCount = 6 + Math.floor(random() * 4); // 6-9 sectors
  }
  
  // Shuffle and pick sectors
  const shuffledSectors = shuffleArray(sectorPool, random);
  const selectedSectors = shuffledSectors.slice(0, Math.min(sectorCount, sectorPool.length));
  
  // Generate percentages
  const percentages = generateSectorPercentages(selectedSectors.length, random);
  
  // Create sector allocations with colors
  const sectors = selectedSectors.map((sector, index) => ({
    sector,
    percentage: percentages[index],
    color: SECTOR_COLORS[index % SECTOR_COLORS.length],
  }));
  
  return {
    fundId: fund.id,
    fundName: fund.name,
    sectors,
  };
}

// Cache for generated sector data
const sectorDataCache = new Map<string, FundSectorData>();

export function getCachedSectorData(fund: MutualFund): FundSectorData {
  const cacheKey = fund.id;
  
  if (!sectorDataCache.has(cacheKey)) {
    sectorDataCache.set(cacheKey, generateFundSectorData(fund));
  }
  
  return sectorDataCache.get(cacheKey)!;
}

// Clear cache (useful when funds are refreshed)
export function clearSectorDataCache(): void {
  sectorDataCache.clear();
}
