-- Private tables and service-only functions. Browser access is through authenticated Edge handlers.
create table if not exists public.bangi_push_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 subscription jsonb not null,
 preferences jsonb not null,
 revision uuid not null default gen_random_uuid(),
 scheduled_until timestamptz not null,
 updated_at timestamptz not null default now(),
 last_test_at timestamptz
);
create table if not exists public.bangi_push_jobs (
 user_id uuid not null references public.bangi_push_subscriptions(user_id) on delete cascade,
 id text not null,
 revision uuid not null,
 due_at timestamptz not null,
 title text not null, body text not null, sound boolean not null, vibrate boolean not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','skipped')),
 locked_at timestamptz,
 primary key(user_id,id)
);
create index if not exists bangi_push_jobs_due on public.bangi_push_jobs(due_at) where status='pending';
alter table public.bangi_push_subscriptions enable row level security;
alter table public.bangi_push_jobs enable row level security;
revoke all on public.bangi_push_subscriptions,public.bangi_push_jobs from anon,authenticated;
grant all on public.bangi_push_subscriptions,public.bangi_push_jobs to service_role;

create or replace function public.bangi_push_save(p_user uuid,p_subscription jsonb,p_preferences jsonb,p_jobs jsonb,p_until timestamptz)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_revision uuid := gen_random_uuid();
begin
 perform pg_advisory_xact_lock(hashtext(p_user::text));
 if not exists(select 1 from public.bangi_push_subscriptions where user_id=p_user) then
  perform pg_advisory_xact_lock(hashtext('bangi:installation-budget'));
  if (select count(*) from public.bangi_push_subscriptions)>=25 then raise exception 'Installation limit reached'; end if;
 end if;
 insert into public.bangi_push_subscriptions(user_id,subscription,preferences,revision,scheduled_until)
 values(p_user,p_subscription,p_preferences,v_revision,p_until)
 on conflict(user_id) do update set subscription=excluded.subscription,preferences=excluded.preferences,revision=v_revision,scheduled_until=p_until,updated_at=now();
 delete from public.bangi_push_jobs where user_id=p_user and status<>'sent';
 insert into public.bangi_push_jobs(user_id,id,revision,due_at,title,body,sound,vibrate)
 select p_user,j.id,v_revision,j.due_at,j.title,j.body,j.sound,j.vibrate from jsonb_to_recordset(p_jobs) as j(id text,due_at timestamptz,title text,body text,sound boolean,vibrate boolean)
 on conflict(user_id,id) do nothing;
 return v_revision;
end $$;

create or replace function public.bangi_push_refill(p_user uuid,p_revision uuid,p_jobs jsonb,p_until timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtext(p_user::text));
 if not exists(select 1 from public.bangi_push_subscriptions where user_id=p_user and revision=p_revision) then return; end if;
 delete from public.bangi_push_jobs where user_id=p_user and revision=p_revision and status in ('pending','skipped');
 insert into public.bangi_push_jobs(user_id,id,revision,due_at,title,body,sound,vibrate)
 select p_user,j.id,p_revision,j.due_at,j.title,j.body,j.sound,j.vibrate from jsonb_to_recordset(p_jobs) as j(id text,due_at timestamptz,title text,body text,sound boolean,vibrate boolean)
 on conflict(user_id,id) do nothing;
 update public.bangi_push_subscriptions set scheduled_until=p_until where user_id=p_user and revision=p_revision;
end $$;

create or replace function public.bangi_push_claim(p_now timestamptz)
returns setof public.bangi_push_jobs language plpgsql security definer set search_path=public,pg_temp as $$
begin
 delete from public.bangi_push_jobs where due_at<p_now-interval '7 days';
 update public.bangi_push_jobs set status='pending' where status='sending' and locked_at<p_now-interval '90 seconds';
 update public.bangi_push_jobs set status='skipped' where status='pending' and due_at<p_now-interval '2 minutes';
 return query update public.bangi_push_jobs set status='sending',locked_at=p_now where (user_id,id) in
 (select user_id,id from public.bangi_push_jobs where status='pending' and due_at<=p_now order by due_at limit 25 for update skip locked)
 returning *;
end $$;

create or replace function public.bangi_push_test_allowed(p_user uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.bangi_push_subscriptions set last_test_at=now() where user_id=p_user and (last_test_at is null or last_test_at<now()-interval '1 minute');
 return found;
end $$;
revoke all on function public.bangi_push_save(uuid,jsonb,jsonb,jsonb,timestamptz), public.bangi_push_refill(uuid,uuid,jsonb,timestamptz), public.bangi_push_claim(timestamptz), public.bangi_push_test_allowed(uuid) from public,anon,authenticated;
grant execute on function public.bangi_push_save(uuid,jsonb,jsonb,jsonb,timestamptz), public.bangi_push_refill(uuid,uuid,jsonb,timestamptz), public.bangi_push_claim(timestamptz), public.bangi_push_test_allowed(uuid) to service_role;
