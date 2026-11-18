import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import {
  updateSalesman,
  resendSalesmanInvitation,
  terminateSalesman,
  reactivateSalesman,
} from "../../new/actions";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";
import NewEditSalesman from "@/components/dashboard/newEdit-salesman";

export const metadata = {
  title: "Edit Profile | Sales Tracker",
};

export default async function EditSalesmanPage({ params }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  const { id: salesmanId } = await params;

  if (!salesmanId) {
    notFound();
  }

  // Admin can edit their own profile or any salesperson.
  // Another admin's profile is not editable here.
  const salesman = await prisma.user.findFirst({
    where: {
      id: salesmanId,
      OR: [
        { role: "SALESPERSON" },
        {
          role: "ADMIN",
          id: user.id,
        },
      ],
    },
    select: {
      id: true,
      name: true,
      title: true,
      email: true,
      username: true,
      passwordHash: true,
      role: true,
      isActive: true,
      monthlyGoal: true,
      quarterlyGoal: true,
      annualGoal: true,
    },
  });

  if (!salesman) {
    notFound();
  }

  const isSalesperson = salesman.role === "SALESPERSON";

  const isRegistered = Boolean(salesman.username && salesman.passwordHash);

  const isPendingRegistration =
    isSalesperson &&
    !salesman.isActive &&
    !salesman.username &&
    !salesman.passwordHash;

  const canResendInvitation = isPendingRegistration;

  const canTerminate = isSalesperson && salesman.isActive && isRegistered;

  const canReactivate = isSalesperson && !salesman.isActive && isRegistered;

  const initialValues = {
    name: salesman.name || "",
    title: salesman.title || "",
    email: salesman.email || "",
    monthlyGoal: salesman.monthlyGoal?.toString() ?? "",
    quarterlyGoal: salesman.quarterlyGoal?.toString() ?? "",
    annualGoal: salesman.annualGoal?.toString() ?? "",
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
          {
            label: "Salesmen",
            href: "/admin/salesmen",
          },
        ]}
        currentPage="Edit Profile"
      />

      <div>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black">
          Edit Profile
        </h1>

        <p className="mt-1 text-sm text-[#777777]">
          Update profile information and sales goals.
        </p>
      </div>

      <section className="mt-5 flex w-full flex-1 flex-col sm:mt-6">
        <NewEditSalesman
          mode="edit"
          salesmanId={salesman.id}
          initialValues={initialValues}
          onSubmit={updateSalesman}
          onResendInvitation={resendSalesmanInvitation}
          canResendInvitation={canResendInvitation}
          onTerminate={terminateSalesman}
          onReactivate={reactivateSalesman}
          canTerminate={canTerminate}
          canReactivate={canReactivate}
        />
      </section>

      <PageTagline>
        Great teams are built one great person at a time.
      </PageTagline>
    </div>
  );
}
