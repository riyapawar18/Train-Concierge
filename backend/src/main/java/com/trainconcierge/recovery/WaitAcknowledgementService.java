package com.trainconcierge.recovery;

import org.springframework.stereotype.Service;

@Service
public class WaitAcknowledgementService {

    private final WaitAcknowledgementRepository repository;

    public WaitAcknowledgementService(WaitAcknowledgementRepository repository) {
        this.repository = repository;
    }

    /**
     * Persists a wait acknowledgement for the given journey and user.
     */
    public WaitAcknowledgement acknowledge(Long journeyId, Long userId) {
        WaitAcknowledgement acknowledgement = new WaitAcknowledgement(journeyId, userId);
        return repository.save(acknowledgement);
    }
}
