ALTER TABLE bridges ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE bridges
SET search_vector = to_tsvector('english',
  coalesce(location, '') || ' ' ||
  coalesce(facility_carried, '') || ' ' ||
  coalesce(features_desc, '')
);

CREATE INDEX IF NOT EXISTS bridges_search_vector_idx ON bridges USING GIN (search_vector);

CREATE OR REPLACE FUNCTION bridges_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.location, '') || ' ' ||
    coalesce(NEW.facility_carried, '') || ' ' ||
    coalesce(NEW.features_desc, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bridges_search_vector_trigger ON bridges;
CREATE TRIGGER bridges_search_vector_trigger
  BEFORE INSERT OR UPDATE ON bridges
  FOR EACH ROW EXECUTE FUNCTION bridges_search_vector_update();
