import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import Input from "@/components/ui/input";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata = {
  title: "Login",
  description: "Advanced Sales Tracker login page.",
};

export default async function LoginPage({ searchParams }) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/salesperson");
  }

  const params = await searchParams;
  const error = params?.error;

  return (
    <AppShell role="salesperson" isAuthenticated={false}>
      <main className="flex flex-1 flex-col bg-white text-blac">
        <div className="flex w-full max-w-2xl flex-1 flex-col">
          <div className="pt-5 sm:pt-6">
            <Breadcrumbs
              items={[{ label: "Sales Tracker", href: "/" }]}
              currentPage="Login"
            />
          </div>

          <section className="mt-5 flex flex-1 flex-col sm:mt-6">
            <h1 className="max-w-[650px] text-[22px] font-semibold leading-[1.3] sm:text-[26px] lg:text-[28px]">
              Excellence, accountability, organization; Advanced.
            </h1>

            <form
              action="/api/auth/login"
              method="post"
              className="mt-16 flex w-full flex-col gap-[7px] sm:mt-20 lg:mt-24"
            >
              {error && (
                <p role="alert" className="mb-3 text-sm text-red-600">
                  {error === "invalid"
                    ? "Invalid username or password, or your account is inactive."
                    : "Unable to log in right now. Please try again."}
                </p>
              )}

              <Input
                id="username"
                name="username"
                type="text"
                placeholder="username or email"
                autoComplete="username"
                required
                aria-label="Username or email"
              />

              <Input
                id="password"
                name="password"
                type="password"
                placeholder="password"
                autoComplete="current-password"
                required
                aria-label="Password"
              />

              <button
                type="submit"
                className={[
                  "mt-4 flex min-h-[38px] w-full items-center justify-center",
                  "rounded-none border border-black bg-black px-4 py-2",
                  "text-sm font-semibold text-white",
                  "transition-colors duration-200",
                  "hover:bg-neutral-800",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-black focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              >
                Log In
              </button>

              <p className="mt-5 text-sm text-black">
                Forgot{" "}
                <Link
                  href="/forgot-username"
                  className="underline underline-offset-2 hover:text-neutral-600"
                >
                  username
                </Link>{" "}
                or{" "}
                <Link
                  href="/forgot-password"
                  className="underline underline-offset-2 hover:text-neutral-600"
                >
                  password
                </Link>
                ?
              </p>
            </form>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
