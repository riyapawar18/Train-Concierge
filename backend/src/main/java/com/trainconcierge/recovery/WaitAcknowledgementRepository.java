package com.trainconcierge.recovery;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WaitAcknowledgementRepository extends JpaRepository<WaitAcknowledgement, Long> {
    // No custom methods needed for now
}
