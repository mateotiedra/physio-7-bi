-- Count of Patients with Appointments but No Invoices by Centre
-- Shows the number and percentage of patients per centre who have had appointments but never received an invoice

SELECT 
    centre,
    patients_with_no_invoice,
    total_patients_in_centre,
    ROUND(patients_with_no_invoice * 100.0 / NULLIF(total_patients_in_centre, 0), 2) as percentage_no_invoice
FROM (
    SELECT 
        a.centre,
        COUNT(DISTINCT CASE WHEN i.id IS NULL THEN a.patient_id END) as patients_with_no_invoice,
        COUNT(DISTINCT a.patient_id) as total_patients_in_centre,
        0 as sort_order
    FROM appointments a
    LEFT JOIN invoices i ON a.patient_id = i.patient_id
    WHERE a.centre IS NOT NULL
    GROUP BY a.centre

    UNION ALL

    SELECT 
        'TOTAL' as centre,
        COUNT(DISTINCT CASE WHEN i.id IS NULL THEN a.patient_id END) as patients_with_no_invoice,
        COUNT(DISTINCT a.patient_id) as total_patients_in_centre,
        1 as sort_order
    FROM appointments a
    LEFT JOIN invoices i ON a.patient_id = i.patient_id
) subquery
ORDER BY sort_order, centre;
