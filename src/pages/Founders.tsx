import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Github, Linkedin, Mail, Code, Database, Brain, Rocket } from 'lucide-react';
import dhruvImage from '@/assets/dhruv-dalal.jpeg';
import vedanshImage from '@/assets/vedansh-taparia.jpeg';

const founders = [
  {
    name: 'Dhruv Dalal',
    role: 'Founder & CEO',
    image: dhruvImage,
    bio: 'Computer Science Engineer with a passion for building scalable fintech solutions. Dhruv leads the technical vision and product strategy at Fundex, combining deep expertise in full-stack development with a keen understanding of financial markets. His mission is to democratize mutual fund analysis through innovative technology.',
    skills: ['Full-Stack Development', 'System Architecture', 'Product Strategy', 'Fintech'],
    icon: <Rocket className="h-5 w-5" />
  },
  {
    name: 'Vedansh Taparia',
    role: 'Co-Founder & CFO',
    image: vedanshImage,
    bio: 'Computer Science Engineer with expertise in data engineering and financial analytics. Vedansh oversees the financial operations and data infrastructure at Fundex, ensuring robust analytical capabilities. His background in algorithms and data structures powers the intelligent insights engine.',
    skills: ['Data Engineering', 'Financial Analytics', 'Backend Systems', 'Algorithms'],
    icon: <Database className="h-5 w-5" />
  }
];

export default function Founders() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">F</span>
            </div>
            <span className="text-xl font-bold">Fundex</span>
          </a>
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Dashboard
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/30">
            <Brain className="h-3 w-3 mr-1" />
            The Team Behind Fundex
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Know The Founders
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Two Computer Science engineers united by a vision to transform how India analyzes and understands mutual funds.
          </p>
        </div>
      </section>

      {/* Founders Grid */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {founders.map((founder, index) => (
              <Card 
                key={founder.name} 
                className="glass-card border-border/50 overflow-hidden group hover:border-primary/50 transition-all duration-300"
              >
                <CardContent className="p-0">
                  {/* Image Section */}
                  <div className="relative h-80 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                    <img 
                      src={founder.image} 
                      alt={founder.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                    
                    {/* Role Badge */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="bg-primary/90 text-primary-foreground mb-2 gap-1">
                        {founder.icon}
                        {founder.role}
                      </Badge>
                      <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                        {founder.name}
                      </h3>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6 space-y-4">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {founder.bio}
                    </p>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-2">
                      {founder.skills.map(skill => (
                        <Badge 
                          key={skill} 
                          variant="outline" 
                          className="bg-secondary/50 text-xs"
                        >
                          <Code className="h-3 w-3 mr-1" />
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    {/* Social Links Placeholder */}
                    <div className="flex gap-3 pt-2">
                      <button className="p-2 rounded-lg bg-secondary/50 hover:bg-primary/20 transition-colors">
                        <Linkedin className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </button>
                      <button className="p-2 rounded-lg bg-secondary/50 hover:bg-primary/20 transition-colors">
                        <Github className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </button>
                      <button className="p-2 rounded-lg bg-secondary/50 hover:bg-primary/20 transition-colors">
                        <Mail className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mission Statement */}
          <div className="mt-16 max-w-3xl mx-auto text-center">
            <Card className="glass-card border-primary/30 bg-primary/5">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
                <p className="text-muted-foreground">
                  At Fundex, we believe every investor deserves access to clear, unbiased mutual fund analysis. 
                  We're building technology that cuts through the noise, helping you make informed decisions 
                  with confidence and clarity.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fundex – All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
