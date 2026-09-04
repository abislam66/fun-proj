"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";

import { Button } from "@/components/ui/primitives";
import { AnalyticsEvent } from "@/lib/analytics";

const REASONS = [
  ["closed", "It looks closed"],
  ["moved", "It moved"],
  ["wrong_hours", "Hours are wrong"],
  ["other", "Something else"],
] as const;

export function ReportProblemForm({ venueName }: { venueName: string }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const posthog = usePostHog();

  if (submitted) {
    return (
      <div className="report-success" role="status">
        <strong>Thanks for the heads-up.</strong>
        <p>We’ll check the details for {venueName}.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="secondary">
        Report a problem
      </Button>
    );
  }

  return (
    <form
      className="report-form"
      onSubmit={(event) => {
        event.preventDefault();
        const reason = new FormData(event.currentTarget).get("reason");
        posthog.capture(AnalyticsEvent.ProblemReported, {
          reason: typeof reason === "string" ? reason : "closed",
        });
        setSubmitted(true);
      }}
    >
      <fieldset>
        <legend>What seems wrong?</legend>
        {REASONS.map(([value, label], index) => (
          <label key={value}>
            <input
              defaultChecked={index === 0}
              name="reason"
              type="radio"
              value={value}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label>
        <span>
          Anything else? <small>Optional</small>
        </span>
        <textarea maxLength={500} name="note" rows={4} />
      </label>
      <div className="report-actions">
        <Button type="submit">Send report</Button>
        <Button onClick={() => setOpen(false)} variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  );
}
