"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Login failed");
    router.push(data.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Demo Bank Login</h1>
          <p className="text-sm text-gray-500">Academic project, simulated funds only.</p>
        </div>
        {error && <p className="rounded bg-red-50 text-red-700 text-sm p-2">{error}</p>}
        <label className="block text-sm text-gray-700">
          Username
          <input
            className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm text-gray-700">
          Password
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button
          disabled={busy}
          className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-xs text-gray-500">Demo users: aarav, priya, rohan (customers), admin. Password: Demo@1234</p>
      </form>
    </main>
  );
}
