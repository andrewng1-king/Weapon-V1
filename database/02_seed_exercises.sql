-- =====================================================================
-- WEAPON V1 — SEED PRESET EXERCISES
-- File 02 of 04. Run AFTER 00_schema.sql.
-- Source: PRESETS object in app.js. owner_id NULL, is_preset = true.
-- Idempotent: ON CONFLICT does nothing.
-- 30 presets total (Chest 4, Back 5, Shoulders 5, Arms 5, Legs 7, Core 4).
-- =====================================================================

insert into public.exercises (owner_id, name, muscle_group, description, default_kg, is_preset) values
  -- Chest
  (null, 'Bench Press',        'Chest',     'Mid chest · front delts · triceps', 40,   true),
  (null, 'Incline Press',      'Chest',     'Upper chest · front delts',         30,   true),
  (null, 'Dip',                'Chest',     'Lower chest · triceps',             0,    true),
  (null, 'Cable Fly',          'Chest',     'Inner & mid chest',                 12.5, true),
  -- Back
  (null, 'Pull-up',            'Back',      'Lats · upper back',                 0,    true),
  (null, 'Lat Pulldown',       'Back',      'Lats — back width',                 40,   true),
  (null, 'Barbell Row',        'Back',      'Mid back · lats — thickness',       40,   true),
  (null, 'Seated Cable Row',   'Back',      'Mid back · rhomboids',              40,   true),
  (null, 'Deadlift',           'Back',      'Lower back · glutes · hamstrings',  60,   true),
  -- Shoulders
  (null, 'Overhead Press',     'Shoulders', 'Front & side delts · triceps',      30,   true),
  (null, 'Lateral Raise',      'Shoulders', 'Side delts — width',                8,    true),
  (null, 'Rear Delt Fly',      'Shoulders', 'Rear delts · upper back',           8,    true),
  (null, 'Face Pull',          'Shoulders', 'Rear delts · traps — posture',      15,   true),
  (null, 'Shrug',              'Shoulders', 'Upper traps',                       40,   true),
  -- Arms
  (null, 'Barbell Curl',       'Arms',      'Biceps — overall mass',             20,   true),
  (null, 'Hammer Curl',        'Arms',      'Biceps · brachialis',               10,   true),
  (null, 'Preacher Curl',      'Arms',      'Biceps — strict isolation',         15,   true),
  (null, 'Tricep Pushdown',    'Arms',      'Triceps — lateral head',            20,   true),
  (null, 'Skull Crusher',      'Arms',      'Triceps — long head',               20,   true),
  -- Legs
  (null, 'Squat',              'Legs',      'Quads · glutes',                    50,   true),
  (null, 'Leg Press',          'Legs',      'Quads · glutes',                    80,   true),
  (null, 'Leg Extension',      'Legs',      'Quads — isolation',                 30,   true),
  (null, 'Romanian Deadlift',  'Legs',      'Hamstrings · glutes',               50,   true),
  (null, 'Leg Curl',           'Legs',      'Hamstrings — isolation',            30,   true),
  (null, 'Hip Thrust',         'Legs',      'Glutes',                            60,   true),
  (null, 'Calf Raise',         'Legs',      'Calves',                            40,   true),
  -- Core
  (null, 'Cable Crunch',       'Core',      'Abs — weighted',                    25,   true),
  (null, 'Hanging Leg Raise',  'Core',      'Lower abs · hip flexors',           0,    true),
  (null, 'Russian Twist',      'Core',      'Obliques — rotation',               5,    true),
  (null, 'Plank',              'Core',      'Whole core — reps = seconds',       0,    true)
on conflict do nothing;
