-- Demo catalog data. Applied only with the demo profile.
-- Every statement is idempotent through natural keys and INSERT IGNORE.

INSERT IGNORE INTO stations (code, name, city, state, latitude, longitude) VALUES
('PUNE', 'Pune Junction', 'Pune', 'Maharashtra', 18.528600, 73.874400),
('KK', 'Khadki', 'Pune', 'Maharashtra', 18.567900, 73.847000),
('LNL', 'Lonavala', 'Lonavala', 'Maharashtra', 18.754600, 73.406200),
('KYN', 'Kalyan Junction', 'Kalyan', 'Maharashtra', 19.240300, 73.130500),
('PNVL', 'Panvel Junction', 'Panvel', 'Maharashtra', 18.989400, 73.117500),
('DR', 'Dadar Central', 'Mumbai', 'Maharashtra', 19.018600, 72.844600),
('BCT', 'Mumbai Central', 'Mumbai', 'Maharashtra', 18.969000, 72.819700),
('CSMT', 'Mumbai CSMT', 'Mumbai', 'Maharashtra', 18.940200, 72.835500),
('LTT', 'Lokmanya Tilak Terminus', 'Mumbai', 'Maharashtra', 19.065700, 72.891000),
('NDLS', 'New Delhi', 'New Delhi', 'Delhi', 28.643100, 77.219700),
('BPL', 'Bhopal Junction', 'Bhopal', 'Madhya Pradesh', 23.259900, 77.412600),
('SBC', 'KSR Bengaluru', 'Bengaluru', 'Karnataka', 12.978400, 77.570000),
('MAS', 'Chennai Central', 'Chennai', 'Tamil Nadu', 13.082700, 80.275000),
('SC', 'Secunderabad Junction', 'Hyderabad', 'Telangana', 17.439900, 78.498300),
('HWH', 'Howrah Junction', 'Howrah', 'West Bengal', 22.583900, 88.342600),
('ADI', 'Ahmedabad Junction', 'Ahmedabad', 'Gujarat', 23.022500, 72.571400),
('BRC', 'Vadodara Junction', 'Vadodara', 'Gujarat', 22.307200, 73.181200),
('JP', 'Jaipur Junction', 'Jaipur', 'Rajasthan', 26.912400, 75.787300),
('NGP', 'Nagpur Junction', 'Nagpur', 'Maharashtra', 21.145800, 79.088200),
('MAO', 'Madgaon Junction', 'Madgaon', 'Goa', 15.273600, 73.961900),
('AGC', 'Agra Cantt', 'Agra', 'Uttar Pradesh', 27.157000, 78.019000),
('GWL', 'Gwalior Junction', 'Gwalior', 'Madhya Pradesh', 26.218300, 78.182800),
('KPD', 'Katpadi Junction', 'Vellore', 'Tamil Nadu', 12.969800, 79.137800),
('JTJ', 'Jolarpettai Junction', 'Jolarpettai', 'Tamil Nadu', 12.571400, 78.577800),
('BZA', 'Vijayawada Junction', 'Vijayawada', 'Andhra Pradesh', 16.517500, 80.620000),
('WL', 'Warangal', 'Warangal', 'Telangana', 17.978400, 79.594100),
('DHN', 'Dhanbad Junction', 'Dhanbad', 'Jharkhand', 23.795700, 86.430400),
('CNB', 'Kanpur Central', 'Kanpur', 'Uttar Pradesh', 26.449900, 80.331900),
('RN', 'Ratnagiri', 'Ratnagiri', 'Maharashtra', 16.990200, 73.312000);

INSERT IGNORE INTO trains (number, name, type, source_code, destination_code, runs_on) VALUES
('12123', 'Deccan Queen', 'SUPERFAST', 'PUNE', 'CSMT', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12124', 'Deccan Queen', 'SUPERFAST', 'CSMT', 'PUNE', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12125', 'Pragati Express', 'SUPERFAST', 'PUNE', 'CSMT', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12126', 'Pragati Express', 'SUPERFAST', 'CSMT', 'PUNE', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12127', 'Intercity Express', 'EXPRESS', 'PUNE', 'CSMT', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12128', 'Intercity Express', 'EXPRESS', 'CSMT', 'PUNE', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('11007', 'Deccan Express', 'EXPRESS', 'PUNE', 'CSMT', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('11008', 'Deccan Express', 'EXPRESS', 'CSMT', 'PUNE', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12129', 'Azad Hind Express', 'EXPRESS', 'PUNE', 'HWH', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12169', 'Solapur Mumbai Express', 'EXPRESS', 'PUNE', 'CSMT', 'MON,TUE,WED,THU,FRI,SAT'),
('12170', 'Solapur Mumbai Express', 'EXPRESS', 'CSMT', 'PUNE', 'MON,TUE,WED,THU,FRI,SAT'),
('12951', 'Mumbai Rajdhani', 'RAJDHANI', 'BCT', 'NDLS', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12952', 'Delhi Rajdhani', 'RAJDHANI', 'NDLS', 'BCT', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12009', 'Mumbai Ahmedabad Shatabdi', 'SHATABDI', 'BCT', 'ADI', 'MON,TUE,WED,THU,FRI,SAT'),
('12010', 'Ahmedabad Mumbai Shatabdi', 'SHATABDI', 'ADI', 'BCT', 'MON,TUE,WED,THU,FRI,SAT'),
('12002', 'Bhopal Shatabdi', 'SHATABDI', 'NDLS', 'BPL', 'MON,TUE,WED,THU,FRI,SAT'),
('12001', 'Delhi Shatabdi', 'SHATABDI', 'BPL', 'NDLS', 'MON,TUE,WED,THU,FRI,SAT'),
('12007', 'Bengaluru Chennai Shatabdi', 'SHATABDI', 'SBC', 'MAS', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12008', 'Chennai Bengaluru Shatabdi', 'SHATABDI', 'MAS', 'SBC', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12759', 'Charminar Express', 'SUPERFAST', 'SC', 'MAS', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12760', 'Charminar Express', 'SUPERFAST', 'MAS', 'SC', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12301', 'Howrah Rajdhani', 'RAJDHANI', 'HWH', 'NDLS', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('12302', 'Kolkata Rajdhani', 'RAJDHANI', 'NDLS', 'HWH', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('10111', 'Konkan Kanya Express', 'EXPRESS', 'BCT', 'MAO', 'MON,TUE,WED,THU,FRI,SAT,SUN'),
('10112', 'Konkan Kanya Express', 'EXPRESS', 'MAO', 'BCT', 'MON,TUE,WED,THU,FRI,SAT,SUN');

INSERT IGNORE INTO train_schedule (train_number, station_code, stop_order, arrival_time, departure_time, day_offset, distance_km) VALUES
('12123', 'PUNE', 1, NULL, '07:15:00', 0, 0),
('12123', 'LNL', 2, '08:05:00', '08:07:00', 0, 66),
('12123', 'KYN', 3, '09:35:00', '09:38:00', 0, 132),
('12123', 'DR', 4, '10:12:00', '10:14:00', 0, 190),
('12123', 'CSMT', 5, '10:25:00', NULL, 0, 192),
('12124', 'CSMT', 1, NULL, '17:10:00', 0, 0),
('12124', 'DR', 2, '17:22:00', '17:24:00', 0, 2),
('12124', 'KYN', 3, '17:58:00', '18:00:00', 0, 60),
('12124', 'LNL', 4, '19:30:00', '19:32:00', 0, 126),
('12124', 'PUNE', 5, '20:25:00', NULL, 0, 192),
('12125', 'PUNE', 1, NULL, '07:50:00', 0, 0),
('12125', 'LNL', 2, '08:40:00', '08:42:00', 0, 66),
('12125', 'KYN', 3, '10:05:00', '10:07:00', 0, 132),
('12125', 'DR', 4, '10:50:00', '10:52:00', 0, 190),
('12125', 'CSMT', 5, '11:15:00', NULL, 0, 192),
('12126', 'CSMT', 1, NULL, '17:40:00', 0, 0),
('12126', 'DR', 2, '17:52:00', '17:54:00', 0, 2),
('12126', 'KYN', 3, '18:30:00', '18:32:00', 0, 60),
('12126', 'LNL', 4, '19:55:00', '19:57:00', 0, 126),
('12126', 'PUNE', 5, '21:05:00', NULL, 0, 192),
('12127', 'PUNE', 1, NULL, '06:35:00', 0, 0),
('12127', 'LNL', 2, '07:20:00', '07:22:00', 0, 66),
('12127', 'KYN', 3, '08:45:00', '08:47:00', 0, 132),
('12127', 'DR', 4, '09:35:00', '09:37:00', 0, 190),
('12127', 'CSMT', 5, '09:55:00', NULL, 0, 192),
('12128', 'CSMT', 1, NULL, '18:20:00', 0, 0),
('12128', 'DR', 2, '18:32:00', '18:34:00', 0, 2),
('12128', 'KYN', 3, '19:15:00', '19:17:00', 0, 60),
('12128', 'LNL', 4, '20:35:00', '20:37:00', 0, 126),
('12128', 'PUNE', 5, '21:45:00', NULL, 0, 192),
('11007', 'PUNE', 1, NULL, '16:30:00', 0, 0),
('11007', 'LNL', 2, '17:25:00', '17:27:00', 0, 66),
('11007', 'KYN', 3, '18:55:00', '18:58:00', 0, 132),
('11007', 'DR', 4, '19:30:00', '19:32:00', 0, 190),
('11007', 'CSMT', 5, '19:45:00', NULL, 0, 192),
('11008', 'CSMT', 1, NULL, '06:25:00', 0, 0),
('11008', 'DR', 2, '06:37:00', '06:39:00', 0, 2),
('11008', 'KYN', 3, '07:20:00', '07:22:00', 0, 60),
('11008', 'LNL', 4, '08:50:00', '08:52:00', 0, 126),
('11008', 'PUNE', 5, '09:55:00', NULL, 0, 192),
('12129', 'PUNE', 1, NULL, '18:05:00', 0, 0),
('12129', 'NGP', 2, '07:30:00', '07:40:00', 1, 890),
('12129', 'BPL', 3, '15:10:00', '15:20:00', 1, 1500),
('12129', 'DHN', 4, '23:30:00', '23:35:00', 1, 1850),
('12129', 'HWH', 5, '04:45:00', NULL, 2, 2000),
('12169', 'PUNE', 1, NULL, '23:10:00', 0, 0),
('12169', 'LNL', 2, '00:05:00', '00:07:00', 1, 66),
('12169', 'KYN', 3, '01:25:00', '01:28:00', 1, 132),
('12169', 'DR', 4, '02:05:00', '02:07:00', 1, 190),
('12169', 'CSMT', 5, '02:25:00', NULL, 1, 192),
('12170', 'CSMT', 1, NULL, '22:35:00', 0, 0),
('12170', 'DR', 2, '22:47:00', '22:49:00', 0, 2),
('12170', 'KYN', 3, '23:30:00', '23:32:00', 0, 60),
('12170', 'LNL', 4, '00:55:00', '00:57:00', 1, 126),
('12170', 'PUNE', 5, '01:55:00', NULL, 1, 192),
('12951', 'BCT', 1, NULL, '17:00:00', 0, 0),
('12951', 'BRC', 2, '19:30:00', '19:35:00', 0, 392),
('12951', 'JP', 3, '23:55:00', '00:05:00', 1, 935),
('12951', 'NDLS', 4, '08:32:00', NULL, 1, 1384),
('12952', 'NDLS', 1, NULL, '16:25:00', 0, 0),
('12952', 'JP', 2, '21:30:00', '21:40:00', 0, 449),
('12952', 'BRC', 3, '02:05:00', '02:10:00', 1, 992),
('12952', 'BCT', 4, '05:15:00', NULL, 1, 1384),
('12009', 'BCT', 1, NULL, '06:25:00', 0, 0),
('12009', 'DR', 2, '06:37:00', '06:39:00', 0, 2),
('12009', 'BRC', 3, '08:20:00', '08:25:00', 0, 392),
('12009', 'ADI', 4, '10:15:00', NULL, 0, 493),
('12010', 'ADI', 1, NULL, '15:30:00', 0, 0),
('12010', 'BRC', 2, '17:10:00', '17:15:00', 0, 101),
('12010', 'DR', 3, '19:15:00', '19:17:00', 0, 491),
('12010', 'BCT', 4, '19:25:00', NULL, 0, 493),
('12002', 'NDLS', 1, NULL, '06:00:00', 0, 0),
('12002', 'AGC', 2, '08:10:00', '08:15:00', 0, 195),
('12002', 'GWL', 3, '09:25:00', '09:30:00', 0, 313),
('12002', 'BPL', 4, '14:30:00', NULL, 0, 707),
('12001', 'BPL', 1, NULL, '15:00:00', 0, 0),
('12001', 'GWL', 2, '19:10:00', '19:15:00', 0, 394),
('12001', 'AGC', 3, '20:45:00', '20:50:00', 0, 512),
('12001', 'NDLS', 4, '23:30:00', NULL, 0, 707),
('12007', 'SBC', 1, NULL, '06:00:00', 0, 0),
('12007', 'KPD', 2, '09:30:00', '09:35:00', 0, 229),
('12007', 'JTJ', 3, '10:55:00', '11:00:00', 0, 321),
('12007', 'MAS', 4, '12:15:00', NULL, 0, 362),
('12008', 'MAS', 1, NULL, '15:30:00', 0, 0),
('12008', 'JTJ', 2, '16:45:00', '16:50:00', 0, 41),
('12008', 'KPD', 3, '18:00:00', '18:05:00', 0, 133),
('12008', 'SBC', 4, '21:30:00', NULL, 0, 362),
('12759', 'SC', 1, NULL, '18:00:00', 0, 0),
('12759', 'WL', 2, '20:30:00', '20:35:00', 0, 132),
('12759', 'BZA', 3, '23:30:00', '23:40:00', 0, 351),
('12759', 'MAS', 4, '08:00:00', NULL, 1, 782),
('12760', 'MAS', 1, NULL, '17:15:00', 0, 0),
('12760', 'BZA', 2, '01:40:00', '01:50:00', 1, 431),
('12760', 'WL', 3, '04:45:00', '04:50:00', 1, 650),
('12760', 'SC', 4, '07:15:00', NULL, 1, 782),
('12301', 'HWH', 1, NULL, '16:50:00', 0, 0),
('12301', 'DHN', 2, '19:40:00', '19:45:00', 0, 259),
('12301', 'CNB', 3, '03:15:00', '03:20:00', 1, 1164),
('12301', 'NDLS', 4, '08:15:00', NULL, 1, 1447),
('12302', 'NDLS', 1, NULL, '16:55:00', 0, 0),
('12302', 'CNB', 2, '21:45:00', '21:50:00', 0, 440),
('12302', 'DHN', 3, '05:20:00', '05:25:00', 1, 1345),
('12302', 'HWH', 4, '08:15:00', NULL, 1, 1604),
('10111', 'BCT', 1, NULL, '23:05:00', 0, 0),
('10111', 'PNVL', 2, '00:15:00', '00:20:00', 1, 39),
('10111', 'RN', 3, '06:30:00', '06:35:00', 1, 330),
('10111', 'MAO', 4, '10:30:00', NULL, 1, 588),
('10112', 'MAO', 1, NULL, '18:45:00', 0, 0),
('10112', 'RN', 2, '22:30:00', '22:35:00', 0, 258),
('10112', 'PNVL', 3, '04:45:00', '04:50:00', 1, 549),
('10112', 'BCT', 4, '06:00:00', NULL, 1, 588);

INSERT IGNORE INTO train_classes (train_number, class_code, base_fare, total_seats) VALUES
('12123', 'CC', 550.00, 72), ('12123', '2S', 180.00, 72), ('12123', '1A', 1250.00, 24),
('12124', 'CC', 550.00, 72), ('12124', '2S', 180.00, 72), ('12124', '1A', 1250.00, 24),
('12125', 'CC', 520.00, 72), ('12125', '2S', 170.00, 72),
('12126', 'CC', 520.00, 72), ('12126', '2S', 170.00, 72),
('12127', 'CC', 500.00, 72), ('12127', '2S', 160.00, 72),
('12128', 'CC', 500.00, 72), ('12128', '2S', 160.00, 72),
('11007', '2S', 150.00, 72), ('11007', 'SL', 320.00, 72), ('11007', '3A', 720.00, 64), ('11007', '2A', 1050.00, 48),
('11008', '2S', 150.00, 72), ('11008', 'SL', 320.00, 72), ('11008', '3A', 720.00, 64), ('11008', '2A', 1050.00, 48),
('12169', 'SL', 280.00, 72), ('12169', '3A', 650.00, 64), ('12169', '2A', 980.00, 48),
('12170', 'SL', 280.00, 72), ('12170', '3A', 650.00, 64), ('12170', '2A', 980.00, 48),
('12129', 'SL', 650.00, 72), ('12129', '3A', 1450.00, 64), ('12129', '2A', 2100.00, 48), ('12129', '1A', 3200.00, 24),
('12951', '1A', 3850.00, 24), ('12951', '2A', 2250.00, 48), ('12951', '3A', 1550.00, 64), ('12951', 'SL', 620.00, 72),
('12952', '1A', 3850.00, 24), ('12952', '2A', 2250.00, 48), ('12952', '3A', 1550.00, 64), ('12952', 'SL', 620.00, 72),
('12009', 'CC', 780.00, 72), ('12009', 'EC', 1450.00, 56),
('12010', 'CC', 780.00, 72), ('12010', 'EC', 1450.00, 56),
('12002', 'CC', 950.00, 72), ('12002', 'EC', 1800.00, 56),
('12001', 'CC', 950.00, 72), ('12001', 'EC', 1800.00, 56),
('12007', 'CC', 720.00, 72), ('12007', 'EC', 1350.00, 56),
('12008', 'CC', 720.00, 72), ('12008', 'EC', 1350.00, 56),
('12759', 'SL', 450.00, 72), ('12759', '3A', 1150.00, 64), ('12759', '2A', 1650.00, 48),
('12760', 'SL', 450.00, 72), ('12760', '3A', 1150.00, 64), ('12760', '2A', 1650.00, 48),
('12301', '1A', 4200.00, 24), ('12301', '2A', 2450.00, 48), ('12301', '3A', 1650.00, 64), ('12301', 'SL', 680.00, 72),
('12302', '1A', 4200.00, 24), ('12302', '2A', 2450.00, 48), ('12302', '3A', 1650.00, 64), ('12302', 'SL', 680.00, 72),
('10111', 'SL', 420.00, 72), ('10111', '3A', 1100.00, 64), ('10111', '2A', 1600.00, 48),
('10112', 'SL', 420.00, 72), ('10112', '3A', 1100.00, 64), ('10112', '2A', 1600.00, 48);

INSERT IGNORE INTO coaches (train_number, class_code, coach_no, layout, seat_count)
SELECT tc.train_number,
       tc.class_code,
       CASE tc.class_code
           WHEN '1A' THEN 'A1'
           WHEN '2A' THEN 'B1'
           WHEN '3A' THEN 'C1'
           WHEN '3E' THEN 'C1'
           WHEN 'SL' THEN 'S1'
           WHEN 'CC' THEN 'D1'
           WHEN 'EC' THEN 'E1'
           WHEN '2S' THEN 'F1'
           ELSE 'G1'
       END,
       CASE
           WHEN tc.class_code IN ('1A', '2A', '3A', '3E', 'SL') THEN 'BERTH'
           WHEN tc.class_code = 'EV' THEN 'CHAIR_2x1'
           ELSE 'CHAIR_3x2'
       END,
       tc.total_seats
FROM train_classes tc;

INSERT IGNORE INTO bus_services (operator, bus_type, from_city, to_city, from_station_code,
                                 departure_time, duration_minutes, base_fare, total_seats) VALUES
('Sahyadri Travels', 'AC_SLEEPER', 'Pune', 'Mumbai', 'PUNE', '22:30:00', 300, 850.00, 36),
('Deccan Roadways', 'AC_SEATER', 'Pune', 'Mumbai', 'PUNE', '06:00:00', 240, 550.00, 40),
('Konkan Coachlines', 'VOLVO_MULTIAXLE', 'Pune', 'Mumbai', 'PUNE', '08:30:00', 230, 750.00, 44),
('Ghat Runners', 'NON_AC_SEATER', 'Pune', 'Mumbai', 'PUNE', '10:00:00', 260, 380.00, 40),
('Highway Star', 'AC_SEATER', 'Pune', 'Mumbai', 'PUNE', '13:00:00', 245, 600.00, 40),
('MetroLink', 'AC_SLEEPER', 'Pune', 'Mumbai', 'PUNE', '16:30:00', 280, 900.00, 36),
('Western Express', 'VOLVO_MULTIAXLE', 'Pune', 'Mumbai', 'PUNE', '19:00:00', 235, 780.00, 44),
('Deccan Roadways', 'AC_SEATER', 'Mumbai', 'Pune', 'CSMT', '07:30:00', 240, 560.00, 40),
('Sahyadri Travels', 'AC_SLEEPER', 'Mumbai', 'Pune', 'CSMT', '23:15:00', 300, 870.00, 36),
('Garden City Coach', 'AC_SEATER', 'Bengaluru', 'Chennai', 'SBC', '21:00:00', 360, 900.00, 40);

INSERT IGNORE INTO hotels (name, station_code, address, distance_km, price_min, price_max, rating,
                           phone, email, map_url) VALUES
('Deccan Grand Residency', 'PUNE', 'Station Road, Pune', 0.6, 3200.00, 6500.00, 4.4,
 '+91 20 4000 1001', 'stay@deccangrand.demo', 'https://www.openstreetmap.org/search?query=Pune%20Station%20Road'),
('Shivneri Comfort Lodge', 'PUNE', 'Laxmi Road, Pune', 2.1, 1200.00, 2400.00, 3.8,
 '+91 20 4000 1002', 'stay@shivnericomfort.demo', 'https://www.openstreetmap.org/search?query=Pune%20Laxmi%20Road'),
('Ghat View Business Hotel', 'PUNE', 'Baner Road, Pune', 8.4, 4500.00, 8200.00, 4.3,
 '+91 20 4000 1003', 'stay@ghatview.demo', 'https://www.openstreetmap.org/search?query=Pune%20Baner%20Road'),
('Empress Boutique Stay', 'PUNE', 'Koregaon Park, Pune', 6.2, 6000.00, 11000.00, 4.6,
 '+91 20 4000 1004', 'stay@empressboutique.demo', 'https://www.openstreetmap.org/search?query=Pune%20Koregaon%20Park'),
('Harbour Gate Residency', 'CSMT', 'P D Mello Road, Mumbai', 0.7, 3400.00, 6800.00, 4.2,
 '+91 22 4000 2001', 'stay@harbourgate.demo', 'https://www.openstreetmap.org/search?query=Mumbai%20PD%20Mello%20Road'),
('Ballard Budget Lodge', 'CSMT', 'Ballard Estate, Mumbai', 1.4, 1100.00, 2200.00, 3.6,
 '+91 22 4000 2002', 'stay@ballardlodge.demo', 'https://www.openstreetmap.org/search?query=Mumbai%20Ballard%20Estate'),
('Fort Business Inn', 'CSMT', 'Fort, Mumbai', 0.9, 4700.00, 8400.00, 4.4,
 '+91 22 4000 2003', 'stay@fortbusiness.demo', 'https://www.openstreetmap.org/search?query=Mumbai%20Fort'),
('Marine Central Hotel', 'BCT', 'Marine Lines, Mumbai', 1.2, 3600.00, 7200.00, 4.3,
 '+91 22 4000 3001', 'stay@marinecentral.demo', 'https://www.openstreetmap.org/search?query=Mumbai%20Marine%20Lines'),
('Grant Road Lodge', 'BCT', 'Grant Road, Mumbai', 1.8, 1300.00, 2500.00, 3.7,
 '+91 22 4000 3002', 'stay@grantroadlodge.demo', 'https://www.openstreetmap.org/search?query=Mumbai%20Grant%20Road'),
('Western Crest Boutique', 'BCT', 'Tardeo, Mumbai', 2.4, 6500.00, 12000.00, 4.7,
 '+91 22 4000 3003', 'stay@westerncrest.demo', 'https://www.openstreetmap.org/search?query=Mumbai%20Tardeo'),
('Dadar Station Residency', 'DR', 'Dadar East, Mumbai', 0.5, 3300.00, 6600.00, 4.1,
 '+91 22 4000 4001', 'stay@dadarstation.demo', 'https://www.openstreetmap.org/search?query=Mumbai%20Dadar%20East'),
('Hindmata Budget Lodge', 'DR', 'Parel, Mumbai', 1.3, 1200.00, 2300.00, 3.5,
 '+91 22 4000 4002', 'stay@hindmatalodge.demo', 'https://www.openstreetmap.org/search?query=Mumbai%20Parel'),
('Central Line Business Hotel', 'DR', 'Matunga, Mumbai', 2.7, 4400.00, 8000.00, 4.2,
 '+91 22 4000 4003', 'stay@centralline.demo', 'https://www.openstreetmap.org/search?query=Mumbai%20Matunga'),
('Kalyan Junction Residency', 'KYN', 'Station Road, Kalyan', 0.4, 3100.00, 6200.00, 4.0,
 '+91 25 4000 5001', 'stay@kalyanresidency.demo', 'https://www.openstreetmap.org/search?query=Kalyan%20Station%20Road'),
('Bazar Peth Lodge', 'KYN', 'Bazar Peth, Kalyan', 1.1, 1000.00, 2100.00, 3.4,
 '+91 25 4000 5002', 'stay@bazarpeth.demo', 'https://www.openstreetmap.org/search?query=Kalyan%20Bazar%20Peth'),
('Godavari Business Inn', 'KYN', 'Shivaji Chowk, Kalyan', 1.9, 4200.00, 7600.00, 4.1,
 '+91 25 4000 5003', 'stay@godavaribusiness.demo', 'https://www.openstreetmap.org/search?query=Kalyan%20Shivaji%20Chowk'),
('Paharganj Grand', 'NDLS', 'Paharganj, New Delhi', 0.8, 3500.00, 7000.00, 4.2,
 '+91 11 4000 6001', 'stay@paharganjgrand.demo', 'https://www.openstreetmap.org/search?query=New%20Delhi%20Paharganj'),
('Ajmeri Gate Lodge', 'NDLS', 'Ajmeri Gate, New Delhi', 1.2, 1150.00, 2300.00, 3.6,
 '+91 11 4000 6002', 'stay@ajmerigatelodge.demo', 'https://www.openstreetmap.org/search?query=New%20Delhi%20Ajmeri%20Gate'),
('Connaught Business Hotel', 'NDLS', 'Connaught Place, New Delhi', 2.5, 5200.00, 9500.00, 4.5,
 '+91 11 4000 6003', 'stay@connaughtbusiness.demo', 'https://www.openstreetmap.org/search?query=New%20Delhi%20Connaught%20Place'),
('Lutyens Boutique', 'NDLS', 'Lodhi Colony, New Delhi', 5.6, 7000.00, 13000.00, 4.8,
 '+91 11 4000 6004', 'stay@lutyensboutique.demo', 'https://www.openstreetmap.org/search?query=New%20Delhi%20Lodhi%20Colony'),
('Majestic Grand Residency', 'SBC', 'Majestic, Bengaluru', 0.5, 3300.00, 6600.00, 4.3,
 '+91 80 4000 7001', 'stay@majesticgrand.demo', 'https://www.openstreetmap.org/search?query=Bengaluru%20Majestic'),
('Gandhi Nagar Lodge', 'SBC', 'Gandhi Nagar, Bengaluru', 1.6, 1100.00, 2200.00, 3.5,
 '+91 80 4000 7002', 'stay@gandhinagarlodge.demo', 'https://www.openstreetmap.org/search?query=Bengaluru%20Gandhi%20Nagar'),
('Garden City Business Hotel', 'SBC', 'MG Road, Bengaluru', 3.2, 4600.00, 8200.00, 4.4,
 '+91 80 4000 7003', 'stay@gardencitybusiness.demo', 'https://www.openstreetmap.org/search?query=Bengaluru%20MG%20Road'),
('Central Station Residency', 'MAS', 'Park Town, Chennai', 0.6, 3200.00, 6400.00, 4.1,
 '+91 44 4000 8001', 'stay@centralstation.demo', 'https://www.openstreetmap.org/search?query=Chennai%20Park%20Town'),
('Egmore Budget Lodge', 'MAS', 'Egmore, Chennai', 1.5, 1050.00, 2150.00, 3.4,
 '+91 44 4000 8002', 'stay@egmorelodge.demo', 'https://www.openstreetmap.org/search?query=Chennai%20Egmore'),
('Marina Business Inn', 'MAS', 'Marina Beach Road, Chennai', 4.8, 4500.00, 8000.00, 4.3,
 '+91 44 4000 8003', 'stay@marinabusiness.demo', 'https://www.openstreetmap.org/search?query=Chennai%20Marina%20Beach');

INSERT IGNORE INTO hotel_policies (hotel_id, standard_checkin_time, standard_checkout_time,
                                    late_arrival_allowed, late_arrival_cutoff,
                                    late_checkout_allowed, max_late_checkout_time,
                                    late_checkout_fee_type, late_checkout_fee_amount,
                                    extra_night_possible, free_change_window_hours,
                                    extension_needs_approval)
SELECT h.id,
       CASE WHEN h.name IN ('Deccan Grand Residency', 'Harbour Gate Residency', 'Marine Central Hotel',
                            'Dadar Station Residency', 'Kalyan Junction Residency', 'Paharganj Grand',
                            'Majestic Grand Residency', 'Central Station Residency')
            THEN '13:00:00' ELSE '12:00:00' END,
       '11:00:00',
       TRUE,
       CASE WHEN h.name IN ('Shivneri Comfort Lodge', 'Ballard Budget Lodge', 'Grant Road Lodge',
                            'Hindmata Budget Lodge', 'Bazar Peth Lodge', 'Ajmeri Gate Lodge',
                            'Gandhi Nagar Lodge', 'Egmore Budget Lodge')
            THEN '22:00:00'
            WHEN h.name IN ('Empress Boutique Stay', 'Western Crest Boutique', 'Lutyens Boutique')
            THEN '01:00:00'
            ELSE '23:59:00' END,
       CASE WHEN h.name IN ('Shivneri Comfort Lodge', 'Ballard Budget Lodge', 'Grant Road Lodge',
                            'Hindmata Budget Lodge', 'Bazar Peth Lodge', 'Ajmeri Gate Lodge',
                            'Gandhi Nagar Lodge', 'Egmore Budget Lodge')
            THEN FALSE ELSE TRUE END,
       CASE WHEN h.name IN ('Shivneri Comfort Lodge', 'Ballard Budget Lodge', 'Grant Road Lodge',
                            'Hindmata Budget Lodge', 'Bazar Peth Lodge', 'Ajmeri Gate Lodge',
                            'Gandhi Nagar Lodge', 'Egmore Budget Lodge')
            THEN '10:00:00'
            WHEN h.name IN ('Deccan Grand Residency', 'Harbour Gate Residency', 'Marine Central Hotel',
                            'Dadar Station Residency', 'Kalyan Junction Residency', 'Paharganj Grand',
                            'Majestic Grand Residency', 'Central Station Residency')
            THEN '15:00:00'
            ELSE '13:00:00' END,
       CASE WHEN h.name IN ('Shivneri Comfort Lodge', 'Ballard Budget Lodge', 'Grant Road Lodge',
                            'Hindmata Budget Lodge', 'Bazar Peth Lodge', 'Ajmeri Gate Lodge',
                            'Gandhi Nagar Lodge', 'Egmore Budget Lodge')
            THEN 'FREE'
            WHEN h.name IN ('Deccan Grand Residency', 'Harbour Gate Residency', 'Marine Central Hotel',
                            'Dadar Station Residency', 'Kalyan Junction Residency', 'Paharganj Grand',
                            'Majestic Grand Residency', 'Central Station Residency')
            THEN 'HOURLY'
            WHEN h.name IN ('Empress Boutique Stay', 'Western Crest Boutique', 'Lutyens Boutique')
            THEN 'FLAT'
            ELSE 'FREE' END,
       CASE WHEN h.name IN ('Deccan Grand Residency', 'Harbour Gate Residency', 'Marine Central Hotel',
                            'Dadar Station Residency', 'Kalyan Junction Residency', 'Paharganj Grand',
                            'Majestic Grand Residency', 'Central Station Residency')
            THEN 150.00
            WHEN h.name IN ('Empress Boutique Stay', 'Western Crest Boutique', 'Lutyens Boutique')
            THEN 500.00
            ELSE 0.00 END,
       CASE WHEN h.name IN ('Empress Boutique Stay', 'Western Crest Boutique', 'Lutyens Boutique')
            THEN FALSE ELSE TRUE END,
       CASE WHEN h.name IN ('Empress Boutique Stay', 'Western Crest Boutique', 'Lutyens Boutique')
            THEN 48
            WHEN h.name IN ('Shivneri Comfort Lodge', 'Ballard Budget Lodge', 'Grant Road Lodge',
                            'Hindmata Budget Lodge', 'Bazar Peth Lodge', 'Ajmeri Gate Lodge',
                            'Gandhi Nagar Lodge', 'Egmore Budget Lodge')
            THEN 12
            ELSE 24 END,
       CASE WHEN h.name IN ('Shivneri Comfort Lodge', 'Ballard Budget Lodge', 'Grant Road Lodge',
                            'Hindmata Budget Lodge', 'Bazar Peth Lodge', 'Ajmeri Gate Lodge',
                            'Gandhi Nagar Lodge', 'Egmore Budget Lodge',
                            'Ghat View Business Hotel', 'Fort Business Inn', 'Central Line Business Hotel',
                            'Godavari Business Inn', 'Connaught Business Hotel', 'Garden City Business Hotel',
                            'Marina Business Inn')
            THEN 'ON_REQUEST' ELSE 'AUTO' END
FROM hotels h;

INSERT IGNORE INTO hotel_rooms (hotel_id, floor, room_no, room_type, capacity, price_per_night)
SELECT h.id,
       1 + MOD(seq.n - 1, 2),
       CONCAT('R', seq.n),
       CASE MOD(seq.n, 3)
           WHEN 0 THEN 'STANDARD'
           WHEN 1 THEN 'DELUXE'
           ELSE 'SUITE'
       END,
       CASE MOD(seq.n, 3)
           WHEN 0 THEN 2
           WHEN 1 THEN 3
           ELSE 4
       END,
       CASE MOD(seq.n, 3)
           WHEN 0 THEN h.price_min
           WHEN 1 THEN h.price_min + 1200.00
           ELSE h.price_max
       END
FROM hotels h
JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
      UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
      UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16
      UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20) seq
  ON seq.n <= 10 + MOD(h.id, 11);

INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES
('seat_alert_threshold', '20', 'Seats remaining at or below this value trigger the availability alert'),
('hotel_unlock_hour', '22', 'Hour of day when waiting-list hotel options unlock'),
('hotel_unlock_wait_hours', '6', 'Hours a passenger must wait before hotel options unlock'),
('station_transfer_minutes', '40', 'Minimum minutes to transfer between stations in a city'),
('rebooking_buffer_minutes', '30', 'Buffer applied when rebuilding a journey after disruption'),
('seat_hold_minutes', '10', 'Minutes a selected seat stays held before release');
