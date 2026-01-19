import { MutualFund, FundSectorData, SectorAllocation } from '@/types/mutualFund';

// Seeded random number generator for consistent results per fund
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

// Comprehensive sector list based on Indian market
const equitySectors = [
  'Financial Services', 'Information Technology', 'Healthcare', 'Consumer Goods',
  'Automobile', 'Industrials', 'Energy', 'Materials', 'Telecommunications',
  'Utilities', 'Real Estate', 'Consumer Services', 'Capital Goods', 'Chemicals',
  'Infrastructure', 'Metals & Mining', 'Pharmaceuticals', 'FMCG', 'Banking',
  'Insurance', 'Power', 'Oil & Gas', 'Cement', 'Textiles'
];

const debtSectors = [
  'Government Securities', 'Corporate Bonds', 'Treasury Bills', 'Commercial Paper',
  'Certificate of Deposits', 'State Development Loans', 'Money Market Instruments',
  'Securitized Debt', 'AAA Rated Bonds', 'AA Rated Bonds'
];

const hybridSectors = [
  'Large Cap Equity', 'Mid Cap Equity', 'Government Bonds', 'Corporate Debt',
  'Money Market', 'Gold', 'REITs', 'InvITs', 'International Equity'
];

function generateSectorAllocations(fund: MutualFund): SectorAllocation[] {
  const random = seededRandom(fund.id + fund.name);
  
  let availableSectors: string[];
  let numSectors: number;
  
  // Determine sectors based on fund category
  if (fund.category === 'Debt' || fund.category === 'Liquid') {
    availableSectors = [...debtSectors];
    numSectors = 4 + Math.floor(random() * 4); // 4-7 sectors
  } else if (fund.category === 'Hybrid') {
    availableSectors = [...hybridSectors];
    numSectors = 5 + Math.floor(random() * 4); // 5-8 sectors
  } else {
    availableSectors = [...equitySectors];
    numSectors = 6 + Math.floor(random() * 6); // 6-11 sectors
  }
  
  // Shuffle sectors using seeded random
  for (let i = availableSectors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [availableSectors[i], availableSectors[j]] = [availableSectors[j], availableSectors[i]];
  }
  
  // Select sectors
  const selectedSectors = availableSectors.slice(0, numSectors);
  
  // Generate allocations
  let remaining = 100;
  const allocations: SectorAllocation[] = [];
  
  selectedSectors.forEach((sector, index) => {
    const isLast = index === selectedSectors.length - 1;
    let percentage: number;
    
    if (isLast) {
      percentage = remaining;
    } else {
      // First sector gets larger allocation
      const maxAlloc = index === 0 ? Math.min(35, remaining - (selectedSectors.length - index - 1) * 3) : 
                       Math.min(25, remaining - (selectedSectors.length - index - 1) * 3);
      const minAlloc = 3;
      percentage = minAlloc + Math.floor(random() * (maxAlloc - minAlloc));
    }
    
    remaining -= percentage;
    
    // Generate a color based on sector name
    const hue = (sector.charCodeAt(0) * 15 + sector.charCodeAt(1) * 10) % 360;
    
    allocations.push({
      sector,
      percentage,
      color: `hsl(${hue}, 70%, 50%)`
    });
  });
  
  // Sort by percentage descending
  return allocations.sort((a, b) => b.percentage - a.percentage);
}

// Cache for sector data
const sectorDataCache = new Map<string, FundSectorData>();

export function getCachedSectorData(fund: MutualFund): FundSectorData {
  if (sectorDataCache.has(fund.id)) {
    return sectorDataCache.get(fund.id)!;
  }
  
  const sectorData: FundSectorData = {
    fundId: fund.id,
    fundName: fund.name,
    sectors: generateSectorAllocations(fund)
  };
  
  sectorDataCache.set(fund.id, sectorData);
  return sectorData;
}

export function clearSectorDataCache(): void {
  sectorDataCache.clear();
}
