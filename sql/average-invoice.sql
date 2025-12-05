SELECT 
    centre,
    invoice_count,
    average_amount,
    total_revenue
FROM (
    SELECT 
        centre,
        COUNT(*) as invoice_count,
        ROUND(AVG(total_amount), 2) as average_amount,
        ROUND(SUM(total_amount), 2) as total_revenue,
        0 as sort_order
    FROM invoices
    WHERE total_amount IS NOT NULL
    GROUP BY centre

    UNION ALL

    SELECT 
        'TOTAL' as centre,
        COUNT(*) as invoice_count,
        ROUND(AVG(total_amount), 2) as average_amount,
        ROUND(SUM(total_amount), 2) as total_revenue,
        1 as sort_order
    FROM invoices
    WHERE total_amount IS NOT NULL
) subquery
ORDER BY sort_order, centre;