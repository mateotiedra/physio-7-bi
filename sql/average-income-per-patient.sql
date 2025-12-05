-- Average Income per Patient by Centre
-- Calculates total revenue divided by number of unique patients per centre

SELECT 
    centre,
    unique_patients,
    total_invoices,
    ROUND(total_revenue, 2) as total_revenue,
    ROUND(avg_revenue_per_patient, 2) as avg_revenue_per_patient,
    ROUND(avg_invoice_amount, 2) as avg_invoice_amount
FROM (
    SELECT 
        i.centre,
        COUNT(DISTINCT i.patient_id) as unique_patients,
        COUNT(*) as total_invoices,
        SUM(i.total_amount) as total_revenue,
        SUM(i.total_amount) / COUNT(DISTINCT i.patient_id) as avg_revenue_per_patient,
        AVG(i.total_amount) as avg_invoice_amount,
        0 as sort_order
    FROM invoices i
    WHERE i.total_amount IS NOT NULL
        AND i.centre IS NOT NULL
    GROUP BY i.centre

    UNION ALL

    SELECT 
        'TOTAL' as centre,
        COUNT(DISTINCT patient_id) as unique_patients,
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_revenue,
        SUM(total_amount) / COUNT(DISTINCT patient_id) as avg_revenue_per_patient,
        AVG(total_amount) as avg_invoice_amount,
        1 as sort_order
    FROM invoices
    WHERE total_amount IS NOT NULL
) subquery
ORDER BY sort_order, centre;
