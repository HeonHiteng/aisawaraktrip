"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckPills, Field, selectClass } from "@/components/admin/field";
import { CITIES, DISH_LABELS, PRICE_TIER_HINT, PRICE_TIER_LABEL, type Eatery, type PriceTier } from "@/types/eatery";
import type { AdminFormState } from "@/app/admin/eateries/actions";

export function EateryForm({
  action,
  eatery,
}: {
  action: (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;
  eatery?: Eatery;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(action, {});
  const e = eatery;

  return (
    <form action={formAction} className="space-y-4">
      {e && <input type="hidden" name="id" value={e.id} />}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" defaultValue={e?.name} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="city">
            <select id="city" name="city" defaultValue={e?.city ?? "Kuching"} className={selectClass()}>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price" htmlFor="priceTier" hint="The guide's rough tiers, not ringgit amounts.">
            <select id="priceTier" name="priceTier" defaultValue={e?.priceTier ?? ""} className={selectClass()}>
              <option value="">Not stated</option>
              {([1, 2, 3] as PriceTier[]).map((t) => (
                <option key={t} value={t}>
                  {PRICE_TIER_LABEL[t]} — {PRICE_TIER_HINT[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="What to eat here">
          <CheckPills
            name="dishes"
            options={Object.entries(DISH_LABELS).map(([value, label]) => ({ value, label }))}
            selected={e?.dishes ?? []}
          />
        </Field>
        <Field label="Google Maps link" htmlFor="mapsUrl" hint="A full https:// link (Share → Copy link in Google Maps).">
          <Input id="mapsUrl" name="mapsUrl" type="url" placeholder="https://maps.app.goo.gl/…" defaultValue={e?.mapsUrl ?? ""} />
        </Field>
        <Field label="Note" htmlFor="notes" hint="One short line, e.g. “Go for the sunset.” (max 300 characters)">
          <Textarea id="notes" name="notes" rows={2} maxLength={300} defaultValue={e?.notes ?? ""} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isSplurge" defaultChecked={e?.isSplurge ?? false} className="accent-[var(--primary)]" />
          A splurge — a special-occasion pick
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={e?.isPublished ?? true} className="accent-[var(--primary)]" />
        Published (visible to travellers)
      </label>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="brand" size="lg" disabled={pending}>
        {pending ? "Saving…" : e ? "Save changes" : "Create eatery"}
      </Button>
    </form>
  );
}
