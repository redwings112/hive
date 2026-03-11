import React, { useState, useEffect, useMemo, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from "firebase/firestore";
import { AlertTriangle, Shield, Activity } from "lucide-react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const COLORS = { ACTIVE: "text-green-400", FAIL: "text-red-500", PENDING: "text-yellow-300" };
const THEMES = { CYBER: "cyberpunk", DARK: "dark" };

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const selectedProject = import.meta.env.VITE_VERITAS_APP_ID || "Veritas-Demo-Alpha";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api/veritas";

const VeritasDashboard = () => {
  const [db, setDb] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [envError, setEnvError] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [theme, setTheme] = useState(THEMES.CYBER);
  const [logModal, setLogModal] = useState({ open: false, build: null });

  // Initialize Firestore
  const dbMemo = useMemo(() => {
    if (!firebaseConfig.apiKey) { setEnvError(true); return null; }
    try {
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      return getFirestore(app);
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  useEffect(() => setDb(dbMemo), [dbMemo]);

  // Subscribe to builds
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const buildsRef = collection(db, "veritas_builds");
    const q = query(buildsRef, where("appId", "==", selectedProject), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, snapshot => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toMillis?.() || Date.now()
      }));
      setBuilds(fetched);
      setLoading(false);

      const latestFail = fetched.find(b => b.status === "FAIL");
      const latestActive = fetched.find(b => b.status === "ACTIVE");

      // Healing overlay logic
      if (latestFail && (!latestActive || latestActive.timestamp < latestFail.timestamp)) setIsHealing(true);
      else setIsHealing(false);

      if (latestFail) toast.error(`🚨 Build ${latestFail.buildId} FAILED!`);
      if (latestFail?.aiSuggestion) toast(`💡 AI Suggestion: ${latestFail.aiSuggestion}`);
      if (latestActive && latestFail) toast.success(`✅ Build ${latestActive.buildId} ACTIVE`);
    });

    return () => unsubscribe();
  }, [db]);

  // Subscribe to status updates
  useEffect(() => {
    if (!db) return;
    const statusRef = doc(db, "veritas_status", selectedProject);
    const unsubscribe = onSnapshot(statusRef, snapshot => setStatus(snapshot.exists() ? snapshot.data() : { status: "OFFLINE" }));
    const timer = setInterval(() => setStatus(prev => ({ ...prev })), 30000); // Auto-refresh last pulse
    return () => { unsubscribe(); clearInterval(timer); };
  }, [db]);

  const currentActive = useMemo(() => builds.find(b => b.status === "ACTIVE"), [builds]);
  const lastFail = useMemo(() => builds.find(b => b.status === "FAIL"), [builds]);

  const formatRelativeTime = useCallback(ts => {
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }, []);

  const handleAction = async (buildId, action) => {
    try {
      if(action==="heal") setIsHealing(true);
      if(action==="promote") setIsHealing(false);

      await axios.post(`${BACKEND_URL}/${action}`, { buildId });
      toast.success(`⚡ ${action.toUpperCase()} triggered for ${buildId}`);
    } catch(err){
      toast.error(`❌ Failed to ${action} ${buildId}`);
      console.error(err);
    }
  };

  if(envError) return (
    <div className="loading-screen text-red-500">
      <AlertTriangle size={48}/>
      <h2>ENV CONFIG ERROR</h2>
      <p>Check your .env file for VITE_ prefixes.</p>
    </div>
  );
  if(loading) return (
    <div className="loading-screen">
      <Activity className="animate-spin text-neon-cyan"/>
      <p>SYNCHRONIZING_VERITAS_GRID...</p>
    </div>
  );

  return (
    <div className={`app-container ${theme}`}>
      <Toaster position="top-right" reverseOrder={false}/>

      {isHealing && lastFail && (
        <div className="healing-overlay">
          <Shield className="animate-pulse text-neon-cyan" size={48}/>
          <h2>SENTINEL_RECOVERY_ACTIVE</h2>
          <p>Restoring stability after build {lastFail.buildId}...</p>
          {lastFail.aiSuggestion && <p>💡 AI Suggestion: {lastFail.aiSuggestion}</p>}
        </div>
      )}

      <header className="header">
        <h1>VERITAS MISSION CONTROL</h1>
        <h3>UPLINK: {selectedProject}</h3>
        <p>Active Sector Status: {status?.status || "OFFLINE"}</p>
        <p>ID: {currentActive?.buildId || "No Active Build"}</p>
        <p>Last Pulse: {status?.last_pulse ? new Date(status.last_pulse.seconds*1000).toLocaleString() : "N/A"}</p>
        <button onClick={()=>setTheme(theme===THEMES.CYBER?THEMES.DARK:THEMES.CYBER)}>Toggle Theme</button>
      </header>

      <main>
        <table>
          <thead>
            <tr>
              <th>BUILD ID</th>
              <th>STATUS</th>
              <th>TIME</th>
              <th>LOGS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {builds.length===0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4">No live data detected.</td>
              </tr>
            ) : (
              builds.map(b => (
                <tr key={b.id} className={COLORS[b.status]}>
                  <td>{b.buildId}</td>
                  <td>{b.status}</td>
                  <td>{formatRelativeTime(b.timestamp)}</td>
                  <td>
                    {b.notes ? (
                      <button onClick={()=>setLogModal({open:true,build:b})}>View Logs</button>
                    ) : "---"}
                  </td>
                  <td>
                    {b.status==="FAIL" && <button onClick={()=>handleAction(b.buildId,"heal")}>HEAL</button>}
                    {b.status!=="ACTIVE" && <button onClick={()=>handleAction(b.buildId,"promote")}>PROMOTE</button>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>

      {logModal.open && logModal.build && (
        <div className="modal-overlay" onClick={()=>setLogModal({open:false,build:null})}>
          <div className="modal-content">
            <h3>Logs for {logModal.build.buildId}</h3>
            <pre>{logModal.build.notes}</pre>
            <button onClick={()=>setLogModal({open:false,build:null})}>Close</button>
          </div>
        </div>
      )}

      <footer>
        PROTOCOL: v2.6 // APP_ID: {selectedProject} // STATUS: {status?.status || "OFFLINE"}
      </footer>
    </div>
  );
};

export default VeritasDashboard;