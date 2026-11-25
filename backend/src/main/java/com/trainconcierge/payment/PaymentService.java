package com.trainconcierge.payment;

import com.trainconcierge.config.PaymentProperties;
import com.trainconcierge.payment.dto.CheckoutResponse;
import com.trainconcierge.payment.dto.VerificationResult;
import com.trainconcierge.payment.gateway.PaymentGateway;
import com.trainconcierge.payment.gateway.RazorpayTestGateway;
import com.trainconcierge.payment.gateway.SimulatedGateway;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepo;
    private final PaymentEventRepository eventRepo;
    private final PaymentProperties props;
    private final SimulatedGateway simulatedGateway;
    private final RazorpayTestGateway razorpayGateway;

    @Autowired
    public PaymentService(PaymentRepository paymentRepo,
                          PaymentEventRepository eventRepo,
                          PaymentProperties props,
                          SimulatedGateway simulatedGateway,
                          RazorpayTestGateway razorpayGateway) {
        this.paymentRepo = paymentRepo;
        this.eventRepo = eventRepo;
        this.props = props;
        this.simulatedGateway = simulatedGateway;
        this.razorpayGateway = razorpayGateway;
    }

    private PaymentGateway getGateway() {
        return switch (props.getMode()) {
            case SIMULATED -> simulatedGateway;
            case RAZORPAY_TEST -> razorpayGateway;
            case UPI_INTENT_DEMO -> simulatedGateway; // For demo we reuse simulated gateway UI
        };
    }

    @Transactional
    public Payment initiate(String purpose, String referenceType, Long referenceId, Long userId, java.math.BigDecimal amount) {
        Payment payment = new Payment();
        payment.setUserId(userId);
        payment.setPurpose(purpose);
        payment.setReferenceType(referenceType);
        payment.setReferenceId(referenceId);
        payment.setAmount(amount);
        payment.setProvider(props.getMode().name());
        payment.setVerificationLevel(Payment.VerificationLevel.SIMULATED);
        payment.setStatus(Payment.Status.INITIATED);
        payment.setExpiresAt(LocalDateTime.now().plusMinutes(props.getExpiryMinutes()));
        payment = paymentRepo.save(payment);
        // initial event
        PaymentEvent event = new PaymentEvent();
        event.setPayment(payment);
        event.setFromStatus(null);
        event.setToStatus(Payment.Status.INITIATED.name());
        event.setSource(PaymentEvent.Source.SYSTEM);
        eventRepo.save(event);
        return payment;
    }

    @Transactional
    public CheckoutResponse startCheckout(Long paymentId, String methodHint) {
        Payment payment = paymentRepo.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));
        payment.setMethodHint(methodHint);
        // transition to PENDING for simulated or razorpay (order created)
        transitionStatus(payment, Payment.Status.PENDING, PaymentEvent.Source.USER, "Method selected: " + methodHint);
        return getGateway().createCheckout(payment);
    }

    @Transactional
    public VerificationResult verifyPayment(Long paymentId, Object proof) {
        Payment payment = paymentRepo.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));
        VerificationResult result = getGateway().verify(payment, proof);
        if (result.getStatus() == VerificationResult.Status.SUCCESS) {
            transitionStatus(payment, Payment.Status.SUCCESS, PaymentEvent.Source.VERIFY, "Verified successfully");
            payment.setProviderPaymentId(result.getProviderPaymentId());
            payment.setVerificationLevel(Payment.VerificationLevel.PROVIDER_VERIFIED);
            paymentRepo.save(payment);
        } else if (result.getStatus() == VerificationResult.Status.FAILED) {
            transitionStatus(payment, Payment.Status.FAILED, PaymentEvent.Source.VERIFY, result.getFailureReason());
            payment.setFailureReason(result.getFailureReason());
            paymentRepo.save(payment);
        } else {
            // PENDING – no status change, just record verification attempt
            // (could be used for async webhook later)
        }
        return result;
    }

    @Transactional
    public void confirmPayment(Long paymentId) {
        // Only allowed for SIMULATED mode where user manually confirms after paying.
        if (props.getMode() != com.trainconcierge.payment.PaymentMode.SIMULATED) {
            throw new IllegalStateException("Explicit confirm only supported in SIMULATED mode");
        }
        Payment payment = paymentRepo.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));
        transitionStatus(payment, Payment.Status.SUCCESS, PaymentEvent.Source.USER, "User confirmed simulated payment");
        payment.setVerificationLevel(Payment.VerificationLevel.SIMULATED);
        paymentRepo.save(payment);
    }

    @Transactional
    public void cancelPayment(Long paymentId, String reason) {
        Payment payment = paymentRepo.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));
        transitionStatus(payment, Payment.Status.FAILED, PaymentEvent.Source.USER, reason);
        payment.setFailureReason(reason);
        paymentRepo.save(payment);
    }

    @Transactional(readOnly = true)
    public Optional<Payment> getPayment(Long paymentId) {
        return paymentRepo.findById(paymentId);
    }

    private void transitionStatus(Payment payment, Payment.Status newStatus, PaymentEvent.Source source, String note) {
        Payment.Status oldStatus = payment.getStatus();
        payment.setStatus(newStatus);
        payment.setUpdatedAt(LocalDateTime.now());
        paymentRepo.save(payment);
        PaymentEvent ev = new PaymentEvent();
        ev.setPayment(payment);
        ev.setFromStatus(oldStatus != null ? oldStatus.name() : null);
        ev.setToStatus(newStatus.name());
        ev.setSource(source);
        ev.setNote(note);
        eventRepo.save(ev);
    }
}
