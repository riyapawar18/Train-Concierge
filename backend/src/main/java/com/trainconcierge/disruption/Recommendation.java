package com.trainconcierge.disruption;

import com.trainconcierge.common.json.StringListJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "recommendations")
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "impact_id", nullable = false)
    private JourneyImpact impact;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RecommendationKind kind;

    @Column(name = "ref_train_number", length = 8)
    private String refTrainNumber;

    @Column(name = "ref_bus_trip_id")
    private Long refBusTripId;

    @Column(name = "class_code", length = 4)
    private String classCode;

    @Column(name = "from_station", nullable = false, length = 8)
    private String fromStation;

    @Column(name = "to_station", nullable = false, length = 8)
    private String toStation;

    @Column(name = "departure_at", nullable = false)
    private LocalDateTime departureAt;

    @Column(name = "arrival_at", nullable = false)
    private LocalDateTime arrivalAt;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal fare;

    @Column(name = "seats_available", nullable = false)
    private int seatsAvailable;

    @Column(nullable = false)
    private int score;

    @Column(name = "`rank`", nullable = false)
    private int rank;

    @Column(nullable = false)
    private boolean recommended;

    @Convert(converter = StringListJsonConverter.class)
    @Column(nullable = false, length = 1000)
    private List<String> reasons;

    @Convert(converter = StringListJsonConverter.class)
    @Column(nullable = false, length = 1000)
    private List<String> warnings;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected Recommendation() {
    }

    public static Recommendation create(JourneyImpact impact, RecommendationKind kind,
                                        String refTrainNumber, Long refBusTripId,
                                        String classCode, String fromStation, String toStation,
                                        LocalDateTime departureAt, LocalDateTime arrivalAt,
                                        BigDecimal fare, int seatsAvailable, int score, int rank,
                                        boolean recommended, List<String> reasons,
                                        List<String> warnings, LocalDateTime createdAt) {
        Recommendation recommendation = new Recommendation();
        recommendation.impact = impact;
        recommendation.kind = kind;
        recommendation.refTrainNumber = refTrainNumber;
        recommendation.refBusTripId = refBusTripId;
        recommendation.classCode = classCode;
        recommendation.fromStation = fromStation;
        recommendation.toStation = toStation;
        recommendation.departureAt = departureAt;
        recommendation.arrivalAt = arrivalAt;
        recommendation.fare = fare;
        recommendation.seatsAvailable = seatsAvailable;
        recommendation.score = score;
        recommendation.rank = rank;
        recommendation.recommended = recommended;
        recommendation.reasons = List.copyOf(reasons);
        recommendation.warnings = List.copyOf(warnings);
        recommendation.createdAt = createdAt;
        return recommendation;
    }

    public Long getId() {
        return id;
    }

    public JourneyImpact getImpact() {
        return impact;
    }

    public RecommendationKind getKind() {
        return kind;
    }

    public String getRefTrainNumber() {
        return refTrainNumber;
    }

    public Long getRefBusTripId() {
        return refBusTripId;
    }

    public String getClassCode() {
        return classCode;
    }

    public String getFromStation() {
        return fromStation;
    }

    public String getToStation() {
        return toStation;
    }

    public LocalDateTime getDepartureAt() {
        return departureAt;
    }

    public LocalDateTime getArrivalAt() {
        return arrivalAt;
    }

    public BigDecimal getFare() {
        return fare;
    }

    public int getSeatsAvailable() {
        return seatsAvailable;
    }

    public int getScore() {
        return score;
    }

    public int getRank() {
        return rank;
    }

    public boolean isRecommended() {
        return recommended;
    }

    public List<String> getReasons() {
        return reasons;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
