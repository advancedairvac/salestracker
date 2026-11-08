
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "My Profile",
};

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(date) {
  if (!date) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
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
    <div className="min-w-0 border-b border-[#e5e5e5] py-4 last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-medium text-black">
        {value || "Not provided"}
      </p>
    </div>
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

export default async function ProfilePage() {
  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    redirect("/login");
  }

  if (authenticatedUser.role !== "ADMIN") {
    redirect("/salesperson");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: authenticatedUser.id,
    },
    select: {
      name: true,
      username: true,
      email: true,
      title: true,
      role: true,
      isActive: true,
      monthlyGoal: true,
      quarterlyGoal: true,
      annualGoal: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const initials = getInitials(user.name);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[{ label: "Sales Tracker", href: "/admin" }]}
        currentPage="My Profile"
      />

      {/* Page Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black sm:text-3xl">
          My Profile
        </h1>

        <p className="text-sm text-[#777]">
          View your personal information and account details.
        </p>
      </div>

      {/* Profile Overview */}
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

          {/* Account Status */}
          <div className="flex shrink-0 items-center gap-2 self-start border border-[#dedede] px-3 py-2 sm:self-center">
            <span
              className={`h-2 w-2 rounded-full ${
                user.isActive ? "bg-green-600" : "bg-red-500"
              }`}
            />

            <span className="text-xs font-semibold uppercase tracking-wide text-[#444]">
              {user.isActive ? "Active Account" : "Inactive Account"}
            </span>
          </div>
        </div>
      </section>

      {/* Personal and Account Information */}
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

          <div>
            <InfoItem label="Full Name" value={user.name} />

            <InfoItem label="Username" value={user.username} />

            <InfoItem label="Email Address" value={user.email} />

            <InfoItem label="Job Title" value={user.title} />
          </div>
        </section>

        {/* Account Information */}
        <section className="border border-[#d5d5d5] bg-white p-5 sm:p-6">
          <div className="mb-3 border-b border-[#d5d5d5] pb-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-black">
              Account Information
            </h2>

            <p className="mt-1 text-xs text-[#888]">
              Your account details and membership information.
            </p>
          </div>

          <div>
            <InfoItem
              label="Account Role"
              value={
                user.role === "ADMIN" ? "Administrator" : "Salesperson"
              }
            />

            <InfoItem
              label="Account Status"
              value={user.isActive ? "Active" : "Inactive"}
            />

            <InfoItem
              label="Member Since"
              value={formatDate(user.createdAt)}
            />

            <InfoItem
              label="Username"
              value={user.username}
            />
          </div>
        </section>
      </div>

      {/* Sales Goals */}
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

      {/* Page Tagline */}
      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
