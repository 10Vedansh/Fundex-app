import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MutualFund } from '@/types/mutualFund';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';

interface FundNewsSectionProps {
  fund: MutualFund;
}

// Generate realistic-looking news items based on fund properties
function generateFundNews(fund: MutualFund) {
  const news = [];

  if (fund.cagr1Y > 15) {
    news.push({
      title: `${fund.amc} ${fund.category} fund delivers strong returns amid market rally`,
      summary: `The fund has posted impressive ${fund.cagr1Y.toFixed(1)}% returns over the past year, outperforming its benchmark.`,
      timeAgo: '2 hours ago',
      source: 'Mint',
    });
  }

  if (fund.category === 'Equity') {
    news.push({
      title: `SEBI reviews ${fund.category.toLowerCase()} mutual fund categorization norms`,
      summary: `The regulator is considering updated guidelines that may affect how ${fund.category.toLowerCase()} funds are classified.`,
      timeAgo: '5 hours ago',
      source: 'Economic Times',
    });
  }

  if (fund.expenseRatio > 1.5) {
    news.push({
      title: `${fund.amc} under pressure to reduce expense ratios`,
      summary: `Industry trends show AMCs cutting costs. Current expense ratio of ${fund.expenseRatio.toFixed(2)}% is above average.`,
      timeAgo: '1 day ago',
      source: 'Moneycontrol',
    });
  }

  news.push({
    title: `${fund.amc} announces portfolio rebalancing for Q4`,
    summary: `The fund house has adjusted sector allocations in response to changing macro conditions.`,
    timeAgo: '1 day ago',
    source: 'LiveMint',
  });

  if (fund.riskLevel === 'High') {
    news.push({
      title: `Market volatility: What ${fund.riskLevel.toLowerCase()} risk fund investors should know`,
      summary: `Experts advise staying invested for the long term despite short-term fluctuations.`,
      timeAgo: '2 days ago',
      source: 'CNBC-TV18',
    });
  }

  news.push({
    title: `${fund.category} mutual funds see ₹${(Math.random() * 20000 + 5000).toFixed(0)} Cr inflows`,
    summary: `The ${fund.category.toLowerCase()} category continues to attract significant investor interest this month.`,
    timeAgo: '3 days ago',
    source: 'Business Standard',
  });

  return news.slice(0, 4);
}

export function FundNewsSection({ fund }: FundNewsSectionProps) {
  const newsItems = useMemo(() => generateFundNews(fund), [fund]);

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          Related News
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {newsItems.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer border border-border/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {item.timeAgo}
                  </span>
                  <span className="text-[10px] text-primary font-medium">{item.source}</span>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
