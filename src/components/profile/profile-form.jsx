
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Input from "@/components/ui/input";

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function InfoItem({ label, value }) {
  return (
    <div className="border-b border-[#e5e5e5] py-4 last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-medium text-black">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  hint,
  required = false,
  autoComplete = "off",
}) {
  return (
    <Input
      id={name}
      name={name}
      label={label}
      type={type}
      value={value}
      onChange={onChange}
      hint={hint}
      required={required}
      autoComplete={autoComplete}
      autoCapitalize="none"
      spellCheck={false}
    />
  );
}

function GoalItem({ label, value }) {
  return (
    <div className="border border-[#dedede] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#888]">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold tracking-tight text-black">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export default function ProfileForm({ user }) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: user.name || "",
    title: user.title || "",
    email: user.email || "",
    username: user.username || "",
  });

  // Password values are always empty initially.
  // Never populate password fields from the database.
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function clearPasswordFields() {
    setPasswordData({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  function handleEdit() {
    setFormData({
      name: user.name || "",
      title: user.title || "",
      email: user.email || "",
      username: user.username || "",
    });

    clearPasswordFields();
    clearMessages();

    setIsEditing(true);
  }

  function handleCancel() {
    setFormData({
      name: user.name || "",
      title: user.title || "",
      email: user.email || "",
      username: user.username || "",
    });

    clearPasswordFields();
    clearMessages();

    setIsEditing(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    clearMessages();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.username.trim()
    ) {
      setError(
        "Full name, email address, and username are required.",
      );
      return;
    }

    const hasAnyPasswordValue = Object.values(passwordData).some(
      (value) => value.length > 0,
    );

    if (hasAnyPasswordValue) {
      const hasAllPasswordValues = Object.values(passwordData).every(
        (value) => value.length > 0,
      );

      if (!hasAllPasswordValues) {
        setError(
          "To change your password, complete all three password fields.",
        );
        return;
      }

      if (passwordData.newPassword.length < 8) {
        setError(
          "New password must be at least 8 characters long.",
        );
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          ...passwordData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Unable to update your profile.",
        );
        return;
      }

      const updatedUser = result.user;

      setFormData({
        name: updatedUser.name || "",
        title: updatedUser.title || "",
        email: updatedUser.email || "",
        username: updatedUser.username || "",
      });

      clearPasswordFields();

      setSuccess("Your profile has been updated successfully.");

      setIsEditing(false);

      router.refresh();
    } catch (error) {
      console.error("Profile form error:", error);

      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const initials = getInitials(user.name);

  return (
    <div className="space-y-7">
      {/* Profile Header */}
      <section className="border border-[#d5d5d5] bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-black text-2xl font-bold uppercase text-white">
            {initials || "U"}
          </div>

          {/* User Information */}
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-extrabold uppercase tracking-tight text-black sm:text-2xl">
              {user.name}
            </h2>

            <p className="mt-1 text-sm text-[#666]">
              {user.title || "Administrator"}
            </p>

            <p className="mt-2 break-all text-sm text-[#777]">
              {user.email}
            </p>
          </div>

          {/* Edit Button */}
          <button
            type="button"
            onClick={isEditing ? handleCancel : handleEdit}
            disabled={isSaving}
            className={`shrink-0 border px-5 py-3 text-xs font-bold uppercase tracking-wide transition ${
              isEditing
                ? "border-black bg-black text-white hover:bg-[#333]"
                : "border-black bg-white text-black hover:bg-black hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isEditing ? "Close Edit" : "Edit Profile"}
          </button>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div
          role="status"
          className="border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Personal Information */}
            <section className="border border-[#d5d5d5] bg-white p-5 sm:p-6">
              <div className="mb-5 border-b border-[#d5d5d5] pb-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-black">
                  Personal Information
                </h2>

                <p className="mt-1 text-xs text-[#888]">
                  Update your personal information.
                </p>
              </div>

              <div className="space-y-5">
                <FormField
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleProfileChange}
                  autoComplete="off"
                  required
                />

                <FormField
                  label="Job Title"
                  name="title"
                  value={formData.title}
                  onChange={handleProfileChange}
                  autoComplete="off"
                />

                <FormField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleProfileChange}
                  autoComplete="off"
                  required
                />
              </div>
            </section>

            {/* Account Information */}
            <section className="border border-[#d5d5d5] bg-white p-5 sm:p-6">
              <div className="mb-5 border-b border-[#d5d5d5] pb-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-black">
                  Account Information
                </h2>

                <p className="mt-1 text-xs text-[#888]">
                  Update your username and password.
                </p>
              </div>

              <div className="space-y-5">
                <FormField
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleProfileChange}
                  autoComplete="off"
                  required
                />

                <FormField
                  label="Old Password"
                  name="oldPassword"
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                />

                <FormField
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                />

                <FormField
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                />

                <p className="text-xs leading-5 text-[#888]">
                  Leave all three password fields empty if you do not
                  want to change your password.
                </p>
              </div>
            </section>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="border border-[#d5d5d5] bg-white px-6 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="border border-black bg-black px-7 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        /* Display Mode */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Personal Information */}
          <section className="border border-[#d5d5d5] bg-white p-5 sm:p-6">
            <div className="mb-3 border-b border-[#d5d5d5] pb-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-black">
                Personal Information
              </h2>

              <p className="mt-1 text-xs text-[#888]">
                Your basic profile information.
              </p>
            </div>

            <InfoItem label="Full Name" value={user.name} />
            <InfoItem label="Job Title" value={user.title} />
            <InfoItem label="Email Address" value={user.email} />
          </section>

          {/* Account Information */}
          <section className="border border-[#d5d5d5] bg-white p-5 sm:p-6">
            <div className="mb-3 border-b border-[#d5d5d5] pb-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-black">
                Account Information
              </h2>

              <p className="mt-1 text-xs text-[#888]">
                Your account credentials and security.
              </p>
            </div>

            <InfoItem label="Username" value={user.username} />
            <InfoItem label="Password" value="••••••••••••" />
          </section>
        </div>
      )}

      {/* Sales Goals - Read Only */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
            Sales Goals
          </h2>

          <p className="mt-1 text-xs text-[#888]">
            Your assigned production goals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <GoalItem
            label="Monthly Goal"
            value={user.monthlyGoal}
          />

          <GoalItem
            label="Quarterly Goal"
            value={user.quarterlyGoal}
          />

          <GoalItem
            label="Annual Goal"
            value={user.annualGoal}
          />
        </div>
      </section>
    </div>
  );
}
