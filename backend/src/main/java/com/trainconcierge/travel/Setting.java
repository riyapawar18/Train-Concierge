package com.trainconcierge.travel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "settings")
public class Setting {

    @Id
    @Column(name = "setting_key", nullable = false, length = 60)
    private String key;

    @Column(name = "setting_value", nullable = false, length = 120)
    private String value;

    @Column(nullable = false, length = 255)
    private String description;

    protected Setting() {
    }

    public String getKey() {
        return key;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getDescription() {
        return description;
    }
}
