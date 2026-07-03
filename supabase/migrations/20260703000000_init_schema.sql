-- Custom Types
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('employee', 'brewer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role public.user_role NOT NULL DEFAULT 'employee',
    status TEXT DEFAULT 'Active',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Allow public read access to profiles" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow users to insert/update their own profile" 
ON public.profiles FOR ALL USING (auth.uid() = id);

-- Table: floors
CREATE TABLE IF NOT EXISTS public.floors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for floors
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

-- Policies for floors
CREATE POLICY "Allow public read access to floors" 
ON public.floors FOR SELECT USING (true);

-- Table: orders
CREATE TABLE IF NOT EXISTS public.orders (
    id SERIAL PRIMARY KEY,
    employee_name TEXT NOT NULL,
    floor_name TEXT NOT NULL,
    drink_name TEXT NOT NULL,
    sugar_level TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    daily_order_number INTEGER NOT NULL,
    feedback_rating INTEGER,
    feedback_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies for orders
CREATE POLICY "Allow public read access to orders" 
ON public.orders FOR SELECT USING (true);

CREATE POLICY "Allow anyone to insert an order" 
ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to update orders" 
ON public.orders FOR UPDATE USING (true);

-- Table: service_hours
CREATE TABLE IF NOT EXISTS public.service_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for service_hours
ALTER TABLE public.service_hours ENABLE ROW LEVEL SECURITY;

-- Policies for service_hours
CREATE POLICY "Allow public read access to service_hours" 
ON public.service_hours FOR SELECT USING (true);

-- Table: settings
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    start_time TEXT,
    end_time TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings
CREATE POLICY "Allow public read access to settings" 
ON public.settings FOR SELECT USING (true);
