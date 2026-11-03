
export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold text-[#0d0d0d]">Settings</h2>
        <p className="mt-2 text-sm text-gray-500">
          General application preferences and integration settings.
        </p>
      </section>

      <section className="space-y-5 rounded-xl border border-black/10 bg-white p-5">
        <div>
          <h3 className="font-semibold">General Settings</h3>
          <p className="mt-1 text-sm text-gray-500">
            Basic information about the application.
          </p>
        </div>

        <label className="block text-sm">
          Application Name
          <input
            defaultValue="Advanced Sales Tracker"
            className="mt-2 w-full rounded-lg border border-gray-200 p-3"
          />
        </label>

        <label className="block text-sm">
          Default Currency
          <select className="mt-2 w-full rounded-lg border border-gray-200 p-3">
            <option>USD - US Dollar</option>
          </select>
        </label>

        <div className="border-t border-black/10 pt-5">
          <h3 className="font-semibold">Integrations</h3>
          <p className="mt-1 text-sm text-gray-500">
            QuickBooks connection and other integration controls will be
            managed here.
          </p>
          <a
            href="/api/quickbooks/connect"
            className="mt-3 inline-block text-sm font-medium text-[#0690c8]"
          >
            Connect QuickBooks →
          </a>
        </div>

        <p className="text-xs text-gray-400">
          Settings are currently display-only and are not saved.
        </p>
      </section>
    </div>
  );
}
