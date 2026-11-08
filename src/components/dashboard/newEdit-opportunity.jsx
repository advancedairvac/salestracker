"use client";

import { useActionState, useEffect, useState } from "react";

import { createOpportunity } from "@/app/admin/opportunities/new/actions";
import { updateOpportunity } from "@/app/admin/opportunities/[id]/actions";

import Input from "@/components/ui/input";

const initialState = {
  error: null,
  values: {},
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function formatDateInput(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

    if (match) return match[1];
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function prepareInitialValues(today, initialValues) {
  return {
    opportunityDate: formatDateInput(initialValues?.opportunityDate || today),
    pocName: "",
    businessName: "",
    jobType: "",
    email: "",
    textMessage: "",
    phone: "",
    location: "",
    value: "",
    followUpDate: "",
    ...initialValues,
    opportunityDate: formatDateInput(initialValues?.opportunityDate || today),
  };
}

/* -------------------------------------------------------
   SHARED FORM STYLES
------------------------------------------------------- */

const textareaClass = [
  "peer min-h-[58px] w-full resize-y rounded-none",
  "border border-[#d9d9d9] bg-white",
  "px-3 pt-[20px] pb-2",
  "text-xs font-normal text-[#111111] lg:text-sm",
  "outline-none transition-colors",
  "focus:border-[#111111]",
].join(" ");

const labelBase = [
  "pointer-events-none absolute left-3 z-[1]",
  "font-medium uppercase tracking-[0.02em]",
  "text-[#565656] transition-all duration-150",
].join(" ");

/* -------------------------------------------------------
   FLOATING SELECT
------------------------------------------------------- */

function FloatingSelect({
  name,
  label,
  value = "",
  onChange,
  children,
  required = false,
}) {
  const [focused, setFocused] = useState(false);

  const floating = focused || value !== "";

  return (
    <div className="relative w-full">
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        className={[
          "peer h-[50px] w-full rounded-none",
          "border border-[#d9d9d9] bg-white",
          "px-3 pt-[15px] pb-[4px]",
          "text-xs font-normal outline-none transition-colors",
          "focus:border-[#111111]",
          "appearance-none",
          floating ? "text-[#111111]" : "text-transparent",
        ].join(" ")}
      >
        <option value="" disabled hidden></option>
        {children}
      </select>

      <label
        htmlFor={name}
        className={`${labelBase} ${
          floating
            ? "top-[6px] text-[10px]"
            : "top-1/2 -translate-y-1/2 text-[10px]"
        }`}
      >
        {label}

        {required && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#666666]">
        <svg
          width="11"
          height="7"
          viewBox="0 0 11 7"
          fill="none"
          aria-hidden="true"
        >
          <path d="M1 1L5.5 5.5L10 1" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
    </div>
  );
}

/* -------------------------------------------------------
   FLOATING TEXTAREA
------------------------------------------------------- */

function FloatingTextarea({ name, label, value = "", onChange }) {
  const [focused, setFocused] = useState(false);

  const floating = focused || value !== "";

  return (
    <div className="relative w-full">
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        rows={2}
        className={textareaClass}
      />

      <label
        htmlFor={name}
        className={`${labelBase} ${
          floating ? "top-[6px] text-[10px]" : "top-[16px] text-[10px]"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

/* -------------------------------------------------------
   NEW / EDIT OPPORTUNITY FORM
------------------------------------------------------- */

export default function NewEditOpportunity({
  user,
  users = [],
  today,
  mode = "new",
  opportunityId = "",
  initialValues = {},
}) {
  const isEdit = mode === "edit";

  const action = isEdit ? updateOpportunity : createOpportunity;

  const [state, formAction, pending] = useActionState(action, initialState);

  const [values, setValues] = useState(() =>
    prepareInitialValues(today, initialValues),
  );

  /* Restore form values after validation errors */

  useEffect(() => {
    if (state.values) {
      setValues((previous) => ({
        ...previous,
        ...state.values,
        opportunityDate: isEdit
          ? previous.opportunityDate
          : formatDateInput(
              state.values.opportunityDate || previous.opportunityDate,
            ),
      }));
    }
  }, [state.values, isEdit]);

  /* Handle input changes */

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /* Error messages */

  const errorMessages = {
    required: "Please complete all required fields.",
    source: "Invalid opportunity source.",
    value: "Please enter a valid dollar value.",
    email: "Please enter a valid email address.",
    date: "Please select a valid opportunity date.",
    followup: "Please select a valid follow-up date.",
    assignee: "Please select a valid team member.",
    create: "Unable to create opportunity. Please try again.",
    update: "Unable to update opportunity. Please try again.",
    opportunity: "Opportunity not found.",
    status: "This opportunity can no longer be edited.",
  };

  return (
    <section className="w-full max-w-[700px]">
      {/* Validation Error */}

      {state.error && (
        <div
          role="alert"
          className="mb-4 border border-[#f1caca] bg-[#fff5f5] px-3 py-2.5 text-xs font-normal text-[#b42318] lg:text-sm"
        >
          {errorMessages[state.error] ||
            "Something went wrong. Please try again."}
        </div>
      )}

      <form action={formAction} className="flex w-full flex-col gap-[9px]">
        {/* Opportunity ID */}

        {isEdit && (
          <input type="hidden" name="opportunityId" value={opportunityId} />
        )}

        {/* Opportunity Date */}

        <Input
          name="opportunityDate"
          label="Today's Date"
          type="date"
          value={values.opportunityDate}
          onChange={handleChange}
          required={!isEdit}
        />

        {/* POC Name */}

        <Input
          name="pocName"
          label="POC Name"
          value={values.pocName}
          onChange={handleChange}
        />

        {/* Business Name */}

        <Input
          name="businessName"
          label="Business Name"
          value={values.businessName}
          onChange={handleChange}
          required
        />

        {/* Job Type */}

        <FloatingSelect
          name="jobType"
          label="Job Type"
          value={values.jobType}
          onChange={handleChange}
          required
        >
          <option value="EQUIPMENT ONLY">EQUIPMENT ONLY</option>

          <option value="INSTALL">INSTALL</option>

          <option value="SERVICE">SERVICE</option>

          <option value="PREVENTATIVE MAINTENANCE">
            PREVENTATIVE MAINTENANCE
          </option>

          <option value="AUTOMOTIVE">AUTOMOTIVE</option>

          <option value="HVACR">HVACR</option>

          <option value="OTHER">OTHER</option>
        </FloatingSelect>

        {/* Email */}

        <Input
          name="email"
          label="Email"
          type="email"
          value={values.email}
          onChange={handleChange}
        />

        {/* Text Message */}

        <FloatingTextarea
          name="textMessage"
          label="Text Message"
          value={values.textMessage}
          onChange={handleChange}
        />

        {/* Phone Number */}

        <Input
          name="phone"
          label="Phone Number (If Different)"
          type="tel"
          value={values.phone}
          onChange={handleChange}
        />

        {/* Location */}

        <Input
          name="location"
          label="Location"
          value={values.location}
          onChange={handleChange}
        />

        {/* Approximate Dollar Value */}

        <Input
          name="value"
          label="Approximate Dollar Value"
          type="number"
          min="0"
          step="0.01"
          value={values.value}
          onChange={handleChange}
        />

        {/* Follow-up Date - New Mode Only */}

        {!isEdit && (
          <Input
            name="followUpDate"
            label="Follow-Up Date"
            type="date"
            value={values.followUpDate}
            onChange={handleChange}
            min={values.opportunityDate}
          />
        )}

        {/* Submit Button */}

        <button
          type="submit"
          disabled={pending}
          className="mt-0 flex h-[48px] w-full items-center justify-center rounded-none border border-[#111111] bg-[#111111] px-4 text-xs font-semibold uppercase tracking-[0.03em] text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-60 lg:text-sm"
        >
          {pending
            ? isEdit
              ? "Updating..."
              : "Creating..."
            : isEdit
              ? "Update"
              : "Create"}
        </button>
      </form>
    </section>
  );
}
