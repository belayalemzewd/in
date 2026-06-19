What this migration does

- Adds two optional text columns to the `movements` table:
  - `damaged_components` (text)
  - `damaged_component_other` (text)

How to apply

1) Supabase SQL editor (recommended)
- Open your Supabase project dashboard.
- Go to "SQL" (or "SQL Editor").
- Create a new query, paste the SQL from `migrations/001_add_movements_columns.sql` and run it.

2) psql (command-line)
- Use your Postgres connection string. Example:

  psql "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:<DB_PORT>/<DB_NAME>" -c "\
  ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS damaged_components text;\
  ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS damaged_component_other text;\
  "

Notes on schema cache / PostgREST

- After running the migration, Supabase/PostgREST may cache the schema. To ensure the API sees the new columns:
  - In the Supabase Dashboard: go to Project -> Settings -> Database / API (or SQL editor) and look for options to "Reload schema" or "Reset schema cache". If no button is present, restarting the API/service or waiting a minute typically refreshes the cache.

RLS / Permissions

- If Row Level Security (RLS) is enabled on `movements`, ensure the role your client uses (usually `anon` or `authenticated`) has an INSERT policy allowing the necessary fields.
- Example policy for authenticated users (adapt for your requirements):

  -- enable RLS if not already
  ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Allow authenticated inserts" ON public.movements
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

- Be careful: do not grant broad insert rights to `anon` unless you understand the security implications.

Testing

- After applying the migration and refreshing the schema, reload your web app and try submitting a damage report again.
- If you still see errors, copy the full Supabase error message (browser console or network response) and share it.

If you want, I can also add a small migration runner script, but it requires storing DB credentials (service_role) which is sensitive — I can show how to run it safely if needed.