-- Add Google Analytics and Search Console properties to the sites table
ALTER TABLE public.sites
ADD COLUMN ga4_property_id TEXT,
ADD COLUMN gsc_property_url TEXT;

-- Add a comment to explain the new columns
COMMENT ON COLUMN public.sites.ga4_property_id IS 'Google Analytics 4 Property ID';
COMMENT ON COLUMN public.sites.gsc_property_url IS 'Google Search Console Property URL (e.g., sc-domain:example.com)';
