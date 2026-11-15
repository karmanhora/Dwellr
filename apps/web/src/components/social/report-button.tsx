"use client";

import { REPORT_REASONS, REPORT_REASON_LABELS } from "@dwellr/core";
import { useActionState, useState } from "react";

import { createReportAction } from "@/app/social/actions";
import { Button } from "@/components/ui/button";
import { FlagIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ReportButtonProps = {
  targetType: "property" | "post" | "comment" | "profile";
  targetId: string;
  label?: string;
};

const initialReportState = { status: "idle" } as const;

export function ReportButton({ targetType, targetId, label = "Report" }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createReportAction, initialReportState);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <FlagIcon size={15} />
        {label}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report this content"
        description="Reports are private. They go to moderation, not to the person you are reporting."
      >
        {state.status === "success" ? (
          <div className="rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
            <p role="status">{state.message}</p>
            <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />

            <div>
              <label htmlFor={`report-reason-${targetId}`} className="text-body-sm font-medium">
                Reason
              </label>
              <Select id={`report-reason-${targetId}`} name="reason" required className="mt-2">
                <option value="">Choose a reason</option>
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {REPORT_REASON_LABELS[reason]}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor={`report-details-${targetId}`} className="text-body-sm font-medium">
                Details <span className="font-normal text-stone">(optional)</span>
              </label>
              <Textarea
                id={`report-details-${targetId}`}
                name="details"
                maxLength={1000}
                rows={3}
                className="mt-2"
                placeholder="What should moderation know?"
              />
            </div>

            {state.status === "error" && state.message ? (
              <p role="alert" className="rounded-card bg-danger-soft px-3 py-2 text-body-sm text-danger">
                {state.message}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={pending}>
                Send report
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
