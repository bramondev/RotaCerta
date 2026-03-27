alter table public.community_posts
  add column if not exists image_path text,
  add column if not exists image_url text,
  add column if not exists expires_at timestamptz,
  add column if not exists removed_at timestamptz,
  add column if not exists removed_reason text;

create index if not exists community_posts_expires_at_idx
  on public.community_posts (expires_at);

create index if not exists community_posts_removed_at_idx
  on public.community_posts (removed_at);

create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  reporter_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, reporter_id)
);

create index if not exists community_post_reports_post_id_idx
  on public.community_post_reports (post_id);

create index if not exists community_post_reports_reporter_id_idx
  on public.community_post_reports (reporter_id);

alter table public.community_post_reports enable row level security;

drop policy if exists "Users can insert their own community reports" on public.community_post_reports;
create policy "Users can insert their own community reports"
  on public.community_post_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can view their own community reports" on public.community_post_reports;
create policy "Users can view their own community reports"
  on public.community_post_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

create or replace function public.apply_community_post_expiration()
returns trigger
language plpgsql
as $$
begin
  if new.removed_at is not null then
    if new.expires_at is null then
      new.expires_at := timezone('utc', now());
    end if;

    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.type = 'post' and coalesce(trim(new.image_url), '') <> '' and new.expires_at is null then
      new.expires_at := timezone('utc', now()) + interval '72 hours';
    elsif new.type <> 'post' and new.expires_at is null then
      new.expires_at := timezone('utc', now()) + interval '24 hours';
    end if;

    return new;
  end if;

  if new.type = 'post' then
    if coalesce(trim(old.image_url), '') = '' and coalesce(trim(new.image_url), '') <> '' then
      new.expires_at := coalesce(new.expires_at, timezone('utc', now()) + interval '72 hours');
    elsif coalesce(trim(old.image_url), '') <> '' and coalesce(trim(new.image_url), '') = '' then
      new.expires_at := null;
    end if;
  elsif old.type = 'post' and new.type <> 'post' and new.expires_at is null then
    new.expires_at := timezone('utc', now()) + interval '24 hours';
  end if;

  return new;
end;
$$;

drop trigger if exists community_post_expiration_trigger on public.community_posts;
create trigger community_post_expiration_trigger
before insert or update on public.community_posts
for each row
execute function public.apply_community_post_expiration();

create or replace function public.handle_community_post_report_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_total integer;
begin
  select count(distinct reporter_id)
    into report_total
  from public.community_post_reports
  where post_id = new.post_id;

  if report_total >= 3 then
    update public.community_posts
      set removed_at = coalesce(removed_at, timezone('utc', now())),
          removed_reason = coalesce(removed_reason, 'reported'),
          expires_at = coalesce(expires_at, timezone('utc', now()))
    where id = new.post_id
      and removed_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists community_post_report_threshold_trigger on public.community_post_reports;
create trigger community_post_report_threshold_trigger
after insert on public.community_post_reports
for each row
execute function public.handle_community_post_report_threshold();
