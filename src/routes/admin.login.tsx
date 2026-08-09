import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { staffLogin } from "@/lib/pb";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Sign in" }, { name: "robots", content: "noindex" }],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await staffLogin(email, password);
      navigate({ to: "/admin", replace: true });
    } catch {
      // Deliberately vague — don't confirm whether the address exists.
      setError("Those details didn't work.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-8">
      <p className="label">The Blade Cuts Both Ways</p>
      <h1 className="mt-6 text-3xl font-light italic text-ink">Sign in</h1>

      <form onSubmit={submit} className="mt-12">
        <label className="label block" htmlFor="email">
          email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full border-0 border-b border-rule bg-transparent pb-2 text-lg font-light text-ink outline-none focus:border-ink"
        />

        <label className="label mt-8 block" htmlFor="password">
          password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full border-0 border-b border-rule bg-transparent pb-2 text-lg font-light text-ink outline-none focus:border-ink"
        />

        {error && <p className="mt-6 text-sm font-light italic text-ink-soft">{error}</p>}

        <button type="submit" disabled={busy} className="label mt-10 hover:opacity-60">
          {busy ? "signing in…" : "sign in →"}
        </button>
      </form>
    </main>
  );
}
