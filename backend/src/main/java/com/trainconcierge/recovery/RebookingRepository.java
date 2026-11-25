package com.trainconcierge.recovery;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RebookingRepository extends JpaRepository<Rebooking, Long> {
    // find by payment id if needed
    Rebooking findByPaymentId(Long paymentId);
}
