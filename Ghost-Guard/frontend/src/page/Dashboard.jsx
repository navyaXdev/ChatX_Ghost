import React, { useState } from "react";
import { useGhostGuard } from "../hooks/useGhostGuard";
import { API } from "../api/ghostGuard";

export default function Dashboard() {
  const { status, events, honeypot } = useGhostGuard();

  const [demoStatus, setDemoStatus] = useState("");
  const [isNormalLoading, setIsNormalLoading] = useState(false);
  const [isAttackRunning, setIsAttackRunning] = useState(false);

  /*
  ============================================================
  FINAL BACKEND CONTRACT
  ============================================================

  GET /status

  {
    total_requests,
    normal_requests,
    honeypot_requests,
    current_threat_level,
    last_updated
  }

  GET /events

  {
    events: [
      {
        id,
        timestamp,
        source_ip,
        method,
        endpoint,
        score,
        decision,
        reasons
      }
    ]
  }

  GET /honeypot-log

  {
    sessions: [
      {
        session_id,
        source_ip,
        started_at,
        actions: [
          {
            timestamp,
            endpoint
          }
        ]
      }
    ]
  }

  DEMO REQUESTS

  Normal:
  GET /api/products
  Single request

  Suspicious:
  GET /admin/users
  20-30 rapid requests
  ============================================================
  */

  const statusData = status.data;

  const eventData = events.data?.events ?? [];
  const honeypotData = honeypot.data?.sessions ?? [];

  /*
  ============================================================
  LATEST HONEYPOT EVENT
  ============================================================
  */

  const latestHoneypotEvent =
    [...eventData]
      .reverse()
      .find((event) => event.decision === "honeypot") ?? null;

  /*
  ============================================================
  LATEST HONEYPOT SESSION
  ============================================================
  */

  const latestHoneypotSession =
    honeypotData.length > 0 ? honeypotData[0] : null;

  /*
  ============================================================
  THREAT LEVEL
  ============================================================
  */

  const threatLevel =
    statusData?.current_threat_level?.toUpperCase() ?? "UNKNOWN";

  const getThreatColor = () => {
    switch (statusData?.current_threat_level) {
      case "high":
        return "text-rose-400 bg-rose-950/40 border-rose-900/40";

      case "medium":
        return "text-amber-400 bg-amber-950/40 border-amber-900/40";

      case "low":
        return "text-emerald-400 bg-emerald-950/40 border-emerald-900/40";

      default:
        return "text-slate-400 bg-slate-900/40 border-slate-800";
    }
  };

  /*
  ============================================================
  FORMAT TIME
  ============================================================
  */

  const formatTime = (timestamp) => {
    if (!timestamp) return "--:--";

    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  /*
  ============================================================
  DECISION STYLE
  ============================================================
  */

  const getDecisionStyle = (decision) => {
    if (decision === "honeypot") {
      return "text-rose-400";
    }

    return "text-emerald-400";
  };

  /*
  ============================================================
  NORMAL REQUEST DEMO
  ============================================================

  One request to the real API.

  The response itself isn't displayed.
  /events will show the resulting decision.
  */

  const handleNormalRequest = async () => {
    if (isNormalLoading || isAttackRunning) return;

    try {
      setIsNormalLoading(true);
      setDemoStatus("Sending normal request...");

      await API.get("/api/products");

      setDemoStatus(
        "Normal request sent. Watch LIVE TRAFFIC for the result."
      );
    } catch (error) {
      console.error("Normal demo request failed:", error);

      setDemoStatus(
        "Normal request failed. Check that the API is running."
      );
    } finally {
      setIsNormalLoading(false);
    }
  };

  /*
  ============================================================
  ATTACK SIMULATION
  ============================================================

  Send 25 rapid requests to /admin/users.

  We intentionally use a small delay instead of Promise.all()
  so the backend sees a rapid burst of requests.
  */

  const handleAttackRequest = async () => {
    if (isNormalLoading || isAttackRunning) return;

    try {
      setIsAttackRunning(true);
      setDemoStatus("Simulating attack... 0/25 requests");

      const totalRequests = 25;

      for (let i = 0; i < totalRequests; i++) {
        try {
          await API.get("/admin/users");
        } catch (error) {
          /*
            Even if the endpoint returns an error, the request
            has still reached the backend and can be observed
            by Ghost Guard.
          */
          console.log(`Attack request ${i + 1} completed with error`);
        }

        setDemoStatus(
          `Simulating attack... ${i + 1}/${totalRequests} requests`
        );

        /*
          Small delay between requests.
        */
        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      setDemoStatus(
        "Attack simulation complete. Watch LIVE TRAFFIC and HONEYPOT."
      );
    } catch (error) {
      console.error("Attack simulation failed:", error);

      setDemoStatus("Attack simulation failed.");
    } finally {
      setIsAttackRunning(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070b12] text-white flex overflow-hidden">
      {/* ================= BACKGROUND ================= */}

      <div
        className="absolute inset-0 bg-cover bg-center z-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2000&auto=format&fit=crop')",
        }}
      />

      <div className="absolute inset-0 bg-[#070b12]/80 z-0 pointer-events-none" />

      {/* ================= SIDEBAR ================= */}

      <aside className="relative z-10 w-64 border-r border-slate-800/50 p-6 flex flex-col justify-between hidden md:flex backdrop-blur-sm">
        <div>
          {/* Logo */}

          <div className="mb-10">
            <h1 className="text-white font-serif tracking-wide text-lg">
              GHOST GUARD
            </h1>

            <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-0.5">
              Adaptive API Defense
            </p>
          </div>

          {/* Navigation */}

          <nav className="space-y-1.5 text-sm font-medium">
            <a
              href="#dashboard"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-slate-800/40 text-white border border-slate-700/30"
            >
              <span>Dashboard</span>
            </a>

          </nav>
        </div>

        {/* System Status */}

        <div className="text-xs text-slate-400 flex items-center space-x-2 pt-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

          <span className="tracking-wider text-[11px] font-medium">
            SYSTEM PROTECTED
          </span>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}

      <main
        id="dashboard"
        className="relative z-10 flex-1 flex flex-col min-w-0 overflow-y-auto"
      >
        {/* ================= HEADER ================= */}

        <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800/50 backdrop-blur-sm">
          <div>
            <span className="text-[11px] text-slate-400 tracking-[0.2em] uppercase font-medium">
              GHOST GUARD / ADAPTIVE API DEFENSE
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-800/80 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

            <span className="tracking-wider font-medium text-[11px]">
              SYSTEM PROTECTED
            </span>

            <span className="text-slate-600">|</span>

            <span className="text-slate-400 text-[11px]">
              LIVE • 2s
            </span>
          </div>
        </header>

        {/* ================= DASHBOARD CONTAINER ================= */}

        <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* ================= TITLE ================= */}

          <div>
            <h2 className="text-4xl lg:text-5xl font-serif text-white font-normal tracking-tight">
              Security Overview
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              Monitor API behavior and observe adaptive threat containment.
            </p>
          </div>

          {/* ================= DEMO CONTROLS ================= */}

          <div className="bg-[#0b1019]/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                <span className="text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
                  LIVE DEMO
                </span>

                <p className="text-sm text-slate-500 mt-1">
                  Generate traffic and watch Ghost Guard detect and contain
                  suspicious behavior.
                </p>

                {demoStatus && (
                  <p className="text-xs text-slate-300 mt-3 font-mono">
                    {demoStatus}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {/* NORMAL REQUEST */}

                <button
                  type="button"
                  onClick={handleNormalRequest}
                  disabled={isNormalLoading || isAttackRunning}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-xs font-semibold tracking-wider hover:bg-emerald-900/50 hover:border-emerald-700/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />

                  {isNormalLoading
                    ? "SENDING..."
                    : "NORMAL REQUEST"}
                </button>

                {/* SIMULATE ATTACK */}

                <button
                  type="button"
                  onClick={handleAttackRequest}
                  disabled={isNormalLoading || isAttackRunning}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-400 text-xs font-semibold tracking-wider hover:bg-rose-900/50 hover:border-rose-700/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-rose-400 mr-2 ${
                      isAttackRunning ? "animate-ping" : ""
                    }`}
                  />

                  {isAttackRunning
                    ? "SIMULATING..."
                    : "SIMULATE ATTACK"}
                </button>
              </div>
            </div>
          </div>

          {/* ================= METRIC CARDS ================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Requests */}

            <div className="bg-[#0b1019]/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between shadow-xl">
              <span className="text-3xl lg:text-4xl font-serif font-light text-white tracking-tight">
                {statusData?.total_requests ?? "--"}
              </span>

              <span className="text-[11px] tracking-[0.2em] text-slate-400 uppercase mt-4 font-medium">
                REQUESTS
              </span>
            </div>

            {/* Normal Requests */}

            <div className="bg-[#0b1019]/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between shadow-xl">
              <span className="text-3xl lg:text-4xl font-serif font-light text-white tracking-tight">
                {statusData?.normal_requests ?? "--"}
              </span>

              <span className="text-[11px] tracking-[0.2em] text-slate-400 uppercase mt-4 font-medium">
                NORMAL
              </span>
            </div>

            {/* Honeypot Requests */}

            <div className="bg-[#0b1019]/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between shadow-xl">
              <span className="text-3xl lg:text-4xl font-serif font-light text-white tracking-tight">
                {statusData?.honeypot_requests ?? "--"}
              </span>

              <span className="text-[11px] tracking-[0.2em] text-slate-400 uppercase mt-4 font-medium">
                HONEYPOT
              </span>
            </div>

            {/* Threat Level */}

            <div className="bg-[#0b1019]/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between shadow-xl">
              <span className="text-3xl lg:text-4xl font-serif font-light text-white tracking-tight">
                {threatLevel}
              </span>

              <span className="text-[11px] tracking-[0.2em] text-slate-400 uppercase mt-4 font-medium">
                THREAT LEVEL
              </span>
            </div>
          </div>

          {/* ================= THREAT LEVEL ================= */}

          <div className="bg-[#0b1019]/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-6 py-4 flex items-center justify-between shadow-xl">
            <span className="text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
              CURRENT THREAT LEVEL
            </span>

            <div
              className={`flex items-center space-x-2 text-xs font-medium px-3 py-1 rounded-full border ${getThreatColor()}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />

              <span className="tracking-wider text-[11px]">
                {threatLevel}
              </span>
            </div>
          </div>

          {/* ================= LIVE TRAFFIC ================= */}

          <div
            id="traffic"
            className="bg-[#0b1019]/80 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-xl"
          >
            <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
                LIVE TRAFFIC
              </span>

              <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />

                <span className="tracking-wider text-[11px]">
                  LIVE
                </span>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-105 scrollbar-design">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800/60 bg-slate-900/20">
                  <tr>
                    <th className="px-6 py-3 font-medium">
                      TIME
                    </th>

                    <th className="px-6 py-3 font-medium">
                      SOURCE IP
                    </th>

                    <th className="px-6 py-3 font-medium">
                      METHOD
                    </th>

                    <th className="px-6 py-3 font-medium">
                      ENDPOINT
                    </th>

                    <th className="px-6 py-3 font-medium">
                      SCORE
                    </th>

                    <th className="px-6 py-3 font-medium">
                      DECISION
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/40 font-mono text-xs">
                  {eventData.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        No traffic events yet.
                      </td>
                    </tr>
                  ) : (
                    eventData.map((event) => (
                      <tr
                        key={event.id}
                        className="hover:bg-slate-900/20 transition-colors"
                      >
                        <td className="px-6 py-3.5 text-slate-400">
                          {formatTime(event.timestamp)}
                        </td>

                        <td className="px-6 py-3.5 text-slate-400">
                          {event.source_ip}
                        </td>

                        <td className="px-6 py-3.5 text-slate-300">
                          {event.method}
                        </td>

                        <td className="px-6 py-3.5 text-slate-300">
                          {event.endpoint}
                        </td>

                        <td className="px-6 py-3.5 text-slate-300">
                          {event.score}
                        </td>

                        <td
                          className={`px-6 py-3.5 font-medium uppercase ${getDecisionStyle(
                            event.decision
                          )}`}
                        >
                          {event.decision}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= BOTTOM GRID ================= */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* WHY HONEYPOT */}

            <div className="lg:col-span-2 bg-[#0b1019]/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between shadow-xl">
              <div>
                <span className="text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
                  WHY WAS IT SENT TO HONEYPOT
                </span>

                <div className="text-3xl font-serif text-white mt-2 mb-4">
                  Score {latestHoneypotEvent?.score ?? "--"}
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  {latestHoneypotEvent?.endpoint ??
                    "No honeypot event"}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-300 pt-4 border-t border-slate-800/60 font-medium">
                {latestHoneypotEvent?.reasons?.length > 0 ? (
                  latestHoneypotEvent.reasons.map(
                    (reason, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />

                        <span>{reason}</span>
                      </div>
                    )
                  )
                ) : (
                  <span className="text-slate-500">
                    No explanation available.
                  </span>
                )}
              </div>
            </div>

            {/* HONEYPOT SESSION */}

            <div
              id="honeypot"
              className="bg-[#0b1019]/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between shadow-xl"
            >
              <div>
                <span className="text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
                  HONEYPOT
                  {latestHoneypotSession?.session_id
                    ? ` / SESSION #${latestHoneypotSession.session_id}`
                    : ""}
                </span>

                <div className="text-xs text-slate-500 mt-2 font-mono">
                  {latestHoneypotSession?.source_ip ??
                    "No active session"}
                </div>

                {/* Attack Path */}

                <div className="flex items-center space-x-2 text-xs font-mono text-slate-300 mt-4 overflow-x-auto pb-2">
                  {latestHoneypotSession?.actions?.length > 0 ? (
                    latestHoneypotSession.actions.map(
                      (action, index) => (
                        <React.Fragment key={index}>
                          {index > 0 && (
                            <span className="text-slate-600">
                              →
                            </span>
                          )}

                          <span>{action.endpoint}</span>
                        </React.Fragment>
                      )
                    )
                  ) : (
                    <span className="text-slate-500">
                      No active honeypot session
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs font-medium text-rose-500 mt-6 pt-4 border-t border-slate-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />

                <span className="tracking-wider text-[11px]">
                  {latestHoneypotSession
                    ? "CONTAINED"
                    : "NO ACTIVE THREAT"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}