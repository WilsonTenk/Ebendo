# Database tests

`money_paths.sql` checks every money path on a throwaway Postgres: Paystack payments and replays, cash with
receipt numbers, overpayments, cancelling and expiry (stock released, 100% to store credit), spending credit,
and that the public API roles can't call the money functions. Any wrong result stops the run.

```sh
docker run -d --name ebendo-sqltest -e POSTGRES_PASSWORD=test -e POSTGRES_DB=ebendo postgres:16-alpine
P="docker exec -i ebendo-sqltest psql -U postgres -d ebendo -v ON_ERROR_STOP=1 -q"
$P < supabase/tests/00_supabase_stubs.sql
$P < supabase/migrations/0001_init.sql
$P < supabase/migrations/0002_cash_and_store_credit.sql
$P < supabase/migrations/0003_product_photos.sql
$P < supabase/migrations/0004_server_role_grants.sql
$P < supabase/tests/money_paths.sql      # ends with "ALL CHECKS PASSED"
docker rm -f ebendo-sqltest
```
