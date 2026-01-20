import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AnimatedStockGraph } from '@/components/landing/AnimatedStockGraph';
import { ScrollReveal } from '@/components/landing/ScrollReveal';
import { FundexLogo } from '@/components/landing/FundexLogo';
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
  Check,
  Database,
  RefreshCw,
  Wallet,
  HelpCircle
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const faqs = [
    { 
      q: 'What is 50Stacks?', 
      a: '50Stacks is an educational platform that helps users explore and understand mutual fund data through clear metrics, visual comparisons, and personalized discovery tools. It is designed to improve financial literacy and assist with informed decision-making.' 
    },
    { 
      q: 'Is 50Stacks free to use?', 
      a: 'Yes, 50Stacks offers free access to core features including fund analysis, comparisons, watchlist functionality, and portfolio tracking. We believe financial education should be accessible to everyone.' 
    },
    { 
      q: 'Does 50Stacks provide investment advice?', 
      a: 'No. 50Stacks provides educational insights and data analysis tools only. We do not offer investment advice, recommendations, or execution services. All decisions should be made after consulting with a qualified financial advisor.' 
    },
    { 
      q: 'How does 50Stacks personalize mutual fund suggestions?', 
      a: 'During onboarding, you answer simple questions about your risk tolerance, investment timeline, and goals. 50Stacks uses these preferences to filter and surface funds that align with your stated profile—not as recommendations, but as relevant options to explore.' 
    },
    { 
      q: 'Where does the mutual fund data come from?', 
      a: '50Stacks aggregates publicly available mutual fund data from official sources including AMFI (Association of Mutual Funds in India) and fund house disclosures. We do not create or manipulate this data.' 
    },
    { 
      q: 'How often is mutual fund data updated?', 
      a: 'Mutual fund data is refreshed daily, typically after market close (around 9:30 PM IST). NAV updates, returns calculations, and other metrics reflect the most recent publicly available information.' 
    },
    { 
      q: 'Does 50Stacks execute investments or handle money?', 
      a: 'No. 50Stacks is purely an educational and analytical tool. We do not execute trades, hold funds, or handle any financial transactions. To invest, you must use your chosen broker or AMC platform.' 
    },
    { 
      q: 'Is my data safe on 50Stacks?', 
      a: 'Yes. We use industry-standard encryption and security practices. Your personal information and preferences are stored securely and never shared with third parties. We do not store any financial account credentials.' 
    },
    { 
      q: 'Who is 50Stacks built for?', 
      a: '50Stacks is built for anyone interested in understanding mutual funds better—beginners learning the basics, intermediate investors comparing options, or experienced users wanting a clean analytical dashboard.' 
    },
    { 
      q: 'Can I track my own portfolio on 50Stacks?', 
      a: 'Yes! You can manually add funds you have invested in, track allocation, and receive educational insights about your portfolio composition. This helps you understand your risk exposure and diversification.' 
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Animated Stock Graph Background */}
      <AnimatedStockGraph />
      
      {/* Gradient overlays for depth */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/90" />
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-primary/5 via-transparent to-transparent" />
      </div>

      {/* Sticky Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="cursor-pointer"
          >
            <FundexLogo size="md" />
          </button>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#founders" onClick={(e) => { e.preventDefault(); document.getElementById('founders')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Founders</a>
            <a href="#faqs" onClick={(e) => { e.preventDefault(); document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQs</a>
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

      {/* Hero Section - Center Aligned */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 z-10">
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <ScrollReveal animation="fade-up" delay={0}>
              <p className="text-sm md:text-base text-muted-foreground mb-6 tracking-wide">
                Built for learning, analysis, and informed decision-making
              </p>
            </ScrollReveal>
            
            <ScrollReveal animation="fade-up" delay={100}>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
                <span className="text-foreground">
                  Decode Mutual Fund
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                  Performance
                </span>
              </h1>
            </ScrollReveal>
            
            <ScrollReveal animation="fade-up" delay={200}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                50Stacks helps you explore, understand, and organize mutual fund data — 
                with clarity and context.
              </p>
            </ScrollReveal>
            
            <ScrollReveal animation="fade-up" delay={300}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')}
                  className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 shadow-xl shadow-primary/25 group transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02]"
                >
                  Get Started 
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 py-6 border-border/50 hover:bg-secondary/50 hover:border-primary/30 transition-all duration-300"
                >
                  Login to Dashboard
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Section 2: Why 50Stacks Exists */}
      <section id="about" className="relative py-24 z-10">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <ScrollReveal animation="fade-right">
                <Badge variant="outline" className="mb-4 bg-secondary/50">Why 50Stacks?</Badge>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={100}>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
                  Many investors see numbers, but lack <span className="text-primary">context</span>
                </h2>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={200}>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  Too much data, not enough understanding. 50Stacks focuses on simplicity, 
                  comparability, and structured insights.
                </p>
              </ScrollReveal>
              
              <div className="space-y-4">
                {[
                  'Designed to make mutual fund data easier to interpret',
                  'Built to help users explore risk and return more clearly',
                  'Focused on clarity over hype'
                ].map((item, idx) => (
                  <ScrollReveal key={idx} animation="fade-right" delay={300 + idx * 100}>
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <p className="text-foreground">{item}</p>
                    </div>
                  </ScrollReveal>
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
                <ScrollReveal key={idx} animation="scale" delay={idx * 100}>
                  <Card className="glass-card border-border/30 p-6 hover:border-primary/50 transition-all duration-300">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <card.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.desc}</p>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Features */}
      <section id="features" className="relative py-24 z-10 bg-secondary/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <ScrollReveal animation="fade-up">
              <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/30">Features</Badge>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={100}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">What 50Stacks Offers</h2>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={200}>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Tools designed for analysis and understanding, not advice or guarantees.
              </p>
            </ScrollReveal>
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
              <ScrollReveal key={idx} animation="fade-up" delay={idx * 100}>
                <Card className="glass-card border-border/30 p-6 hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 h-full">
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
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal animation="fade-up" delay={400}>
            <p className="text-center text-sm text-muted-foreground max-w-xl mx-auto">
              <Lock className="h-4 w-4 inline mr-1" />
              50Stacks does not provide investment advice. All insights are informational.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Section 4: How Personalization Works */}
      <section className="relative py-24 z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <ScrollReveal animation="fade-up">
              <Badge variant="outline" className="mb-4 bg-secondary/50">How It Works</Badge>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={100}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Personalization That Makes Sense</h2>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={200}>
              <p className="text-muted-foreground">Designed to align with your preferences, not to make promises.</p>
            </ScrollReveal>
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
                <ScrollReveal key={idx} animation="fade-left" delay={idx * 150}>
                  <div className="relative flex gap-6 mb-8 last:mb-0">
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
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Transparency & Trust */}
      <section className="relative py-24 z-10 bg-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <ScrollReveal animation="scale">
              <Badge variant="outline" className="mb-4 bg-success/10 text-success border-success/30">
                <Shield className="h-3 w-3 mr-2" />
                Transparency First
              </Badge>
            </ScrollReveal>
            <ScrollReveal animation="scale" delay={100}>
              <h2 className="text-3xl md:text-4xl font-bold mb-8 tracking-tight">Built on Trust</h2>
            </ScrollReveal>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Database, text: 'Uses publicly available mutual fund data' },
                { icon: Lock, text: 'No execution of investments' },
                { icon: Shield, text: 'No hidden fund promotion' },
                { icon: Users, text: 'Clear educational intent' }
              ].map((item, idx) => (
                <ScrollReveal key={idx} animation="fade-up" delay={200 + idx * 100}>
                  <Card className="glass-card border-border/30 p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-success" />
                    </div>
                    <p className="text-sm text-left">{item.text}</p>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Future Ready */}
      <section className="relative py-24 z-10">
        <div className="container mx-auto px-4 text-center">
          <ScrollReveal animation="blur">
            <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/30">
              <Zap className="h-3 w-3 mr-2" />
              Future Ready
            </Badge>
          </ScrollReveal>
          <ScrollReveal animation="blur" delay={100}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Built with Scale in Mind</h2>
          </ScrollReveal>
          <ScrollReveal animation="blur" delay={200}>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Modular architecture designed for evolving data sources and future feature expansion.
            </p>
          </ScrollReveal>
          
          <ScrollReveal animation="fade-up" delay={300}>
            <div className="flex flex-wrap justify-center gap-3">
              {['Modular Architecture', 'Scalable Infrastructure', 'API Ready', 'Continuous Updates'].map((tag, idx) => (
                <Badge key={idx} variant="outline" className="bg-secondary/50 px-4 py-2">
                  {tag}
                </Badge>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Section 7: Founders */}
      <section id="founders" className="relative py-24 z-10 bg-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <ScrollReveal animation="fade-up">
            <Badge variant="outline" className="mb-4 bg-secondary/50">The Team</Badge>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={100}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Know The Founders</h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-muted-foreground mb-8">3 CSE engineers with a shared vision for better financial literacy.</p>
          </ScrollReveal>
          
          <ScrollReveal animation="fade-up" delay={300}>
            <Button onClick={() => navigate('/founders')} variant="outline" className="gap-2">
              Meet the Team <ArrowRight className="h-4 w-4" />
            </Button>
          </ScrollReveal>
        </div>
      </section>

      {/* Section 8: FAQs */}
      <section id="faqs" className="relative py-24 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <ScrollReveal animation="fade-up">
                <Badge variant="outline" className="mb-4 bg-secondary/50">
                  <HelpCircle className="h-3 w-3 mr-2" />
                  FAQs
                </Badge>
              </ScrollReveal>
              <ScrollReveal animation="fade-up" delay={100}>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Common Questions</h2>
              </ScrollReveal>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, idx) => (
                <ScrollReveal key={idx} animation="fade-up" delay={150 + idx * 50}>
                  <AccordionItem value={`item-${idx}`} className="glass-card border-border/30 rounded-lg px-6 overflow-hidden">
                    <AccordionTrigger className="text-left hover:no-underline py-4 text-sm font-medium">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4 text-sm leading-relaxed">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                </ScrollReveal>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 z-10 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="container mx-auto px-4 text-center">
          <ScrollReveal animation="scale">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Ready to Explore?</h2>
          </ScrollReveal>
          <ScrollReveal animation="scale" delay={100}>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of investors who use 50Stacks to understand mutual fund performance.
            </p>
          </ScrollReveal>
          <ScrollReveal animation="scale" delay={200}>
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 shadow-xl shadow-primary/20"
            >
              Create Free Account <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-background/80 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <FundexLogo size="sm" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} 50Stacks – All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
