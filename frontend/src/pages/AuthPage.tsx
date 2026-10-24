import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const MIN_PASSWORD = 8;
const inputClass = "mt-1 w-full rounded-sm border border-ink/20 bg-white px-3 py-2";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isRegister = mode === "register";
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (isRegister && password.length < MIN_PASSWORD) {
      setError(`Use a password with at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setPending(true);
    try {
      await (isRegister ? register : login)(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span aria-hidden className="flex gap-1">
          <span className="h-8 w-2 -skew-x-12 bg-stripe" />
          <span className="h-8 w-2 -skew-x-12 bg-stripe" />
        </span>
        <span className="font-display text-3xl font-extrabold tracking-tight">Lotline</span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="rounded-md bg-white p-6 ring-1 ring-ink/10">
        <h1 className="font-display text-2xl font-bold">{isRegister ? "Create your account" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-mute">
          {isRegister ? "Browse the lot and buy vehicles." : "See what's on the lot today."}
        </p>

        <label className="mt-5 block text-sm font-medium">
          Email
          <input
            className={inputClass}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          Password
          <input
            className={inputClass}
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {isRegister && <p className="mt-1 text-xs text-mute">At least {MIN_PASSWORD} characters.</p>}

        {error && (
          <p role="alert" className="mt-4 rounded-sm bg-stop/10 px-3 py-2 text-sm font-medium text-stop">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-sm bg-ink px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {isRegister ? "Create account" : "Sign in"}
        </button>

        <p className="mt-4 text-center text-sm">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link className="font-semibold underline underline-offset-4" to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form>
    </main>
  );
}
