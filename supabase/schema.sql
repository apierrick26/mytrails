-- MyTrails — Schéma Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- ============================================================
-- 1. Table principale des activités
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title         text NOT NULL,
  activity_type text NOT NULL,
  date          date NOT NULL,
  country       text,
  region        text,
  description   text,
  weather       text,
  temperature   int,
  rating        int CHECK (rating BETWEEN 1 AND 5),
  tags          text[],
  gpx_file_url  text,
  geometry      jsonb,   -- GeoJSON Point ou LineString
  stats         jsonb,   -- {distance_m, elevation_gain, ...}
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own activities"
  ON activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own activities"
  ON activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own activities"
  ON activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own activities"
  ON activities FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. Photos liées aux activités
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  url         text NOT NULL,
  caption     text,
  taken_at    timestamptz,
  position    int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own photos"
  ON photos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own photos"
  ON photos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own photos"
  ON photos FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. Types d'activités personnalisables
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_types (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name    text NOT NULL,
  color   text NOT NULL,
  icon    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own types"
  ON activity_types FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own types"
  ON activity_types FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own types"
  ON activity_types FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own types"
  ON activity_types FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. Trigger updated_at sur activities
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
