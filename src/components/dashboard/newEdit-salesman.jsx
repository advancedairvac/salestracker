"use client";

import { useState } from "react";

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

export default function NewEditSalesman({
  mode = "new",
  salesmanId = "",
  initialValues = {},
  onSubmit,
}) {
  const isEdit = mode === "edit";

  const [values, setValues] = useState(() =>
    prepareInitialValues(initialValues),
  );

  const [pending, setPending] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!onSubmit || pending) return;

    setPending(true);

    try {
      await onSubmit({
        ...values,
        salesmanId: isEdit ? salesmanId : undefined,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-[700px]">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[9px]">
        {/* Salesman ID */}
        {isEdit && <input type="hidden" name="salesmanId" value={salesmanId} />}

        {/* Name */}
        <Input
          name="name"
          label="Name"
          type="text"
          placeholder=" "
          value={values.name}
          onChange={handleChange}
          required
        />

        {/* Title */}
        <Input
          name="title"
          label="Title"
          type="text"
          placeholder=" "
          value={values.title}
          onChange={handleChange}
        />

        {/* Gmail */}
        <Input
          name="email"
          label="Gmail"
          type="email"
          placeholder=" "
          value={values.email}
          onChange={handleChange}
          required
        />

        {/* Monthly Goal */}
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

        {/* Quarterly Goal */}
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

        {/* Annual Goal */}
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pending}
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
              : "Creating..."
            : isEdit
              ? "Update"
              : "Create"}
        </button>
      </form>
    </section>
  );
}
