-- Update appointments with NULL centre to 'Préverenges'
UPDATE appointments
SET centre = 'Préverenges'
WHERE centre IS NULL;
