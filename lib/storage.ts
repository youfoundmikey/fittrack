import { AppState, Exercise, Plan, WorkoutSession, PersonalRecord } from "./types";

const KEY = "fittrack_v1";

const DEFAULT_EXERCISES: Exercise[] = [
  { id: "ex1", name: "Bench Press", muscleGroup: "chest" },
  { id: "ex2", name: "Incline Dumbbell Press", muscleGroup: "chest" },
  { id: "ex3", name: "Squat", muscleGroup: "legs" },
  { id: "ex4", name: "Deadlift", muscleGroup: "back" },
  { id: "ex5", name: "Pull-Up", muscleGroup: "back" },
  { id: "ex6", name: "Barbell Row", muscleGroup: "back" },
  { id: "ex7", name: "Overhead Press", muscleGroup: "shoulders" },
  { id: "ex8", name: "Lateral Raise", muscleGroup: "shoulders" },
  { id: "ex9", name: "Barbell Curl", muscleGroup: "biceps" },
  { id: "ex10", name: "Tricep Pushdown", muscleGroup: "triceps" },
  { id: "ex11", name: "Leg Press", muscleGroup: "legs" },
  { id: "ex12", name: "Romanian Deadlift", muscleGroup: "glutes" },
  { id: "ex13", name: "Plank", muscleGroup: "core" },
  { id: "ex14", name: "Cable Fly", muscleGroup: "chest" },
  { id: "ex15", name: "Face Pull", muscleGroup: "shoulders" },
  { id: "ex16", name: "Leg Curl", muscleGroup: "legs" },
  { id: "ex17", name: "Leg Extension", muscleGroup: "legs" },
  { id: "ex18", name: "Dumbbell Row", muscleGroup: "back" },
  { id: "ex19", name: "Dips", muscleGroup: "triceps" },
  { id: "ex20", name: "Running", muscleGroup: "cardio" },
];

const DEFAULT_STATE: AppState = {
  exercises: DEFAULT_EXERCISES,
  plans: [],
  sessions: [],
  prs: [],
};

export function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as AppState;
    // merge new default exercises
    const existingIds = new Set(parsed.exercises.map((e) => e.id));
    const missing = DEFAULT_EXERCISES.filter((e) => !existingIds.has(e.id));
    return { ...DEFAULT_STATE, ...parsed, exercises: [...parsed.exercises, ...missing] };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function updatePRs(state: AppState, session: WorkoutSession): PersonalRecord[] {
  const prs = [...state.prs];
  for (const we of session.exercises) {
    for (const set of we.sets) {
      if (!set.completed || set.weight <= 0) continue;
      const idx = prs.findIndex((p) => p.exerciseId === we.exerciseId);
      const score = set.weight * set.reps;
      const existing = idx >= 0 ? prs[idx] : null;
      const existingScore = existing ? existing.weight * existing.reps : 0;
      if (score > existingScore) {
        const newPr: PersonalRecord = {
          exerciseId: we.exerciseId,
          weight: set.weight,
          reps: set.reps,
          date: session.date,
        };
        if (idx >= 0) prs[idx] = newPr;
        else prs.push(newPr);
      }
    }
  }
  return prs;
}
