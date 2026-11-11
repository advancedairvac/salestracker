"use client";

import { useActionState, useEffect, useState } from "react";


import { updateOpportunity } from "@/app/admin/opportunities/[id]/actions";

import Input from "@/components/ui/input";
import CustomerSearch from "@/components/ui/customer-search";

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

function prepareInitialValues(today, initialValues, user) {
  return {
    opportunityDate: formatDateInput(initialValues?.opportunityDate || today),
    pocName: "",
    stCustomerId: "",
    businessName: "",
    jobType: "",
    email: "",
    textMessage: "",
    phone: "",
    location: "",
    value: "",
    followUpDate: "",
    assignedToId: user?.id || "",
    ...initialValues,
    opportunityDate: formatDateInput(initialValues?.opportunityDate || today),
    assignedToId: initialValues?.assignedToId || user?.id || "",
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
  createAction,
  mode = "new",
  opportunityId = "",
  initialValues = {},
}) {
  const isEdit = mode === "edit";
  const isAdmin = user?.role === "ADMIN";

 const action = isEdit ? updateOpportunity : createAction;

  const [state, formAction, pending] = useActionState(action, initialState);

  const [values, setValues] = useState(() =>
    prepareInitialValues(today, initialValues, user),
  );

  /* -------------------------------------------------------
     ASSIGNMENT OPTIONS
  ------------------------------------------------------- */

  const activeSalespeople = users.filter(
    (item) => item.role === "SALESPERSON" && item.isActive !== false,
  );

  const assignmentUsers = [
    ...(isAdmin ? [user] : []),
    ...activeSalespeople.filter((item) => item.id !== user?.id),
  ];

  /* -------------------------------------------------------
     RESTORE FORM VALUES AFTER VALIDATION ERRORS
  ------------------------------------------------------- */

  useEffect(() => {
    if (state.values) {
      setValues((previous) => ({
        ...previous,
        ...state.values,
        opportunityDate: formatDateInput(
          state.values.opportunityDate || previous.opportunityDate,
        ),
        assignedToId: state.values.assignedToId || previous.assignedToId,
      }));
    }
  }, [state.values]);

  /* -------------------------------------------------------
     HANDLE INPUT CHANGES
  ------------------------------------------------------- */

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value,

      // Reset ServiceTitan ID when POC Name is manually changed.
      ...(name === "pocName" ? { stCustomerId: "" } : {}),
    }));
  }

  /* -------------------------------------------------------
     HANDLE SERVICETITAN CUSTOMER SELECTION
  ------------------------------------------------------- */

  function handleCustomerSelect(customer) {
    setValues((previous) => ({
      ...previous,
      stCustomerId: customer.stCustomerId || "",
      pocName: customer.pocName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      location: customer.location || "",
    }));
  }

  /* -------------------------------------------------------
     ERROR MESSAGES
  ------------------------------------------------------- */

  const errorMessages = {
    required: "Please complete all required fields.",
    value: "Please enter a valid dollar value.",
    email: "Please enter a valid email address.",
    date: "Please select a valid opportunity date.",
    followup: "Please select a valid follow-up date.",
    assignee: "Please select a valid team member.",
    create: "Unable to create opportunity. Please try again.",
    update: "Unable to update opportunity. Please try again.",
    opportunity: "Opportunity not found.",
    status: "This opportunity can no longer be edited.",
    permission: "You do not have permission to perform this action.",
  };

  return (
    <section className="w-full max-w-[700px]">
      {/* VALIDATION ERROR */}

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
        {/* OPPORTUNITY ID */}

        {isEdit && (
          <input type="hidden" name="opportunityId" value={opportunityId} />
        )}

        {/* SERVICETITAN CUSTOMER ID */}

        <input
          type="hidden"
          name="stCustomerId"
          value={values.stCustomerId || ""}
        />

        {/* OPPORTUNITY DATE - REQUIRED */}

        <Input
          name="opportunityDate"
          label="Today's Date"
          type="date"
          value={values.opportunityDate}
          onChange={handleChange}
          required
        />

        {/* POC NAME - REQUIRED */}

        <CustomerSearch
          value={values.pocName}
          onChange={handleChange}
          onSelect={handleCustomerSelect}
          required
        />

        {/* BUSINESS NAME - OPTIONAL */}

        <Input
          name="businessName"
          label="Business Name"
          value={values.businessName}
          onChange={handleChange}
        />

        {/* JOB TYPE - OPTIONAL */}

        <FloatingSelect
          name="jobType"
          label="Job Type"
          value={values.jobType}
          onChange={handleChange}
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

        {/* EMAIL - OPTIONAL */}

        <Input
          name="email"
          label="Email"
          type="email"
          value={values.email}
          onChange={handleChange}
        />

        {/* TEXT MESSAGE - OPTIONAL */}

        <FloatingTextarea
          name="textMessage"
          label="Text Message"
          value={values.textMessage}
          onChange={handleChange}
        />

        {/* PHONE NUMBER - OPTIONAL */}

        <Input
          name="phone"
          label="Phone Number (If Different)"
          type="tel"
          value={values.phone}
          onChange={handleChange}
        />

        {/* LOCATION - OPTIONAL */}

        <Input
          name="location"
          label="Location"
          value={values.location}
          onChange={handleChange}
        />

        {/* APPROXIMATE DOLLAR VALUE - REQUIRED */}

        <Input
          name="value"
          label="Approximate Dollar Value"
          type="number"
          min="0"
          step="0.01"
          value={values.value}
          onChange={handleChange}
          required
        />

        {/* FOLLOW-UP DATE - OPTIONAL, NEW MODE ONLY */}

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

        {/* ASSIGNED TO - ALWAYS AT THE END */}

        {isAdmin ? (
          <FloatingSelect
            name="assignedToId"
            label="Assigned To"
            value={values.assignedToId}
            onChange={handleChange}
            required
          >
            {assignmentUsers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id === user.id ? `${item.name} (You)` : item.name}
              </option>
            ))}
          </FloatingSelect>
        ) : (
          <input type="hidden" name="assignedToId" value={user.id} />
        )}

        {/* SUBMIT BUTTON */}

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
