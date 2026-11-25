package com.trainconcierge.travel;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SeatInventoryService {

    private static final String INSERT_SEAT_SQL = """
            INSERT IGNORE INTO seat_inventory
                (train_number, travel_date, coach_id, seat_no, berth_type, status, held_until, held_by, version)
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0)
            """;

    private final SeatInventoryRepository seatInventoryRepository;
    private final CoachRepository coachRepository;
    private final JdbcTemplate jdbcTemplate;

    public SeatInventoryService(SeatInventoryRepository seatInventoryRepository,
                                CoachRepository coachRepository,
                                JdbcTemplate jdbcTemplate) {
        this.seatInventoryRepository = seatInventoryRepository;
        this.coachRepository = coachRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * The demo inventory is seeded for a fixed window. When a date or coach has no rows
     * yet, generate deterministic seats so the search, charts and seat map always agree.
     */
    @Transactional
    public void ensureInventory(String trainNumber, LocalDate travelDate) {
        List<Coach> coaches = coachRepository.findByTrainNumberOrderByCoachNoAsc(trainNumber);
        if (coaches.isEmpty()) {
            return;
        }
        Set<Long> existingCoaches = new HashSet<>();
        for (SeatInventoryRepository.CoachSeatCount count
                : seatInventoryRepository.countSeatsByCoach(trainNumber, travelDate)) {
            if (count.getTotal() > 0) {
                existingCoaches.add(count.getCoachId());
            }
        }

        List<Object[]> rows = new ArrayList<>();
        for (Coach coach : coaches) {
            if (existingCoaches.contains(coach.getId())) {
                continue;
            }
            for (int seatNo = 1; seatNo <= coach.getSeatCount(); seatNo++) {
                rows.add(new Object[]{
                        trainNumber,
                        travelDate,
                        coach.getId(),
                        seatNo,
                        berthType(coach.getLayout(), seatNo),
                        simulatedStatus(trainNumber, coach.getId(), seatNo, travelDate).name()
                });
            }
        }
        if (!rows.isEmpty()) {
            jdbcTemplate.batchUpdate(INSERT_SEAT_SQL, rows);
        }
    }

    @Transactional
    public void releaseExpiredForTrain(String trainNumber, LocalDate travelDate) {
        seatInventoryRepository.releaseExpiredForTrain(trainNumber, travelDate,
                SeatStatus.HELD, SeatStatus.AVAILABLE, now());
    }

    @Transactional
    public int releaseAllExpired() {
        return seatInventoryRepository.releaseExpired(SeatStatus.HELD, SeatStatus.AVAILABLE, now());
    }

    @Transactional
    public void releaseExpiredForUser(Long userId) {
        seatInventoryRepository.releaseExpiredForUser(userId,
                SeatStatus.HELD, SeatStatus.AVAILABLE, now());
    }

    @Transactional(readOnly = true)
    public Map<String, ClassSeatCounts> countsForTrain(String trainNumber, LocalDate travelDate) {
        Map<String, EnumMap<SeatStatus, Integer>> grouped = new HashMap<>();
        for (SeatInventoryRepository.ClassStatusCount count
                : seatInventoryRepository.countByTrainAndDateGrouped(trainNumber, travelDate)) {
            grouped.computeIfAbsent(count.getClassCode(), ignored -> new EnumMap<>(SeatStatus.class))
                    .merge(count.getStatus(), Math.toIntExact(count.getTotal()), Integer::sum);
        }
        Map<String, ClassSeatCounts> result = new HashMap<>();
        grouped.forEach((classCode, statuses) -> {
            int available = statuses.getOrDefault(SeatStatus.AVAILABLE, 0);
            int occupied = statuses.getOrDefault(SeatStatus.OCCUPIED, 0);
            int held = statuses.getOrDefault(SeatStatus.HELD, 0);
            result.put(classCode, new ClassSeatCounts(available + occupied + held, available, occupied, held));
        });
        return result;
    }

    @Transactional(readOnly = true)
    public List<SeatInventory> seats(String trainNumber, LocalDate travelDate, Long coachId) {
        return seatInventoryRepository
                .findByTrainNumberAndTravelDateAndCoachIdOrderBySeatNoAsc(trainNumber, travelDate, coachId);
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private static SeatStatus simulatedStatus(String trainNumber, Long coachId, int seatNo, LocalDate date) {
        int occupancy = trainNumber.equals("12123") || trainNumber.equals("12125") ? 97 : 70;
        long seed = coachId * 31L + seatNo * 17L + date.toEpochDay() * 13L;
        int hash = (int) Math.floorMod(seed, 100);
        return hash < occupancy ? SeatStatus.OCCUPIED : SeatStatus.AVAILABLE;
    }

    private static String berthType(CoachLayout layout, int seatNo) {
        if (layout == CoachLayout.BERTH) {
            return switch ((seatNo - 1) % 8) {
                case 0 -> "LB";
                case 1 -> "MB";
                case 2 -> "UB";
                case 3 -> "LB";
                case 4 -> "MB";
                case 5 -> "UB";
                case 6 -> "SL";
                default -> "SU";
            };
        }
        return switch ((seatNo - 1) % 3) {
            case 0 -> "WS";
            case 1 -> "MS";
            default -> "AS";
        };
    }

    public record ClassSeatCounts(int total, int available, int occupied, int held) {
    }
}
