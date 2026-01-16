import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ChevronRight, 
  BarChart3, 
  Target, 
  BookmarkPlus, 
  PieChart, 
  Shield, 
  Zap, 
  Users,
  Eye,
  Layers,
  Lock,
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Parallax effect for hero
    const handleScroll = () => {
      if (heroRef.current) {
        const scrolled = window.scrollY;
        heroRef.current.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/5 rounded-full blur-2xl animate-pulse delay-500" />
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Sticky Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Fundex</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#founders" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Founders</a>
            <a href="#faqs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQs</a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')} className="hidden sm:inline-flex">
              Login
            </Button>
            <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              Sign Up <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 z-10">
        <div ref={heroRef} className="container mx-auto px-4 py-20 text-center relative">
          <Badge variant="outline" className="mb-6 bg-primary/10 text-primary border-primary/30 px-4 py-2">
            <Sparkles className="h-3 w-3 mr-2" />
            Built for learning, analysis, and informed decision-making
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              Decode Mutual Fund
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Performance
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Fundex helps you explore, understand, and organize mutual fund data — 
            with clarity and context.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 shadow-xl shadow-primary/20 group"
            >
              Get Started 
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6 border-border/50 hover:bg-secondary/50"
            >
              Login to Dashboard
            </Button>
          </div>

          {/* Floating UI Elements */}
          <div className="absolute top-1/4 left-10 hidden lg:block animate-float">
            <Card className="glass-card border-border/30 p-3 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-success" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">1Y Returns</p>
                  <p className="text-sm font-semibold text-success">+24.5%</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="absolute top-1/3 right-10 hidden lg:block animate-float delay-1000">
            <Card className="glass-card border-border/30 p-3 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <PieChart className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                  <p className="text-sm font-semibold">Moderate</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 2: Why Fundex Exists */}
      <section id="about" className="relative py-24 z-10">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <Badge variant="outline" className="mb-4 bg-secondary/50">Why Fundex?</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Many investors see numbers, but lack <span className="text-primary">context</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Too much data, not enough understanding. Fundex focuses on simplicity, 
                comparability, and structured insights.
              </p>
              
              <div className="space-y-4">
                {[
                  'Designed to make mutual fund data easier to interpret',
                  'Built to help users explore risk and return more clearly',
                  'Focused on clarity over hype'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Eye, title: 'Clarity', desc: 'Clear metrics at a glance' },
                { icon: Layers, title: 'Structure', desc: 'Organized fund data' },
                { icon: Target, title: 'Context', desc: 'Risk-adjusted insights' },
                { icon: Shield, title: 'Trust', desc: 'Transparent sourcing' }
              ].map((card, idx) => (
                <Card 
                  key={idx} 
                  className="glass-card border-border/30 p-6 hover:border-primary/50 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Features */}
      <section id="features" className="relative py-24 z-10 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/30">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Fundex Offers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tools designed for analysis and understanding, not advice or guarantees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                icon: BarChart3,
                title: 'Structured Fund Data',
                features: ['Clean metrics', 'Side-by-side comparison', 'Transparent data sourcing']
              },
              {
                icon: Target,
                title: 'Personalized Discovery',
                features: ['Preference-based suggestions', 'Risk alignment', 'No blanket recommendations']
              },
              {
                icon: BookmarkPlus,
                title: 'Watchlist & Tracking',
                features: ['Save funds for review', 'Track ideas over time', 'Organize your research']
              },
              {
                icon: PieChart,
                title: 'Portfolio Insights',
                features: ['Allocation awareness', 'Risk exposure understanding', 'Educational signals']
              }
            ].map((feature, idx) => (
              <Card 
                key={idx} 
                className="glass-card border-border/30 p-6 hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-3">{feature.title}</h3>
                <ul className="space-y-2">
                  {feature.features.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground max-w-xl mx-auto">
            <Lock className="h-4 w-4 inline mr-1" />
            Fundex does not provide investment advice. All insights are informational.
          </p>
        </div>
      </section>

      {/* Section 4: How Personalization Works */}
      <section className="relative py-24 z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 bg-secondary/50">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Personalization That Makes Sense</h2>
            <p className="text-muted-foreground">Designed to align with your preferences, not to make promises.</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20 hidden md:block" />
              
              {[
                { step: 1, title: 'Answer Simple Questions', desc: 'Tell us about your financial preferences in plain language' },
                { step: 2, title: 'Risk & Goals Identified', desc: 'We understand your risk appetite and investment timeline' },
                { step: 3, title: 'Fund Universe Filtered', desc: 'Thousands of funds narrowed to what might be relevant' },
                { step: 4, title: 'Relevant Funds Surfaced', desc: 'See options that align with your stated preferences' }
              ].map((item, idx) => (
                <div key={idx} className="relative flex gap-6 mb-8 last:mb-0">
                  <div className="hidden md:flex h-16 w-16 rounded-full bg-primary/10 border-2 border-primary items-center justify-center flex-shrink-0 z-10">
                    <span className="text-xl font-bold text-primary">{item.step}</span>
                  </div>
                  <Card className="flex-1 glass-card border-border/30 p-6">
                    <div className="md:hidden h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <span className="font-bold text-primary">{item.step}</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Transparency & Trust */}
      <section className="relative py-24 z-10 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-4 bg-success/10 text-success border-success/30">
              <Shield className="h-3 w-3 mr-2" />
              Transparency First
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-8">Built on Trust</h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Eye, text: 'Uses publicly available mutual fund data' },
                { icon: Lock, text: 'No execution of investments' },
                { icon: Shield, text: 'No hidden fund promotion' },
                { icon: Users, text: 'Clear educational intent' }
              ].map((item, idx) => (
                <Card key={idx} className="glass-card border-border/30 p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-success" />
                  </div>
                  <p className="text-sm text-left">{item.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Future Ready */}
      <section className="relative py-24 z-10">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/30">
            <Zap className="h-3 w-3 mr-2" />
            Future Ready
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Built with Scale in Mind</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Modular architecture designed for evolving data sources and future feature expansion.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3">
            {['Modular Architecture', 'Scalable Infrastructure', 'API Ready', 'Continuous Updates'].map((tag, idx) => (
              <Badge key={idx} variant="outline" className="bg-secondary/50 px-4 py-2">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Founders */}
      <section id="founders" className="relative py-24 z-10 bg-secondary/20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-4 bg-secondary/50">The Team</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Know The Founders</h2>
          <p className="text-muted-foreground mb-8">Two CSE engineers with a shared vision for better financial literacy.</p>
          
          <Button onClick={() => navigate('/founders')} variant="outline" className="gap-2">
            Meet the Team <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Section 8: FAQs */}
      <section id="faqs" className="relative py-24 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 bg-secondary/50">FAQs</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">Common Questions</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {[
                { q: 'What is Fundex?', a: 'Fundex is an analytical platform that helps users explore and understand mutual fund data through clear metrics, comparisons, and personalized discovery tools.' },
                { q: 'Is Fundex free to use?', a: 'Yes, Fundex offers free access to core features including fund analysis, comparisons, and watchlist functionality.' },
                { q: 'Does Fundex give investment advice?', a: 'No. Fundex provides educational insights and data analysis tools. We do not offer investment advice, recommendations, or execution services.' },
                { q: 'Where does the data come from?', a: 'Fundex aggregates publicly available mutual fund data from official sources including AMFI and fund house disclosures.' },
                { q: 'Is my data secure?', a: 'Yes. We use industry-standard encryption and never share your personal information with third parties.' }
              ].map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="glass-card border-border/30 rounded-lg px-6">
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 z-10 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Explore?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of investors who use Fundex to understand mutual fund performance.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 shadow-xl shadow-primary/20"
          >
            Create Free Account <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-background/80 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fundex – All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
