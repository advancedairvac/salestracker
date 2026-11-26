
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashInvitationToken } from "@/lib/auth/invitations";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import AppFooter from "@/components/layout/app-footer";
import RegisterForm from "@/components/login/register-form";

export const metadata = {
  title: "Complete Registration | Sales Tracker",
  description: "Complete your Sales Tracker account registration.",
};

export default async function RegisterPage({ searchParams }) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/salesperson");
  }

  const params = await searchParams;
  const token = String(params?.token || "").trim();

  let salesman = null;

  if (/^[a-f0-9]{64}$/i.test(token)) {
    try {
      const tokenHash = hashInvitationToken(token);

      salesman = await prisma.user.findFirst({
        where: {
          invitationTokenHash: tokenHash,
          invitationExpiresAt: {
            gt: new Date(),
          },
          role: "SALESPERSON",
          status: "INVITED",
          passwordHash: null,
          username: null,
        },
        select: {
          name: true,
          email: true,
        },
      });
    } catch (error) {
      console.error("Registration invitation lookup failed:", error);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white text-black">
      {/* REGISTER CONTENT */}

      <main className="flex flex-1 flex-col px-5 pt-5 lg:px-23 lg:pt-10">
        <div className="flex w-full max-w-2xl flex-1 flex-col">
          {/* BREADCRUMB */}

          <div>
            <Breadcrumbs
              items={[
                {
                  label: "Sales Tracker",
                  href: "/",
                },
              ]}
              currentPage="Complete Registration"
            />
          </div>

          {/* REGISTRATION FORM */}

          <section className="mt-5 flex flex-1 flex-col sm:mt-6">
            <h1 className="max-w-[650px] text-[22px] font-semibold leading-[1.3] sm:text-[26px] lg:text-[28px]">
              Excellence, accountability, organization; Advanced.
            </h1>

            <div className="mt-16 w-full sm:mt-20 lg:mt-24">
              {salesman ? (
                <RegisterForm
                  token={token}
                  initialName={salesman.name}
                  email={salesman.email}
                />
              ) : (
                <div className="w-full max-w-2xl">
                  <p className="text-sm leading-6 text-neutral-700">
                    This invitation link is invalid, expired, or has already
                    been used. Please contact your administrator and request
                    a new invitation.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}

      <AppFooter />
    </div>
  );
}
