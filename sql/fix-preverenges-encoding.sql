-- Fix corrupted encoding for 'Préverenges' in appointments table
UPDATE appointments
SET centre = 'Préverenges'
WHERE centre = 'Pr├⌐verenges' OR centre LIKE 'Pr%verenges';
