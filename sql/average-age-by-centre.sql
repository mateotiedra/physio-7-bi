-- Average Patient Age by Centre
-- Calculates average, median, and age range of patients who have had appointments at each centre

SELECT 
    centre,
    patient_count,
    ROUND(avg_age, 1) as avg_age,
    ROUND(CAST(median_age AS NUMERIC), 1) as median_age,
    ROUND(min_age, 1) as min_age,
    ROUND(max_age, 1) as max_age
FROM (
    SELECT 
        a.centre,
        COUNT(DISTINCT a.patient_id) as patient_count,
        AVG(
            EXTRACT(YEAR FROM AGE(
                CURRENT_DATE,
                TO_DATE(p.ddn, 'DD.MM.YYYY')
            ))
        ) as avg_age,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 
            EXTRACT(YEAR FROM AGE(
                CURRENT_DATE,
                TO_DATE(p.ddn, 'DD.MM.YYYY')
            ))
        ) as median_age,
        MIN(
            EXTRACT(YEAR FROM AGE(
                CURRENT_DATE,
                TO_DATE(p.ddn, 'DD.MM.YYYY')
            ))
        ) as min_age,
        MAX(
            EXTRACT(YEAR FROM AGE(
                CURRENT_DATE,
                TO_DATE(p.ddn, 'DD.MM.YYYY')
            ))
        ) as max_age,
        0 as sort_order
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.centre IS NOT NULL 
        AND p.ddn IS NOT NULL
        AND p.ddn ~ '^\d{2}\.\d{2}\.\d{4}$'
    GROUP BY a.centre

    UNION ALL

    SELECT 
        'TOTAL' as centre,
        COUNT(DISTINCT a.patient_id) as patient_count,
        AVG(
            EXTRACT(YEAR FROM AGE(
                CURRENT_DATE,
                TO_DATE(p.ddn, 'DD.MM.YYYY')
            ))
        ) as avg_age,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 
            EXTRACT(YEAR FROM AGE(
                CURRENT_DATE,
                TO_DATE(p.ddn, 'DD.MM.YYYY')
            ))
        ) as median_age,
        MIN(
            EXTRACT(YEAR FROM AGE(
                CURRENT_DATE,
                TO_DATE(p.ddn, 'DD.MM.YYYY')
            ))
        ) as min_age,
        MAX(
            EXTRACT(YEAR FROM AGE(
                CURRENT_DATE,
                TO_DATE(p.ddn, 'DD.MM.YYYY')
            ))
        ) as max_age,
        1 as sort_order
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE p.ddn IS NOT NULL
        AND p.ddn ~ '^\d{2}\.\d{2}\.\d{4}$'
) subquery
ORDER BY sort_order, centre;
