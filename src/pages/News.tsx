import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ExternalLink, Search, Loader2, Newspaper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FundexLogo } from '@/components/landing/FundexLogo';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
}

const NEWS_QUERIES = [
  'mutual funds India',
  'stock market India investing',
  'SEBI mutual fund regulation',
  'SIP investment India',
  'Indian equity market',
];

export default function News() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [queryIndex, setQueryIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNews('mutual funds India');
  }, []);

  const fetchNews = async (query: string, append = false) => {
    if (!append) setIsLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-news', {
        body: { query },
      });

      if (fnError) throw fnError;
      if (data?.articles) {
        if (append) {
          setArticles(prev => {
            // Deduplicate by title
            const existing = new Set(prev.map(a => a.title));
            const newArticles = data.articles.filter((a: NewsArticle) => !existing.has(a.title));
            return [...prev, ...newArticles];
          });
        } else {
          setArticles(data.articles);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch news:', err);
      if (!append) setError('Unable to load news. Please try again later.');
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    const nextIdx = queryIndex + 1;
    if (nextIdx >= NEWS_QUERIES.length) {
      setHasMore(false);
      return;
    }
    setQueryIndex(nextIdx);
    fetchNews(NEWS_QUERIES[nextIdx], true);
  }, [queryIndex]);

  const filteredArticles = search
    ? articles.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase())
      )
    : articles;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <FundexLogo size="sm" className="!h-8" />
          </div>
          <h1 className="text-lg font-semibold">Market News</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search news articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 bg-secondary/40 border-border/40 text-base"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading latest news...</p>
          </div>
        ) : error ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => fetchNews('mutual funds India')} variant="outline">Retry</Button>
            </CardContent>
          </Card>
        ) : filteredArticles.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No articles found.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article, idx) => (
                <a
                  key={idx}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <Card className="glass-card h-full border-border/30 hover:border-primary/40 transition-all duration-300 overflow-hidden">
                    {article.imageUrl && (
                      <div className="h-40 overflow-hidden">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          {article.source}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                        {article.description}
                      </p>
                      <span className="text-xs text-primary flex items-center gap-1">
                        Read more <ExternalLink className="h-3 w-3" />
                      </span>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>

            {/* Load More */}
            {!search && hasMore && (
              <div className="flex justify-center mt-10">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading more...
                    </>
                  ) : (
                    'Load More News'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
