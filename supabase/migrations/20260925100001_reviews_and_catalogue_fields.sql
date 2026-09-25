-- ============================================================
-- 0007 reviews + the catalogue fields the app already models
--
--  * experiences.rating / review_count = the editorial BASELINE. The app blends
--    it with live rows from `reviews` (lib/domain/reviews.ts ratingSummary),
--    exactly as the demo store does.
--  * vendors.avatar_url = Vendor.avatarUrl in types/catalogue.ts.
--  * reviews: publicly readable for published experiences; written only by the
--    server (service role) after it has verified the reviewer holds a
--    confirmed/completed booking — clients get no write privileges at all.
-- ============================================================

alter table public.experiences
  add column rating       numeric(2, 1) check (rating is null or rating between 1 and 5),
  add column review_count int not null default 0 check (review_count >= 0);

alter table public.vendors
  add column avatar_url text;

create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  -- snapshot: profiles are private, so the public list can't join to them
  author_name   text not null,
  rating        smallint not null check (rating between 1 and 5),
  comment       text not null check (char_length(comment) between 10 and 600),
  created_at    timestamptz not null default now(),
  unique (experience_id, user_id)
);
create index reviews_experience_idx on public.reviews (experience_id, created_at desc);

alter table public.reviews enable row level security;

create policy "reviews_read" on public.reviews
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.experiences e
      where e.id = experience_id and e.is_published
    )
  );

-- Writes: server only (service role bypasses RLS and holds its own grants).
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;
