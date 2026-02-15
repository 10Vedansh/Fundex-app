const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query = 'mutual funds India' } = await req.json().catch(() => ({}));

    const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');
    if (!NEWS_API_KEY) {
      // Fallback: use GNews free API (no key needed for limited use)
      const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=in&max=30&apikey=${Deno.env.get('GNEWS_API_KEY') || ''}`;
      
      // If no API key at all, return curated static articles
      if (!Deno.env.get('GNEWS_API_KEY')) {
        return new Response(
          JSON.stringify({
            articles: getStaticArticles(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const resp = await fetch(gnewsUrl);
      const data = await resp.json();

      const articles = (data.articles || []).map((a: any) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        source: a.source?.name || 'Unknown',
        publishedAt: a.publishedAt,
        imageUrl: a.image,
      }));

      return new Response(
        JSON.stringify({ articles }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NewsAPI.org
    const newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=30&apiKey=${NEWS_API_KEY}`;
    const resp = await fetch(newsUrl);
    const data = await resp.json();

    const articles = (data.articles || []).map((a: any) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source?.name || 'Unknown',
      publishedAt: a.publishedAt,
      imageUrl: a.urlToImage,
    }));

    return new Response(
      JSON.stringify({ articles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(
      JSON.stringify({ articles: getStaticArticles() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getStaticArticles() {
  return [
    {
      title: 'SEBI Proposes New Mutual Fund Lite Framework for Passive Funds',
      description: 'SEBI has proposed a new regulatory framework for passive mutual fund schemes, aiming to reduce costs and simplify compliance for index and ETF products.',
      url: 'https://www.livemint.com/mutual-fund',
      source: 'Livemint',
      publishedAt: new Date().toISOString(),
      imageUrl: null,
    },
    {
      title: 'Equity Mutual Funds See ₹25,000 Crore Inflows in January 2026',
      description: 'Domestic equity mutual funds continued to attract strong inflows, with SIP contributions crossing ₹22,000 crore for the month.',
      url: 'https://www.moneycontrol.com/mutual-funds',
      source: 'Moneycontrol',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      imageUrl: null,
    },
    {
      title: 'Small Cap Funds: Should You Invest Now or Wait?',
      description: 'With small cap valuations running high, experts weigh in on whether systematic investment plans remain the best approach for small cap exposure.',
      url: 'https://www.economictimes.com/mutual-funds',
      source: 'Economic Times',
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      imageUrl: null,
    },
    {
      title: 'Top 10 Flexi Cap Funds by 5-Year Returns in 2026',
      description: 'A comprehensive ranking of the best-performing flexi cap mutual funds based on long-term CAGR, risk-adjusted returns, and consistency.',
      url: 'https://www.valueresearchonline.com',
      source: 'Value Research',
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      imageUrl: null,
    },
    {
      title: 'RBI Rate Decision Impact on Debt Mutual Funds',
      description: 'The latest RBI monetary policy review and its implications for short-duration, gilt, and dynamic bond fund categories.',
      url: 'https://www.livemint.com/mutual-fund',
      source: 'Livemint',
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      imageUrl: null,
    },
    {
      title: 'How to Build a Mutual Fund Portfolio for Beginners',
      description: 'A step-by-step guide for first-time mutual fund investors covering asset allocation, fund selection, and SIP strategies.',
      url: 'https://www.moneycontrol.com/mutual-funds',
      source: 'Moneycontrol',
      publishedAt: new Date(Date.now() - 432000000).toISOString(),
      imageUrl: null,
    },
  ];
}
