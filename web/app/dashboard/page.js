"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n));

const inputCls = "mt-1 w-full border rounded px-3 py-2 text-gray-900";
const btnCls = "w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700";

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState(null); // { type: "ok" | "error", text }
  const [hType, setHType] = useState("");
  const [hQuery, setHQuery] = useState("");

  const [dep, setDep] = useState({ accountId: "", amount: "" });
  const [wd, setWd] = useState({ accountId: "", amount: "" });
  const [tr, setTr] = useState({ fromAccountId: "", toAccountNumber: "", amount: "", description: "" });

  const load = useCallback(async () => {
    const meRes = await fetch("/api/me");
    if (!meRes.ok) return router.replace("/login");
    const m = await meRes.json();
    if (m.role !== "CUSTOMER") return router.replace("/admin");
    setMe(m);

    const a = await fetch("/api/accounts").then((r) => r.json());
    setAccounts(a.accounts || []);
  }, [router]);

  const loadHistory = useCallback(async () => {
    const q = new URLSearchParams();
    if (hType) q.set("type", hType);
    if (hQuery.trim()) q.set("q", hQuery.trim());
    const res = await fetch(`/api/history?${q.toString()}`);
    if (res.ok) setHistory((await res.json()).history || []);
  }, [hType, hQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!me) return;
    const t = setTimeout(loadHistory, 250); // small delay while typing
    return () => clearTimeout(t);
  }, [me, loadHistory]);

  async function submit(url, payload, reset) {
    setMsg(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ type: "ok", text: data.message || "Done" });
      reset();
      await load();
      await loadHistory();
    } else {
      setMsg({ type: "error", text: data.error || "Something went wrong" });
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!me) return <p className="p-8 text-gray-600">Loading...</p>;

  const accountOptions = (
    <>
      <option value="">Select account</option>
      {accounts.map((a) => (
        <option key={a.account_id} value={a.account_id}>
          {a.account_number} ({a.account_type})
        </option>
      ))}
    </>
  );

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {me.name}</h1>
          <p className="text-sm text-gray-500">Demo bank, simulated funds only</p>
        </div>
        <button onClick={logout} className="text-sm text-blue-700 underline">Log out</button>
      </header>

      {msg && (
        <p className={`rounded p-3 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {accounts.map((a) => (
          <div key={a.account_id} className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">{a.account_type} account</p>
            <p className="font-mono text-gray-900">{a.account_number}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{inr(a.balance)}</p>
            <p className="text-xs text-gray-500">Status: {a.account_status}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <form
          className="bg-white rounded-xl shadow p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit("/api/deposit", dep, () => setDep({ accountId: "", amount: "" }));
          }}
        >
          <h2 className="font-semibold text-gray-900">Deposit</h2>
          <label className="block text-sm text-gray-700">Account
            <select className={inputCls} value={dep.accountId} onChange={(e) => setDep({ ...dep, accountId: e.target.value })} required>{accountOptions}</select>
          </label>
          <label className="block text-sm text-gray-700">Amount (INR)
            <input className={inputCls} inputMode="decimal" value={dep.amount} onChange={(e) => setDep({ ...dep, amount: e.target.value })} required />
          </label>
          <button className={btnCls}>Deposit</button>
        </form>

        <form
          className="bg-white rounded-xl shadow p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit("/api/withdraw", wd, () => setWd({ accountId: "", amount: "" }));
          }}
        >
          <h2 className="font-semibold text-gray-900">Withdraw</h2>
          <label className="block text-sm text-gray-700">Account
            <select className={inputCls} value={wd.accountId} onChange={(e) => setWd({ ...wd, accountId: e.target.value })} required>{accountOptions}</select>
          </label>
          <label className="block text-sm text-gray-700">Amount (INR)
            <input className={inputCls} inputMode="decimal" value={wd.amount} onChange={(e) => setWd({ ...wd, amount: e.target.value })} required />
          </label>
          <button className={btnCls}>Withdraw</button>
        </form>

        <form
          className="bg-white rounded-xl shadow p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit("/api/transfer", tr, () =>
              setTr({ fromAccountId: "", toAccountNumber: "", amount: "", description: "" })
            );
          }}
        >
          <h2 className="font-semibold text-gray-900">Transfer</h2>
          <label className="block text-sm text-gray-700">From account
            <select className={inputCls} value={tr.fromAccountId} onChange={(e) => setTr({ ...tr, fromAccountId: e.target.value })} required>{accountOptions}</select>
          </label>
          <label className="block text-sm text-gray-700">To account number
            <input className={inputCls} placeholder="DEMO0000000002" value={tr.toAccountNumber} onChange={(e) => setTr({ ...tr, toAccountNumber: e.target.value })} required />
          </label>
          <label className="block text-sm text-gray-700">Amount (INR)
            <input className={inputCls} inputMode="decimal" value={tr.amount} onChange={(e) => setTr({ ...tr, amount: e.target.value })} required />
          </label>
          <label className="block text-sm text-gray-700">Note (optional)
            <input className={inputCls} value={tr.description} onChange={(e) => setTr({ ...tr, description: e.target.value })} maxLength={255} />
          </label>
          <button className={btnCls}>Transfer</button>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow p-4 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold text-gray-900">Transaction history</h2>
          <div className="flex gap-2 text-sm">
            <select className="border rounded px-2 py-1 text-gray-900 bg-white" value={hType} onChange={(e) => setHType(e.target.value)}>
              <option value="">All types</option>
              <option>TRANSFER</option>
              <option>DEPOSIT</option>
              <option>WITHDRAWAL</option>
            </select>
            <input
              className="border rounded px-2 py-1 text-gray-900"
              placeholder="Search reference or account"
              value={hQuery}
              onChange={(e) => setHQuery(e.target.value)}
              maxLength={50}
            />
          </div>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No matching transactions.</p>
        ) : (
          <table className="w-full text-sm text-left text-gray-800">
            <thead className="text-gray-500 border-b">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="pr-3">Type</th>
                <th className="pr-3">Reference</th>
                <th className="pr-3">From</th>
                <th className="pr-3">To</th>
                <th className="pr-3 text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={`${h.ref}-${i}`} className="border-b last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(h.tx_date).toLocaleString("en-IN")}</td>
                  <td className="pr-3">{h.tx_type}</td>
                  <td className="pr-3 font-mono text-xs">{h.ref}</td>
                  <td className="pr-3">{h.from_account || "-"}</td>
                  <td className="pr-3">{h.to_account || "-"}</td>
                  <td className={`pr-3 text-right font-medium ${h.direction === "DEBIT" ? "text-red-700" : "text-green-700"}`}>
                    {h.direction === "DEBIT" ? "-" : "+"}{inr(h.amount)}
                  </td>
                  <td>{h.tx_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
