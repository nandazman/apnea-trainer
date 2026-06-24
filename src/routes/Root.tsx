import { Link, Outlet } from "@tanstack/react-router";
import { Particles } from "../components/Particles";
import { useApp } from "../state/AppContext";

const navCls = "rounded-lg px-3 py-1.5 text-sm lowercase tracking-wide transition";

export function Root() {
  const { settings } = useApp();
  const reduced = settings.settings.motion === "reduced";

  return (
    <div className={`group ${reduced ? "motion-reduced" : ""}`}>
      <div
        aria-hidden
        className="fixed inset-[-20%] z-[-2] animate-drift bg-[radial-gradient(40%_30%_at_30%_20%,rgb(34_211_238/0.1),transparent_70%),radial-gradient(45%_35%_at_75%_70%,rgb(90_200_250/0.08),transparent_70%)] motion-reduce:animate-none! group-[.motion-reduced]:animate-none!"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[-1] bg-[radial-gradient(120%_100%_at_50%_40%,transparent_55%,rgb(0_0_0/0.55))]"
      />
      <Particles />

      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-12 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-light tracking-[0.3em] text-bio lowercase">apnea</h1>
          <nav className="flex gap-1">
            {[
              { to: "/", label: "trainer" },
              { to: "/history", label: "history" },
              { to: "/settings", label: "settings" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={navCls}
                activeProps={{ className: `${navCls} bg-bio/15 text-bio` }}
                inactiveProps={{ className: `${navCls} text-ink-dim hover:text-ink` }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
