package com.trainconcierge.disruption;

import com.trainconcierge.disruption.event.DisruptionCreatedEvent;
import com.trainconcierge.disruption.event.DisruptionResolvedEvent;
import com.trainconcierge.disruption.event.DisruptionUpdatedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class DisruptionEventListener {

    private final DisruptionPipeline pipeline;

    public DisruptionEventListener(DisruptionPipeline pipeline) {
        this.pipeline = pipeline;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCreated(DisruptionCreatedEvent event) {
        pipeline.onCreated(event.disruptionId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUpdated(DisruptionUpdatedEvent event) {
        pipeline.onUpdated(event.disruptionId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onResolved(DisruptionResolvedEvent event) {
        pipeline.onResolved(event.disruptionId());
    }
}
