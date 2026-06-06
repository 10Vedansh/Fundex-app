import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { isMobileApp } from '@/utils/isMobileApp';
import { AppSplash } from '@/components/mobile/AppSplash';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TermsAndConditions } from '@/components/legal/TermsAndConditions';
import { PrivacyPolicy } from '@/components/legal/PrivacyPolicy';
import { Disclaimer } from '@/components/legal/Disclaimer';
import { RefundPolicy } from '@/components/legal/RefundPolicy';
import { GsapReveal } from '@/components/landing/GsapReveal';
import { GlowCard } from '@/components/landing/GlowCard';
import { MagneticButton } from '@/components/landing/MagneticButton';
import { FundexLogo } from '@/components/landing/FundexLogo';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  ArrowRight, 
  ArrowUpRight,
  BarChart2, 
  Target, 
  Bookmark, 
  PieChart, 
  Database, 
  Shield, 
  Lock,
  
  TrendingUp,
  Zap,
  LineChart,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { faqs as sharedFaqs } from '@/data/faqData';

// Lazy load the 3D background to prevent blocking; reload on stale chunk errors
const ThreeBackground = lazy(() =>
  import('@/components/landing/ThreeBackground')
    .then(m => ({ default: m.ThreeBackground }))
    .catch(() => {
      window.location.reload();
      return { default: () => null } as any;
    })
);

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [appMode] = useState(() => isMobileApp());
  const [splashDone, setSplashDone] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Mobile-app launch flow: show splash, then redirect past landing.
  useEffect(() => {
    if (!appMode || !splashDone || authLoading) return;
    navigate(user ? '/dashboard' : '/auth', { replace: true });
  }, [appMode, splashDone, authLoading, user, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hero text animation
  useEffect(() => {
    if (!heroRef.current) return;
    
    const chars = heroRef.current.querySelectorAll('.hero-char');
    gsap.fromTo(
      chars,
      { 
        opacity: 0, 
        y: 100,
        rotateX: -90,
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.8,
        stagger: 0.02,
        ease: 'power3.out',
        delay: 0.3,
      }
    );
  }, []);

  const faqs = sharedFaqs;

  const features = [
    {
      icon: LineChart,
      title: 'Advanced Analytics',
      desc: 'Deep dive into NAVs, returns, expense ratios, and risk metrics with institutional-grade analysis tools.',
    },
    {
      icon: Target,
      title: 'Smart Discovery',
      desc: 'AI-powered fund matching based on your unique risk profile, investment horizon, and financial goals.',
    },
    {
      icon: Bookmark,
      title: 'Portfolio Tracking',
      desc: 'Monitor your watchlist in real-time. Track changes, set alerts, and never miss an opportunity.',
    },
    {
      icon: PieChart,
      title: 'Allocation Insights',
      desc: 'Visualize sector exposure, diversification metrics, and portfolio balance at a glance.',
    },
  ];

  const stats = [
    { value: '2200+', label: 'Funds Analyzed' },
    { value: '25K+', label: 'Data Points' },
    { value: '99.9%', label: 'Uptime' },
  ];

  const heroText = "CIFRAA";

  // App-mode: render only the splash, then redirect (effect above handles nav).
  if (appMode) {
    return <AppSplash onFinish={() => setSplashDone(true)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* 3D Background */}
      <Suspense fallback={
        <div 
          className="fixed inset-0 z-0"
          style={{
            background: 'linear-gradient(145deg, hsl(222, 47%, 6%) 0%, hsl(222, 47%, 11%) 50%, hsl(222, 47%, 8%) 100%)',
          }}
        />
      }>
        <ThreeBackground />
      </Suspense>

      {/* Navigation */}
      <nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled 
            ? "bg-background/80 backdrop-blur-xl border-b border-border/30 py-3" 
            : "bg-transparent py-6"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center group"
          >
            <FundexLogo size="sm" className={cn(
              "transition-all duration-500",
              scrolled ? "!h-12" : "!h-14"
            )} />
          </button>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {['About', 'Features', 'Founders', 'News', 'FAQs'].map((item) => (
                <a 
                  key={item}
                  href={item === 'News' ? '/news' : `#${item.toLowerCase()}`}
                  onClick={(e) => { 
                    e.preventDefault();
                    if (item === 'News') {
                      navigate('/news');
                    } else {
                      document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300 group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/auth')} 
              className="hidden sm:inline-flex text-sm font-medium hover:bg-white/5"
            >
              Log in
            </Button>
            <MagneticButton
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold"
            >
              Get Started
              <ArrowUpRight className="h-4 w-4 ml-2 inline-block" />
            </MagneticButton>
            
            {/* Mobile menu toggle */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/30 py-6 px-6">
            <div className="flex flex-col gap-4">
              {['About', 'Features', 'Founders', 'News', 'FAQs'].map((item) => (
                  <a 
                    key={item}
                    href={item === 'News' ? '/news' : `#${item.toLowerCase()}`}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      if (item === 'News') {
                        navigate('/news');
                      } else {
                        document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
                      }
                      setMobileMenuOpen(false);
                    }}
                    className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item}
                  </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 z-10">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          {/* Badge */}
          {/* Main headline */}
          <div ref={heroRef} className="mb-8" style={{ perspective: '1000px' }}>
            <h1 className="text-7xl sm:text-8xl lg:text-[10rem] font-bold tracking-tighter leading-none">
              {heroText.split('').map((char, i) => (
                <span 
                  key={i} 
                  className="hero-char inline-block"
                  style={{ 
                    opacity: 0,
                    background: 'linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--muted-foreground)) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {char}
                </span>
              ))}
            </h1>
          </div>

          <GsapReveal delay={400}>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-light">
              Transform complex mutual fund data into
              <span className="text-foreground font-medium"> actionable clarity</span>.
              <br className="hidden sm:block" />
              Make decisions with confidence.
            </p>
          </GsapReveal>
          
          <GsapReveal delay={600}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <MagneticButton 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-base font-semibold shadow-lg shadow-primary/25"
              >
                Start Analyzing Free
                <ArrowRight className="h-5 w-5 ml-2 inline-block" />
              </MagneticButton>
              <Button 
                size="lg" 
                variant="ghost" 
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-muted-foreground hover:text-foreground px-8 py-4 rounded-full"
              >
                See how it works
              </Button>
            </div>
          </GsapReveal>

        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-40 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <GsapReveal>
                <p className="text-sm text-primary mb-4 tracking-[0.2em] uppercase font-semibold">
                  The Problem
                </p>
              </GsapReveal>
              <GsapReveal delay={100}>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight leading-tight">
                  Data everywhere.
                  <br />
                  <span className="text-muted-foreground">Understanding nowhere.</span>
                </h2>
              </GsapReveal>
              <GsapReveal delay={200}>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Every fund shows returns. Few explain what they mean. NAVs, expense ratios, 
                  risk grades—numbers without context are just noise.
                </p>
              </GsapReveal>
              <GsapReveal delay={300}>
                <p className="text-muted-foreground leading-relaxed">
                  The problem is not access to information. 
                  <span className="text-foreground font-medium"> It's the absence of interpretation.</span>
                </p>
              </GsapReveal>
            </div>

            <div className="space-y-4">
              {[
                { num: '01', text: '5,000+ mutual fund schemes in India' },
                { num: '02', text: 'Returns shown without risk context' },
                { num: '03', text: 'Category confusion everywhere' },
                { num: '04', text: 'No standard comparison framework' },
              ].map((item, idx) => (
                <GsapReveal key={idx} delay={150 + idx * 100}>
                  <GlowCard className="p-6">
                    <div className="flex items-center gap-6">
                      <span className="text-4xl font-light text-primary/40 font-mono">{item.num}</span>
                      <p className="text-lg text-foreground/90">{item.text}</p>
                    </div>
                  </GlowCard>
                </GsapReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-40 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <GsapReveal>
              <p className="text-sm text-primary mb-4 tracking-[0.2em] uppercase font-semibold">
                Features
              </p>
            </GsapReveal>
            <GsapReveal delay={100}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
                Built for serious investors
              </h2>
            </GsapReveal>
            <GsapReveal delay={200}>
              <p className="text-lg text-muted-foreground">
                Professional-grade analysis tools that reveal insights, not sell products.
              </p>
            </GsapReveal>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <GsapReveal key={idx} delay={idx * 100}>
                <GlowCard className="p-8 h-full">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </GlowCard>
              </GsapReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="relative py-40 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <GsapReveal>
              <p className="text-sm text-primary mb-4 tracking-[0.2em] uppercase font-semibold">
                Transparency
              </p>
            </GsapReveal>
            <GsapReveal delay={100}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                Zero conflicts of interest
              </h2>
            </GsapReveal>
            <GsapReveal delay={200}>
              <p className="text-lg text-muted-foreground leading-relaxed mb-12">
                We source data from AMFI and official fund house disclosures. 
                No commissions, no fund promotions, no hidden agendas. 
                What you see is what exists—unmanipulated.
              </p>
            </GsapReveal>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Database, text: 'Publicly sourced data' },
                { icon: Lock, text: 'No money handling' },
                { icon: Shield, text: 'No hidden partnerships' },
              ].map((item, idx) => (
                <GsapReveal key={idx} delay={300 + idx * 100}>
                  <GlowCard className="p-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                        <item.icon className="h-6 w-6 text-foreground/60" />
                      </div>
                      <p className="text-foreground/80 font-medium">{item.text}</p>
                    </div>
                  </GlowCard>
                </GsapReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-40 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <GsapReveal>
              <p className="text-sm text-primary mb-4 tracking-[0.2em] uppercase font-semibold">
                How It Works
              </p>
            </GsapReveal>
            <GsapReveal delay={100}>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Start in under 2 minutes
              </h2>
            </GsapReveal>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Quick signup with email or Google' },
              { step: '02', title: 'Set Preferences', desc: 'Tell us your risk appetite & goals' },
              { step: '03', title: 'Explore Funds', desc: 'See personalized fund matches' },
              { step: '04', title: 'Track & Analyze', desc: 'Build your understanding' },
            ].map((item, idx) => (
              <GsapReveal key={idx} delay={idx * 100}>
                <div className="relative">
                  {idx < 3 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border/50 to-transparent" />
                  )}
                  <p className="text-6xl font-light text-primary/20 mb-4 font-mono">{item.step}</p>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </GsapReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section id="founders" className="relative py-40 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <GsapReveal>
              <p className="text-sm text-primary mb-4 tracking-[0.2em] uppercase font-semibold">
                The Team
              </p>
            </GsapReveal>
            <GsapReveal delay={100}>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Built by engineers who invest
              </h2>
            </GsapReveal>
            <GsapReveal delay={200}>
              <p className="text-lg text-muted-foreground mb-12">
                Three computer science engineers frustrated by the gap between 
                great financial data and tools to understand it.
              </p>
            </GsapReveal>
            <GsapReveal delay={300}>
              <MagneticButton 
                onClick={() => navigate('/founders')} 
                className="border border-border/50 hover:border-primary/50 bg-transparent text-foreground px-8 py-3 rounded-full font-medium transition-colors"
              >
                Meet the founders
                <ArrowRight className="h-4 w-4 ml-2 inline-block" />
              </MagneticButton>
            </GsapReveal>
          </div>
        </div>
      </section>

      {/* News Section - Redirect */}
      <section id="news" className="relative py-40 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <GsapReveal>
              <p className="text-sm text-primary mb-4 tracking-[0.2em] uppercase font-semibold">
                Stay Informed
              </p>
            </GsapReveal>
            <GsapReveal delay={100}>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Market news & insights
              </h2>
            </GsapReveal>
            <GsapReveal delay={200}>
              <p className="text-lg text-muted-foreground mb-12">
                Stay updated with the latest mutual fund news, market trends, and expert analysis — all in one place.
              </p>
            </GsapReveal>
            <GsapReveal delay={300}>
              <MagneticButton 
                onClick={() => navigate('/news')} 
                className="border border-border/50 hover:border-primary/50 bg-transparent text-foreground px-8 py-3 rounded-full font-medium transition-colors"
              >
                Read Latest News
                <ArrowRight className="h-4 w-4 ml-2 inline-block" />
              </MagneticButton>
            </GsapReveal>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="relative py-40 z-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <GsapReveal>
              <p className="text-sm text-primary mb-4 tracking-[0.2em] uppercase font-semibold">
                FAQ
              </p>
            </GsapReveal>
            <GsapReveal delay={100}>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Common questions
              </h2>
            </GsapReveal>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, idx) => (
              <GsapReveal key={idx} delay={150 + idx * 75}>
                <AccordionItem 
                  value={`item-${idx}`} 
                  className="border border-border/30 rounded-xl px-6 bg-card/20 backdrop-blur-sm data-[state=open]:bg-card/40 data-[state=open]:border-primary/30 transition-all duration-300"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-5 text-lg font-medium">
                    {faq.q}
                  </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 text-base leading-relaxed whitespace-pre-line">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </GsapReveal>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-40 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <GlowCard className="p-16 md:p-24 text-center">
            <GsapReveal>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
                Ready to invest smarter?
              </h2>
            </GsapReveal>
            <GsapReveal delay={100}>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                Join thousands of investors using CIFRAA for clear, contextual mutual fund analysis.
              </p>
            </GsapReveal>
            <GsapReveal delay={200}>
              <MagneticButton 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-4 rounded-full text-base font-semibold shadow-lg shadow-primary/25"
              >
                Create Free Account
                <ArrowRight className="h-5 w-5 ml-2 inline-block" />
              </MagneticButton>
            </GsapReveal>
          </GlowCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
            <div>
              <FundexLogo size="sm" className="!h-10 mb-4" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Making mutual fund analysis accessible and understandable for everyone.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-8 text-sm">
              <button
                onClick={() => setTermsOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </button>
              <button
                onClick={() => setPrivacyOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </button>
              <button
                onClick={() => setDisclaimerOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Disclaimer
              </button>
              <button
                onClick={() => setRefundOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Refund
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-border/10">
            <p className="text-xs text-muted-foreground/60 max-w-3xl leading-relaxed mb-4">
              <strong className="text-muted-foreground/80">Disclaimer:</strong> Mutual fund investments are subject to market risks. 
              Read all scheme-related documents carefully. Past performance is not indicative of future returns. 
              CIFRAA is NOT a SEBI-registered Investment Advisor. We do not provide investment advice.
            </p>
            <p className="text-xs text-muted-foreground/40">
              © {new Date().getFullYear()} CIFRAA. All rights reserved.
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
