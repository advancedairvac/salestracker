"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  updateFollowUpMode,
  updateOpportunityStatus,
} from "@/app/admin/opportunities/[id]/actions";

// ============================================
// HELPERS
// ============================================

function formatDate(date) {
  if (!date) return "Not scheduled";

  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date) {
  if (!date) return "";

  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getLocalDateTimeValue(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Format a date using the browser's local timezone.
function getLocalDateValue(date = new Date()) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Set reopening time to 7:30 AM in the browser's local timezone.
function getReopenDateTime(date) {
  if (!date) return null;

  const value = new Date(`${date}T07:30:00`);

  if (Number.isNaN(value.getTime())) return null;

  return value;
}

function isOverdue(date) {
  return Boolean(date && new Date(date).getTime() < Date.now());
}

function getStatusLabel(status) {
  const labels = {
    OPEN: "Open",
    WON: "Won",
    LOST: "Lost",
    TEMPORARILY_CLOSED: "Temporarily Closed",
    PERMANENTLY_CLOSED: "Permanently Closed",
    SCHEDULED_TO_REOPEN: "Scheduled to Reopen",
  };

  return labels[status] || status;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

// ============================================
// TOGGLE
// ============================================

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Follow-up mode"
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-[#8dc63f]" : "bg-[#d4d4d4]"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all duration-200 ${
          checked ? "left-[24px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

// ============================================
// OPPORTUNITY ACTIONS
// ============================================

export default function OpportunityActions({ opportunity, schedule }) {
  const router = useRouter();

  // ============================================
  // FOLLOW-UP INITIAL STATE
  // ============================================

  const initialManualFollowUp = useMemo(() => {
    return [...(opportunity.followUps || [])]
      .filter(
        (item) =>
          item.scheduleType === "MANUAL" &&
          item.status === "PENDING" &&
          item.dueAt,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
  }, [opportunity.followUps]);

  const initialNextFollowUp = useMemo(() => {
    return [...(opportunity.followUps || [])]
      .filter(
        (item) => item.isActive && item.status === "PENDING" && item.dueAt,
      )
      .sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      )[0];
  }, [opportunity.followUps]);

  // ============================================
  // FOLLOW-UP STATE
  // ============================================

  const [mode, setMode] = useState(schedule?.mode || "STANDARD");

  const [savedManualDateTime, setSavedManualDateTime] = useState(
    initialManualFollowUp?.dueAt || null,
  );

  const [manualDateTime, setManualDateTime] = useState(() =>
    getLocalDateTimeValue(initialManualFollowUp?.dueAt),
  );

  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    initialNextFollowUp?.dueAt || null,
  );

  const [showEditor, setShowEditor] = useState(
    schedule?.mode === "MANUAL" && !initialManualFollowUp?.dueAt,
  );

  // ============================================
  // STATUS ACTION STATE
  // ============================================

  const [currentStatus, setCurrentStatus] = useState(opportunity.status);

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");
  const [closeType, setCloseType] = useState("");

  // Use the original opportunity estimate as the default final sale value.
  const [finalValue, setFinalValue] = useState(String(opportunity.value ?? 0));

  const [note, setNote] = useState("");

  // Reopen date only. Time is automatically set to 7:30 AM.
  const [reopenDate, setReopenDate] = useState("");

  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");

  // ============================================
  // GENERAL STATE
  // ============================================

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [pending, startTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();

  const isStandard = mode === "STANDARD";
  const isManual = mode === "MANUAL";

  const isOpen = currentStatus === "OPEN";
  const manualIsOverdue = isManual && isOverdue(savedManualDateTime);

  // ============================================
  // CHANGE FOLLOW-UP MODE
  // ============================================

  function handleToggle() {
    if (pending || !isOpen) return;

    setError("");
    setSuccess("");

    const nextMode = isStandard ? "MANUAL" : "STANDARD";

    startTransition(async () => {
      const result = await updateFollowUpMode(opportunity.id, nextMode);

      if (!result?.success) {
        setError(result?.error || "Unable to update the follow-up schedule.");
        return;
      }

      if (nextMode === "STANDARD") {
        setMode("STANDARD");
        setShowEditor(false);
        setNextFollowUpAt(result.nextFollowUpAt || null);
        setSuccess("Standard follow-up intervals activated.");
        return;
      }

      setMode("MANUAL");

      if (result.needsDate) {
        setSavedManualDateTime(null);
        setManualDateTime("");
        setNextFollowUpAt(null);
        setShowEditor(true);
        return;
      }

      setSavedManualDateTime(result.manualDateTime || result.nextFollowUpAt);

      setManualDateTime(
        getLocalDateTimeValue(result.manualDateTime || result.nextFollowUpAt),
      );

      setNextFollowUpAt(result.nextFollowUpAt || null);
      setShowEditor(false);
      setSuccess("Saved manual follow-up activated.");
    });
  }

  // ============================================
  // OPEN FOLLOW-UP EDITOR
  // ============================================

  function handleEditTime() {
    setError("");
    setSuccess("");

    setManualDateTime(getLocalDateTimeValue(savedManualDateTime));
    setShowEditor(true);
  }

  // ============================================
  // SAVE MANUAL FOLLOW-UP
  // ============================================

  function handleManualSave() {
    if (!manualDateTime) {
      setError("Please select a follow-up date and time.");
      return;
    }

    const selectedDate = new Date(manualDateTime);

    if (Number.isNaN(selectedDate.getTime())) {
      setError("Please select a valid date and time.");
      return;
    }

    if (selectedDate <= new Date()) {
      setError("Please select a future date and time.");
      return;
    }

    setError("");
    setSuccess("");

    const selectedDateISO = selectedDate.toISOString();

    startTransition(async () => {
      const result = await updateFollowUpMode(
        opportunity.id,
        "MANUAL",
        selectedDateISO,
      );

      if (!result?.success) {
        setError(result?.error || "Unable to save the manual follow-up.");
        return;
      }

      setMode("MANUAL");

      setSavedManualDateTime(result.manualDateTime || selectedDateISO);

      setManualDateTime(
        getLocalDateTimeValue(result.manualDateTime || selectedDateISO),
      );

      setNextFollowUpAt(result.nextFollowUpAt || selectedDateISO);

      setShowEditor(false);
      setSuccess("Manual follow-up date and time saved.");
    });
  }

  // ============================================
  // CANCEL FOLLOW-UP EDITING
  // ============================================

  function handleCancelEdit() {
    setError("");
    setSuccess("");

    if (!savedManualDateTime) {
      setShowEditor(true);
      return;
    }

    setManualDateTime(getLocalDateTimeValue(savedManualDateTime));

    setShowEditor(false);
  }

  // ============================================
  // OPEN STATUS ACTION
  // ============================================

  function handleSelectAction(action) {
    setSelectedAction(action);
    setCloseType("");

    // Restore the original estimate when opening the Won form.
    setFinalValue(action === "WON" ? String(opportunity.value ?? 0) : "");

    setNote("");
    setReopenDate("");

    setStatusError("");
    setStatusSuccess("");

    setShowStatusMenu(false);
  }

  // ============================================
  // CANCEL STATUS ACTION
  // ============================================

  function handleCancelStatusAction() {
    setSelectedAction("");
    setCloseType("");

    setFinalValue(String(opportunity.value ?? 0));
    setNote("");
    setReopenDate("");

    setStatusError("");
  }

  // ============================================
  // SUBMIT STATUS ACTION
  // ============================================

  function handleStatusSubmit(event) {
    event.preventDefault();

    if (statusPending || !selectedAction) return;

    setStatusError("");
    setStatusSuccess("");

    const payload = {
      note: note.trim(),
    };

    const action = selectedAction;

    // ------------------------------------------
    // WON VALIDATION
    // ------------------------------------------

    if (selectedAction === "WON") {
      if (finalValue.trim() === "" || !Number.isFinite(Number(finalValue))) {
        setStatusError("Please enter a valid final sale value.");
        return;
      }

      if (Number(finalValue) < 0) {
        setStatusError("Final value cannot be negative.");
        return;
      }

      payload.finalValue = Number(finalValue);
    }

    // ------------------------------------------
    // CLOSE VALIDATION
    // ------------------------------------------

    if (selectedAction === "CLOSE") {
      if (!closeType) {
        setStatusError("Please select a closing option.");
        return;
      }

      payload.closeType = closeType;

      // Schedule Reopen: Date only, automatically 7:30 AM.
      if (closeType === "SCHEDULE_REOPEN") {
        if (!reopenDate) {
          setStatusError("Please select a reopening date.");
          return;
        }

        const selectedDate = getReopenDateTime(reopenDate);

        if (!selectedDate) {
          setStatusError("Please select a valid reopening date.");
          return;
        }

        if (selectedDate <= new Date()) {
          setStatusError(
            "Please select a future date. The opportunity will reopen at 7:30 AM.",
          );
          return;
        }

        // Convert the selected local date and 7:30 AM to UTC.
        payload.reopenAt = selectedDate.toISOString();
      }
    }

    // ------------------------------------------
    // SAVE STATUS
    // ------------------------------------------

    startStatusTransition(async () => {
      const result = await updateOpportunityStatus(
        opportunity.id,
        action,
        payload,
      );

      if (!result?.success) {
        setStatusError(
          result?.error || "Unable to update the opportunity status.",
        );
        return;
      }

      const nextStatus =
        action === "WON"
          ? "WON"
          : action === "LOST"
            ? "LOST"
            : closeType === "TEMPORARY"
              ? "TEMPORARILY_CLOSED"
              : closeType === "PERMANENT"
                ? "PERMANENTLY_CLOSED"
                : "SCHEDULED_TO_REOPEN";

      setCurrentStatus(nextStatus);
      setSelectedAction("");
      setCloseType("");

      setStatusSuccess(
        result.message || "Opportunity status updated successfully.",
      );

      router.refresh();
    });
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="mt-8 space-y-8">
      {/* FOLLOW-UP SECTION */}

      {isOpen ? (
        <section>
          <div className="flex min-h-6 flex-wrap items-center gap-3">
            <Toggle
              checked={isStandard}
              disabled={pending || statusPending}
              onChange={handleToggle}
            />

            <span className="text-sm font-medium leading-5 text-neutral-800">
              {isStandard
                ? "Standard Follow-up intervals"
                : "Manual Follow-up date input"}
            </span>

            {pending && (
              <span className="ml-1 flex items-center gap-2 text-xs text-neutral-500">
                <Spinner />
                Saving...
              </span>
            )}
          </div>

          {isStandard && (
            <p className="mt-2 ml-14 text-xs font-medium uppercase tracking-wide text-neutral-500">
              [24HRS / 36HRS / 1WK / 2WKS / 1MNTH]
            </p>
          )}

          {/* SAVED MANUAL DATE */}

          {isManual && savedManualDateTime && !showEditor && (
            <div className="mt-4 ml-14 max-w-sm">
              <div className="space-y-1 text-sm leading-5 text-neutral-700">
                <p>{formatDate(savedManualDateTime)}</p>
                <p>{formatTime(savedManualDateTime)}</p>
              </div>

              {manualIsOverdue && (
                <p className="mt-2 text-xs font-medium leading-5 text-red-600">
                  Follow-up overdue. Please update the follow-up date and time.
                </p>
              )}

              <button
                type="button"
                disabled={pending}
                onClick={handleEditTime}
                className="mt-3 text-sm font-medium text-neutral-900 underline underline-offset-4 transition-colors hover:text-neutral-500 disabled:opacity-50"
              >
                Edit Time
              </button>
            </div>
          )}

          {/* MANUAL DATE EDITOR */}

          {isManual && showEditor && (
            <div className="mt-4 ml-14 w-full max-w-sm space-y-4">
              <div>
                <label
                  htmlFor="manualFollowUpDateTime"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Select Follow-up Date & Time
                </label>

                <input
                  id="manualFollowUpDateTime"
                  type="datetime-local"
                  value={manualDateTime}
                  min={getLocalDateTimeValue(new Date())}
                  onChange={(event) => {
                    setManualDateTime(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  disabled={pending}
                  className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black disabled:opacity-60"
                />
              </div>

              <button
                type="button"
                disabled={pending || !manualDateTime}
                onClick={handleManualSave}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : (
                  "Save Follow-up"
                )}
              </button>

              {savedManualDateTime && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleCancelEdit}
                  className="w-full py-1 text-left text-sm text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-900 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </section>
      ) : (
        <p className="text-sm text-neutral-500">
          Follow-up is disabled for this opportunity.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm leading-5 text-red-600">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="text-sm leading-5 text-green-700">
          {success}
        </p>
      )}

      {/* OPPORTUNITY STARTED DATE */}

      <div className="mt-10 space-y-1 text-sm leading-5 text-neutral-500">
        <p className="font-medium text-neutral-600">
          Date Opportunity was started:
        </p>

        <p>{formatDate(opportunity.opportunityDate)}</p>
      </div>

      {/* OPPORTUNITY STATUS ACTIONS */}

      <section className="border-y border-neutral-200 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Opportunity Status
            </p>

            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {getStatusLabel(currentStatus)}
            </p>
          </div>

          {isOpen && (
            <div className="relative">
              <button
                type="button"
                disabled={statusPending}
                onClick={() => setShowStatusMenu((value) => !value)}
                className="flex h-10 items-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
              >
                Actions
                <span aria-hidden="true">▾</span>
              </button>

              {showStatusMenu && (
                <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => handleSelectAction("WON")}
                    className="block w-full px-4 py-2.5 text-left text-sm text-neutral-800 hover:bg-neutral-100"
                  >
                    Mark as Won
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAction("LOST")}
                    className="block w-full px-4 py-2.5 text-left text-sm text-neutral-800 hover:bg-neutral-100"
                  >
                    Mark as Lost
                  </button>

                  <div className="my-1 border-t border-neutral-100" />

                  <button
                    type="button"
                    onClick={() => handleSelectAction("CLOSE")}
                    className="block w-full px-4 py-2.5 text-left text-sm text-neutral-800 hover:bg-neutral-100"
                  >
                    Close Opportunity
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STATUS ACTION FORM */}

        {selectedAction && isOpen && (
          <form
            onSubmit={handleStatusSubmit}
            className="mt-5 max-w-lg space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                {selectedAction === "WON"
                  ? "Mark Opportunity as Won"
                  : selectedAction === "LOST"
                    ? "Mark Opportunity as Lost"
                    : "Close Opportunity"}
              </h3>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {selectedAction === "WON"
                  ? "Review or update the final sale value before confirming."
                  : selectedAction === "LOST"
                    ? "You can optionally add a note about why this opportunity was lost."
                    : "Choose how you want to close this opportunity."}
              </p>
            </div>

            {/* WON: EDITABLE FINAL VALUE */}

            {selectedAction === "WON" && (
              <div>
                <label
                  htmlFor="finalSaleValue"
                  className="mb-1.5 block text-sm font-medium text-neutral-700"
                >
                  Final Sale Value <span className="text-red-500">*</span>
                </label>

                <input
                  id="finalSaleValue"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={finalValue}
                  onChange={(event) => setFinalValue(event.target.value)}
                  placeholder="Enter final sale value"
                  disabled={statusPending}
                  className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black disabled:opacity-60"
                />
              </div>
            )}

            {/* CLOSE OPTIONS */}

            {selectedAction === "CLOSE" && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-700">
                  Select closing type
                </p>

                <div className="space-y-2">
                  {[
                    {
                      value: "TEMPORARY",
                      label: "Temporary Close",
                      description: "Close for now. May be reopened later.",
                    },
                    {
                      value: "PERMANENT",
                      label: "Permanent Close",
                      description: "Permanently close this opportunity.",
                    },
                    {
                      value: "SCHEDULE_REOPEN",
                      label: "Schedule Reopen",
                      description:
                        "Close now and save a future reopening date.",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                        closeType === option.value
                          ? "border-black bg-white"
                          : "border-neutral-200 bg-white hover:border-neutral-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="closeType"
                        value={option.value}
                        checked={closeType === option.value}
                        onChange={() => {
                          setCloseType(option.value);
                          setStatusError("");
                        }}
                        disabled={statusPending}
                        className="mt-1 accent-black"
                      />

                      <span>
                        <span className="block text-sm font-medium text-neutral-900">
                          {option.label}
                        </span>

                        <span className="mt-0.5 block text-xs text-neutral-500">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                {/* SCHEDULE REOPEN: DATE ONLY */}

                {closeType === "SCHEDULE_REOPEN" && (
                  <div>
                    <label
                      htmlFor="reopenDate"
                      className="mb-1.5 block text-sm font-medium text-neutral-700"
                    >
                      Reopen Date <span className="text-red-600">*</span>
                    </label>

                    <input
                      id="reopenDate"
                      type="date"
                      required
                      min={getLocalDateValue()}
                      value={reopenDate}
                      onChange={(event) => {
                        setReopenDate(event.target.value);
                        setStatusError("");
                      }}
                      disabled={statusPending}
                      className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black disabled:opacity-60"
                    />

                    <p className="mt-1.5 text-xs text-neutral-500">
                      Reopening time: 7:30 AM (Automatically set)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* OPTIONAL NOTE */}

            <div>
              <label
                htmlFor="statusNote"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Note{" "}
                <span className="font-normal text-neutral-400">(Optional)</span>
              </label>

              <textarea
                id="statusNote"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add an optional note..."
                disabled={statusPending}
                className="w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition-colors focus:border-black disabled:opacity-60"
              />
            </div>

            {statusError && (
              <p role="alert" className="text-sm text-red-600">
                {statusError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={statusPending}
                className="flex h-10 min-w-28 items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {statusPending ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : (
                  "Confirm"
                )}
              </button>

              <button
                type="button"
                disabled={statusPending}
                onClick={handleCancelStatusAction}
                className="h-10 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {statusSuccess && (
          <p role="status" className="mt-3 text-sm text-green-700">
            {statusSuccess}
          </p>
        )}
      </section>
    </div>
  );
}
