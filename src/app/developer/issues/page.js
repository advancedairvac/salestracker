
export const metadata = {
  title: "Project Issues",
};

export default function IssuesPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">Project Issues</h2>
        <p className="mt-2 text-sm text-gray-500">
          Access the project issue tracker to review bugs and development tasks.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">GitHub Issues</h3>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Open the project issue tracker to report a bug, review a task, or
          follow up on an existing issue.
        </p>
        <a
          href="https://github.com/advancedairvac/salestracker/issues"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-lg bg-[#0d0d0d] px-4 py-2.5 text-sm font-medium text-white"
        >
          Open GitHub Issues ↗
        </a>
      </section>
    </div>
  );
}
