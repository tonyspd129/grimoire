---
name: sql-query
description: Write and optimize SQL queries, debug slow queries, design schemas, use window functions
category: data
triggers: [sql, query, database, select, join, index, postgres, sqlite, mysql, slow, explain, schema]
---

## SQL — Query Writing and Optimization

### Query structure reference

```sql
SELECT col1, col2, agg_func(col3) AS alias
FROM table1 t1
JOIN table2 t2 ON t1.id = t2.fk_id
WHERE t1.status = 'active'
  AND t1.created_at >= NOW() - INTERVAL '30 days'
GROUP BY col1, col2
HAVING COUNT(*) > 5
ORDER BY alias DESC
LIMIT 100 OFFSET 0;
```

### JOIN types

```sql
INNER JOIN -- rows with matches in both tables
LEFT JOIN  -- all left rows, nulls where right has no match
RIGHT JOIN -- all right rows (prefer LEFT JOIN for clarity)
FULL JOIN  -- all rows from both, nulls where no match
CROSS JOIN -- cartesian product (rare)
```

### Window functions (avoid self-joins and subqueries)

```sql
-- Rank within group
SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rank
FROM employees;

-- Running total
SELECT date, amount, SUM(amount) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) AS running_total
FROM transactions;

-- Previous/next row
SELECT *, LAG(price) OVER (ORDER BY date) AS prev_price
FROM prices;
```

### Debugging slow queries

```sql
EXPLAIN ANALYZE SELECT ...;   -- PostgreSQL: shows actual execution plan
EXPLAIN SELECT ...;           -- SQLite: simpler output

-- Look for:
-- Seq Scan on large table → add index
-- Hash Join with huge rows → check join conditions
-- Sort with large N → add index on ORDER BY column
```

### Index design

```sql
-- Single column
CREATE INDEX idx_users_email ON users(email);

-- Composite (order matters — most selective first)
CREATE INDEX idx_orders_status_date ON orders(status, created_at);

-- Partial index (only index relevant rows)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Covering index (avoids heap access)
CREATE INDEX idx_orders_covering ON orders(user_id) INCLUDE (total, status);
```

### Common patterns

```sql
-- Upsert (PostgreSQL)
INSERT INTO users (id, email) VALUES ($1, $2)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Delete with join
DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE status = 'banned');

-- CTE for readability
WITH active_users AS (
  SELECT id FROM users WHERE last_seen > NOW() - INTERVAL '7 days'
)
SELECT COUNT(*) FROM orders WHERE user_id IN (SELECT id FROM active_users);

-- JSON in PostgreSQL
SELECT data->>'name', data->'address'->>'city' FROM records;
SELECT * FROM records WHERE data @> '{"status": "active"}';
```

### Schema best practices

```sql
-- Always have these on every table
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

-- Foreign keys
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

-- Enum-like column
CHECK (status IN ('pending', 'active', 'archived'))
```
