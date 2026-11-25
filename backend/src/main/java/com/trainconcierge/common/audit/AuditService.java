package com.trainconcierge.common.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void record(Long actorUserId, String action, String targetType, Long targetId, String details) {
        auditLogRepository.save(new AuditLog(actorUserId, action, targetType, targetId, details));
    }
}
