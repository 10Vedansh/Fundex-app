import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TermsAndConditions } from '@/components/legal/TermsAndConditions';
import { PrivacyPolicy } from '@/components/legal/PrivacyPolicy';
import { Disclaimer } from '@/components/legal/Disclaimer';
import { RefundPolicy } from '@/components/legal/RefundPolicy';
import { SubtleMarketBackground } from '@/components/landing/SubtleMarketBackground';
import { OpacityReveal } from '@/components/landing/OpacityReveal';
import { ProximityCard } from '@/components/landing/ProximityCard';
import { FundexLogo } from '@/components/landing/FundexLogo';
import { ArrowRight, BarChart2, Target, Bookmark, PieChart, Database, Shield, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Landing() {
  const navigate = useNavigate();
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const faqs = [
    { 
      q: 'What is 50Stacks?', 
      a: '50Stacks is an educational platform that helps users explore and understand mutual fund data through clear metrics, visual comparisons, and personalized discovery tools.' 
    },
    { 
      q: 'Is 50Stacks free to use?', 
      a: 'Yes, 50Stacks offers free access to core features including fund analysis, comparisons, watchlist functionality, and portfolio tracking.' 
    },
    { 
      q: 'Does 50Stacks provide investment advice?', 
      a: 'No. 50Stacks provides educational insights and data analysis tools only. We do not offer investment advice or recommendations.' 
    },
    { 
      q: 'How does personalization work?', 
      a: 'During onboarding, you answer questions about your risk tolerance, timeline, and goals. 50Stacks filters funds that align with your profile—not as recommendations, but as relevant options to explore.' 
    },
    { 
      q: 'Where does the data come from?', 
      a: '50Stacks aggregates publicly available mutual fund data from AMFI and fund house disclosures. Data is refreshed daily after market close.' 
    },
    { 
      q: 'Is my data secure?', 
      a: 'Yes. We use industry-standard encryption. Your information is stored securely and never shared with third parties.' 
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Premium Financial Background */}
      <SubtleMarketBackground />

      {/* Navigation */}
      <nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled 
            ? "bg-background/95 backdrop-blur-md border-b border-border/50 py-3" 
            : "bg-transparent py-5"
        )}
      >
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center"
          >
            <FundexLogo size="sm" className={cn(
              "transition-all duration-300",
              scrolled ? "!h-14" : "!h-16"
            )} />
          </button>
          
          <div className="hidden md:flex items-center gap-8">
            <a 
              href="#about"
              onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }}
              className={cn(
                "text-sm transition-colors duration-200",
                scrolled ? "text-muted-foreground hover:text-foreground" : "text-foreground/70 hover:text-foreground"
              )}
            >
              About
            </a>
            <a 
              href="#features"
              onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
              className={cn(
                "text-sm transition-colors duration-200",
                scrolled ? "text-muted-foreground hover:text-foreground" : "text-foreground/70 hover:text-foreground"
              )}
            >
              Features
            </a>
            <a 
              href="#founders"
              onClick={(e) => { e.preventDefault(); document.getElementById('founders')?.scrollIntoView({ behavior: 'smooth' }); }}
              className={cn(
                "text-sm transition-colors duration-200",
                scrolled ? "text-muted-foreground hover:text-foreground" : "text-foreground/70 hover:text-foreground"
              )}
            >
              Founders
            </a>
            <a 
              href="#faqs"
              onClick={(e) => { e.preventDefault(); document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' }); }}
              className={cn(
                "text-sm transition-colors duration-200",
                scrolled ? "text-muted-foreground hover:text-foreground" : "text-foreground/70 hover:text-foreground"
              )}
            >
              FAQs
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/auth')} 
              className={cn(
                "hidden sm:inline-flex text-sm font-medium transition-all duration-300",
                !scrolled && "text-foreground/80 hover:text-foreground hover:bg-white/5"
              )}
            >
              Log in
            </Button>
            <Button 
              onClick={() => navigate('/auth')} 
              className={cn(
                "text-sm font-medium transition-all duration-300",
                scrolled ? "" : "bg-primary/90 hover:bg-primary"
              )}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 z-10">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="max-w-2xl">
            <OpacityReveal>
              <p className="text-sm text-muted-foreground mb-6 tracking-[0.2em] uppercase font-medium">
                Mutual Fund Analytics Platform
              </p>
            </OpacityReveal>
            
            <OpacityReveal delay={50}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold mb-8 leading-[1.1] tracking-tight text-foreground">
                See what the numbers
                <br />
                <span className="text-muted-foreground">actually mean</span>
              </h1>
            </OpacityReveal>
            
            <OpacityReveal delay={100}>
              <p className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed">
                50Stacks transforms mutual fund data into clarity. 
                Compare performance, understand risk, make informed decisions.
              </p>
            </OpacityReveal>
            
            <OpacityReveal delay={150}>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')}
                  className="text-sm px-6 py-5 font-medium"
                >
                  Start analyzing
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="ghost" 
                  onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-sm px-6 py-5 font-medium text-muted-foreground hover:text-foreground"
                >
                  Learn more
                </Button>
              </div>
            </OpacityReveal>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <OpacityReveal delay={400}>
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-muted-foreground/30 to-transparent" />
          </OpacityReveal>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-32 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <OpacityReveal>
                <p className="text-sm text-primary/80 mb-4 tracking-[0.15em] uppercase font-medium">
                  The Problem
                </p>
              </OpacityReveal>
              <OpacityReveal delay={50}>
                <h2 className="text-3xl md:text-4xl font-semibold mb-6 tracking-tight text-foreground leading-tight">
                  Data everywhere.
                  <br />
                  <span className="text-muted-foreground">Understanding nowhere.</span>
                </h2>
              </OpacityReveal>
              <OpacityReveal delay={100}>
                <p className="text-base text-muted-foreground leading-relaxed mb-6">
                  Every fund shows returns. Few explain what they mean. NAVs, expense ratios, 
                  risk grades—numbers without context are just noise.
                </p>
              </OpacityReveal>
              <OpacityReveal delay={150}>
                <p className="text-muted-foreground leading-relaxed">
                  The problem is not access to information. It is the absence of interpretation.
                </p>
              </OpacityReveal>
            </div>

            <div className="space-y-4">
              <OpacityReveal delay={100}>
                <p className="text-xs text-muted-foreground mb-6 tracking-[0.1em] uppercase">
                  What investors face
                </p>
              </OpacityReveal>
              {[
                '5,000+ mutual fund schemes in India',
                'Returns shown without risk context',
                'Category confusion (Large-cap? Flexi-cap?)',
                'No standard way to compare fairly'
              ].map((item, idx) => (
                <OpacityReveal key={idx} delay={150 + idx * 50}>
                  <div className="flex items-center gap-4 py-4 border-b border-border/30">
                    <span className="text-sm text-muted-foreground/50 font-mono">{String(idx + 1).padStart(2, '0')}</span>
                    <p className="text-base text-foreground/80">{item}</p>
                  </div>
                </OpacityReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 z-10 bg-secondary/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <OpacityReveal>
              <p className="text-sm text-primary/80 mb-4 tracking-[0.15em] uppercase font-medium">
                Features
              </p>
            </OpacityReveal>
            <OpacityReveal delay={50}>
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight text-foreground">
                Tools that reveal, not recommend
              </h2>
            </OpacityReveal>
            <OpacityReveal delay={100}>
              <p className="text-base text-muted-foreground">
                Analysis features built for understanding, not selling.
              </p>
            </OpacityReveal>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: BarChart2,
                title: 'Fund Analysis',
                desc: 'Compare NAVs, returns, expense ratios, and risk metrics across consistent time periods. Context, not just data.',
              },
              {
                icon: Target,
                title: 'Personalized Discovery',
                desc: 'Surface funds matching your risk tolerance, horizon, and goals. Preference-based filtering—not advice.',
              },
              {
                icon: Bookmark,
                title: 'Watchlist & Tracking',
                desc: 'Save funds you are researching. Track changes. Organize analysis without losing context.',
              },
              {
                icon: PieChart,
                title: 'Portfolio Insights',
                desc: 'Understand allocation, exposure, and diversification. Educational signals for clearer thinking.',
              }
            ].map((feature, idx) => (
              <OpacityReveal key={idx} delay={idx * 75}>
                <ProximityCard 
                  className="p-6 rounded-lg border border-border/40 bg-card/30 h-full"
                  intensity={0.015}
                >
                  <div className="h-11 w-11 rounded-md bg-secondary/80 flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-foreground/70" />
                  </div>
                  <h3 className="font-medium text-lg mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{feature.desc}</p>
                </ProximityCard>
              </OpacityReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="relative py-32 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <OpacityReveal>
                <p className="text-sm text-primary/80 mb-4 tracking-[0.15em] uppercase font-medium">
                  Transparency
                </p>
              </OpacityReveal>
              <OpacityReveal delay={50}>
                <h2 className="text-3xl md:text-4xl font-semibold mb-6 tracking-tight text-foreground">
                  No hidden agendas.
                  <br />
                  <span className="text-muted-foreground">Just transparent data.</span>
                </h2>
              </OpacityReveal>
              <OpacityReveal delay={100}>
                <p className="text-base text-muted-foreground leading-relaxed">
                  We source data from AMFI and official fund house disclosures. 
                  No commissions, no fund promotions, no conflicts of interest. 
                  What you see is what exists—unmanipulated.
                </p>
              </OpacityReveal>
            </div>

            <div className="space-y-4">
              {[
                { icon: Database, text: 'Publicly sourced mutual fund data' },
                { icon: Lock, text: 'No investment execution or money handling' },
                { icon: Shield, text: 'No hidden fund partnerships or promotions' },
              ].map((item, idx) => (
                <OpacityReveal key={idx} delay={100 + idx * 75}>
                  <ProximityCard 
                    className="flex items-center gap-4 p-4 rounded-lg border border-border/30 bg-card/20"
                    intensity={0.01}
                  >
                    <div className="h-11 w-11 rounded-md bg-secondary/60 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-foreground/60" />
                    </div>
                    <p className="text-base text-foreground/80">{item.text}</p>
                  </ProximityCard>
                </OpacityReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-32 z-10 bg-secondary/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <OpacityReveal>
              <p className="text-sm text-primary/80 mb-4 tracking-[0.15em] uppercase font-medium">
                How It Works
              </p>
            </OpacityReveal>
            <OpacityReveal delay={50}>
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight text-foreground">
                Your analysis. Your decisions.
              </h2>
            </OpacityReveal>
            <OpacityReveal delay={100}>
              <p className="text-base text-muted-foreground">
                Simple onboarding. Meaningful output. You stay in control.
              </p>
            </OpacityReveal>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Create account', desc: 'Quick signup with email' },
              { step: '02', title: 'Set preferences', desc: 'Risk, goals, timeline' },
              { step: '03', title: 'Explore funds', desc: 'Filtered to your profile' },
              { step: '04', title: 'Track & analyze', desc: 'Build understanding' }
            ].map((item, idx) => (
              <OpacityReveal key={idx} delay={idx * 75}>
                <div>
                  <p className="text-4xl font-light text-muted-foreground/25 mb-3 font-mono">{item.step}</p>
                  <h3 className="font-medium text-foreground mb-1 text-base">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </OpacityReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section id="founders" className="relative py-32 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl mx-auto text-center">
            <OpacityReveal>
              <p className="text-sm text-muted-foreground mb-4 tracking-[0.15em] uppercase font-medium">
                The Team
              </p>
            </OpacityReveal>
            <OpacityReveal delay={50}>
              <h2 className="text-3xl font-semibold mb-4 tracking-tight text-foreground">
                Built by engineers who invest
              </h2>
            </OpacityReveal>
            <OpacityReveal delay={100}>
              <p className="text-base text-muted-foreground mb-8">
                Three computer science engineers frustrated by the gap between 
                great financial data and tools to understand it.
              </p>
            </OpacityReveal>
            <OpacityReveal delay={150}>
              <Button 
                onClick={() => navigate('/founders')} 
                variant="outline" 
                className="font-medium text-sm border-border/50"
              >
                Meet the founders
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </OpacityReveal>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="relative py-32 z-10 bg-secondary/20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <OpacityReveal>
              <p className="text-sm text-muted-foreground mb-4 tracking-[0.15em] uppercase font-medium">
                FAQ
              </p>
            </OpacityReveal>
            <OpacityReveal delay={50}>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Common questions
              </h2>
            </OpacityReveal>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, idx) => (
              <OpacityReveal key={idx} delay={75 + idx * 50}>
                <AccordionItem 
                  value={`item-${idx}`} 
                  className="border border-border/30 rounded-lg px-5 bg-card/20 data-[state=open]:bg-card/40 transition-colors duration-200"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-4 text-base font-medium text-foreground">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 text-base leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </OpacityReveal>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 z-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <OpacityReveal>
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4 tracking-tight text-foreground">
              Ready to understand your investments?
            </h2>
          </OpacityReveal>
          <OpacityReveal delay={50}>
            <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
              Join investors using 50Stacks for clear, contextual analysis.
            </p>
          </OpacityReveal>
          <OpacityReveal delay={100}>
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-sm px-6 py-5 font-medium"
            >
              Create free account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </OpacityReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-12 bg-background/80">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8">
            <div className="flex items-center">
              <FundexLogo size="sm" className="!h-8" />
            </div>
            
            <div className="flex flex-wrap gap-6 text-xs">
              <button
                onClick={() => setTermsOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Terms
              </button>
              <button
                onClick={() => setPrivacyOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Privacy
              </button>
              <button
                onClick={() => setDisclaimerOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Disclaimer
              </button>
              <button
                onClick={() => setRefundOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Refund
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-border/20">
            <p className="text-[11px] text-muted-foreground/70 max-w-2xl leading-relaxed">
              <strong className="text-muted-foreground">Disclaimer:</strong> Mutual fund investments are subject to market risks. 
              Read all scheme-related documents carefully. Past performance is not indicative of future returns. 
              50Stacks is NOT a SEBI-registered Investment Advisor. We do not provide investment advice.
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-4">
              © {new Date().getFullYear()} 50Stacks
            </p>
          </div>
        </div>
      </footer>

      {/* Legal modals */}
      <TermsAndConditions open={termsOpen} onOpenChange={setTermsOpen} />
      <PrivacyPolicy open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <Disclaimer open={disclaimerOpen} onOpenChange={setDisclaimerOpen} />
      <RefundPolicy open={refundOpen} onOpenChange={setRefundOpen} />
    </div>
  );
}
