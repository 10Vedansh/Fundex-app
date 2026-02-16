const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query = 'mutual funds India', page = 1 } = await req.json().catch(() => ({}));

    const GNEWS_API_KEY = Deno.env.get('GNEWS_API_KEY');

    if (!GNEWS_API_KEY) {
      console.log('No GNEWS_API_KEY configured, returning static articles');
      return new Response(
        JSON.stringify({ articles: getStaticArticles() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GNews API – max 100 articles per day on free tier
    const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=in&max=10&page=${page}&apikey=${GNEWS_API_KEY}`;
    
    console.log(`Fetching news from GNews: query="${query}", page=${page}`);
    const resp = await fetch(gnewsUrl);
    
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('GNews API error:', resp.status, errText);
      // Fallback to static on API error
      return new Response(
        JSON.stringify({ articles: getStaticArticles() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();

    const articles = (data.articles || []).map((a: any) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source?.name || 'Unknown',
      publishedAt: a.publishedAt,
      imageUrl: a.image,
    }));

    console.log(`Fetched ${articles.length} articles from GNews`);

    return new Response(
      JSON.stringify({ articles, totalArticles: data.totalArticles || articles.length }),
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
