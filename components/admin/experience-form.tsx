"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckPills, Field, selectClass } from "@/components/admin/field";
import { demoCategories } from "@/lib/demo/fixtures";
import type { Experience, LocationRef, Vendor } from "@/types/catalogue";
import type { AdminFormState } from "@/app/admin/experiences/actions";

const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

export function ExperienceForm({
  action,
  vendors,
  locations,
  experience,
}: {
  action: (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;
  vendors: Vendor[];
  locations: LocationRef[];
  experience?: Experience;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    action,
    {},
  );
  const e = experience;

  return (
    <form action={formAction} className="space-y-5">
      {e && <input type="hidden" name="id" value={e.id} />}

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Field label="Title" htmlFor="title">
          <Input id="title" name="title" defaultValue={e?.title} required />
        </Field>
        <Field label="Summary" htmlFor="summary" hint="One line for cards.">
          <Input id="summary" name="summary" defaultValue={e?.summary ?? ""} />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={e?.description ?? ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vendor" htmlFor="vendorId">
            <select
              id="vendorId"
              name="vendorId"
              defaultValue={e?.vendor.id ?? vendors[0]?.id}
              className={selectClass()}
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.verificationStatus !== "verified"
                    ? ` (${v.verificationStatus})`
                    : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location" htmlFor="locationId">
            <select
              id="locationId"
              name="locationId"
              defaultValue={e?.location?.id ?? locations[0]?.id}
              className={selectClass()}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Categories">
          <CheckPills
            name="categories"
            options={demoCategories.map((c) => ({
              value: c.slug,
              label: c.name,
            }))}
            selected={e?.categories ?? []}
          />
        </Field>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-2">
        <Field label="Price per person (MYR)" htmlFor="pricePerPerson">
          <Input
            id="pricePerPerson"
            name="pricePerPerson"
            type="number"
            min={0}
            step={10}
            defaultValue={e?.pricePerPerson ?? 0}
          />
        </Field>
        <Field label="Duration (minutes)" htmlFor="durationMinutes">
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={15}
            step={15}
            defaultValue={e?.durationMinutes ?? 120}
          />
        </Field>
        <Field label="Min pax" htmlFor="minPax">
          <Input
            id="minPax"
            name="minPax"
            type="number"
            min={1}
            defaultValue={e?.minPax ?? 1}
          />
        </Field>
        <Field label="Max pax" htmlFor="maxPax">
          <Input
            id="maxPax"
            name="maxPax"
            type="number"
            min={1}
            defaultValue={e?.maxPax ?? 10}
          />
        </Field>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Field label="Meeting point" htmlFor="meetingPoint">
          <Input
            id="meetingPoint"
            name="meetingPoint"
            defaultValue={e?.meetingPoint ?? ""}
          />
        </Field>
        <Field label="Available days">
          <CheckPills
            name="availabilityDays"
            options={DAYS}
            selected={e?.availability.days ?? ["sat", "sun"]}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Start times"
            htmlFor="availabilityTimes"
            hint="Comma-separated, e.g. 09:00, 14:00"
          >
            <Input
              id="availabilityTimes"
              name="availabilityTimes"
              defaultValue={(e?.availability.times ?? ["09:00"]).join(", ")}
            />
          </Field>
          <Field label="Capacity / slot" htmlFor="capacityPerSlot">
            <Input
              id="capacityPerSlot"
              name="capacityPerSlot"
              type="number"
              min={1}
              defaultValue={e?.availability.capacityPerSlot ?? 10}
            />
          </Field>
          <Field label="Lead time (hours)" htmlFor="bookingLeadtimeHours">
            <Input
              id="bookingLeadtimeHours"
              name="bookingLeadtimeHours"
              type="number"
              min={0}
              defaultValue={e?.bookingLeadtimeHours ?? 24}
            />
          </Field>
        </div>
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
            defaultValue={(e?.images ?? []).map((i) => i.url).join("\n")}
          />
        </Field>
        <Field
          label="What's included"
          htmlFor="includes"
          hint="One item per line, e.g. Local guide"
        >
          <Textarea
            id="includes"
            name="includes"
            rows={3}
            defaultValue={(e?.includes ?? []).join("\n")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Languages" htmlFor="languages" hint="Comma-separated.">
            <Input
              id="languages"
              name="languages"
              defaultValue={(e?.languages ?? ["English"]).join(", ")}
            />
          </Field>
          <Field label="Cancellation policy" htmlFor="cancellationPolicy">
            <Input
              id="cancellationPolicy"
              name="cancellationPolicy"
              defaultValue={e?.cancellationPolicy ?? ""}
              placeholder="Free cancellation up to 24 hours before start."
            />
          </Field>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={e?.isPublished ?? true}
          className="accent-[var(--primary)]"
        />
        Published (visible to travellers)
      </label>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Saving…" : e ? "Save changes" : "Create experience"}
        </Button>
      </div>
    </form>
  );
}
