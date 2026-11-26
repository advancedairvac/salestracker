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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {salesman ? (
          <RegisterForm
            token={token}
            salesmanName={salesman.name}
            salesmanEmail={salesman.email}
          />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-500"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
              </svg>
            </div>

            <h1 className="text-xl font-semibold text-gray-900">
              {serverError
                ? "Unable to Verify Invitation"
                : "Invitation Unavailable"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              {serverError
                ? "We couldn't verify your invitation right now. Please try again later or contact your administrator."
                : "This invitation link is invalid, expired, or has already been used. Please contact your administrator and request a new invitation."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}