export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps"
  | "legs" | "glutes" | "core" | "cardio" | "full body";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  notes?: string;
}

export interface SetLog {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

export interface Plan {
  id: string;
  name: string;
  exercises: PlanExercise[];
  createdAt: string;
}

export interface PlanExercise {
  exerciseId: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number;
}

export interface WorkoutSession {
  id: string;
  planId?: string;
  planName?: string;
  date: string;
  duration: number; // seconds
  exercises: WorkoutExercise[];
  notes?: string;
}

export interface PersonalRecord {
  exerciseId: string;
  weight: number;
  reps: number;
  date: string;
}

export interface AppState {
  exercises: Exercise[];
  plans: Plan[];
  sessions: WorkoutSession[];
  prs: PersonalRecord[];
}
