alter table public.students
  add column if not exists programming_languages jsonb not null default '[]'::jsonb,
  add column if not exists tools jsonb not null default '[]'::jsonb,
  add column if not exists preferred_domain text,
  add column if not exists preferred_mode text,
  add column if not exists preferred_location text;
