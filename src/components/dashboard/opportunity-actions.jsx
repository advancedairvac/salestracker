
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/input";

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

function getLocalDateValue(date = new Date()) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalDateTimeAt730(date) {
  if (!date) return null;

  const value = new Date(`${date}T07:30:00`);

  return Number.isNaN(value.getTime()) ? null : value;
}

function getEarliestFollowUpDate() {
  const now = new Date();
  const todayAt730 = new Date(now);

  todayAt730.setHours(7, 30, 0, 0);

  if (todayAt730 <= now) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return getLocalDateValue(tomorrow);
  }

  return getLocalDateValue(now);
}

function isOverdue(date) {
  return Boolean(date && new Date(date).getTime() < Date.now());
}

function getStatusLabel(status) {
  const labels = {
    OPEN: "Open",
    WON: "Won",
    LOST: "Lost",
    SCHEDULED_TO_REOPEN: "Scheduled to Reopen",
  };

  return labels[status] || status;
}

// ============================================
// SPINNER
// ============================================

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

export default function OpportunityActions({
  opportunity,
  schedule,
  role = "ADMIN",
  canManage: canManageProp,
  updateFollowUpModeAction,
  updateOpportunityStatusAction,
}) {
  const router = useRouter();

  const isAdmin = role === "ADMIN";

  const canManage =
    canManageProp !== undefined ? canManageProp : isAdmin;

  // ============================================
  // INITIAL FOLLOW-UP DATA
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
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )[0];
  }, [opportunity.followUps]);

  const initialNextFollowUp = useMemo(() => {
    return [...(opportunity.followUps || [])]
      .filter(
        (item) => item.isActive && item.status === "PENDING" && item.dueAt,
      )
      .sort(
        (a, b) =>
          new Date(a.dueAt).getTime() -
          new Date(b.dueAt).getTime(),
      )[0];
  }, [opportunity.followUps]);

  // ============================================
  // FOLLOW-UP STATE
  // ============================================

  const [mode, setMode] = useState(schedule?.mode || "STANDARD");

  const [savedManualDateTime, setSavedManualDateTime] = useState(
    initialManualFollowUp?.dueAt || null,
  );

  const [manualDate, setManualDate] = useState(() =>
    getLocalDateValue(initialManualFollowUp?.dueAt || new Date()),
  );

  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    initialNextFollowUp?.dueAt || null,
  );

  const [showEditor, setShowEditor] = useState(
    schedule?.mode === "MANUAL" && !initialManualFollowUp?.dueAt,
  );

  // ============================================
  // CLOSING STATE
  // ============================================

  const [currentStatus, setCurrentStatus] = useState(opportunity.status);

  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeType, setCloseType] = useState("");
  const [note, setNote] = useState("");
  const [titanJobId, setTitanJobId] = useState(
    opportunity.titanJobId || "",
  );
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
  // FOLLOW-UP MODE
  // ============================================

  function handleToggle() {
    if (pending || !isOpen || !canManage) return;

    setError("");
    setSuccess("");

    const nextMode = isStandard ? "MANUAL" : "STANDARD";

    startTransition(async () => {
      try {
        const result = await updateFollowUpModeAction(
          opportunity.id,
          nextMode,
        );

        if (!result?.success) {
          setError(
            result?.error || "Unable to update the follow-up schedule.",
          );
          return;
        }

        if (nextMode === "STANDARD") {
          setMode("STANDARD");
          setShowEditor(false);
          setSavedManualDateTime(null);
          setNextFollowUpAt(result.nextFollowUpAt || null);
          setSuccess("Standard follow-up intervals activated.");

          router.refresh();
          return;
        }

        setMode("MANUAL");

        if (result.needsDate) {
          setSavedManualDateTime(null);
          setManualDate(getLocalDateValue());
          setNextFollowUpAt(null);
          setShowEditor(true);
          return;
        }

        const savedDateTime =
          result.manualDateTime || result.nextFollowUpAt;

        setSavedManualDateTime(savedDateTime);
        setManualDate(getLocalDateValue(savedDateTime));
        setNextFollowUpAt(result.nextFollowUpAt || null);
        setShowEditor(false);
        setSuccess("Saved manual follow-up activated.");

        router.refresh();
      } catch (err) {
        console.error("Follow-up toggle failed:", err);
        setError("Something went wrong. Please try again.");
      }
    });
  }

  // ============================================
  // EDIT MANUAL FOLLOW-UP DATE
  // ============================================

  function handleEditDate() {
    if (!canManage || !isOpen) return;

    setError("");
    setSuccess("");

    setManualDate(
      savedManualDateTime
        ? getLocalDateValue(savedManualDateTime)
        : getLocalDateValue(),
    );

    setShowEditor(true);
  }

  // ============================================
  // SAVE MANUAL FOLLOW-UP DATE
  // ============================================

  function handleManualSave() {
    if (!canManage || !isOpen) return;

    if (!manualDate) {
      setError("Please select a follow-up date.");
      return;
    }

    const selectedDate = getLocalDateTimeAt730(manualDate);

    if (!selectedDate) {
      setError("Please select a valid follow-up date.");
      return;
    }

    if (selectedDate <= new Date()) {
      setError(
        "Please select a future date. Follow-up time is automatically set to 7:30 AM.",
      );
      return;
    }

    setError("");
    setSuccess("");

    const selectedDateISO = selectedDate.toISOString();

    startTransition(async () => {
      try {
        const result = await updateFollowUpModeAction(
          opportunity.id,
          "MANUAL",
          selectedDateISO,
        );

        if (!result?.success) {
          setError(
            result?.error || "Unable to save the manual follow-up.",
          );
          return;
        }

        setMode("MANUAL");

        const savedDateTime =
          result.manualDateTime || selectedDateISO;

        setSavedManualDateTime(savedDateTime);
        setManualDate(getLocalDateValue(savedDateTime));
        setNextFollowUpAt(result.nextFollowUpAt || selectedDateISO);

        setShowEditor(false);
        setSuccess("Manual follow-up date saved. Time: 7:30 AM.");

        router.refresh();
      } catch (err) {
        console.error("Manual follow-up save failed:", err);
        setError("Something went wrong. Please try again.");
      }
    });
  }

  // ============================================
  // CANCEL MANUAL DATE EDIT
  // ============================================

  function handleCancelEdit() {
    if (!canManage) return;

    setError("");
    setSuccess("");

    if (!savedManualDateTime) {
      setShowEditor(true);
      return;
    }

    setManualDate(getLocalDateValue(savedManualDateTime));
    setShowEditor(false);
  }

  // ============================================
  // CLOSE OPPORTUNITY
  // ============================================

  function handleOpenCloseForm() {
    if (!canManage || !isOpen) return;

    setCloseType("");
    setNote("");
    setTitanJobId(opportunity.titanJobId || "");
    setReopenDate("");
    setStatusError("");
    setStatusSuccess("");
    setShowCloseForm(true);
  }

  function handleCancelCloseForm() {
    setShowCloseForm(false);
    setCloseType("");
    setNote("");
    setTitanJobId(opportunity.titanJobId || "");
    setReopenDate("");
    setStatusError("");
  }

  function handleStatusSubmit(event) {
    event.preventDefault();

    if (statusPending || !showCloseForm || !canManage || !isOpen) {
      return;
    }

    setStatusError("");
    setStatusSuccess("");

    if (!["WON", "LOST", "SCHEDULE_REOPEN"].includes(closeType)) {
      setStatusError("Please select a valid closing type.");
      return;
    }

    const payload = {
      closeType,
      note: note.trim(),
    };

    if (closeType === "WON") {
      payload.titanJobId = titanJobId.trim();
    }

    if (closeType === "SCHEDULE_REOPEN") {
      if (!reopenDate) {
        setStatusError("Please select a reopening date.");
        return;
      }

      const selectedDate = getLocalDateTimeAt730(reopenDate);

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

      payload.reopenAt = selectedDate.toISOString();
    }

    startStatusTransition(async () => {
      try {
        const result = await updateOpportunityStatusAction(
          opportunity.id,
          "CLOSE",
          payload,
        );

        if (!result?.success) {
          setStatusError(
            result?.error || "Unable to update the opportunity status.",
          );
          return;
        }

        setCurrentStatus(result.status || closeType);
        setShowCloseForm(false);
        setCloseType("");

        setStatusSuccess(
          result.message || "Opportunity status updated successfully.",
        );

        router.refresh();
      } catch (err) {
        console.error("Close opportunity failed:", err);
        setStatusError("Something went wrong. Please try again.");
      }
    });
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="mt-8 space-y-8">
      {/* FOLLOW-UP SECTION */}

      {isOpen && canManage ? (
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

          {isManual && savedManualDateTime && !showEditor && (
            <div className="mt-4 ml-14 max-w-sm">
              <div className="space-y-1 text-sm leading-5 text-neutral-700">
                <p>{formatDate(savedManualDateTime)}</p>
                <p>{formatTime(savedManualDateTime)}</p>
              </div>

              {manualIsOverdue && (
                <p className="mt-2 text-xs font-medium leading-5 text-red-600">
                  Follow-up overdue. Please update the follow-up date.
                </p>
              )}

              <button
                type="button"
                disabled={pending}
                onClick={handleEditDate}
                className="mt-3 text-sm font-medium text-neutral-900 underline underline-offset-4 transition-colors hover:text-neutral-500 disabled:opacity-50"
              >
                Edit Date
              </button>
            </div>
          )}

          {/* MANUAL FOLLOW-UP DATE */}

          {isManual && showEditor && (
            <div className="mt-4 ml-14 w-full max-w-sm space-y-4">
              <Input
                id="manualFollowUpDate"
                name="manualFollowUpDate"
                type="date"
                label="Select Follow-up Date"
                value={manualDate}
                min={getEarliestFollowUpDate()}
                onChange={(event) => {
                  setManualDate(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={pending}
                hint="Follow-up time: 7:30 AM (Automatically set)"
              />

              <button
                type="button"
                disabled={pending || !manualDate}
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
          {isOpen
            ? "Follow-up management is available only to the assigned salesperson and Admin."
            : "Follow-up is disabled for this opportunity."}
        </p>
      )}

      {canManage && error && (
        <p role="alert" className="text-sm leading-5 text-red-600">
          {error}
        </p>
      )}

      {canManage && success && (
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

      {/* OPPORTUNITY STATUS + TITAN JOB ID */}

      <section className="border-y border-neutral-200 py-5">
        <div className="grid grid-cols-2 items-center gap-6">
          {/* LEFT: OPPORTUNITY STATUS */}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Opportunity Status
            </p>

            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {getStatusLabel(currentStatus)}
            </p>
          </div>

          {/* RIGHT: TITAN JOB ID */}

          <div className="flex justify-end">
            {opportunity.titanJobId && (
              <div className="w-full">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Titan Job ID
                </p>

                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {opportunity.titanJobId}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CLOSE OPPORTUNITY BUTTON */}

        {canManage && isOpen && !showCloseForm && (
          <button
            type="button"
            disabled={statusPending}
            onClick={handleOpenCloseForm}
            className="mt-5 flex h-10 items-center justify-center rounded-md bg-black px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close Opportunity
          </button>
        )}

        {/* CLOSE OPPORTUNITY FORM */}

        {canManage && showCloseForm && isOpen && (
          <form
            onSubmit={handleStatusSubmit}
            className="mt-5 max-w-lg space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Close Opportunity
              </h3>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Choose how you want to close this opportunity.
              </p>
            </div>

            {/* CLOSING TYPE */}

            <div className="space-y-3">
              <p className="text-sm font-medium text-neutral-700">
                Select closing type
              </p>

              <div className="space-y-2">
                {[
                  {
                    value: "WON",
                    label: "Won",
                    description: "Mark this opportunity as won.",
                  },
                  {
                    value: "LOST",
                    label: "Lost",
                    description: "Mark this opportunity as lost.",
                  },
                  {
                    value: "SCHEDULE_REOPEN",
                    label: "Schedule Reopen",
                    description:
                      "Close now and automatically reopen on a selected date.",
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
                        setReopenDate("");
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

              {/* TITAN JOB ID */}

              {closeType === "WON" && (
                <Input
                  id="titanJobId"
                  name="titanJobId"
                  type="text"
                  label="Titan Job ID (Optional)"
                  value={titanJobId}
                  onChange={(event) => setTitanJobId(event.target.value)}
                  disabled={statusPending}
                />
              )}

              {/* REOPEN DATE */}

              {closeType === "SCHEDULE_REOPEN" && (
                <Input
                  id="reopenDate"
                  name="reopenDate"
                  type="date"
                  label="Reopen Date"
                  required
                  min={getEarliestFollowUpDate()}
                  value={reopenDate}
                  onChange={(event) => {
                    setReopenDate(event.target.value);
                    setStatusError("");
                  }}
                  disabled={statusPending}
                  hint="Reopening time: 7:30 AM (Automatically set)"
                />
              )}
            </div>

            {/* OPTIONAL NOTE */}

            <div>
              <Input
                as="textarea"
                id="statusNote"
                name="statusNote"
                label="Note (Optional)"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={statusPending}
              />
            </div>

            {statusError && (
              <p role="alert" className="text-sm text-red-600">
                {statusError}
              </p>
            )}

            {/* ACTION BUTTONS */}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={statusPending || !closeType}
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
                onClick={handleCancelCloseForm}
                className="h-10 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {canManage && statusSuccess && (
          <p role="status" className="mt-3 text-sm text-green-700">
            {statusSuccess}
          </p>
        )}
      </section>
    </div>
  );
}
