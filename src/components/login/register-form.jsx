"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Input from "@/components/ui/input";
import { completeSalesmanRegistration } from "@/app/register/actions";

const ERROR_MESSAGES = {
  required: "Please complete all required fields.",
  username:
    "Username must be 3–30 characters and contain only letters, numbers, or underscores.",
  "password-length": "Your password must be at least 4 characters long.",
  "password-match": "Passwords do not match.",
  token: "Invalid invitation token.",
  "invalid-invitation":
    "This invitation is invalid, expired, or has already been used.",
  "username-taken": "This username is already taken. Please choose another.",
  server: "Unable to complete registration. Please try again.",
};

export default function RegisterForm({
  token,
  initialName = "",
  email = "",
}) {
  const router = useRouter();

  const [values, setValues] = useState({
    name: initialName,
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);

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

    if (pending) return;

    if (values.password.length < 4) {
      setFeedback({
        type: "error",
        message: ERROR_MESSAGES["password-length"],
      });
      return;
    }

    if (values.password !== values.confirmPassword) {
      setFeedback({
        type: "error",
        message: ERROR_MESSAGES["password-match"],
      });
      return;
    }

    setPending(true);
    setFeedback(null);

    try {
      const result = await completeSalesmanRegistration({
        ...values,
        token,
      });

      if (result?.error) {
        setFeedback({
          type: "error",
          message:
            ERROR_MESSAGES[result.error] ||
            "Something went wrong. Please try again.",
        });
        return;
      }

      if (result?.success) {
        router.push("/login?registered=success");
        router.refresh();
      }
    } catch (error) {
      console.error("Registration form submission failed:", error);

      setFeedback({
        type: "error",
        message: ERROR_MESSAGES.server,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-[7px]"
    >
      {/* INVITATION INFORMATION */}

      <div className="mb-5 w-full bg-neutral-50 px-3 py-3">
        <p className="mb-1 text-[10px] uppercase tracking-[0.04em] text-neutral-500">
          Invitation for
        </p>

        <p className="text-sm font-medium text-black">
          {initialName}
        </p>

        <p className="text-sm text-neutral-500">
          {email}
        </p>
      </div>

      {/* FULL NAME */}

      <Input
        name="name"
        label="Full Name"
        type="text"
        value={values.name}
        onChange={handleChange}
        autoComplete="name"
        required
      />

      {/* USERNAME */}

      <Input
        name="username"
        label="Username"
        type="text"
        value={values.username}
        onChange={handleChange}
        autoComplete="username"
        minLength={3}
        maxLength={30}
        required
        hint="3–30 characters. Letters, numbers, and underscores only."
      />

      {/* PASSWORD */}

      <Input
        name="password"
        label="Password"
        type="password"
        value={values.password}
        onChange={handleChange}
        autoComplete="new-password"
        minLength={4}
        required
        hint="Your password must be at least 4 characters long."
      />

      {/* CONFIRM PASSWORD */}

      <Input
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        value={values.confirmPassword}
        onChange={handleChange}
        autoComplete="new-password"
        minLength={4}
        required
      />

      {/* FEEDBACK */}

      {feedback && (
        <p
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={[
            "mt-3 text-sm leading-6",
            feedback.type === "success"
              ? "text-green-700"
              : "text-red-600",
          ].join(" ")}
        >
          {feedback.message}
        </p>
      )}

      {/* SUBMIT */}

      <button
        type="submit"
        disabled={pending}
        className={[
          "mt-4 flex min-h-[38px] w-full items-center justify-center",
          "rounded-none border border-black bg-black px-4 py-2",
          "text-sm font-semibold uppercase tracking-[0.03em] text-white",
          "transition-colors duration-200",
          "hover:bg-neutral-800",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-black focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
        ].join(" ")}
      >
        {pending ? "Creating Account..." : "Complete Registration"}
      </button>

      {/* POLICY NOTICE */}

      <p className="mt-5 max-w-2xl text-center text-xs leading-5 text-neutral-500">
        By completing registration, you agree to use the Sales Tracker
        in accordance with your organization&apos;s policies.
      </p>
    </form>
  );
}