import { Plan } from "./types";

// Pre-built training plans with all exercises mapped to the default exercise IDs in storage.ts
// ex1=Bench Press, ex2=Incline DB Press, ex3=Squat, ex4=Deadlift, ex5=Pull-Up,
// ex6=Barbell Row, ex7=OHP, ex8=Lateral Raise, ex9=Barbell Curl, ex10=Tricep Pushdown,
// ex11=Leg Press, ex12=Romanian DL, ex13=Plank, ex14=Cable Fly, ex15=Face Pull,
// ex16=Leg Curl, ex17=Leg Extension, ex18=Dumbbell Row, ex19=Dips, ex20=Running

export const TEMPLATE_PLANS: Plan[] = [
  {
    id: "tpl_push",
    name: "Push",
    createdAt: "2026-01-01T00:00:00Z",
    exercises: [
      { exerciseId: "ex1",  defaultSets: 4, defaultReps: 8,  defaultWeight: 135 }, // Bench Press
      { exerciseId: "ex2",  defaultSets: 3, defaultReps: 10, defaultWeight: 60  }, // Incline DB Press
      { exerciseId: "ex7",  defaultSets: 3, defaultReps: 8,  defaultWeight: 95  }, // OHP
      { exerciseId: "ex8",  defaultSets: 3, defaultReps: 15, defaultWeight: 20  }, // Lateral Raise
      { exerciseId: "ex14", defaultSets: 3, defaultReps: 12, defaultWeight: 30  }, // Cable Fly
      { exerciseId: "ex10", defaultSets: 3, defaultReps: 12, defaultWeight: 50  }, // Tricep Pushdown
      { exerciseId: "ex19", defaultSets: 3, defaultReps: 10, defaultWeight: 0   }, // Dips
    ],
  },
  {
    id: "tpl_pull",
    name: "Pull",
    createdAt: "2026-01-01T00:00:00Z",
    exercises: [
      { exerciseId: "ex4",  defaultSets: 4, defaultReps: 5,  defaultWeight: 185 }, // Deadlift
      { exerciseId: "ex5",  defaultSets: 4, defaultReps: 8,  defaultWeight: 0   }, // Pull-Up
      { exerciseId: "ex6",  defaultSets: 4, defaultReps: 8,  defaultWeight: 115 }, // Barbell Row
      { exerciseId: "ex18", defaultSets: 3, defaultReps: 10, defaultWeight: 55  }, // Dumbbell Row
      { exerciseId: "ex9",  defaultSets: 3, defaultReps: 12, defaultWeight: 65  }, // Barbell Curl
      { exerciseId: "ex15", defaultSets: 3, defaultReps: 15, defaultWeight: 40  }, // Face Pull
    ],
  },
  {
    id: "tpl_legs",
    name: "Legs",
    createdAt: "2026-01-01T00:00:00Z",
    exercises: [
      { exerciseId: "ex3",  defaultSets: 4, defaultReps: 5,  defaultWeight: 185 }, // Squat
      { exerciseId: "ex11", defaultSets: 3, defaultReps: 10, defaultWeight: 270 }, // Leg Press
      { exerciseId: "ex12", defaultSets: 3, defaultReps: 10, defaultWeight: 115 }, // Romanian DL
      { exerciseId: "ex16", defaultSets: 3, defaultReps: 12, defaultWeight: 80  }, // Leg Curl
      { exerciseId: "ex17", defaultSets: 3, defaultReps: 15, defaultWeight: 90  }, // Leg Extension
      { exerciseId: "ex13", defaultSets: 3, defaultReps: 1,  defaultWeight: 0   }, // Plank (reps = hold time hint)
    ],
  },
  {
    id: "tpl_cardio",
    name: "Cardio",
    createdAt: "2026-01-01T00:00:00Z",
    exercises: [
      { exerciseId: "ex20", defaultSets: 1, defaultReps: 1,  defaultWeight: 0   }, // Running (tracked by duration)
    ],
  },
  {
    id: "tpl_hiit",
    name: "HIIT",
    createdAt: "2026-01-01T00:00:00Z",
    exercises: [
      // HIIT uses bodyweight + minimal equipment — weight=0 means bodyweight
      { exerciseId: "ex20", defaultSets: 8, defaultReps: 1,  defaultWeight: 0   }, // Sprint intervals
      { exerciseId: "ex13", defaultSets: 4, defaultReps: 1,  defaultWeight: 0   }, // Plank holds
      { exerciseId: "ex19", defaultSets: 3, defaultReps: 15, defaultWeight: 0   }, // Dips
    ],
  },
  {
    id: "tpl_upper",
    name: "Upper Body",
    createdAt: "2026-01-01T00:00:00Z",
    exercises: [
      { exerciseId: "ex1",  defaultSets: 4, defaultReps: 8,  defaultWeight: 135 }, // Bench Press
      { exerciseId: "ex5",  defaultSets: 4, defaultReps: 8,  defaultWeight: 0   }, // Pull-Up
      { exerciseId: "ex7",  defaultSets: 3, defaultReps: 10, defaultWeight: 95  }, // OHP
      { exerciseId: "ex6",  defaultSets: 3, defaultReps: 10, defaultWeight: 115 }, // Barbell Row
      { exerciseId: "ex9",  defaultSets: 3, defaultReps: 12, defaultWeight: 65  }, // Barbell Curl
      { exerciseId: "ex10", defaultSets: 3, defaultReps: 12, defaultWeight: 50  }, // Tricep Pushdown
      { exerciseId: "ex8",  defaultSets: 3, defaultReps: 15, defaultWeight: 20  }, // Lateral Raise
    ],
  },
  {
    id: "tpl_full",
    name: "Full Body",
    createdAt: "2026-01-01T00:00:00Z",
    exercises: [
      { exerciseId: "ex3",  defaultSets: 3, defaultReps: 5,  defaultWeight: 155 }, // Squat
      { exerciseId: "ex1",  defaultSets: 3, defaultReps: 8,  defaultWeight: 115 }, // Bench Press
      { exerciseId: "ex4",  defaultSets: 3, defaultReps: 5,  defaultWeight: 155 }, // Deadlift
      { exerciseId: "ex7",  defaultSets: 3, defaultReps: 8,  defaultWeight: 75  }, // OHP
      { exerciseId: "ex5",  defaultSets: 3, defaultReps: 8,  defaultWeight: 0   }, // Pull-Up
      { exerciseId: "ex13", defaultSets: 3, defaultReps: 1,  defaultWeight: 0   }, // Plank
    ],
  },
];

// Description copy shown in the templates tab
export const TEMPLATE_INFO: Record<string, { desc: string; tags: string[] }> = {
  tpl_push:  { desc: "Chest, shoulders, and triceps.",   tags: ["chest", "shoulders", "triceps"] },
  tpl_pull:  { desc: "Back and biceps.",                 tags: ["back", "biceps"] },
  tpl_legs:  { desc: "Quads, hamstrings, glutes, core.", tags: ["legs", "glutes", "core"] },
  tpl_cardio:{ desc: "Steady-state cardio session.",     tags: ["cardio"] },
  tpl_hiit:  { desc: "High-intensity intervals.",        tags: ["cardio", "full body"] },
  tpl_upper: { desc: "Push + pull combined upper day.",  tags: ["chest", "back", "shoulders"] },
  tpl_full:  { desc: "Compound lifts, whole body.",      tags: ["full body"] },
};
