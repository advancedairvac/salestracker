
import QuickBooksTabs from "@/components/quickbooks-testing/quickbooks-tabs";

export const metadata = {
  title: "QuickBooks API Testing | Advanced Sales Tracker",
  description: "Test QuickBooks Online Accounting API resources.",
};

export default function QuickBooksTestingPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-[#0690c8]">
          INTEGRATION TESTING
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-[#0d0d0d]">
          QuickBooks API Testing
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Inspect company information and test read-only QuickBooks Online
          Accounting API resources. Use the tabs below to review returned
          records and raw JSON responses.
        </p>
      </section>

      <QuickBooksTabs />
    </div>
  );
}
