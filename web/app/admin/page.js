"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const fmt = (d) => (d ? new Date(d).toLocaleString("en-IN") : "-");
const TABS = [
  { id: "alerts", label: "Fraud alerts" },
  { id: "events", label: "Security events" },
  { id: "audit", label: "Audit log" },
  { id: "activity", label: "Activity (MongoDB)" },
];
const sevCls = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};
const selCls = "border rounded px-2 py-1 text-sm text-gray-900 bg-white";

function Badge({ value }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${sevCls[value] || "bg-gray-100 text-gray-700"}`}>{value || "-"}</span>;
}

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("alerts");
  const [msg, setMsg] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [events, setEvents] = useState([]);
  const [sevFilter, setSevFilter] = useState("");
  const [audit, setAudit] = useState([]);
  const [act, setAct] = useState({ logs: [], byType: [], topFailedIps: [], transferStats: [] });
  const [actError, setActError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");

  const loadAlerts = useCallback(async () => {
    const q = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/admin/alerts${q}`);
    if (res.ok) {
      const d = await res.json();
      setAlerts(d.alerts);
      setSummary(d.summary);
    }
  }, [statusFilter]);

  const loadEvents = useCallback(async () => {
    const q = sevFilter ? `?severity=${sevFilter}` : "";
    const res = await fetch(`/api/admin/security-events${q}`);
    if (res.ok) setEvents((await res.json()).events);
  }, [sevFilter]);

  const loadAudit = useCallback(async () => {
    const res = await fetch("/api/admin/audit");
    if (res.ok) setAudit((await res.json()).audit);
  }, []);

  const loadActivity = useCallback(async () => {
    const q = new URLSearchParams();
    if (typeFilter) q.set("type", typeFilter);
    if (outcomeFilter) q.set("outcome", outcomeFilter);
    const res = await fetch(`/api/admin/activity?${q.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAct(data);
      setActError("");
    } else {
      setActError(data.error || "Could not load MongoDB activity");
    }
  }, [typeFilter, outcomeFilter]);

  useEffect(() => {
    fetch("/api/me").then(async (res) => {
      if (!res.ok) return router.replace("/login");
      const data = await res.json();
      if (data.role !== "ADMIN") return router.replace("/dashboard");
      setMe(data);
    });
  }, [router]);

  useEffect(() => { if (me && tab === "alerts") loadAlerts(); }, [me, tab, loadAlerts]);
  useEffect(() => { if (me && tab === "events") loadEvents(); }, [me, tab, loadEvents]);
  useEffect(() => { if (me && tab === "audit") loadAudit(); }, [me, tab, loadAudit]);
  useEffect(() => { if (me && tab === "activity") loadActivity(); }, [me, tab, loadActivity]);

  async function setStatus(alertId, status) {
    setMsg(null);
    const res = await fetch("/api/admin/alerts/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, status }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg({ type: res.ok ? "ok" : "error", text: data.message || data.error || "Error" });
    if (res.ok) loadAlerts();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!me) return <p className="p-8 text-gray-600">Loading...</p>;

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin dashboard</h1>
          <p className="text-sm text-gray-500">Logged in as {me.name} (ADMIN)</p>
        </div>
        <button onClick={logout} className="text-sm text-blue-700 underline">Log out</button>
      </header>

      <nav className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t.id ? "bg-blue-600 text-white" : "bg-white text-gray-700 shadow"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {msg && (
        <p className={`rounded p-3 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>
      )}

      {tab === "alerts" && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {summary.map((s) => (
              <div key={s.fraud_type} className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-gray-500">{s.fraud_type}</p>
                <p className="text-2xl font-bold text-gray-900">{s.alerts}</p>
                <p className="text-xs text-gray-500">avg risk {s.avg_risk}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Fraud alerts</h2>
              <label className="text-sm text-gray-700">Status{" "}
                <select className={selCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  {["OPEN", "INVESTIGATING", "CONFIRMED", "FALSE_POSITIVE", "RESOLVED"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500">No alerts found.</p>
            ) : (
              <table className="w-full text-sm text-left text-gray-800">
                <thead className="text-gray-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">#</th><th className="pr-3">Detected</th><th className="pr-3">Customer</th>
                    <th className="pr-3">Type</th><th className="pr-3">Txn</th><th className="pr-3">Risk</th>
                    <th className="pr-3">Severity</th><th className="pr-3">Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.alert_id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3">{a.alert_id}</td>
                      <td className="pr-3 whitespace-nowrap">{fmt(a.detected_at)}</td>
                      <td className="pr-3">{a.customer_name}</td>
                      <td className="pr-3">{a.fraud_type}<div className="text-xs text-gray-500">{a.reason}</div></td>
                      <td className="pr-3">{a.transaction_id}</td>
                      <td className="pr-3">{a.risk_score}</td>
                      <td className="pr-3"><Badge value={a.severity} /></td>
                      <td className="pr-3">{a.alert_status}</td>
                      <td>
                        <select
                          className={selCls}
                          value=""
                          onChange={(e) => e.target.value && setStatus(a.alert_id, e.target.value)}
                        >
                          <option value="">Change...</option>
                          {["INVESTIGATING", "CONFIRMED", "FALSE_POSITIVE", "RESOLVED"].map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {tab === "events" && (
        <section className="bg-white rounded-xl shadow p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Security events</h2>
            <label className="text-sm text-gray-700">Severity{" "}
              <select className={selCls} value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
                <option value="">All</option>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">No events found.</p>
          ) : (
            <table className="w-full text-sm text-left text-gray-800">
              <thead className="text-gray-500 border-b">
                <tr><th className="py-2 pr-3">Time</th><th className="pr-3">Customer</th><th className="pr-3">Event</th><th className="pr-3">Severity</th><th className="pr-3">IP</th><th>Details</th></tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.event_id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmt(e.event_time)}</td>
                    <td className="pr-3">{e.customer_name}</td>
                    <td className="pr-3">{e.event_type}</td>
                    <td className="pr-3"><Badge value={e.severity} /></td>
                    <td className="pr-3">{e.ip_address || "-"}</td>
                    <td>{e.event_details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "audit" && (
        <section className="bg-white rounded-xl shadow p-4 overflow-x-auto">
          <h2 className="font-semibold text-gray-900 mb-3">Audit log</h2>
          {audit.length === 0 ? (
            <p className="text-sm text-gray-500">No audit entries yet. Change an alert status to create one.</p>
          ) : (
            <table className="w-full text-sm text-left text-gray-800">
              <thead className="text-gray-500 border-b">
                <tr><th className="py-2 pr-3">Time</th><th className="pr-3">User</th><th className="pr-3">Action</th><th className="pr-3">Table</th><th className="pr-3">Record</th><th className="pr-3">Old</th><th>New</th></tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.audit_id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmt(a.action_timestamp)}</td>
                    <td className="pr-3">{a.username}</td>
                    <td className="pr-3">{a.action}</td>
                    <td className="pr-3">{a.table_name}</td>
                    <td className="pr-3">{a.record_id}</td>
                    <td className="pr-3">{a.old_value}</td>
                    <td>{a.new_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "activity" && (
        <section className="space-y-4">
          {actError && <p className="rounded p-3 text-sm bg-red-50 text-red-700">{actError}</p>}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Events by type (aggregation)</h3>
              <ul className="text-sm text-gray-800 space-y-1">
                {act.byType.map((b) => (
                  <li key={`${b._id.eventType}-${b._id.outcome}`} className="flex justify-between">
                    <span>{b._id.eventType} / {b._id.outcome}</span><strong>{b.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Most failed logins by IP</h3>
              {act.topFailedIps.length === 0 ? (
                <p className="text-sm text-gray-500">None yet.</p>
              ) : (
                <ul className="text-sm text-gray-800 space-y-1">
                  {act.topFailedIps.map((r) => (
                    <li key={r._id} className="flex justify-between">
                      <span>{r._id} <span className="text-xs text-gray-500">({(r.usernames || []).join(", ")})</span></span>
                      <strong>{r.failures}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Transfers per customer</h3>
              {act.transferStats.length === 0 ? (
                <p className="text-sm text-gray-500">None yet.</p>
              ) : (
                <ul className="text-sm text-gray-800 space-y-1">
                  {act.transferStats.map((t) => (
                    <li key={String(t._id)} className="flex justify-between">
                      <span>Customer {t._id}: {t.transfers} transfer(s)</span>
                      <strong>{Math.round(t.totalAmount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold text-gray-900">Activity log (MongoDB)</h2>
              <div className="flex gap-2 text-sm text-gray-700">
                <label>Type{" "}
                  <select className={selCls} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">All</option>
                    {["LOGIN", "TRANSFER", "DEPOSIT", "WITHDRAWAL", "ALERT_REVIEW"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>Outcome{" "}
                  <select className={selCls} value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)}>
                    <option value="">All</option>
                    <option>SUCCESS</option>
                    <option>FAILURE</option>
                  </select>
                </label>
              </div>
            </div>
            {act.logs.length === 0 ? (
              <p className="text-sm text-gray-500">No activity found.</p>
            ) : (
              <table className="w-full text-sm text-left text-gray-800">
                <thead className="text-gray-500 border-b">
                  <tr><th className="py-2 pr-3">Time</th><th className="pr-3">Type</th><th className="pr-3">Outcome</th><th className="pr-3">User</th><th className="pr-3">IP</th><th>Details (varies per event)</th></tr>
                </thead>
                <tbody>
                  {act.logs.map((l) => (
                    <tr key={l._id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmt(l.createdAt)}</td>
                      <td className="pr-3">{l.eventType}</td>
                      <td className={`pr-3 font-medium ${l.outcome === "FAILURE" ? "text-red-700" : "text-green-700"}`}>{l.outcome}</td>
                      <td className="pr-3">{l.username || "-"}</td>
                      <td className="pr-3">{l.ip || "-"}</td>
                      <td className="font-mono text-xs">{JSON.stringify(l.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
