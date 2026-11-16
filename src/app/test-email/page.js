
"use client";

import { useState } from "react";

export default function TestEmailPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(
    "Advanced Sales Tracker - Test Email"
  );
  const [message, setMessage] = useState(
    "This is a test email from Advanced Sales Tracker."
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, message }),
      });

      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        error: "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">
          Send Test Email
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Test your Resend email integration.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Recipient Email
            </label>
            <input
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Subject
            </label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Message
            </label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Test Email"}
          </button>
        </form>

        {result && (
          <div className={`mt-4 rounded-lg p-3 text-sm ${
            result.success
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}>
            {result.message || result.error}
          </div>
        )}
      </div>
    </main>
  );
}
