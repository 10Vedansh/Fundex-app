import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TermsAndConditions } from '@/components/legal/TermsAndConditions';
import { PrivacyPolicy } from '@/components/legal/PrivacyPolicy';
import { Disclaimer } from '@/components/legal/Disclaimer';
import { RefundPolicy } from '@/components/legal/RefundPolicy';
import { TrendingUp, ArrowRight, BarChart2, Target, Bookmark, PieChart } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

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
      q: 'How does personalization work?', 
      a: 'During onboarding, you answer simple questions about your risk tolerance, investment timeline, and goals. 50Stacks uses these preferences to filter and surface funds that align with your stated profile—not as recommendations, but as relevant options to explore.' 
    },
    { 
      q: 'Where does the data come from?', 
      a: '50Stacks aggregates publicly available mutual fund data from official sources including AMFI (Association of Mutual Funds in India) and fund house disclosures. Data is refreshed daily after market close.' 
    },
    { 
      q: 'Is my data secure?', 
      a: 'Yes. We use industry-standard encryption and security practices. Your personal information and preferences are stored securely and never shared with third parties. We do not store any financial account credentials.' 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 group"
          >
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp size={18} className="text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              50Stacks
            </span>
          </button>
          
          <div className="hidden md:flex items-center gap-8">
            <a 
              href="#about" 
              onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              About
            </a>
            <a 
              href="#features" 
              onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }} 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Features
            </a>
            <a 
              href="#founders" 
              onClick={(e) => { e.preventDefault(); document.getElementById('founders')?.scrollIntoView({ behavior: 'smooth' }); }} 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Team
            </a>
            <a 
              href="#faqs" 
              onClick={(e) => { e.preventDefault(); document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' }); }} 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/auth')} 
              className="hidden sm:inline-flex text-sm font-medium"
            >
              Log in
            </Button>
            <Button 
              onClick={() => navigate('/auth')} 
              className="text-sm font-medium"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-sm text-muted-foreground mb-6 tracking-wide uppercase">
              Mutual Fund Analytics Platform
            </p>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold mb-8 leading-[1.1] tracking-tight text-foreground">
              Understand your investments with clarity
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
              50Stacks helps you analyze, compare, and track Indian mutual funds with 
              transparent data and meaningful context. No advice. No noise. Just insight.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="text-base px-6 py-5 font-medium"
              >
                Start analyzing
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-base px-6 py-5 font-medium border-border/60"
              >
                Learn more
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-24 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-sm text-primary mb-4 font-medium">The Problem</p>
              <h2 className="text-3xl font-semibold mb-6 tracking-tight text-foreground">
                Too much data, not enough understanding
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Most investors see numbers—NAVs, returns, expense ratios—but lack the context 
                to interpret them meaningfully. Information exists everywhere, but clarity is rare.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                50Stacks focuses on what matters: structured data, honest comparisons, and 
                personalized discovery based on your stated preferences. We don't tell you 
                what to buy. We help you understand what you're looking at.
              </p>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-muted-foreground mb-4 font-medium uppercase tracking-wide">
                Our Principles
              </p>
              {[
                { title: 'Clarity over complexity', desc: 'Clean metrics presented in context, not isolation' },
                { title: 'Transparency first', desc: 'All data sourced from AMFI and official disclosures' },
                { title: 'Education, not advice', desc: 'We inform your thinking, not your decisions' },
                { title: 'No hidden agendas', desc: 'No commission, no fund promotions, no conflicts' }
              ].map((item, idx) => (
                <div key={idx} className="border-l-2 border-border pl-4 py-1">
                  <h3 className="font-medium text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 bg-secondary/30 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <p className="text-sm text-primary mb-4 font-medium">Features</p>
            <h2 className="text-3xl font-semibold mb-4 tracking-tight text-foreground">
              Tools built for understanding
            </h2>
            <p className="text-muted-foreground">
              Analysis and organization features designed to support informed decision-making.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: BarChart2,
                title: 'Fund Analysis',
                desc: 'Structured data for every mutual fund scheme. Compare NAVs, returns, expense ratios, and risk metrics across consistent time periods.',
              },
              {
                icon: Target,
                title: 'Personalized Discovery',
                desc: 'Surface funds that match your stated risk tolerance, investment horizon, and goals. Preference-based filtering, not recommendations.',
              },
              {
                icon: Bookmark,
                title: 'Watchlist & Tracking',
                desc: 'Save funds you are researching. Track changes over time. Organize your analysis without losing context.',
              },
              {
                icon: PieChart,
                title: 'Portfolio Insights',
                desc: 'Understand your allocation, risk exposure, and diversification. Educational signals to inform your thinking.',
              }
            ].map((feature, idx) => (
              <div 
                key={idx} 
                className="p-6 rounded-lg border border-border/50 bg-card/50 hover:border-border transition-colors duration-200"
              >
                <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mt-12 text-center">
            50Stacks is an educational tool. We do not provide investment advice or execute transactions.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-24 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <p className="text-sm text-primary mb-4 font-medium">How It Works</p>
            <h2 className="text-3xl font-semibold mb-4 tracking-tight text-foreground">
              Simple onboarding, meaningful output
            </h2>
            <p className="text-muted-foreground">
              Answer a few questions. Get a filtered view of funds that align with your preferences.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Create account', desc: 'Quick signup with email or social login' },
              { step: '02', title: 'Set preferences', desc: 'Risk tolerance, goals, and investment horizon' },
              { step: '03', title: 'Explore funds', desc: 'Browse filtered results based on your profile' },
              { step: '04', title: 'Track & analyze', desc: 'Save funds, compare data, build understanding' }
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <p className="text-4xl font-light text-muted-foreground/30 mb-3">{item.step}</p>
                <h3 className="font-medium text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="founders" className="relative py-24 bg-secondary/30 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm text-primary mb-4 font-medium">The Team</p>
            <h2 className="text-3xl font-semibold mb-4 tracking-tight text-foreground">
              Built by engineers who invest
            </h2>
            <p className="text-muted-foreground mb-8">
              Three computer science engineers with a shared frustration: great financial data 
              exists, but tools to understand it don't. So we built one.
            </p>
            <Button 
              onClick={() => navigate('/founders')} 
              variant="outline" 
              className="font-medium border-border/60"
            >
              Meet the founders
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="relative py-24 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm text-primary mb-4 font-medium">FAQ</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Common questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, idx) => (
              <AccordionItem 
                key={idx} 
                value={`item-${idx}`} 
                className="border border-border/50 rounded-lg px-6 bg-card/30"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4 text-sm font-medium text-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 text-sm leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-semibold mb-4 tracking-tight text-foreground">
            Ready to understand your investments?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join investors who use 50Stacks for clear, contextual mutual fund analysis.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="text-base px-6 py-5 font-medium"
          >
            Create free account
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp size={16} className="text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-base font-semibold tracking-tight text-foreground">
                50Stacks
              </span>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm">
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
                Refund Policy
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-border/30">
            <p className="text-xs text-muted-foreground max-w-3xl">
              <strong>Disclaimer:</strong> Mutual fund investments are subject to market risks. 
              Read all scheme-related documents carefully before investing. Past performance is not 
              indicative of future returns. 50Stacks is an educational platform and is NOT a 
              SEBI-registered Investment Advisor. We do not provide investment advice or recommendations.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              © {new Date().getFullYear()} 50Stacks. All rights reserved.
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
