CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_email TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL, -- e.g., 'completed', 'refunded', 'pending'
    source TEXT NOT NULL, -- 'Manual', 'Kiwify', 'Stripe'
    platform_fee NUMERIC(10, 2) DEFAULT 0.00, -- To store platform fees
    external_id TEXT, -- To store the transaction ID from Kiwify/Stripe
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add an index on the external_id for faster lookups from webhooks
CREATE INDEX idx_sales_external_id ON sales(external_id);