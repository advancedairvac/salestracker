"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Input from "@/components/ui/input";

const EMPTY_VALUES = {
  name: "",
  title: "",
  email: "",
  monthlyGoal: "",
  quarterlyGoal: "",
  annualGoal: "",
};

function prepareInitialValues(initialValues = {}) {
  return {
    ...EMPTY_VALUES,
    ...initialValues,
    monthlyGoal: initialValues.monthlyGoal ?? "",
    quarterlyGoal: initialValues.quarterlyGoal ?? "",
    annualGoal: initialValues.annualGoal ?? "",
  };
}

const ERROR_MESSAGES = {
  permission: "You do not have permission to perform this action.",
  required: "Please complete all required fields.",
  email: "Please enter a valid email address.",
  goal: "Please enter valid sales goals.",
  "duplicate-email": "A user with this email address already exists.",
  create: "Unable to create the salesman. Please try again.",
  update: "Unable to update the profile. Please try again.",
  "invitation-email":
    "The profile was saved, but the invitation email could not be sent. Please try again.",
  "not-found": "The account could not be found.",
  "not-eligible": "This account is not eligible for this action.",
};

export default function NewEditSalesman({
  mode = "new",
  salesmanId = "",
  initialValues = {},
  onSubmit,
  onResendInvitation,
  canResendInvitation = false,
  onTerminate,
  onReactivate,
  canTerminate = false,
  canReactivate = false,
}) {
  const router = useRouter();

  const isEdit = mode === "edit";

  const [values, setValues] = useState(() =>
    prepareInitialValues(initialValues),
  );

  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [accountActionPending, setAccountActionPending] = useState(false);

  const [createdSalesmanId, setCreatedSalesmanId] = useState("");

  const [feedback, setFeedback] = useState(null);

  const shouldShowResend = isEdit
    ? canResendInvitation
    : Boolean(createdSalesmanId);

  const targetSalesmanId = isEdit ? salesmanId : createdSalesmanId;

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFeedback(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!onSubmit || pending || resending || accountActionPending) {
      return;
    }

    setPending(true);
    setFeedback(null);

    try {
      const result = await onSubmit({
        ...values,
        salesmanId: isEdit ? salesmanId : undefined,
      });

      if (result?.error) {
        if (result.salesmanId) {
          setCreatedSalesmanId(result.salesmanId);
        }

        setFeedback({
          type: "error",
          message:
            result.message ||
            ERROR_MESSAGES[result.error] ||
            "Something went wrong. Please try again.",
        });

        if (result.error === "invitation-email" && isEdit) {
          router.refresh();
        }

        return;
      }

      if (result?.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
        return;
      }

      if (result?.success) {
        setCreatedSalesmanId("");

        setFeedback({
          type: "success",
          message:
            result.message ||
            (isEdit
              ? "Profile updated successfully."
              : "Salesman created and invitation email sent successfully."),
        });

        if (!isEdit) {
          setValues(EMPTY_VALUES);
        }
      }
    } catch (error) {
      console.error("Salesman form submission failed:", error);

      setFeedback({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  async function handleResendInvitation() {
    if (
      !targetSalesmanId ||
      !onResendInvitation ||
      pending ||
      resending ||
      accountActionPending
    ) {
      return;
    }

    setResending(true);
    setFeedback(null);

    try {
      const result = await onResendInvitation(targetSalesmanId);

      if (result?.error) {
        setFeedback({
          type: "error",
          message:
            ERROR_MESSAGES[result.error] ||
            "Unable to resend the invitation. Please try again.",
        });

        return;
      }

      if (result?.success) {
        if (!isEdit) {
          setCreatedSalesmanId("");
        }

        setFeedback({
          type: "success",
          message: result.message || "Invitation email sent successfully.",
        });

        router.refresh();
      }
    } catch (error) {
      console.error("Resend invitation failed:", error);

      setFeedback({
        type: "error",
        message: "Unable to resend the invitation. Please try again.",
      });
    } finally {
      setResending(false);
    }
  }

  async function handleAccountAction(action, actionType) {
    if (
      !salesmanId ||
      !action ||
      pending ||
      resending ||
      accountActionPending
    ) {
      return;
    }

    const confirmationMessage =
      actionType === "terminate"
        ? "Are you sure you want to terminate this salesperson? Their account will be deactivated, but all existing data will be preserved."
        : "Are you sure you want to reactivate this salesperson's account?";

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setAccountActionPending(true);
    setFeedback(null);

    try {
      const result = await action(salesmanId);

      if (result?.error) {
        setFeedback({
          type: "error",
          message:
            ERROR_MESSAGES[result.error] ||
            "Unable to update the account status.",
        });

        return;
      }

      if (result?.success) {
        setFeedback({
          type: "success",
          message: result.message || "Account status updated successfully.",
        });

        router.refresh();
      }
    } catch (error) {
      console.error("Account status action failed:", error);

      setFeedback({
        type: "error",
        message: "Unable to update the account status.",
      });
    } finally {
      setAccountActionPending(false);
    }
  }

  return (
    <section className="w-full max-w-[700px]">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[9px]">
        {isEdit && <input type="hidden" name="salesmanId" value={salesmanId} />}

        <Input
          name="name"
          label="Name"
          type="text"
          placeholder=" "
          value={values.name}
          onChange={handleChange}
          required
        />

        <Input
          name="title"
          label="Title"
          type="text"
          placeholder=" "
          value={values.title}
          onChange={handleChange}
        />

        <Input
          name="email"
          label="Gmail"
          type="email"
          placeholder=" "
          value={values.email}
          onChange={handleChange}
          required
        />

        <Input
          name="monthlyGoal"
          label="Monthly Goal"
          type="number"
          placeholder=" "
          min="0"
          step="0.01"
          value={values.monthlyGoal}
          onChange={handleChange}
        />

        <Input
          name="quarterlyGoal"
          label="Quarterly Goal"
          type="number"
          placeholder=" "
          min="0"
          step="0.01"
          value={values.quarterlyGoal}
          onChange={handleChange}
        />

        <Input
          name="annualGoal"
          label="Annual Goal"
          type="number"
          placeholder=" "
          min="0"
          step="0.01"
          value={values.annualGoal}
          onChange={handleChange}
        />

        {feedback && (
          <p
            role={feedback.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={[
              "mt-2 text-sm leading-6",
              feedback.type === "success" ? "text-green-700" : "text-red-600",
            ].join(" ")}
          >
            {feedback.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || resending || accountActionPending}
          className={[
            "mt-0 flex h-[48px] w-full items-center justify-center",
            "rounded-none border border-[#111111] bg-[#111111] px-4",
            "text-xs font-semibold uppercase tracking-[0.03em] text-white",
            "transition-colors hover:bg-[#333333]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "lg:text-sm",
          ].join(" ")}
        >
          {pending
            ? isEdit
              ? "Updating..."
              : "Saving & Sending Invitation..."
            : isEdit
              ? "Update"
              : "Save & Invite"}
        </button>

        {shouldShowResend && (
          <button
            type="button"
            onClick={handleResendInvitation}
            disabled={pending || resending || accountActionPending}
            className={[
              "flex h-[48px] w-full items-center justify-center",
              "rounded-none border border-[#111111] bg-white px-4",
              "text-xs font-semibold uppercase tracking-[0.03em] text-black",
              "transition-colors hover:bg-neutral-100",
              "disabled:cursor-not-allowed disabled:opacity-60",
            ].join(" ")}
          >
            {resending ? "Resending Invitation..." : "Resend Invitation"}
          </button>
        )}

        {canTerminate && (
          <button
            type="button"
            onClick={() => handleAccountAction(onTerminate, "terminate")}
            disabled={pending || resending || accountActionPending}
            className={[
              "mt-3 flex h-[48px] w-full items-center justify-center",
              "rounded-none border border-red-600 bg-white px-4",
              "text-xs font-semibold uppercase tracking-[0.03em] text-red-600",
              "transition-colors hover:bg-red-50",
              "disabled:cursor-not-allowed disabled:opacity-60",
            ].join(" ")}
          >
            {accountActionPending ? "Processing..." : "Terminate Salesperson"}
          </button>
        )}

        {canReactivate && (
          <button
            type="button"
            onClick={() => handleAccountAction(onReactivate, "reactivate")}
            disabled={pending || resending || accountActionPending}
            className={[
              "mt-3 flex h-[48px] w-full items-center justify-center",
              "rounded-none border border-green-700 bg-white px-4",
              "text-xs font-semibold uppercase tracking-[0.03em] text-green-700",
              "transition-colors hover:bg-green-50",
              "disabled:cursor-not-allowed disabled:opacity-60",
            ].join(" ")}
          >
            {accountActionPending ? "Processing..." : "Reactivate Salesperson"}
          </button>
        )}
      </form>
    </section>
  );
}
