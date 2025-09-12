CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    type TEXT, -- 'Course' or 'Tool'
    created_at TIMESTAMPTZ DEFAULT NOW()
);