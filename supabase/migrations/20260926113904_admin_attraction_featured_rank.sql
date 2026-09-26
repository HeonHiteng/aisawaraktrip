-- ============================================================
-- 0019 admin_save_attraction also saves the must-see rank (featuredRank: 1-99, or empty)
-- ============================================================

create or replace function public.admin_save_attraction(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id   uuid := nullif(p ->> 'id', '')::uuid;
  v_slug text;
  v_n    int  := 1;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if v_id is null then
    v_slug := p ->> 'slugBase';
    while exists (select 1 from public.attractions where slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := (p ->> 'slugBase') || '-' || v_n;
    end loop;

    insert into public.attractions (
      name, slug, summary, description, location_id, address, avg_visit_minutes,
      price_min, price_max, is_free, tips, is_sample, is_published, featured_rank, created_by
    ) values (
      p ->> 'name', v_slug, nullif(p ->> 'summary', ''), nullif(p ->> 'description', ''),
      nullif(p ->> 'locationId', '')::uuid, nullif(p ->> 'address', ''),
      (p ->> 'avgVisitMinutes')::int, (p ->> 'priceMin')::numeric, (p ->> 'priceMax')::numeric,
      coalesce((p ->> 'isFree')::boolean, false), nullif(p ->> 'tips', ''),
      false, coalesce((p ->> 'isPublished')::boolean, false),
      nullif(p ->> 'featuredRank', '')::smallint, auth.uid()
    )
    returning id into v_id;
  else
    -- opening_hours / booking_required / lat / lng are not part of the form: left untouched
    update public.attractions set
      name = p ->> 'name',
      summary = nullif(p ->> 'summary', ''),
      description = nullif(p ->> 'description', ''),
      location_id = nullif(p ->> 'locationId', '')::uuid,
      address = nullif(p ->> 'address', ''),
      avg_visit_minutes = (p ->> 'avgVisitMinutes')::int,
      price_min = (p ->> 'priceMin')::numeric,
      price_max = (p ->> 'priceMax')::numeric,
      is_free = coalesce((p ->> 'isFree')::boolean, false),
      tips = nullif(p ->> 'tips', ''),
      is_published = coalesce((p ->> 'isPublished')::boolean, false),
      featured_rank = nullif(p ->> 'featuredRank', '')::smallint
    where id = v_id;
    if not found then
      raise exception 'attraction not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.attraction_categories where attraction_id = v_id;
  insert into public.attraction_categories (attraction_id, category_id)
  select v_id, c.id from public.categories c
  where c.slug in (select jsonb_array_elements_text(coalesce(p -> 'categories', '[]'::jsonb)));

  delete from public.images where owner_type = 'attraction' and owner_id = v_id;
  insert into public.images (owner_type, owner_id, url, alt, sort_order, is_primary)
  select 'attraction', v_id, u.url, nullif(p ->> 'name', ''), (u.ord - 1)::int, (u.ord = 1)
  from jsonb_array_elements_text(coalesce(p -> 'images', '[]'::jsonb)) with ordinality as u(url, ord);

  return v_id;
end;
$$;
