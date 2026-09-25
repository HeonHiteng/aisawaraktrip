-- ============================================================
-- 0014 admin catalogue functions + admin booking status
--
-- Admin work runs under the ADMIN'S OWN session (not the service role), so RLS
-- (`is_admin()`, migration 0005) is the authority: a forgotten requireAdmin() in
-- app code can't escalate, and every change is attributed to the real admin.
--
-- Saving an experience/attraction touches several tables (row + category links +
-- photos), so each is one SECURITY INVOKER function = one transaction. Each also
-- checks is_admin() up front, so a non-admin gets a clear error instead of RLS
-- quietly filtering half the writes.
--
-- Bookings: admins may change STATUS only (column-level grant). Money columns stay
-- server-only. The 0004 trigger already lets an admin make any transition and logs
-- the admin's id in booking_status_history.
-- ============================================================

-- ---------- bookings: admin status changes ----------
grant update (status, cancellation_reason) on public.bookings to authenticated;

create policy "bookings_admin_update" on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- experiences ----------
create or replace function public.admin_save_experience(p jsonb)
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
    -- slug comes from the title; keep it unique (x, x-2, x-3 …). Never changed on edit.
    v_slug := p ->> 'slugBase';
    while exists (select 1 from public.experiences where slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := (p ->> 'slugBase') || '-' || v_n;
    end loop;

    insert into public.experiences (
      vendor_id, title, slug, summary, description, location_id, duration_minutes,
      price_per_person, min_pax, max_pax, languages, includes, meeting_point,
      cancellation_policy, availability, booking_leadtime_hours,
      is_sample, is_published, created_by
    ) values (
      (p ->> 'vendorId')::uuid, p ->> 'title', v_slug,
      nullif(p ->> 'summary', ''), nullif(p ->> 'description', ''),
      nullif(p ->> 'locationId', '')::uuid, (p ->> 'durationMinutes')::int,
      (p ->> 'pricePerPerson')::numeric, (p ->> 'minPax')::int, (p ->> 'maxPax')::int,
      array(select jsonb_array_elements_text(p -> 'languages')),
      array(select jsonb_array_elements_text(p -> 'includes')),
      nullif(p ->> 'meetingPoint', ''), nullif(p ->> 'cancellationPolicy', ''),
      coalesce(p -> 'availability', '{}'::jsonb), (p ->> 'bookingLeadtimeHours')::int,
      false, coalesce((p ->> 'isPublished')::boolean, false), auth.uid()
    )
    returning id into v_id;
  else
    -- rating/review_count/is_sample/slug are deliberately not editable here
    update public.experiences set
      vendor_id = (p ->> 'vendorId')::uuid,
      title = p ->> 'title',
      summary = nullif(p ->> 'summary', ''),
      description = nullif(p ->> 'description', ''),
      location_id = nullif(p ->> 'locationId', '')::uuid,
      duration_minutes = (p ->> 'durationMinutes')::int,
      price_per_person = (p ->> 'pricePerPerson')::numeric,
      min_pax = (p ->> 'minPax')::int,
      max_pax = (p ->> 'maxPax')::int,
      languages = array(select jsonb_array_elements_text(p -> 'languages')),
      includes = array(select jsonb_array_elements_text(p -> 'includes')),
      meeting_point = nullif(p ->> 'meetingPoint', ''),
      cancellation_policy = nullif(p ->> 'cancellationPolicy', ''),
      availability = coalesce(p -> 'availability', '{}'::jsonb),
      booking_leadtime_hours = (p ->> 'bookingLeadtimeHours')::int,
      is_published = coalesce((p ->> 'isPublished')::boolean, false)
    where id = v_id;
    if not found then
      raise exception 'experience not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.experience_categories where experience_id = v_id;
  insert into public.experience_categories (experience_id, category_id)
  select v_id, c.id from public.categories c
  where c.slug in (select jsonb_array_elements_text(coalesce(p -> 'categories', '[]'::jsonb)));

  delete from public.images where owner_type = 'experience' and owner_id = v_id;
  insert into public.images (owner_type, owner_id, url, alt, sort_order, is_primary)
  select 'experience', v_id, u.url, nullif(p ->> 'title', ''), (u.ord - 1)::int, (u.ord = 1)
  from jsonb_array_elements_text(coalesce(p -> 'images', '[]'::jsonb)) with ordinality as u(url, ord);

  return v_id;
end;
$$;

-- ---------- attractions ----------
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
      price_min, price_max, is_free, tips, is_sample, is_published, created_by
    ) values (
      p ->> 'name', v_slug, nullif(p ->> 'summary', ''), nullif(p ->> 'description', ''),
      nullif(p ->> 'locationId', '')::uuid, nullif(p ->> 'address', ''),
      (p ->> 'avgVisitMinutes')::int, (p ->> 'priceMin')::numeric, (p ->> 'priceMax')::numeric,
      coalesce((p ->> 'isFree')::boolean, false), nullif(p ->> 'tips', ''),
      false, coalesce((p ->> 'isPublished')::boolean, false), auth.uid()
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
      is_published = coalesce((p ->> 'isPublished')::boolean, false)
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

-- ---------- vendors ----------
create or replace function public.admin_save_vendor(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id     uuid := nullif(p ->> 'id', '')::uuid;
  v_slug   text;
  v_n      int  := 1;
  v_loc    uuid;
  v_status public.verification_status := (p ->> 'verificationStatus')::public.verification_status;
  v_contact jsonb := jsonb_build_object(
    'email', nullif(p ->> 'contactEmail', ''),
    'phone', nullif(p ->> 'contactPhone', '')
  );
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  -- the form offers known locations; a name that matches none is a mistake, not something to invent
  if nullif(p ->> 'locationName', '') is not null then
    select id into v_loc from public.locations
    where lower(name) = lower(p ->> 'locationName') limit 1;
    if v_loc is null then
      raise exception 'unknown location: %', p ->> 'locationName' using errcode = 'P0002';
    end if;
  end if;

  if v_id is null then
    v_slug := p ->> 'slugBase';
    while exists (select 1 from public.vendors where slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := (p ->> 'slugBase') || '-' || v_n;
    end loop;

    insert into public.vendors (
      name, slug, description, location_id, contact, verification_status,
      verified_at, verified_by, avatar_url, is_sample, is_published, created_by
    ) values (
      p ->> 'name', v_slug, nullif(p ->> 'description', ''), v_loc,
      jsonb_strip_nulls(v_contact), v_status,
      case when v_status = 'verified' then now() end,
      case when v_status = 'verified' then auth.uid() end,
      nullif(p ->> 'avatarUrl', ''), false,
      coalesce((p ->> 'isPublished')::boolean, false), auth.uid()
    )
    returning id into v_id;
  else
    update public.vendors set
      name = p ->> 'name',
      description = nullif(p ->> 'description', ''),
      location_id = v_loc,
      -- merge (keeps any other keys), then drop the nulls so clearing a field really clears it
      contact = jsonb_strip_nulls(coalesce(contact, '{}'::jsonb) || v_contact),
      verification_status = v_status,
      verified_at = case when v_status = 'verified' then coalesce(verified_at, now()) end,
      verified_by = case when v_status = 'verified' then coalesce(verified_by, auth.uid()) end,
      avatar_url = nullif(p ->> 'avatarUrl', ''),
      is_published = coalesce((p ->> 'isPublished')::boolean, false)
    where id = v_id;
    if not found then
      raise exception 'vendor not found' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_set_vendor_verification(
  p_id uuid, p_status public.verification_status
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  update public.vendors set
    verification_status = p_status,
    verified_at = case when p_status = 'verified' then coalesce(verified_at, now()) end,
    verified_by = case when p_status = 'verified' then coalesce(verified_by, auth.uid()) end
  where id = p_id;
  if not found then
    raise exception 'vendor not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Signed-in users only; the functions themselves then require is_admin().
revoke execute on function public.admin_save_experience(jsonb) from public, anon;
revoke execute on function public.admin_save_attraction(jsonb) from public, anon;
revoke execute on function public.admin_save_vendor(jsonb)     from public, anon;
revoke execute on function public.admin_set_vendor_verification(uuid, public.verification_status)
  from public, anon;
grant execute on function public.admin_save_experience(jsonb) to authenticated;
grant execute on function public.admin_save_attraction(jsonb) to authenticated;
grant execute on function public.admin_save_vendor(jsonb)     to authenticated;
grant execute on function public.admin_set_vendor_verification(uuid, public.verification_status)
  to authenticated;
