-- Position 7311 vs 7301 Ratio Analysis by Centre
-- Compares the ratio of position 7311 to total (7311 + 7301) per centre

SELECT 
    centre,
    pos_7311_count,
    pos_7301_count,
    total_count,
    ROUND(pos_7311_revenue, 2) as pos_7311_revenue,
    ROUND(pos_7301_revenue, 2) as pos_7301_revenue,
    ROUND(total_revenue, 2) as total_revenue,
    ROUND(pos_7311_count * 100.0 / NULLIF(total_count, 0), 2) as pct_7311_by_count,
    ROUND(pos_7311_revenue * 100.0 / NULLIF(total_revenue, 0), 2) as pct_7311_by_revenue
FROM (
    SELECT 
        i.centre,
        COUNT(*) FILTER (WHERE s.position_number = '7311') as pos_7311_count,
        COUNT(*) FILTER (WHERE s.position_number = '7301') as pos_7301_count,
        COUNT(*) FILTER (WHERE s.position_number IN ('7311', '7301')) as total_count,
        SUM(s.amount) FILTER (WHERE s.position_number = '7311') as pos_7311_revenue,
        SUM(s.amount) FILTER (WHERE s.position_number = '7301') as pos_7301_revenue,
        SUM(s.amount) FILTER (WHERE s.position_number IN ('7311', '7301')) as total_revenue,
        0 as sort_order
    FROM services s
    JOIN invoices i ON s.invoice_id = i.id
    WHERE s.position_number IN ('7311', '7301')
        AND s.amount IS NOT NULL
        AND i.centre IS NOT NULL
    GROUP BY i.centre

    UNION ALL

    SELECT 
        'TOTAL' as centre,
        COUNT(*) FILTER (WHERE s.position_number = '7311') as pos_7311_count,
        COUNT(*) FILTER (WHERE s.position_number = '7301') as pos_7301_count,
        COUNT(*) FILTER (WHERE s.position_number IN ('7311', '7301')) as total_count,
        SUM(s.amount) FILTER (WHERE s.position_number = '7311') as pos_7311_revenue,
        SUM(s.amount) FILTER (WHERE s.position_number = '7301') as pos_7301_revenue,
        SUM(s.amount) FILTER (WHERE s.position_number IN ('7311', '7301')) as total_revenue,
        1 as sort_order
    FROM services s
    JOIN invoices i ON s.invoice_id = i.id
    WHERE s.position_number IN ('7311', '7301')
        AND s.amount IS NOT NULL
) subquery
ORDER BY sort_order, centre;
