import React, { useState, useEffect } from "react";
import axios from "axios";

const MOCK_BUILDS = [
  {
    id: "mock",
    buildId: "v2.1.0-fallback",
    timestamp: Date.now(),
    status: "ACTIVE",
    notes: "No live data detected"
  }
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api/veritas";
const APP_ID = import.meta.env.VITE_VERITAS_APP_ID || "Veritas-Demo-Alpha";

const App = () => {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mock, setMock] = useState(false);

  useEffect(() => {
    const fetchBuilds = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/list?appId=${APP_ID}`);
        if (res.data?.length > 0) {
          setBuilds(res.data);
          setMock(false);
        } else {
          setBuilds(MOCK_BUILDS);
          setMock(true);
        }
      } catch (err) {
        console.error("Fetch builds failed:", err);
        setBuilds(MOCK_BUILDS);
        setMock(true);
      }
      setLoading(false);
    };

    fetchBuilds();
    const interval = setInterval(fetchBuilds, 10000); // auto-refresh
    return () => clearInterval(interval);
  }, []);

  const active = builds.find(b => b.status === "ACTIVE");

  const handleAction = async (buildId, action) => {
    try {
      await axios.post(`${BACKEND_URL}/${action}`, { buildId });
      alert(`${action.toUpperCase()} triggered for ${buildId}`);
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} ${buildId}`);
    }
  };

  if (loading) return <div>SYNCING_VERITAS_GRID...</div>;

  return (
    <div style={{ padding: "30px", fontFamily: "monospace" }}>
      <h1>VERITAS_MISSION_CONTROL</h1>

      {mock && <p style={{ color: "orange" }}>MOCK_DATA_ACTIVE // CHECK_LEDGER_PATH</p>}

      {active && (
        <div style={{ marginBottom: "20px" }}>
          <p>ID: {active.buildId}</p>
          <p>Status: {active.status}</p>
          <p>Last Pulse: {new Date(active.timestamp).toLocaleString()}</p>
        </div>
      )}

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Build</th>
            <th>Status</th>
            <th>Time</th>
            <th>Logs</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {builds.map(b => (
            <tr key={b.id}>
              <td>{b.buildId}</td>
              <td>{b.status}</td>
              <td>{new Date(b.timestamp).toLocaleTimeString()}</td>
              <td>{b.notes}</td>
              <td>
                {b.status === "FAIL" && <button onClick={() => handleAction(b.buildId, "heal")}>HEAL</button>}
                {b.status !== "ACTIVE" && <button onClick={() => handleAction(b.buildId, "promote")}>PROMOTE</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer style={{ marginTop: "20px" }}>PROTOCOL v2.6 | STATUS: {mock ? "OFFLINE" : "LIVE"}</footer>
    </div>
  );
};

export default App;