import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Footer } from '@/components/Footer';
import { Linkedin, Twitter, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface FounderCardProps {
  name: string;
  role: string;
  bio: string;
  initials: string;
  imageUrl?: string;
}

function FounderCard({ name, role, bio, initials, imageUrl }: FounderCardProps) {
  return (
    <Card className="glass-card hover-lift overflow-hidden">
      <CardContent className="p-8 flex flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-xl" />
          <Avatar className="h-32 w-32 border-4 border-primary/30 relative">
            <AvatarImage src={imageUrl} alt={name} />
            <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-purple-500 text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <Badge variant="outline" className="mb-3 bg-primary/10 text-primary border-primary/30">
          {role}
        </Badge>
        
        <h3 className="text-2xl font-bold text-foreground mb-2">{name}</h3>
        
        <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
          {bio}
        </p>
        
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Linkedin className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Twitter className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Mail className="h-5 w-5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Founders() {
  const founders = [
    {
      name: 'Coming Soon',
      role: 'Founder & CEO',
      bio: 'Passionate about democratizing investment insights and making mutual fund analysis accessible to everyone. Bio will be updated soon.',
      initials: 'F',
    },
    {
      name: 'Coming Soon',
      role: 'Co-Founder & CTO',
      bio: 'Technology enthusiast with a vision to build intelligent tools that help investors make informed decisions. Bio will be updated soon.',
      initials: 'C',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/30">
            Meet the Team
          </Badge>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Know the <span className="text-gradient">Founders</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The passionate minds behind Fundex, dedicated to revolutionizing how you analyze and invest in mutual funds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {founders.map((founder, index) => (
            <FounderCard key={index} {...founder} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <Card className="glass-card max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-foreground mb-3">Our Mission</h3>
              <p className="text-muted-foreground leading-relaxed">
                At Fundex, we believe everyone deserves access to professional-grade investment analysis. 
                Our mission is to simplify mutual fund research and empower Indian investors with 
                data-driven insights, AI-powered recommendations, and comprehensive analytics.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
