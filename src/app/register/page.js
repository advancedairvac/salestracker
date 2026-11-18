import Link from "next/link";

import { prisma } from "@/lib/prisma";

import {
  hashInvitationToken,
} from "@/lib/auth/invitations";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import AppFooter from "@/components/layout/app-footer";
import RegisterForm from "@/components/login/register-form";

export const metadata = {
  title: "Complete Registration | Advanced Sales Tracker",
  description: "Complete your Advanced Sales Tracker account registration.",
};

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  const token = String(params?.token || "").trim();

  let salesman = null;

  if (
    token.length === 64 &&
    /^[a-f0-9]+$/i.test(token)
  ) {
    const tokenHash = hashInvitationToken(token);

    salesman = await prisma.user.findFirst({
      where: {
        invitationTokenHash: tokenHash,
        invitationExpiresAt: {
          gt: new Date(),
        },
        role: "SALESPERSON",
        isActive: false,
        passwordHash: null,
      },
      select: {
        name: true,
        email: true,
      },
    });
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white text-black">
      <main className="flex flex-1 flex-col px-5 pt-5 lg:px-23 lg:pt-10">
        <div className="flex w-full max-w-2xl flex-1 flex-col">
          <Breadcrumbs
            items={[
              {
                label: "Sales Tracker",
                href: "/",
              },
            ]}
            currentPage="Register"
          />

          <section className="mt-8 flex flex-1 flex-col sm:mt-10">
            <h1 className="max-w-[650px] text-[22px] font-semibold leading-[1.3] sm:text-[26px] lg:text-[28px]">
              Excellence, accountability, organization; Advanced.
            </h1>

            {salesman ? (
              <>
                <div className="mt-8">
                  <h2 className="text-lg font-semibold">
                    Complete Your Registration
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Welcome, {salesman.name}. Your invitation has been
                    verified. Set up your username and password to
                    activate your account.
                  </p>

                  <p className="mt-2 text-sm text-neutral-600">
                    {salesman.email}
                  </p>
                </div>

                <RegisterForm token={token} />
              </>
            ) : (
              <div className="mt-10 max-w-xl">
                <h2 className="text-lg font-semibold">
                  Invitation Unavailable
                </h2>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  This invitation link is invalid, expired, or has
                  already been used. Please contact your administrator
                  and request a new invitation.
                </p>

                <Link
                  href="/login"
                  className="mt-6 inline-block text-sm underline underline-offset-2 hover:text-neutral-600"
                >
                  Go to Login
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}