"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { completeSalesmanRegistration } from "@/app/register/actions";

const ERROR_MESSAGES = {
  required: "Please complete all fields.",
  "username-format":
    "Username must be 3–30 characters and may contain letters, numbers, dots, and underscores.",
  "password-length": "Password must contain at least 10 characters.",
  "password-mismatch": "Your passwords do not match.",
  "username-taken": "This username is already taken. Please choose another.",
  "invalid-token":
    "This invitation link is invalid, expired, or has already been used. Please contact your administrator for a new invitation.",
  server: "Unable to complete registration. Please try again.",
};

export default function RegisterForm({ token }) {
  const router = useRouter();

  const [values, setValues] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (pending) return;

    setPending(true);
    setError("");

    try {
      const result = await completeSalesmanRegistration({
        token,
        ...values,
      });

      if (result?.error) {
        setError(
          ERROR_MESSAGES[result.error] ||
            "Unable to complete registration.",
        );
        return;
      }

      if (result?.success) {
        router.replace("/login?registered=1");
        router.refresh();
      }
    } catch (submitError) {
      console.error("Registration form failed:", submitError);
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const inputClass = [
    "min-h-[44px] w-full rounded-none",
    "border border-black bg-white px-3 py-2",
    "text-sm text-black placeholder:text-neutral-500",
    "outline-none focus:border-black focus:ring-0",
  ].join(" ");

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 flex w-full flex-col gap-3 sm:mt-14"
    >
      {error && (
        <p
          role="alert"
          className="mb-2 text-sm leading-6 text-red-600"
        >
          {error}
        </p>
      )}

      <input
        id="register-username"
        name="username"
        type="text"
        placeholder="username"
        aria-label="Username"
        autoComplete="username"
        minLength={3}
        maxLength={30}
        value={values.username}
        onChange={handleChange}
        required
        className={inputClass}
      />

      <input
        id="register-password"
        name="password"
        type="password"
        placeholder="password"
        aria-label="Password"
        autoComplete="new-password"
        minLength={10}
        value={values.password}
        onChange={handleChange}
        required
        className={inputClass}
      />

      <input
        id="register-confirm-password"
        name="confirmPassword"
        type="password"
        placeholder="confirm password"
        aria-label="Confirm password"
        autoComplete="new-password"
        minLength={10}
        value={values.confirmPassword}
        onChange={handleChange}
        required
        className={inputClass}
      />

      <p className="text-xs leading-5 text-neutral-600">
        Your password must contain at least 10 characters.
      </p>

      <button
        type="submit"
        disabled={pending}
        className={[
          "mt-3 flex min-h-[42px] w-full items-center justify-center",
          "rounded-none border border-black bg-black px-4 py-2",
          "text-sm font-semibold text-white",
          "transition-colors hover:bg-neutral-800",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-black focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
        ].join(" ")}
      >
        {pending ? "Creating Account..." : "Complete Registration"}
      </button>
    </form>
  );
}