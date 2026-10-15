create or replace function public.validate_student_auth_email()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  roll_number text := lower(trim(coalesce(new.raw_user_meta_data->>'roll_number', '')));
begin
  if coalesce(metadata->>'role', 'student') <> 'faculty'
    and coalesce(new.email, '') <> (roll_number || '@rvrjc.ac.in') then
    raise exception 'Student email must be the lowercase roll number followed by @rvrjc.ac.in';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_student_auth_email on auth.users;
create trigger validate_student_auth_email
  before insert on auth.users
  for each row execute procedure public.validate_student_auth_email();
