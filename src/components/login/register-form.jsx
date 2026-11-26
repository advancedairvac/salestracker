
"use client";

import { useState } from "react";
import Link from "next/link";

import Input from "@/components/ui/input";
import { completeSalesmanRegistration } from "@/app/register/actions";

const ERROR_MESSAGES = {
  required: "Please complete all required fields.",
  username:
    "Username must be 3–30 characters and contain only letters, numbers, or underscores.",
  "username-taken": "This username is already taken. Please choose another one.",
  "password-length": "Password must be at least 4 characters long.",
  "password-match": "Passwords do not match.",
  "invalid-token":
    "This invitation is invalid, expired, or has already been used.",
  server: "Unable to complete registration. Please try again.",
};

export default function RegisterForm({
  token,
  salesmanName = "",
  salesmanEmail = "",
}) {
  const [values, setValues] = useState({
    name: salesmanName,
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [completed, setCompleted] = useState(false);

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

    setFeedback(null);

    if (
      !values.name.trim() ||
      !values.username.trim() ||
      !values.password ||
      !values.confirmPassword
    ) {
      setFeedback({
        type: "error",
        message: ERROR_MESSAGES.required,
      });
      return;
    }

    const username = values.username.trim();

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setFeedback({
        type: "error",
        message: ERROR_MESSAGES.username,
      });
      return;
    }

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

    try {
      const result = await completeSalesmanRegistration({
        name: values.name.trim(),
        username,
        password: values.password,
        confirmPassword: values.confirmPassword,
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
        setCompleted(true);
        setFeedback({
          type: "success",
          message: "Your account has been successfully activated.",
        });
      }
    } catch (error) {
      console.error("Registration failed:", error);

      setFeedback({
        type: "error",
        message: ERROR_MESSAGES.server,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-[700px]">
      {!completed ? (
        <>
          <div className="mb-5">
            <h1 className="text-base font-semibold uppercase text-black lg:text-lg">
              Complete Your Registration
            </h1>

            <p className="mt-1 text-xs text-neutral-500 lg:text-sm">
              Create your account to access the Sales Tracker.
            </p>
          </div>

          {salesmanEmail && (
            <div className="mb-5 border border-[#d9d9d9] px-3 py-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.02em] text-[#565656]">
                Invitation For
              </p>

              <p className="mt-1 text-xs text-black lg:text-sm">
                {salesmanName}
              </p>

              <p className="text-xs text-neutral-500 lg:text-sm">
                {salesmanEmail}
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-[9px]"
          >
            <Input
              name="name"
              label="Full Name"
              type="text"
              value={values.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />

            <Input
              name="username"
              label="Username"
              type="text"
              value={values.username}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={30}
              autoComplete="username"
              hint="3–30 characters. Letters, numbers, and underscores only."
            />

            <Input
              name="password"
              label="Password"
              type="password"
              value={values.password}
              onChange={handleChange}
              required
              minLength={4}
              autoComplete="new-password"
              hint="Your password must be at least 4 characters long."
            />

            <Input
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              value={values.confirmPassword}
              onChange={handleChange}
              required
              minLength={4}
              autoComplete="new-password"
            />

            {feedback && (
              <p
                role={feedback.type === "error" ? "alert" : "status"}
                aria-live="polite"
                className={[
                  "mt-2 text-xs leading-5 lg:text-sm",
                  feedback.type === "success"
                    ? "text-green-700"
                    : "text-red-600",
                ].join(" ")}
              >
                {feedback.message}
              </p>
            )}

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
              {pending ? "Creating Account..." : "Complete Registration"}
            </button>
          </form>

          <p className="mt-5 text-xs leading-5 text-neutral-500">
            By completing registration, you agree to use the Sales Tracker in
            accordance with your organization's policies.
          </p>
        </>
      ) : (
        <div className="w-full">
          <h1 className="text-base font-semibold uppercase text-black lg:text-lg">
            Registration Completed
          </h1>

          <p className="mt-2 text-xs leading-6 text-neutral-500 lg:text-sm">
            Your account has been successfully activated. You can now log in using
            your username and password.
          </p>

          <Link
            href="/login"
            className={[
              "mt-5 flex h-[48px] w-full items-center justify-center",
              "rounded-none border border-[#111111] bg-[#111111] px-4",
              "text-xs font-semibold uppercase tracking-[0.03em] text-white",
              "transition-colors hover:bg-[#333333]",
              "lg:text-sm",
            ].join(" ")}
          >
            Go to Login
          </Link>
        </div>
      )}
    </section>
  );
}
