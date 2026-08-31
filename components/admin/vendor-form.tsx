"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/admin/field";
import type { Vendor } from "@/types/catalogue";
import type { AdminFormState } from "@/app/admin/vendors/actions";

const STATUSES = ["unverified", "pending", "verified", "rejected"];

export function VendorForm({
  action,
  vendor,
}: {
  action: (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;
  vendor?: Vendor;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    action,
    {},
  );
  const v = vendor;

  return (
    <form action={formAction} className="space-y-4">
      {v && <input type="hidden" name="id" value={v.id} />}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" defaultValue={v?.name} required />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={v?.description ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" htmlFor="locationName">
            <Input
              id="locationName"
              name="locationName"
              defaultValue={v?.locationName ?? ""}
            />
          </Field>
          <Field label="Verification" htmlFor="verificationStatus">
            <select
              id="verificationStatus"
              name="verificationStatus"
              defaultValue={v?.verificationStatus ?? "unverified"}
              className={selectClass()}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact email" htmlFor="contactEmail">
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={v?.contactEmail ?? ""}
            />
          </Field>
          <Field label="Contact phone" htmlFor="contactPhone">
            <Input
              id="contactPhone"
              name="contactPhone"
              defaultValue={v?.contactPhone ?? ""}
            />
          </Field>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={v?.isPublished ?? false}
          className="accent-[var(--primary)]"
        />
        Published
      </label>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : v ? "Save changes" : "Create vendor"}
      </Button>
    </form>
  );
}
