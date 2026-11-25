-- Second coach for each class on the Pune-Mumbai corridor, so the coach selector has a
-- real choice in the demo. Inventory is seeded for the extra coaches over the same
-- 14-day window as V101, so rerunning the demo scripts stays idempotent.

INSERT IGNORE INTO coaches (train_number, class_code, coach_no, layout, seat_count)
SELECT c.train_number,
       c.class_code,
       CONCAT(LEFT(c.coach_no, 1), '2'),
       c.layout,
       c.seat_count
FROM coaches c
WHERE c.train_number IN ('12123', '12124', '12125', '12126', '12127', '12128',
                         '11007', '11008', '12169', '12170')
  AND RIGHT(c.coach_no, 1) = '1';

INSERT IGNORE INTO seat_inventory (train_number, travel_date, coach_id, seat_no, berth_type,
                                   status, held_until, version)
SELECT c.train_number,
       d.travel_date,
       c.id,
       s.n,
       CASE
           WHEN c.layout = 'BERTH' THEN
               CASE MOD(s.n - 1, 8)
                   WHEN 0 THEN 'LB'
                   WHEN 1 THEN 'MB'
                   WHEN 2 THEN 'UB'
                   WHEN 3 THEN 'LB'
                   WHEN 4 THEN 'MB'
                   WHEN 5 THEN 'UB'
                   WHEN 6 THEN 'SL'
                   ELSE 'SU'
               END
           ELSE
               CASE MOD(s.n - 1, 3)
                   WHEN 0 THEN 'WS'
                   WHEN 1 THEN 'MS'
                   ELSE 'AS'
               END
       END,
       CASE
           WHEN MOD(c.id * 31 + s.n * 17 + d.day_no * 13, 100) <
                CASE WHEN c.train_number IN ('12123', '12125') THEN 97 ELSE 70 END
               THEN 'OCCUPIED'
           ELSE 'AVAILABLE'
       END,
       NULL,
       0
FROM coaches c
JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
      UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
      UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16
      UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
      UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
      UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28
      UNION ALL SELECT 29 UNION ALL SELECT 30 UNION ALL SELECT 31 UNION ALL SELECT 32
      UNION ALL SELECT 33 UNION ALL SELECT 34 UNION ALL SELECT 35 UNION ALL SELECT 36
      UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39 UNION ALL SELECT 40
      UNION ALL SELECT 41 UNION ALL SELECT 42 UNION ALL SELECT 43 UNION ALL SELECT 44
      UNION ALL SELECT 45 UNION ALL SELECT 46 UNION ALL SELECT 47 UNION ALL SELECT 48
      UNION ALL SELECT 49 UNION ALL SELECT 50 UNION ALL SELECT 51 UNION ALL SELECT 52
      UNION ALL SELECT 53 UNION ALL SELECT 54 UNION ALL SELECT 55 UNION ALL SELECT 56
      UNION ALL SELECT 57 UNION ALL SELECT 58 UNION ALL SELECT 59 UNION ALL SELECT 60
      UNION ALL SELECT 61 UNION ALL SELECT 62 UNION ALL SELECT 63 UNION ALL SELECT 64
      UNION ALL SELECT 65 UNION ALL SELECT 66 UNION ALL SELECT 67 UNION ALL SELECT 68
      UNION ALL SELECT 69 UNION ALL SELECT 70 UNION ALL SELECT 71 UNION ALL SELECT 72) s
  ON s.n <= c.seat_count
JOIN (SELECT 0 AS day_no, CURRENT_DATE + INTERVAL '0' DAY AS travel_date
      UNION ALL SELECT 1, CURRENT_DATE + INTERVAL '1' DAY
      UNION ALL SELECT 2, CURRENT_DATE + INTERVAL '2' DAY
      UNION ALL SELECT 3, CURRENT_DATE + INTERVAL '3' DAY
      UNION ALL SELECT 4, CURRENT_DATE + INTERVAL '4' DAY
      UNION ALL SELECT 5, CURRENT_DATE + INTERVAL '5' DAY
      UNION ALL SELECT 6, CURRENT_DATE + INTERVAL '6' DAY
      UNION ALL SELECT 7, CURRENT_DATE + INTERVAL '7' DAY
      UNION ALL SELECT 8, CURRENT_DATE + INTERVAL '8' DAY
      UNION ALL SELECT 9, CURRENT_DATE + INTERVAL '9' DAY
      UNION ALL SELECT 10, CURRENT_DATE + INTERVAL '10' DAY
      UNION ALL SELECT 11, CURRENT_DATE + INTERVAL '11' DAY
      UNION ALL SELECT 12, CURRENT_DATE + INTERVAL '12' DAY
      UNION ALL SELECT 13, CURRENT_DATE + INTERVAL '13' DAY) d
WHERE c.train_number IN ('12123', '12124', '12125', '12126', '12127', '12128',
                         '11007', '11008', '12169', '12170');

UPDATE train_classes tc
SET total_seats = (SELECT COALESCE(SUM(c.seat_count), 0)
                   FROM coaches c
                   WHERE c.train_number = tc.train_number
                     AND c.class_code = tc.class_code)
WHERE tc.train_number IN ('12123', '12124', '12125', '12126', '12127', '12128',
                          '11007', '11008', '12169', '12170');
