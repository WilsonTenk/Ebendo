-- Stand-ins for Supabase-only pieces, so the migrations run on plain Postgres for testing.
create role anon; create role authenticated; create role service_role;
create schema storage; create table storage.buckets (id text primary key, name text, public boolean);
