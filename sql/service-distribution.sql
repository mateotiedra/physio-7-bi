-- Service Distribution Analysis by Position Number
-- Shows aggregated metrics for each position across all services

SELECT 
    position_number,
    most_common_description,
    service_count,
    unique_invoices,
    unique_descriptions,
    ROUND(total_revenue, 2) as total_revenue,
    ROUND(avg_amount, 2) as avg_amount,
    ROUND(min_amount, 2) as min_amount,
    ROUND(max_amount, 2) as max_amount,
    ROUND(service_count * 100.0 / SUM(service_count) OVER(), 2) as pct_of_total_services,
    ROUND(total_revenue * 100.0 / SUM(total_revenue) OVER(), 2) as pct_of_total_revenue
FROM (
    SELECT 
        COALESCE(position_number, 'Unknown') as position_number,
        MODE() WITHIN GROUP (ORDER BY description) as most_common_description,
        COUNT(*) as service_count,
        COUNT(DISTINCT invoice_id) as unique_invoices,
        COUNT(DISTINCT description) as unique_descriptions,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
    FROM services
    WHERE amount IS NOT NULL
    GROUP BY position_number
) subquery
ORDER BY total_revenue DESC;
