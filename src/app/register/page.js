
import { prisma } from "@/lib/prisma";
import { hashInvitationToken } from "@/lib/auth/invitations";
import RegisterForm from "@/components/login/register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  const token = String(params?.token || "").trim();

  let salesman = null;
  let serverError = false;

  try {
    if (token.length === 64 && /^[a-f0-9]+$/i.test(token)) {
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
        },
        select: {
          name: true,
          email: true,
        },
      });
    }
  } catch (error) {
    console.error("Registration invitation validation failed:", error);
    serverError = true;
  }

  return (
    <main className="min-h-screen w-full bg-white px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-[700px]">
        {salesman ? (
          <RegisterForm
            token={token}
            salesmanName={salesman.name}
            salesmanEmail={salesman.email}
          />
        ) : (
          <section className="w-full max-w-[700px]">
            <h1 className="text-base font-semibold uppercase text-black lg:text-lg">
              {serverError
                ? "Unable to Verify Invitation"
                : "Invitation Unavailable"}
            </h1>

            <p className="mt-2 text-xs leading-6 text-neutral-500 lg:text-sm">
              {serverError
                ? "We couldn't verify your invitation right now. Please try again later or contact your administrator."
                : "This invitation link is invalid, expired, or has already been used. Please contact your administrator and request a new invitation."}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
