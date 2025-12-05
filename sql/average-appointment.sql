SELECT 
    centre,
    patient_count,
    total_appointments,
    ROUND(avg_appointments_per_patient, 2) as avg_appointments_per_patient
FROM (
    SELECT 
        a.centre,
        COUNT(DISTINCT a.patient_id) as patient_count,
        COUNT(*) as total_appointments,
        CAST(COUNT(*) AS DECIMAL) / COUNT(DISTINCT a.patient_id) as avg_appointments_per_patient,
        0 as sort_order
    FROM appointments a
    WHERE a.centre IS NOT NULL
    GROUP BY a.centre

    UNION ALL

    SELECT 
        'TOTAL' as centre,
        COUNT(DISTINCT patient_id) as patient_count,
        COUNT(*) as total_appointments,
        CAST(COUNT(*) AS DECIMAL) / COUNT(DISTINCT patient_id) as avg_appointments_per_patient,
        1 as sort_order
    FROM appointments
    WHERE centre IS NOT NULL
) subquery
ORDER BY sort_order, centre;