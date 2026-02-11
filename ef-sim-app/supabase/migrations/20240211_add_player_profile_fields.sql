-- Add new profile columns to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS height integer,
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS dominant_foot text,
ADD COLUMN IF NOT EXISTS playstyle text,
ADD COLUMN IF NOT EXISTS weak_foot_usage text,
ADD COLUMN IF NOT EXISTS weak_foot_accuracy text,
ADD COLUMN IF NOT EXISTS form text,
ADD COLUMN IF NOT EXISTS injury_resistance text,
ADD COLUMN IF NOT EXISTS positions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_booster jsonb DEFAULT '[]'::jsonb;

-- Comment on columns for clarity (Optional but good practice)
COMMENT ON COLUMN players.positions IS 'Array of position compatibilities';
COMMENT ON COLUMN players.skills IS 'Array of player skills';
COMMENT ON COLUMN players.custom_booster IS 'Array of custom booster effects';
