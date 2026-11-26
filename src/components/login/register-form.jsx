"use client";

import { useState } from "react";
import Link from "next/link";
import { completeSalesmanRegistration } from "@/app/register/actions";

const ERROR_MESSAGES = {
  required: "Please fill in all required fields.",
  username:
    "Username must be 3–30 characters and contain only letters, numbers, or underscores.",
  "username-taken": "This username is already taken. Please choose another one.",
  "password-length": "Password must be at least 10 characters long.",
  "password-match": "Passwords do not match.",
  "invalid-token":
    "This invitation is invalid, expired, or has already been used.",
  server: "Something went wrong. Please try again later.",
};

export default function RegisterForm({
  token,
  salesmanName,
  salesmanEmail,
}) {
  const [name, setName] = useState(salesmanName || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    if (password.length < 10) {
      setError(ERROR_MESSAGES["password-length"]);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(ERROR_MESSAGES["password-match"]);
      setLoading(false);
      return;
    }

    try {
      const result = await completeSalesmanRegistration({
        name,
        username,
        password,
        confirmPassword,
        token,
      });

      if (result?.success) {
        setSuccess(true);
        return;
      }

      setError(
        ERROR_MESSAGES[result?.error] ||
          "Unable to complete registration. Please try again."
      );
    } catch (err) {
      console.error("Registration form error:", err);
      setError(ERROR_MESSAGES.server);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-600"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">
          Registration Completed
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Your account has been successfully activated. You can now log in using
          your username and password.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Complete Your Registration
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Create your account to access the Sales Tracker.
        </p>
      </div>

      {salesmanEmail && (
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Invitation for
          </p>

          <p className="mt-1 text-sm font-medium text-gray-900">
            {salesmanName}
          </p>

          <p className="text-sm text-gray-500">{salesmanEmail}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Full Name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            placeholder="Enter your full name"
          />
        </div>

        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Username
          </label>

          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]{3,30}"
            autoComplete="username"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            placeholder="Choose a username"
          />

          <p className="mt-1.5 text-xs text-gray-400">
            3–30 characters. Letters, numbers, and underscores only.
          </p>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={10}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            placeholder="Create a password"
          />

          <p className="mt-1.5 text-xs text-gray-400">
            Your password must be at least 10 characters long.
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={10}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            placeholder="Confirm your password"
          />
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating Account..." : "Complete Registration"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs leading-5 text-gray-400">
        By completing registration, you agree to use the Sales Tracker in
        accordance with your organization's policies.
      </p>
    </div>
  );
}