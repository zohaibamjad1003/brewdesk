# Database Schema Definitions

This document contains the PostgreSQL schema definitions and RLS policies for the BrewDesk database tables.

---

## 1. Custom Types

```sql
-- Role Enum
CREATE TYPE public.user_role AS ENUM ('employee', 'brewer', 'admin');

-- Order Status
-- Used to represent the status of a beverage order.
-- Note: 'Not Found' orders are stored with status = 'Delivered' and feedback_comments = '__NOT_FOUND__' as a database sentinel bypass.
```

---

## 2. Table: `profiles`
Stores user profile information for Employees, Brewers, and Admins.

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role public.user_role NOT NULL DEFAULT 'employee',
    status TEXT DEFAULT 'Active', -- Used by Brewers ('Active', 'On Break', 'Off')
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to profiles" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow users to insert/update their own profile" 
ON public.profiles FOR ALL USING (auth.uid() = id);
```

---

## 3. Table: `floors`
Stores office floor locations.

```sql
CREATE TABLE public.floors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to floors" 
ON public.floors FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to floors" 
ON public.floors FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
```

---

## 4. Table: `orders`
Stores employee drink orders and feedback reviews.

```sql
CREATE TABLE public.orders (
    id SERIAL PRIMARY KEY,
    employee_name TEXT NOT NULL,
    floor_name TEXT NOT NULL,
    drink_name TEXT NOT NULL,
    sugar_level TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'On the way', 'Delivered'
    daily_order_number INTEGER NOT NULL,
    feedback_rating INTEGER, -- Rating (1-5)
    feedback_comments TEXT, -- '__NOT_FOUND__' is used as a sentinel for Not Found button clicks
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to orders" 
ON public.orders FOR SELECT USING (true);

CREATE POLICY "Allow anyone to insert an order" 
ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to update orders" 
ON public.orders FOR UPDATE USING (true);
```

---

## 5. Table: `service_hours`
Stores time slots during which beverage ordering is allowed.

```sql
CREATE TABLE public.service_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.service_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to service_hours" 
ON public.service_hours FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to service_hours" 
ON public.service_hours FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
```

---

## 6. Table: `settings`
Stores system-wide key-value configurations.

```sql
CREATE TABLE public.settings (
    key TEXT PRIMARY KEY,
    start_time TEXT, -- Multi-purpose text field (holds 'true'/'false' for cooldown toggle)
    end_time TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to settings" 
ON public.settings FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to settings" 
ON public.settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
```

---

## 7. Supabase Realtime Sync Activation
Ensure that Supabase Realtime is active on the following tables for instant updates:

```sql
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.floors;
alter publication supabase_realtime add table public.service_hours;
alter publication supabase_realtime add table public.settings;
```
