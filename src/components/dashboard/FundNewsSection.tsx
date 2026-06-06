import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MutualFund } from '@/types/mutualFund';
import { Newspaper, ExternalLink, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FundNewsSectionProps {
  fund: MutualFund;
}

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function FundNewsSection({ fund }: FundNewsSectionProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      setLoading(true);
      try {
        // Build search query from fund's AMC and category
        const query = `${fund.amc} mutual fund India`;
        const { data, error } = await supabase.functions.invoke('fetch-news', {
          body: { query, page: 1 },
        });

        if (!cancelled && data?.articles) {
          setArticles(data.articles.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to fetch fund news:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNews();
    return () => { cancelled = true; };
  }, [fund.amc, fund.category]);

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          Related News
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading news...</span>
          </div>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent news found for {fund.amc}</p>
        ) : (
          articles.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors border border-border/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {item.publishedAt ? timeAgo(item.publishedAt) : 'Recent'}
                    </span>
                    <span className="text-[10px] text-primary font-medium">{item.source}</span>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              </div>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  );
}
