-- Remove duplicate patients keeping only the oldest one (by created_at)
DELETE FROM patients a
USING patients b
WHERE a.id > b.id
  AND a.nom = b.nom
  AND a.prenom = b.prenom
  AND a.ddn = b.ddn
  AND a.no_avs = b.no_avs;

-- Add unique constraint on patients table for (nom, prenom, ddn, no_avs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_unique_identity
    ON patients(nom, prenom, ddn, no_avs);
