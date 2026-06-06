import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FundData {
  id: string;
  name: string;
  category: string;
  amc: string;
  cagr1Y: number;
  cagr3Y: number;
  cagr5Y: number;
  volatility: number;
  sharpeRatio: number;
  expenseRatio: number;
  riskLevel: string;
  alpha: number;
  beta: number;
  aum: number;
  strengthBadge: string;
}

interface InsightRequest {
  funds: FundData[];
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { funds, riskProfile }: InsightRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating insights for ${funds.length} funds with ${riskProfile} profile`);

    // Calculate additional derived factors
    const fundsWithFactors = funds.map(f => {
      // Consistency score: how stable are returns across 1Y, 3Y, 5Y
      const avgReturn = (f.cagr1Y + f.cagr3Y + f.cagr5Y) / 3;
      const returnVariance = Math.sqrt(
        (Math.pow(f.cagr1Y - avgReturn, 2) + Math.pow(f.cagr3Y - avgReturn, 2) + Math.pow(f.cagr5Y - avgReturn, 2)) / 3
      );
      const consistencyScore = avgReturn > 0 ? Math.max(0, 100 - returnVariance * 5) : 0;
      
      // Downside protection: lower beta + lower volatility = better protection
      const downsideProtection = Math.max(0, 100 - (f.beta * 50 + f.volatility * 2));
      
      // Value score: alpha relative to expense ratio
      const valueScore = f.expenseRatio > 0 ? (f.alpha / f.expenseRatio) * 10 : 0;
      
      // Size stability: larger AUM generally means more stable
      const sizeStability = f.aum > 20000 ? 'Large' : f.aum > 5000 ? 'Medium' : 'Small';
      
      // Momentum: recent performance vs long-term
      const momentum = f.cagr1Y - f.cagr5Y;
      const momentumTrend = momentum > 5 ? 'Strong upward' : momentum > 0 ? 'Positive' : momentum > -5 ? 'Stable' : 'Declining';
      
      return { ...f, consistencyScore, downsideProtection, valueScore, sizeStability, momentumTrend };
    });

    const fundsDescription = fundsWithFactors.map(f => 
      `${f.name} (${f.category}, AMC: ${f.amc}):
- Returns: 1Y ${f.cagr1Y.toFixed(1)}%, 3Y ${f.cagr3Y.toFixed(1)}%, 5Y ${f.cagr5Y.toFixed(1)}%
- Risk Metrics: Volatility ${f.volatility.toFixed(1)}%, Sharpe ${f.sharpeRatio}, Beta ${f.beta.toFixed(2)}, Alpha ${f.alpha.toFixed(2)}
- Cost: Expense Ratio ${f.expenseRatio}%
- Derived Factors: Consistency ${f.consistencyScore.toFixed(0)}/100, Downside Protection ${f.downsideProtection.toFixed(0)}/100, Value Score ${f.valueScore.toFixed(1)}
- Fund Size: ${f.sizeStability} (₹${f.aum} Cr), Momentum: ${f.momentumTrend}
- Overall Rating: ${f.strengthBadge}`
    ).join('\n\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert Indian mutual fund analyst providing personalized investment recommendations. 

Analyze funds using these 8 key factors:
1. **Risk-Adjusted Returns (Sharpe Ratio)**: Higher is better, indicates return per unit of risk
2. **Consistency Score**: How stable returns are across 1Y, 3Y, 5Y periods (100 = very consistent)
3. **Alpha**: Excess returns over benchmark - positive alpha = outperformance
4. **Beta**: Market sensitivity - <1 means less volatile than market, >1 means more volatile
5. **Downside Protection**: Combined score from beta and volatility (higher = better protection)
6. **Value Score**: Alpha generated per unit of expense ratio (cost efficiency)
7. **Momentum Trend**: Recent vs long-term performance trajectory
8. **Fund Size Stability**: Larger AUM generally means more liquidity and stability

For ${riskProfile} investors:
${riskProfile === 'Conservative' ? '- Prioritize: High consistency, high downside protection, low volatility, debt/liquid funds\n- Acceptable: Lower returns for stability\n- Avoid: High beta, declining momentum funds' : ''}
${riskProfile === 'Moderate' ? '- Prioritize: Balanced Sharpe ratio, good consistency, moderate beta (0.8-1.2)\n- Acceptable: Hybrid funds, diversified equity, large caps\n- Seek: Good value score (alpha vs expense)' : ''}
${riskProfile === 'Aggressive' ? '- Prioritize: High alpha, strong momentum, growth potential\n- Acceptable: Higher volatility for better returns\n- Focus: Small/mid caps, sector funds with upward momentum' : ''}

Keep insights actionable and specific to each fund's metrics.`
          },
          {
            role: "user",
            content: `Generate personalized investment insights for a ${riskProfile} investor analyzing these funds:

${fundsDescription}

Return a JSON array with objects containing:
- "fundId": string (the fund's ID)
- "insight": string (one compelling sentence about why this fund suits this investor)
- "rationale": string (2-3 key metrics that justify the recommendation)
- "suitabilityScore": number (1-10 rating for how well this fund fits the ${riskProfile} profile)

Only return the JSON array, no other text.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response:", content);

    // Parse the JSON from the response
    let insights;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        insights = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return fallback insights
      insights = funds.map(f => ({
        fundId: f.id,
        insight: `${f.name} offers ${f.riskLevel.toLowerCase()} risk with ${f.cagr1Y}% annual returns.`,
        rationale: `Sharpe ratio of ${f.sharpeRatio} indicates good risk-adjusted performance.`
      }));
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
