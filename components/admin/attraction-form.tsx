"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckPills, Field, selectClass } from "@/components/admin/field";
import { demoCategories } from "@/lib/demo/fixtures";
import type { Attraction, LocationRef } from "@/types/catalogue";
import type { AdminFormState } from "@/app/admin/attractions/actions";

export function AttractionForm({
  action,
  locations,
  attraction,
}: {
  action: (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;
  locations: LocationRef[];
  attraction?: Attraction;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    action,
    {},
  );
  const a = attraction;

  return (
    <form action={formAction} className="space-y-4">
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" defaultValue={a?.name} required />
        </Field>
        <Field label="Summary" htmlFor="summary">
          <Input id="summary" name="summary" defaultValue={a?.summary ?? ""} />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={a?.description ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" htmlFor="locationId">
            <select
              id="locationId"
              name="locationId"
              defaultValue={a?.location?.id ?? locations[0]?.id}
              className={selectClass()}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" defaultValue={a?.address ?? ""} />
          </Field>
        </div>
        <Field label="Categories">
          <CheckPills
            name="categories"
            options={demoCategories.map((c) => ({
              value: c.slug,
              label: c.name,
            }))}
            selected={a?.categories ?? []}
          />
        </Field>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-3">
        <Field label="Typical visit (min)" htmlFor="avgVisitMinutes">
          <Input
            id="avgVisitMinutes"
            name="avgVisitMinutes"
            type="number"
            min={15}
            step={15}
            defaultValue={a?.avgVisitMinutes ?? 90}
          />
        </Field>
        <Field label="Price min (MYR)" htmlFor="priceMin">
          <Input
            id="priceMin"
            name="priceMin"
            type="number"
            min={0}
            defaultValue={a?.priceMin ?? 0}
          />
        </Field>
        <Field label="Price max (MYR)" htmlFor="priceMax">
          <Input
            id="priceMax"
            name="priceMax"
            type="number"
            min={0}
            defaultValue={a?.priceMax ?? 0}
          />
        </Field>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Field
          label="Photos"
          htmlFor="images"
          hint="One image URL per line. The first is used as the cover photo."
        >
          <Textarea
            id="images"
            name="images"
            rows={3}
            placeholder="https://images.example.com/photo.jpg"
            defaultValue={(a?.images ?? []).map((i) => i.url).join("\n")}
          />
        </Field>
        <Field label="Visitor tip" htmlFor="tips">
          <Input id="tips" name="tips" defaultValue={a?.tips ?? ""} />
        </Field>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isFree"
            defaultChecked={a?.isFree ?? false}
            className="accent-[var(--primary)]"
          />
          Free entry
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={a?.isPublished ?? true}
            className="accent-[var(--primary)]"
          />
          Published (visible to travellers)
        </label>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? "Saving…" : a ? "Save changes" : "Create attraction"}
      </Button>
    </form>
  );
}
