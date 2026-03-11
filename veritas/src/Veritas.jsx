import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { AlertTriangle, Shield, Activity } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const COLORS = { ACTIVE: "text-green-400", FAIL: "text-red-500", PENDING: "text-yellow-300" };
const THEMES = { CYBER: "cyberpunk", DARK: "dark" };

const APP_ID = import.meta.env.VITE_VERITAS_APP_ID || "Veritas-Demo-Alpha";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api/veritas";

const Veritas = () => {
  const [builds, setBuilds] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHealing, setIsHealing] = useState(false);
  const [theme, setTheme] = useState(THEMES.CYBER);
  const [logModal, setLogModal] = useState({ open: false, build: null });

  // Fetch builds from backend
  useEffect(() => {
    const fetchBuilds = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/list?appId=${APP_ID}`);
        setBuilds(res.data || []);
        const latestFail = res.data?.find(b => b.status === "FAIL");
        setIsHealing(!!latestFail);
      } catch (err) {
        console.error(err);
        setBuilds([]);
      }
      setLoading(false);
    };

    fetchBuilds();
    const interval = setInterval(fetchBuilds, 10000); // auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Status fetch + auto-refresh
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/status?appId=${APP_ID}`);
        setStatus(res.data);
      } catch (err) {
        console.error(err);
        setStatus({ status: "OFFLINE" });
      }
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  const currentActive = useMemo(() => builds.find(b => b.status === "ACTIVE"), [builds]);
  const lastFail = useMemo(() => builds.find(b => b.status === "FAIL"), [builds]);

  const formatRelativeTime = useCallback(ts => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }, []);

  const handleAction = async (buildId, action) => {
    try {
      if (action === "heal") setIsHealing(true);
      if (action === "promote") setIsHealing(false);

      await axios.post(`${BACKEND_URL}/${action}`, { buildId });
      toast.success(`⚡ ${action.toUpperCase()} triggered for ${buildId}`);
    } catch (err) {
      toast.error(`❌ Failed to ${action} ${buildId}`);
      console.error(err);
    }
  };

  if (loading) return <div className="loading-screen"><Activity className="animate-spin text-neon-cyan" /><p>SYNCHRONIZING_VERITAS_GRID...</p></div>;

  return (
    <div className={`app-container ${theme}`}>
      <Toaster position="top-right" reverseOrder={false} />

      {isHealing && lastFail && (
        <div className="healing-overlay">
          <Shield className="animate-pulse text-neon-cyan" size={48} />
          <h2>SENTINEL_RECOVERY_ACTIVE</h2>
          <p>Restoring stability after build {lastFail.buildId}...</p>
          {lastFail.aiSuggestion && <p>💡 AI Suggestion: {lastFail.aiSuggestion}</p>}
        </div>
      )}

      <header className="header">
        <h1>VERITAS MISSION CONTROL</h1>
        <h3>UPLINK: {APP_ID}</h3>
        <p>Active Sector Status: {status?.status || "OFFLINE"}</p>
        <p>ID: {currentActive?.buildId || "No Active Build"}</p>
        <p>Last Pulse: {status?.last_pulse ? new Date(status.last_pulse.seconds * 1000).toLocaleString() : "N/A"}</p>
        <button onClick={() => setTheme(theme === THEMES.CYBER ? THEMES.DARK : THEMES.CYBER)}>Toggle Theme</button>
      </header>

      <main>
        <table>
          <thead>
            <tr><th>BUILD ID</th><th>STATUS</th><th>TIME</th><th>LOGS</th><th>ACTIONS</th></tr>
          </thead>
          <tbody>
            {builds.length === 0 ? <tr><td colSpan="5" className="text-center py-4">No live data detected.</td></tr> :
              builds.map(b => (
                <tr key={b.id} className={COLORS[b.status]}>
                  <td>{b.buildId}</td>
                  <td>{b.status}</td>
                  <td>{formatRelativeTime(b.timestamp)}</td>
                  <td>{b.notes ? <button onClick={() => setLogModal({ open: true, build: b })}>View Logs</button> : "---"}</td>
                  <td>
                    {b.status === "FAIL" && <button onClick={() => handleAction(b.buildId, "heal")}>HEAL</button>}
                    {b.status !== "ACTIVE" && <button onClick={() => handleAction(b.buildId, "promote")}>PROMOTE</button>}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </main>

      {logModal.open && logModal.build && (
        <div className="modal-overlay" onClick={() => setLogModal({ open: false, build: null })}>
          <div className="modal-content">
            <h3>Logs for {logModal.build.buildId}</h3>
            <pre>{logModal.build.notes}</pre>
            <button onClick={() => setLogModal({ open: false, build: null })}>Close</button>
          </div>
        </div>
      )}

      <footer>PROTOCOL: v2.6 // APP_ID: {APP_ID} // STATUS: {status?.status || "OFFLINE"}</footer>
    </div>
  );
};

export default Veritas;