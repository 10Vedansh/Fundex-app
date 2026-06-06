-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  -- Questionnaire responses
  risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  investment_horizon TEXT CHECK (investment_horizon IN ('short', 'medium', 'long')),
  investment_goal TEXT CHECK (investment_goal IN ('wealth', 'income', 'preservation', 'tax')),
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  investment_amount TEXT CHECK (investment_amount IN ('small', 'medium', 'large')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create watchlist table
CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_id TEXT NOT NULL,
  fund_name TEXT NOT NULL,
  fund_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, fund_id)
);

-- Create portfolio table for user investments
CREATE TABLE public.portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_id TEXT NOT NULL,
  fund_name TEXT NOT NULL,
  fund_category TEXT,
  invested_amount DECIMAL(15, 2),
  sip_amount DECIMAL(15, 2),
  is_sip BOOLEAN DEFAULT FALSE,
  units DECIMAL(15, 4),
  purchase_nav DECIMAL(10, 4),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, fund_id)
);

-- Create fund cache table for daily data
CREATE TABLE public.fund_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE DEFAULT 'mf_data',
  data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for watchlist
CREATE POLICY "Users can view their own watchlist" 
  ON public.watchlist FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their watchlist" 
  ON public.watchlist FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their watchlist" 
  ON public.watchlist FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for portfolio
CREATE POLICY "Users can view their own portfolio" 
  ON public.portfolio FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their portfolio" 
  ON public.portfolio FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their portfolio" 
  ON public.portfolio FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their portfolio" 
  ON public.portfolio FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policy for fund cache (public read, no write from client)
CREATE POLICY "Anyone can read fund cache" 
  ON public.fund_cache FOR SELECT 
  USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_updated_at
  BEFORE UPDATE ON public.portfolio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user creation (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();