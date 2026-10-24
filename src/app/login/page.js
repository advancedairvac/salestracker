
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const demoUsers = [
  {
    identifier: "admin@advancedtracker.com",
    password: "Admin@123",
    role: "admin",
    label: "Admin",
    redirect: "/admin",
  },
  {
    identifier: "sales@advancedtracker.com",
    password: "Sales@123",
    role: "salesperson",
    label: "Salesperson",
    redirect: "/salesperson",
  },
  {
    identifier: "developer",
    password: "1234",
    role: "developer",
    redirect: "/developer",
  },
];

const visibleDemoAccounts = [
  {
    label: "Admin",
    identifier: "admin@advancedtracker.com",
    password: "Admin@123",
  },
  {
    label: "Salesperson",
    identifier: "sales@advancedtracker.com",
    password: "Sales@123",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleLogin(event) {
    event.preventDefault();
    setError("");

    const normalizedIdentifier = identifier.trim().toLowerCase();

    const user = demoUsers.find(
      (item) =>
        item.identifier.toLowerCase() === normalizedIdentifier &&
        item.password === password
    );

    if (!user) {
      setError("Invalid email/username or password. Please try again.");
      return;
    }

    setLoading(true);
    router.push(user.redirect);
  }

  function fillDemoAccount(user) {
    setIdentifier(user.identifier);
    setPassword(user.password);
    setError("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fb] px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center text-2xl font-bold tracking-tight text-[#0d0d0d]"
          >
            Advanced<span className="text-[#0690c8]">.</span>
          </Link>

          <p className="mt-2 text-xs font-medium tracking-[0.2em] text-gray-500">
            SALES TRACKER
          </p>
        </div>

        {/* Login Card */}
        <section className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-[#0d0d0d]">
              Welcome back
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Sign in to access your Advanced Sales Tracker workspace.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email or Username */}
            <div>
              <label
                htmlFor="identifier"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email or Username
              </label>

              <input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="Enter your email or username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#0690c8] focus:ring-2 focus:ring-[#0690c8]/10"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setError(
                      "Password recovery is not available yet. Please contact your administrator."
                    )
                  }
                  className="text-xs font-medium text-[#067da9] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-16 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#0690c8] focus:ring-2 focus:ring-[#0690c8]/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 text-xs font-medium text-gray-500 hover:text-[#0690c8]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0d0d0d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Public Demo Accounts */}
          <div className="mt-7 border-t border-black/[0.08] pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Demo Accounts
            </p>

            <div className="mt-3 space-y-2">
              {visibleDemoAccounts.map((user) => (
                <button
                  key={user.label}
                  type="button"
                  onClick={() => fillDemoAccount(user)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-3 text-left transition hover:border-[#0690c8]/50 hover:bg-[#0690c8]/[0.04]"
                >
                  <span className="text-sm font-medium text-[#0d0d0d]">
                    {user.label}
                  </span>

                  <span className="text-xs font-medium text-[#067da9]">
                    Use account →
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-400">
              Demo accounts are provided for testing purposes only.
            </p>
          </div>
        </section>

        {/* Footer Links */}
        <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-gray-500">
          <Link href="/privacy-policy" className="hover:text-[#0690c8]">
            Privacy Policy
          </Link>

          <Link
            href="/license-agreement"
            className="hover:text-[#0690c8]"
          >
            License Agreement
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Advanced Sales Tracker
        </p>
      </div>
    </main>
  );
}
