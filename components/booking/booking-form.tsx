"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMYR, formatDays, weekdayKey } from "@/lib/format";
import { priceBooking } from "@/types/booking";
import { submitBooking, type BookState } from "@/app/(app)/book/actions";

type Props = {
  experienceId: string;
  tripId: string | null;
  unitPrice: number;
  minPax: number;
  maxPax: number;
  availableDays: string[];
  times: string[];
  leadtimeHours: number;
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
};

function isoIn(hours: number) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString().slice(0, 10);
}

export function BookingForm(props: Props) {
  const [state, action, pending] = useActionState<BookState, FormData>(
    submitBooking,
    {},
  );
  const [adults, setAdults] = useState(Math.max(props.minPax, 2));
  const [children, setChildren] = useState(0);
  const [date, setDate] = useState(isoIn(Math.max(props.leadtimeHours, 72)));

  const dateWarning =
    props.availableDays.length &&
    !props.availableDays.includes(weekdayKey(date))
      ? `Not available on ${new Date(date).toLocaleDateString("en-MY", {
          weekday: "long",
        })} — runs ${formatDays(props.availableDays)}.`
      : null;

  const pax = adults + children;
  const price = useMemo(
    () => priceBooking(props.unitPrice, Math.max(1, pax)),
    [props.unitPrice, pax],
  );
  const paxError =
    pax < props.minPax || pax > props.maxPax
      ? `This experience takes ${props.minPax}–${props.maxPax} people.`
      : null;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="experienceId" value={props.experienceId} />
      {props.tripId && (
        <input type="hidden" name="tripId" value={props.tripId} />
      )}
      <input type="hidden" name="numAdults" value={adults} />
      <input type="hidden" name="numChildren" value={children} />

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="bookingDate">Date</Label>
            <Input
              id="bookingDate"
              name="bookingDate"
              type="date"
              min={isoIn(props.leadtimeHours)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={pending}
              aria-invalid={!!dateWarning}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Time</Label>
            <select
              id="startTime"
              name="startTime"
              defaultValue={props.times[0] ?? "09:00"}
              disabled={pending}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {(props.times.length ? props.times : ["09:00"]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        {dateWarning ? (
          <p className="text-xs text-destructive">{dateWarning}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Runs {formatDays(props.availableDays)}. Book at least{" "}
            {Math.round(props.leadtimeHours / 24) || 1} day
            {props.leadtimeHours > 24 ? "s" : ""} ahead.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Stepper
            label="Adults"
            value={adults}
            min={1}
            max={props.maxPax}
            onChange={setAdults}
            disabled={pending}
          />
          <Stepper
            label="Children"
            value={children}
            min={0}
            max={Math.max(0, props.maxPax - 1)}
            onChange={setChildren}
            disabled={pending}
          />
        </div>
        {paxError && <p className="text-xs text-destructive">{paxError}</p>}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Lead traveller</p>
        <div className="space-y-1.5">
          <Label htmlFor="customerName">Full name</Label>
          <Input
            id="customerName"
            name="customerName"
            defaultValue={props.defaultName}
            required
            disabled={pending}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              defaultValue={props.defaultEmail}
              placeholder="you@email.com"
              required
              disabled={pending}
            />
            <p className="text-[11px] text-muted-foreground">
              Your booking confirmation goes here.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              defaultValue={props.defaultPhone}
              placeholder="+60…"
              disabled={pending}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="specialRequests">Special requests (optional)</Label>
          <Textarea
            id="specialRequests"
            name="specialRequests"
            rows={2}
            maxLength={500}
            placeholder="Dietary needs, pickup location, mobility…"
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {formatMYR(props.unitPrice)} × {Math.max(1, pax)}
          </span>
          <span>{formatMYR(price.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service fee</span>
          <span>{formatMYR(price.serviceFee)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold">
          <span>Total</span>
          <span>{formatMYR(price.totalAmount)}</span>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || !!paxError || !!dateWarning}
        size="lg"
        className="w-full bg-brand-gradient text-white"
      >
        {pending ? "Confirming…" : "Confirm booking"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You&apos;ll choose a payment method on the next step (test mode).
      </p>
    </form>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          className="grid size-8 place-items-center rounded-full border border-border text-lg disabled:opacity-40"
        >
          −
        </button>
        <span className="w-6 text-center font-medium tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          className="grid size-8 place-items-center rounded-full border border-border text-lg disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
