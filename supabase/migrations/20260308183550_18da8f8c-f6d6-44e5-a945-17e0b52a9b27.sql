
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create welcome notification on new user signup
CREATE OR REPLACE FUNCTION public.create_welcome_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    NEW.user_id,
    'success',
    'Welcome to CIFRAA! 🎉',
    'Here''s a quick walkthrough: 1️⃣ Complete your profile in My Account to get personalized recommendations. 2️⃣ Explore mutual funds in the All Funds tab and add favorites to your Watchlist. 3️⃣ Use Build Portfolio for AI-powered fund suggestions based on your risk profile. 4️⃣ Try the SIP Calculator to plan your investments. 5️⃣ Chat with our AI assistant for any questions. Happy investing!'
  );
  RETURN NEW;
END;
$$;

-- Trigger welcome notification when profile is created
CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_welcome_notification();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
