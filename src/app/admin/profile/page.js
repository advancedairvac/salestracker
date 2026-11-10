
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";
import ProfileForm from "@/components/profile/profile-form";

export const metadata = {
  title: "My Profile",
};

export default async function ProfilePage() {
  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    redirect("/login");
  }

  if (authenticatedUser.role !== "ADMIN") {
    redirect("/salesperson");
  }

  const databaseUser = await prisma.user.findUnique({
    where: {
      id: authenticatedUser.id,
    },
    select: {
      id: true,
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

  if (!databaseUser || !databaseUser.isActive) {
    redirect("/login");
  }

  // Convert Prisma Decimal values into serializable strings.
  // Never select or pass passwordHash to the client.
  const user = {
    id: databaseUser.id,
    name: databaseUser.name,
    username: databaseUser.username,
    email: databaseUser.email,
    title: databaseUser.title || "",
    role: databaseUser.role,
    isActive: databaseUser.isActive,
    monthlyGoal: databaseUser.monthlyGoal?.toString() || "0",
    quarterlyGoal: databaseUser.quarterlyGoal?.toString() || "0",
    annualGoal: databaseUser.annualGoal?.toString() || "0",
    createdAt: databaseUser.createdAt.toISOString(),
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="My Profile"
      />

      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black sm:text-3xl">
          My Profile
        </h1>

        <p className="text-sm text-[#777]">
          View and manage your personal information and account details.
        </p>
      </div>

      <ProfileForm user={user} />

      <PageTagline>
        Iron sharpens iron, as one man sharpens another.
      </PageTagline>
    </div>
  );
}
