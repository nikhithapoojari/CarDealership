import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium ${
    isActive ? "underline decoration-stripe decoration-2 underline-offset-8" : "text-white/80 hover:text-white"
  }`;

export default function Navbar() {
  const { isAdmin, logout } = useAuth();

  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {/* Two parking-lot stripes: the brand mark. */}
            <span aria-hidden className="flex gap-1">
              <span className="h-6 w-1.5 -skew-x-12 bg-stripe" />
              <span className="h-6 w-1.5 -skew-x-12 bg-stripe" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight">Lotline</span>
          </div>
          {isAdmin && (
            <nav aria-label="Main" className="flex gap-5">
              <NavLink to="/" end className={linkClass}>
                On the lot
              </NavLink>
              <NavLink to="/admin" className={linkClass}>
                Manage inventory
              </NavLink>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <span className="rounded-sm bg-stripe px-2 py-0.5 text-xs font-semibold text-ink">Admin</span>
          )}
          <button type="button" onClick={logout} className="text-sm font-medium underline underline-offset-4">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
