-- Position 7311 vs 7301 Ratio Analysis by Centre and Year
-- Compares the ratio of position 7311 to total (7311 + 7301) per centre per year

SELECT 
    centre,
    year,
    ROUND(pos_7311_count * 100.0 / NULLIF(total_count, 0), 2) as pct_7311_by_count,
    ROUND(pos_7311_revenue * 100.0 / NULLIF(total_revenue, 0), 2) as pct_7311_by_revenue
FROM (
    SELECT 
        i.centre,
        EXTRACT(YEAR FROM s.date::date) as year,
        COUNT(*) FILTER (WHERE s.position_number = '7311') as pos_7311_count,
        COUNT(*) FILTER (WHERE s.position_number = '7301') as pos_7301_count,
        COUNT(*) FILTER (WHERE s.position_number IN ('7311', '7301')) as total_count,
        SUM(s.amount) FILTER (WHERE s.position_number = '7311') as pos_7311_revenue,
        SUM(s.amount) FILTER (WHERE s.position_number = '7301') as pos_7301_revenue,
        SUM(s.amount) FILTER (WHERE s.position_number IN ('7311', '7301')) as total_revenue
    FROM services s
    JOIN invoices i ON s.invoice_id = i.id
    WHERE s.position_number IN ('7311', '7301')
        AND s.amount IS NOT NULL
        AND s.date IS NOT NULL
        AND i.centre IS NOT NULL
        AND i.centre ILIKE '%cornavin%'
    GROUP BY i.centre, EXTRACT(YEAR FROM s.date::date)
) subquery
ORDER BY centre, year;
