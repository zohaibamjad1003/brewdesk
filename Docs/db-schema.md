\-- WARNING: This schema is for context only and is not meant to be run.

\-- Table order and constraints may not be valid for execution.



CREATE TABLE public.profiles (

&#x20; id uuid NOT NULL,

&#x20; name text NOT NULL,

&#x20; email text,

&#x20; role USER-DEFINED NOT NULL DEFAULT 'employee'::user\_role,

&#x20; created\_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),

&#x20; avatar\_url text,

&#x20; status text DEFAULT 'Active'::text,

&#x20; CONSTRAINT profiles\_pkey PRIMARY KEY (id),

&#x20; CONSTRAINT profiles\_id\_fkey FOREIGN KEY (id) REFERENCES auth.users(id)

);

CREATE TABLE public.floors (

&#x20; id uuid NOT NULL DEFAULT gen\_random\_uuid(),

&#x20; name text NOT NULL UNIQUE,

&#x20; created\_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),

&#x20; CONSTRAINT floors\_pkey PRIMARY KEY (id)

);

CREATE TABLE public.drinks (

&#x20; id uuid NOT NULL DEFAULT gen\_random\_uuid(),

&#x20; name text NOT NULL UNIQUE,

&#x20; created\_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),

&#x20; CONSTRAINT drinks\_pkey PRIMARY KEY (id)

);

CREATE TABLE public.orders (

&#x20; id uuid NOT NULL DEFAULT gen\_random\_uuid(),

&#x20; employee\_id uuid NOT NULL,

&#x20; floor\_name text NOT NULL,

&#x20; drink\_name text NOT NULL,

&#x20; sugar USER-DEFINED NOT NULL,

&#x20; status USER-DEFINED NOT NULL DEFAULT 'Pending'::order\_status,

&#x20; feedback\_rating integer CHECK (feedback\_rating >= 1 AND feedback\_rating <= 5),

&#x20; feedback\_comments text,

&#x20; created\_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),

&#x20; custom\_name text,

&#x20; CONSTRAINT orders\_pkey PRIMARY KEY (id),

&#x20; CONSTRAINT orders\_employee\_id\_fkey FOREIGN KEY (employee\_id) REFERENCES public.profiles(id)

);

CREATE TABLE public.settings (

&#x20; key text NOT NULL DEFAULT 'beverage\_config'::text,

&#x20; start\_time time without time zone NOT NULL DEFAULT '09:00:00'::time without time zone,

&#x20; end\_time time without time zone NOT NULL DEFAULT '18:00:00'::time without time zone,

&#x20; created\_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),

&#x20; CONSTRAINT settings\_pkey PRIMARY KEY (key)

);

CREATE TABLE public.service\_hours (

&#x20; id uuid NOT NULL DEFAULT gen\_random\_uuid(),

&#x20; label text NOT NULL,

&#x20; start\_time time without time zone NOT NULL,

&#x20; end\_time time without time zone NOT NULL,

&#x20; created\_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),

&#x20; CONSTRAINT service\_hours\_pkey PRIMARY KEY (id)

);

