CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL, -- e.g., 'active', 'canceled', 'past_due'
  source TEXT NOT NULL, -- 'Stripe' or 'Kiwify'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions."
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service roles can insert subscriptions."
  ON public.subscriptions FOR INSERT
  WITH CHECK (true); -- Or more restrictive if needed

CREATE POLICY "Service roles can update subscriptions."
  ON public.subscriptions FOR UPDATE
  USING (true); -- Or more restrictive if needed

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_subscription_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at timestamp on any change
CREATE TRIGGER on_subscription_update
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_subscription_update();
