-- Ebendo 0004: give the server role access to our tables.
--
-- Newer Supabase projects no longer grant table privileges to the API roles
-- automatically. The site talks to the database only from the server, with the
-- secret (service_role) key, so that role gets full access. The public
-- (anon / publishable) key gets nothing: the browser never reads tables directly.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Tables and sequences added by later migrations get the same access.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
