"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { AppState, Plan, Exercise, WorkoutSession, WorkoutExercise, SetLog, PlanExercise, MuscleGroup } from "@/lib/types";
import { loadState, saveState, uid, updatePRs } from "@/lib/storage";
import { TEMPLATE_PLANS, TEMPLATE_INFO } from "@/lib/templates";

type Screen = "dashboard" | "plans" | "exercises" | "history" | "templates" | "workout";
type Modal = "none" | "newPlan" | "addExercise" | "editPlan" | "newExercise" | "addToPlan" | "sessionDetail";

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: "#c8f542", back: "#42c8f5", shoulders: "#f5a642",
  biceps: "#a042f5", triceps: "#f542a0", legs: "#42f5a0",
  glutes: "#f5e642", core: "#f58c42", cardio: "#42f5f5", "full body": "#ffffff",
};

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<AppState>({ exercises: [], plans: [], sessions: [], prs: [] });
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [modal, setModal] = useState<Modal>("none");
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [viewSession, setViewSession] = useState<WorkoutSession | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Load once
  useEffect(() => { setState(loadState()); }, []);

  // Save on change
  const save = useCallback((s: AppState) => { setState(s); saveState(s); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── WORKOUT SESSION ──────────────────────────────────────────────────────
  const startWorkout = (plan?: Plan) => {
    const session: WorkoutSession = {
      id: uid(), planId: plan?.id, planName: plan?.name,
      date: new Date().toISOString(), duration: 0,
      exercises: plan ? plan.exercises.map((pe) => ({
        exerciseId: pe.exerciseId,
        sets: Array.from({ length: pe.defaultSets }, () => ({
          id: uid(), weight: pe.defaultWeight, reps: pe.defaultReps, completed: false,
        })),
      })) : [],
    };
    setActiveSession(session);
    setScreen("workout");
  };

  const finishWorkout = () => {
    if (!activeSession) return;
    const duration = Math.floor((Date.now() - new Date(activeSession.date).getTime()) / 1000);
    const finished = { ...activeSession, duration };
    const newPrs = updatePRs(state, finished);
    const newState: AppState = {
      ...state,
      sessions: [finished, ...state.sessions],
      prs: newPrs,
    };
    save(newState);
    setActiveSession(null);
    setScreen("dashboard");
    showToast("Workout saved! 💪");
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof SetLog, value: string | boolean) => {
    if (!activeSession) return;
    const exercises = activeSession.exercises.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      const sets = ex.sets.map((s, si) => {
        if (si !== setIdx) return s;
        return { ...s, [field]: field === "completed" ? value : parseFloat(value as string) || 0 };
      });
      return { ...ex, sets };
    });
    setActiveSession({ ...activeSession, exercises });
  };

  const addSetToExercise = (exIdx: number) => {
    if (!activeSession) return;
    const exercises = activeSession.exercises.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { id: uid(), weight: last?.weight || 0, reps: last?.reps || 10, completed: false }] };
    });
    setActiveSession({ ...activeSession, exercises });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    if (!activeSession) return;
    const exercises = activeSession.exercises.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) };
    });
    setActiveSession({ ...activeSession, exercises });
  };

  const addExerciseToSession = (exId: string) => {
    if (!activeSession) return;
    const newEx: WorkoutExercise = {
      exerciseId: exId,
      sets: [{ id: uid(), weight: 0, reps: 10, completed: false }],
    };
    setActiveSession({ ...activeSession, exercises: [...activeSession.exercises, newEx] });
    setModal("none");
  };

  const removeExerciseFromSession = (exIdx: number) => {
    if (!activeSession) return;
    setActiveSession({ ...activeSession, exercises: activeSession.exercises.filter((_, i) => i !== exIdx) });
  };

  // Render
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative", background: "var(--bg)" }}>
      {toast && <Toast msg={toast} />}

      {screen === "workout" && activeSession ? (
        <WorkoutScreen
          session={activeSession}
          exercises={state.exercises}
          onUpdateSet={updateSet}
          onAddSet={addSetToExercise}
          onRemoveSet={removeSet}
          onAddExercise={() => setModal("addToPlan")}
          onRemoveExercise={removeExerciseFromSession}
          onFinish={finishWorkout}
          onDiscard={() => { setActiveSession(null); setScreen("dashboard"); }}
        />
      ) : (
        <>
          <div style={{ paddingBottom: 80 }}>
            {screen === "dashboard" && (
              <Dashboard state={state} onStart={startWorkout} onViewSession={(s) => { setViewSession(s); setModal("sessionDetail"); }} />
            )}
            {screen === "plans" && (
              <PlansScreen
                state={state}
                onNewPlan={() => { setEditingPlan(null); setModal("newPlan"); }}
                onEditPlan={(p) => { setEditingPlan(p); setModal("editPlan"); }}
                onStart={startWorkout}
                onDelete={(id) => save({ ...state, plans: state.plans.filter((p) => p.id !== id) })}
              />
            )}
            {screen === "exercises" && (
              <ExercisesScreen
                state={state}
                onNew={() => setModal("newExercise")}
                onDelete={(id) => save({ ...state, exercises: state.exercises.filter((e) => e.id !== id) })}
              />
            )}
            {screen === "history" && (
              <HistoryScreen
                state={state}
                onView={(s) => { setViewSession(s); setModal("sessionDetail"); }}
                onDelete={(id) => save({ ...state, sessions: state.sessions.filter((s) => s.id !== id) })}
              />
            )}
            {screen === "templates" && (
              <TemplatesScreen
                state={state}
                onStart={startWorkout}
                onAddToPlans={(plan) => {
                  const already = state.plans.some((p) => p.id === plan.id);
                  if (!already) save({ ...state, plans: [...state.plans, plan] });
                  showToast(already ? "Already in your plans!" : "Added to your plans!");
                }}
              />
            )}
          </div>
          <NavBar screen={screen} onNav={setScreen} />
        </>
      )}

      {/* Modals */}
      {modal === "newPlan" && (
        <NewPlanModal
          exercises={state.exercises}
          onSave={(plan) => { save({ ...state, plans: [...state.plans, plan] }); setModal("none"); showToast("Plan created!"); }}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "editPlan" && editingPlan && (
        <NewPlanModal
          exercises={state.exercises}
          existing={editingPlan}
          onSave={(plan) => { save({ ...state, plans: state.plans.map((p) => p.id === plan.id ? plan : p) }); setModal("none"); showToast("Plan updated!"); }}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "newExercise" && (
        <NewExerciseModal
          onSave={(ex) => { save({ ...state, exercises: [...state.exercises, ex] }); setModal("none"); showToast("Exercise added!"); }}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "addToPlan" && (
        <AddExerciseModal
          exercises={state.exercises}
          current={activeSession?.exercises.map((e) => e.exerciseId) || []}
          onAdd={addExerciseToSession}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "sessionDetail" && viewSession && (
        <SessionDetailModal session={viewSession} exercises={state.exercises} onClose={() => { setModal("none"); setViewSession(null); }} />
      )}
    </div>
  );
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      background: "var(--accent)", color: "#0a0a0a", padding: "10px 20px",
      borderRadius: 100, fontWeight: 600, fontSize: 14, zIndex: 9999,
      whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(200,245,66,0.4)",
    }}>{msg}</div>
  );
}

// ── NAV BAR ──────────────────────────────────────────────────────────────────
function NavBar({ screen, onNav }: { screen: Screen; onNav: (s: Screen) => void }) {
  const tabs: { id: Screen; label: string; icon: string }[] = [
    { id: "dashboard", label: "Home",      icon: "⬡" },
    { id: "templates", label: "Templates", icon: "★" },
    { id: "plans",     label: "Plans",     icon: "◈" },
    { id: "exercises", label: "Library",   icon: "◎" },
    { id: "history",   label: "Log",       icon: "◷" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)",
      borderTop: "0.5px solid var(--border)",
      display: "flex", zIndex: 100,
    }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onNav(t.id)} style={{
          flex: 1, padding: "12px 0 16px",
          background: "none", color: screen === t.id ? "var(--accent)" : "var(--text-dim)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          transition: "color 0.15s",
        }}>
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ state, onStart, onViewSession }: { state: AppState; onStart: (p?: Plan) => void; onViewSession: (s: WorkoutSession) => void }) {
  const recent = state.sessions.slice(0, 3);
  const totalSets = state.sessions.reduce((acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets.filter((st) => st.completed).length, 0), 0);
  const totalTime = state.sessions.reduce((acc, s) => acc + s.duration, 0);

  return (
    <div style={{ padding: "0 0 16px" }}>
      <div style={{ padding: "60px 20px 24px", background: "linear-gradient(180deg, #111 0%, var(--bg) 100%)" }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 24px", letterSpacing: "-0.5px" }}>
          Ready to train?
        </h1>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
          {[
            { label: "Workouts", value: state.sessions.length },
            { label: "Sets done", value: totalSets },
            { label: "Time", value: totalTime > 0 ? fmt(totalTime) : "–" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Start buttons */}
        <button onClick={() => onStart()} style={{
          width: "100%", padding: "16px", background: "var(--accent)",
          color: "#0a0a0a", borderRadius: 14, fontWeight: 700, fontSize: 16,
          letterSpacing: "0.02em", marginBottom: 8,
        }}>
          Start Empty Workout
        </button>

        {state.plans.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Or pick a plan
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {state.plans.map((plan) => (
                <button key={plan.id} onClick={() => onStart(plan)} style={{
                  flexShrink: 0, padding: "10px 16px",
                  background: "var(--surface)", border: "0.5px solid var(--border)",
                  borderRadius: 10, color: "var(--text)", fontSize: 13, fontWeight: 500,
                  whiteSpace: "nowrap",
                }}>
                  {plan.name}
                  <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: 12 }}>
                    {plan.exercises.length} ex
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PRs */}
      {state.prs.length > 0 && (
        <Section title="Personal Records">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {state.prs.slice(0, 4).map((pr) => {
              const ex = state.exercises.find((e) => e.id === pr.exerciseId);
              if (!ex) return null;
              return (
                <div key={pr.exerciseId} style={{ background: "var(--surface)", borderRadius: 12, padding: "12px" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{ex.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
                    {pr.weight}<span style={{ fontSize: 12, fontWeight: 400 }}> lbs</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>× {pr.reps} reps</div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <Section title="Recent Workouts">
          {recent.map((s) => (
            <SessionCard key={s.id} session={s} exercises={state.exercises} onView={() => onViewSession(s)} />
          ))}
        </Section>
      )}

      {state.sessions.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏋️</div>
          <div style={{ fontSize: 15 }}>No workouts yet. Hit Start to begin!</div>
        </div>
      )}
    </div>
  );
}

// ── PLANS SCREEN ─────────────────────────────────────────────────────────────
function PlansScreen({ state, onNewPlan, onEditPlan, onStart, onDelete }: {
  state: AppState; onNewPlan: () => void;
  onEditPlan: (p: Plan) => void; onStart: (p: Plan) => void; onDelete: (id: string) => void;
}) {
  return (
    <div style={{ padding: "60px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Plans</h1>
        <Btn onClick={onNewPlan}>+ New Plan</Btn>
      </div>
      {state.plans.length === 0 ? (
        <Empty icon="📋" text="No plans yet. Create one to organize your workouts." />
      ) : (
        state.plans.map((plan) => {
          const groups = [...new Set(plan.exercises.map((pe) => {
            const ex = state.exercises.find((e) => e.id === pe.exerciseId);
            return ex?.muscleGroup;
          }).filter(Boolean))];
          return (
            <div key={plan.id} style={{ background: "var(--surface)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{plan.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
                    {plan.exercises.length} exercises
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <SmBtn onClick={() => onEditPlan(plan)}>Edit</SmBtn>
                  <SmBtn onClick={() => onDelete(plan.id)} danger>Del</SmBtn>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {groups.map((g) => (
                  <span key={g} style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: 100,
                    background: `${MUSCLE_COLORS[g as MuscleGroup]}22`,
                    color: MUSCLE_COLORS[g as MuscleGroup], fontWeight: 500,
                    textTransform: "capitalize",
                  }}>{g}</span>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}>
                {plan.exercises.slice(0, 4).map((pe) => {
                  const ex = state.exercises.find((e) => e.id === pe.exerciseId);
                  if (!ex) return null;
                  return (
                    <div key={pe.exerciseId} style={{ fontSize: 13, color: "var(--text-muted)", padding: "2px 0" }}>
                      • {ex.name} — {pe.defaultSets}×{pe.defaultReps} @ {pe.defaultWeight} lbs
                    </div>
                  );
                })}
                {plan.exercises.length > 4 && (
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                    +{plan.exercises.length - 4} more
                  </div>
                )}
              </div>
              <button onClick={() => onStart(plan)} style={{
                width: "100%", padding: "10px", background: "var(--accent-dim)",
                border: "0.5px solid var(--accent)", borderRadius: 10,
                color: "var(--accent)", fontWeight: 600, fontSize: 14,
              }}>
                Start This Plan
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── EXERCISES SCREEN ──────────────────────────────────────────────────────────
function ExercisesScreen({ state, onNew, onDelete }: { state: AppState; onNew: () => void; onDelete: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const GROUPS: MuscleGroup[] = ["chest","back","shoulders","biceps","triceps","legs","glutes","core","cardio","full body"];

  const filtered = state.exercises.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup === "all" || ex.muscleGroup === filterGroup;
    return matchSearch && matchGroup;
  });

  return (
    <div style={{ padding: "60px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Library</h1>
        <Btn onClick={onNew}>+ Add</Btn>
      </div>

      <input
        placeholder="Search exercises…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={inputStyle}
      />

      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 0 12px", marginLeft: -20, paddingLeft: 20 }}>
        {["all", ...GROUPS].map((g) => (
          <button key={g} onClick={() => setFilterGroup(g)} style={{
            flexShrink: 0, padding: "6px 12px", borderRadius: 100, fontSize: 12,
            background: filterGroup === g ? "var(--accent)" : "var(--surface)",
            color: filterGroup === g ? "#0a0a0a" : "var(--text-muted)",
            fontWeight: filterGroup === g ? 600 : 400,
            border: "0.5px solid " + (filterGroup === g ? "var(--accent)" : "var(--border)"),
            textTransform: "capitalize",
          }}>{g}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty icon="🔍" text="No exercises match." />
      ) : (
        filtered.map((ex) => (
          <div key={ex.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 14px", background: "var(--surface)", borderRadius: 12, marginBottom: 8,
          }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{ex.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 100, textTransform: "capitalize",
                  background: `${MUSCLE_COLORS[ex.muscleGroup]}22`,
                  color: MUSCLE_COLORS[ex.muscleGroup],
                }}>{ex.muscleGroup}</span>
              </div>
            </div>
            <SmBtn onClick={() => onDelete(ex.id)} danger>✕</SmBtn>
          </div>
        ))
      )}
    </div>
  );
}

// ── HISTORY SCREEN ────────────────────────────────────────────────────────────
function HistoryScreen({ state, onView, onDelete }: { state: AppState; onView: (s: WorkoutSession) => void; onDelete: (id: string) => void }) {
  return (
    <div style={{ padding: "60px 20px 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Workout Log</h1>
      {state.sessions.length === 0 ? (
        <Empty icon="📝" text="No workouts logged yet." />
      ) : (
        state.sessions.map((s) => (
          <div key={s.id} style={{ marginBottom: 8 }}>
            <SessionCard session={s} exercises={state.exercises} onView={() => onView(s)} />
            <button onClick={() => onDelete(s.id)} style={{
              width: "100%", padding: "6px", background: "none",
              color: "var(--text-dim)", fontSize: 11, borderRadius: "0 0 8px 8px",
              borderTop: "none",
            }}>Delete</button>
          </div>
        ))
      )}
    </div>
  );
}

// ── SESSION CARD ─────────────────────────────────────────────────────────────
function SessionCard({ session, exercises, onView }: { session: WorkoutSession; exercises: Exercise[]; onView: () => void }) {
  const completedSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  const totalVolume = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).reduce((b, s) => b + s.weight * s.reps, 0), 0);
  return (
    <button onClick={onView} style={{
      width: "100%", background: "var(--surface)", borderRadius: 14, padding: 16,
      textAlign: "left", border: "0.5px solid var(--border)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{session.planName || "Free Workout"}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmt(session.duration)}</div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{fmtDate(session.date)}</div>
      <div style={{ display: "flex", gap: 12 }}>
        <Stat label="Exercises" value={session.exercises.length} />
        <Stat label="Sets" value={completedSets} />
        <Stat label="Volume" value={`${totalVolume.toLocaleString()} lbs`} />
      </div>
    </button>
  );
}

// ── WORKOUT SCREEN ────────────────────────────────────────────────────────────
function WorkoutScreen({ session, exercises, onUpdateSet, onAddSet, onRemoveSet, onAddExercise, onRemoveExercise, onFinish, onDiscard }: {
  session: WorkoutSession; exercises: Exercise[];
  onUpdateSet: (ei: number, si: number, f: keyof SetLog, v: string | boolean) => void;
  onAddSet: (ei: number) => void;
  onRemoveSet: (ei: number, si: number) => void;
  onAddExercise: () => void;
  onRemoveExercise: (ei: number) => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(new Date(session.date).getTime());

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  const completedSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)",
        borderBottom: "0.5px solid var(--border)", padding: "16px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{session.planName || "Workout"}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{fmt(elapsed)}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <SmBtn onClick={onDiscard}>Discard</SmBtn>
            <button onClick={onFinish} style={{
              padding: "8px 16px", background: "var(--accent)", color: "#0a0a0a",
              borderRadius: 8, fontWeight: 600, fontSize: 13,
            }}>Finish</button>
          </div>
        </div>
        {totalSets > 0 && (
          <div style={{ background: "var(--surface2)", borderRadius: 4, height: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: "var(--accent)",
              width: `${(completedSets / totalSets) * 100}%`, transition: "width 0.3s",
            }} />
          </div>
        )}
      </div>

      {/* Exercises */}
      <div style={{ padding: "12px 16px" }}>
        {session.exercises.length === 0 && (
          <Empty icon="➕" text="No exercises yet. Add some below." />
        )}
        {session.exercises.map((we, ei) => {
          const ex = exercises.find((e) => e.id === we.exerciseId);
          if (!ex) return null;
          return (
            <div key={we.exerciseId + ei} style={{ background: "var(--surface)", borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{ex.name}</div>
                  <span style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 100, textTransform: "capitalize",
                    background: `${MUSCLE_COLORS[ex.muscleGroup]}22`,
                    color: MUSCLE_COLORS[ex.muscleGroup],
                  }}>{ex.muscleGroup}</span>
                </div>
                <SmBtn onClick={() => onRemoveExercise(ei)} danger>✕</SmBtn>
              </div>

              {/* Set headers */}
              <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 32px", gap: 6, marginBottom: 6 }}>
                {["Set", "Weight (lbs)", "Reps", ""].map((h) => (
                  <div key={h} style={{ fontSize: 10, color: "var(--text-dim)", textAlign: h === "Set" ? "center" : "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
                ))}
              </div>

              {we.sets.map((s, si) => (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <button onClick={() => onUpdateSet(ei, si, "completed", !s.completed)} style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: s.completed ? "var(--accent)" : "var(--surface2)",
                    border: `1.5px solid ${s.completed ? "var(--accent)" : "var(--border)"}`,
                    color: s.completed ? "#0a0a0a" : "var(--text-dim)",
                    fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{si + 1}</button>
                  <input
                    type="number" inputMode="decimal" value={s.weight || ""}
                    onChange={(e) => onUpdateSet(ei, si, "weight", e.target.value)}
                    placeholder="0"
                    style={{ ...setInputStyle, background: s.completed ? "#1a2200" : "var(--surface2)" }}
                  />
                  <input
                    type="number" inputMode="numeric" value={s.reps || ""}
                    onChange={(e) => onUpdateSet(ei, si, "reps", e.target.value)}
                    placeholder="0"
                    style={{ ...setInputStyle, background: s.completed ? "#1a2200" : "var(--surface2)" }}
                  />
                  <button onClick={() => onRemoveSet(ei, si)} style={{
                    width: 28, height: 28, borderRadius: 6, background: "none",
                    color: "var(--text-dim)", fontSize: 16,
                  }}>×</button>
                </div>
              ))}

              <button onClick={() => onAddSet(ei)} style={{
                width: "100%", padding: "8px", background: "none",
                border: "0.5px dashed var(--border)", borderRadius: 8,
                color: "var(--text-muted)", fontSize: 13, marginTop: 6,
              }}>+ Add Set</button>
            </div>
          );
        })}

        <button onClick={onAddExercise} style={{
          width: "100%", padding: "14px", background: "var(--surface)",
          border: "0.5px dashed var(--border)", borderRadius: 16,
          color: "var(--text-muted)", fontWeight: 500, fontSize: 14,
        }}>+ Add Exercise</button>
      </div>
    </div>
  );
}

// ── NEW PLAN MODAL ────────────────────────────────────────────────────────────
function NewPlanModal({ exercises, existing, onSave, onClose }: {
  exercises: Exercise[]; existing?: Plan;
  onSave: (p: Plan) => void; onClose: () => void;
}) {
  const [name, setName] = useState(existing?.name || "");
  const [selected, setSelected] = useState<PlanExercise[]>(existing?.exercises || []);
  const [search, setSearch] = useState("");

  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));
  const isSelected = (id: string) => selected.some((s) => s.exerciseId === id);

  const toggle = (ex: Exercise) => {
    if (isSelected(ex.id)) {
      setSelected(selected.filter((s) => s.exerciseId !== ex.id));
    } else {
      setSelected([...selected, { exerciseId: ex.id, defaultSets: 3, defaultReps: 10, defaultWeight: 0 }]);
    }
  };

  const updatePE = (exId: string, field: keyof PlanExercise, val: number) => {
    setSelected(selected.map((s) => s.exerciseId === exId ? { ...s, [field]: val } : s));
  };

  const handleSave = () => {
    if (!name.trim() || selected.length === 0) return;
    onSave({ id: existing?.id || uid(), name: name.trim(), exercises: selected, createdAt: existing?.createdAt || new Date().toISOString() });
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader title={existing ? "Edit Plan" : "New Plan"} onClose={onClose} />
      <div style={{ padding: "0 20px 20px", overflowY: "auto", flex: 1 }}>
        <input placeholder="Plan name…" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />

        {selected.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Selected ({selected.length})
            </div>
            {selected.map((pe) => {
              const ex = exercises.find((e) => e.id === pe.exerciseId)!;
              return (
                <div key={pe.exerciseId} style={{ background: "var(--surface2)", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{ex.name}</span>
                    <SmBtn onClick={() => toggle(ex)} danger>✕</SmBtn>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Sets", field: "defaultSets" as const, val: pe.defaultSets },
                      { label: "Reps", field: "defaultReps" as const, val: pe.defaultReps },
                      { label: "Weight", field: "defaultWeight" as const, val: pe.defaultWeight },
                    ].map(({ label, field, val }) => (
                      <div key={field}>
                        <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 3, textTransform: "uppercase" }}>{label}</div>
                        <input
                          type="number" inputMode="numeric" value={val}
                          onChange={(e) => updatePE(pe.exerciseId, field, parseInt(e.target.value) || 0)}
                          style={setInputStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <input placeholder="Search exercises…" value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} />
        <div style={{ marginTop: 8 }}>
          {filtered.map((ex) => (
            <button key={ex.id} onClick={() => toggle(ex)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", background: isSelected(ex.id) ? "var(--accent-dim)" : "var(--surface)",
              border: `0.5px solid ${isSelected(ex.id) ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 10, marginBottom: 6, color: "var(--text)", textAlign: "left",
            }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{ex.name}</span>
              <span style={{ fontSize: 12, color: isSelected(ex.id) ? "var(--accent)" : "var(--text-muted)", textTransform: "capitalize" }}>
                {isSelected(ex.id) ? "✓" : ex.muscleGroup}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 20px 24px", borderTop: "0.5px solid var(--border)" }}>
        <button onClick={handleSave} disabled={!name.trim() || selected.length === 0} style={{
          width: "100%", padding: 14, background: name.trim() && selected.length > 0 ? "var(--accent)" : "var(--surface2)",
          color: name.trim() && selected.length > 0 ? "#0a0a0a" : "var(--text-dim)",
          borderRadius: 12, fontWeight: 700, fontSize: 15,
        }}>
          {existing ? "Save Changes" : "Create Plan"}
        </button>
      </div>
    </ModalWrapper>
  );
}

// ── NEW EXERCISE MODAL ────────────────────────────────────────────────────────
function NewExerciseModal({ onSave, onClose }: { onSave: (e: Exercise) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState<MuscleGroup>("chest");
  const GROUPS: MuscleGroup[] = ["chest","back","shoulders","biceps","triceps","legs","glutes","core","cardio","full body"];

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: uid(), name: name.trim(), muscleGroup: group });
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader title="New Exercise" onClose={onClose} />
      <div style={{ padding: "16px 20px" }}>
        <input
          placeholder="Exercise name…" value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...inputStyle, marginBottom: 16 }}
          autoFocus
        />
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Muscle Group</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GROUPS.map((g) => (
              <button key={g} onClick={() => setGroup(g)} style={{
                padding: "6px 12px", borderRadius: 100, fontSize: 12,
                background: group === g ? `${MUSCLE_COLORS[g]}33` : "var(--surface2)",
                border: `0.5px solid ${group === g ? MUSCLE_COLORS[g] : "var(--border)"}`,
                color: group === g ? MUSCLE_COLORS[g] : "var(--text-muted)",
                fontWeight: group === g ? 600 : 400,
                textTransform: "capitalize",
              }}>{g}</button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={!name.trim()} style={{
          width: "100%", padding: 14,
          background: name.trim() ? "var(--accent)" : "var(--surface2)",
          color: name.trim() ? "#0a0a0a" : "var(--text-dim)",
          borderRadius: 12, fontWeight: 700, fontSize: 15,
        }}>Add Exercise</button>
      </div>
    </ModalWrapper>
  );
}

// ── ADD EXERCISE TO SESSION ───────────────────────────────────────────────────
function AddExerciseModal({ exercises, current, onAdd, onClose }: {
  exercises: Exercise[]; current: string[];
  onAdd: (id: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader title="Add Exercise" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", overflowY: "auto", flex: 1 }}>
        <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} autoFocus />
        {filtered.map((ex) => {
          const already = current.includes(ex.id);
          return (
            <button key={ex.id} onClick={() => !already && onAdd(ex.id)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px", background: already ? "var(--surface2)" : "var(--surface)",
              border: "0.5px solid var(--border)", borderRadius: 10, marginBottom: 6,
              color: already ? "var(--text-dim)" : "var(--text)", textAlign: "left",
              opacity: already ? 0.5 : 1,
            }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{ex.name}</span>
              <span style={{ fontSize: 12, color: already ? "var(--text-dim)" : "var(--text-muted)", textTransform: "capitalize" }}>
                {already ? "added" : ex.muscleGroup}
              </span>
            </button>
          );
        })}
      </div>
    </ModalWrapper>
  );
}

// ── SESSION DETAIL ────────────────────────────────────────────────────────────
function SessionDetailModal({ session, exercises, onClose }: { session: WorkoutSession; exercises: Exercise[]; onClose: () => void }) {
  const totalVolume = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).reduce((b, s) => b + s.weight * s.reps, 0), 0);
  const completedSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader title={session.planName || "Free Workout"} onClose={onClose} />
      <div style={{ padding: "0 20px 20px", overflowY: "auto", flex: 1 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>{fmtDate(session.date)} · {fmt(session.duration)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          <StatCard label="Exercises" value={session.exercises.length} />
          <StatCard label="Sets" value={completedSets} />
          <StatCard label="Volume" value={`${totalVolume.toLocaleString()} lbs`} />
        </div>
        {session.exercises.map((we, i) => {
          const ex = exercises.find((e) => e.id === we.exerciseId);
          if (!ex) return null;
          const completed = we.sets.filter((s) => s.completed);
          return (
            <div key={i} style={{ background: "var(--surface)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{ex.name}</div>
              {completed.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No completed sets</div>
              ) : (
                completed.map((s, si) => (
                  <div key={si} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", padding: "3px 0" }}>
                    <span>Set {si + 1}</span>
                    <span>{s.weight} lbs × {s.reps} reps</span>
                    <span style={{ color: "var(--accent)" }}>{(s.weight * s.reps).toLocaleString()} lbs total</span>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </ModalWrapper>
  );
}

// ── TEMPLATES SCREEN ─────────────────────────────────────────────────────────
function TemplatesScreen({ state, onStart, onAddToPlans }: {
  state: AppState;
  onStart: (p: Plan) => void;
  onAddToPlans: (p: Plan) => void;
}) {
  // Build a full Plan with exercise names resolved from the template + state's exercise list
  const resolvedPlans = TEMPLATE_PLANS.map((tpl) => {
    // Merge template exercises with any custom exercises in state
    const allExercises = state.exercises;
    const validExercises = tpl.exercises.filter((pe) =>
      allExercises.some((e) => e.id === pe.exerciseId)
    );
    return { ...tpl, exercises: validExercises };
  });

  const ICONS: Record<string, string> = {
    tpl_push: "🫸", tpl_pull: "🫷", tpl_legs: "🦵",
    tpl_cardio: "🏃", tpl_hiit: "⚡", tpl_upper: "💪", tpl_full: "🔥",
  };

  return (
    <div style={{ padding: "60px 20px 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Templates</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24, margin: "0 0 24px" }}>
        Pre-built plans ready to go. Start one directly or save it to your plans.
      </p>

      {resolvedPlans.map((plan) => {
        const info = TEMPLATE_INFO[plan.id];
        const inMyPlans = state.plans.some((p) => p.id === plan.id);

        return (
          <div key={plan.id} style={{
            background: "var(--surface)", borderRadius: 18, padding: 18,
            marginBottom: 14, border: "0.5px solid var(--border)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "var(--surface2)", fontSize: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {ICONS[plan.id] || "🏋️"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 1 }}>{info?.desc}</div>
                </div>
              </div>
            </div>

            {/* Muscle tags */}
            {info?.tags && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {info.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: 11, padding: "3px 9px", borderRadius: 100, textTransform: "capitalize",
                    background: `${MUSCLE_COLORS[tag as MuscleGroup] ?? "#888"}22`,
                    color: MUSCLE_COLORS[tag as MuscleGroup] ?? "#888",
                    fontWeight: 500, border: `0.5px solid ${MUSCLE_COLORS[tag as MuscleGroup] ?? "#888"}44`,
                  }}>{tag}</span>
                ))}
              </div>
            )}

            {/* Exercise list */}
            <div style={{ marginBottom: 16 }}>
              {plan.exercises.map((pe, i) => {
                const ex = state.exercises.find((e) => e.id === pe.exerciseId);
                if (!ex) return null;
                return (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 13, color: "var(--text-muted)", padding: "5px 0",
                    borderBottom: i < plan.exercises.length - 1 ? "0.5px solid var(--border)" : "none",
                  }}>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{ex.name}</span>
                    <span>{pe.defaultSets} × {pe.defaultReps}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => onAddToPlans(plan)} style={{
                padding: "10px", borderRadius: 10, fontWeight: 600, fontSize: 13,
                background: inMyPlans ? "var(--surface2)" : "var(--accent-dim)",
                border: `0.5px solid ${inMyPlans ? "var(--border)" : "var(--accent)"}`,
                color: inMyPlans ? "var(--text-dim)" : "var(--accent)",
              }}>
                {inMyPlans ? "✓ Saved" : "+ Save Plan"}
              </button>
              <button onClick={() => onStart(plan)} style={{
                padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 13,
                background: "var(--accent)", color: "#0a0a0a",
              }}>
                Start Now
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "0 20px", marginBottom: 24 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</div>
      {children}
    </div>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 14px", background: "var(--accent-dim)",
      border: "0.5px solid var(--accent)", borderRadius: 8,
      color: "var(--accent)", fontWeight: 600, fontSize: 13,
    }}>{children}</button>
  );
}

function SmBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 10px", background: danger ? "rgba(255,77,77,0.1)" : "var(--surface2)",
      border: `0.5px solid ${danger ? "rgba(255,77,77,0.3)" : "var(--border)"}`,
      borderRadius: 6, color: danger ? "var(--danger)" : "var(--text-muted)",
      fontSize: 12, fontWeight: 500,
    }}>{children}</button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--surface)", borderRadius: "20px 20px 0 0",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "20px 20px 16px", borderBottom: "0.5px solid var(--border)",
      position: "sticky", top: 0, background: "var(--surface)", zIndex: 10,
    }}>
      <div style={{ width: 32 }} />
      <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
      <button onClick={onClose} style={{
        width: 32, height: 32, borderRadius: 100,
        background: "var(--surface2)", color: "var(--text-muted)",
        fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
      }}>×</button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", background: "var(--surface2)",
  border: "0.5px solid var(--border)", borderRadius: 10,
  color: "var(--text)", fontSize: 15,
};

const setInputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", background: "var(--surface2)",
  border: "0.5px solid var(--border)", borderRadius: 8,
  color: "var(--text)", fontSize: 14, textAlign: "center",
};
