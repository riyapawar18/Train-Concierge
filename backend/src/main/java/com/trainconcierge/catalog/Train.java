package com.trainconcierge.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "trains")
public class Train {

    @Id
    @Column(name = "number", nullable = false, length = 8)
    private String number;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TrainType type;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_code", nullable = false)
    private Station source;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "destination_code", nullable = false)
    private Station destination;

    @Column(name = "runs_on", nullable = false, length = 40)
    private String runsOn;

    protected Train() {
    }

    public String getNumber() {
        return number;
    }

    public String getName() {
        return name;
    }

    public TrainType getType() {
        return type;
    }

    public Station getSource() {
        return source;
    }

    public Station getDestination() {
        return destination;
    }

    public String getRunsOn() {
        return runsOn;
    }
}
