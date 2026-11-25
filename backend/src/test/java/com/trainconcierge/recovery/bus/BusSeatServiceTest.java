package com.trainconcierge.recovery.bus;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BusSeatServiceTest {

    private BusSeatRepository seatRepo;
    private BusHoldRepository holdRepo;
    private BusSeatService service;

    @BeforeEach
    void setUp() {
        seatRepo = mock(BusSeatRepository.class);
        holdRepo = mock(BusHoldRepository.class);
        service = new BusSeatService(seatRepo, holdRepo);
    }

    @Test
    void holdSeat_freeState_succeeds() {
        BusSeat seat = new BusSeat();
        seat.setId(1L);
        seat.setStatus("FREE");
        when(seatRepo.findById(1L)).thenReturn(Optional.of(seat));
        when(holdRepo.save(any(BusHold.class))).thenAnswer(i -> i.getArgument(0));
        when(seatRepo.save(any(BusSeat.class))).thenAnswer(i -> i.getArgument(0));

        service.holdSeat(1L, 100L);

        verify(seatRepo).save(argThat(s -> "HELD".equals(s.getStatus()) && s.getHeldBy().equals(100L)));
        verify(holdRepo).save(argThat(h -> h.getUserId().equals(100L) && h.getBusSeatId().equals(1L)));
    }

    @Test
    void holdSeat_alreadyHeld_throws() {
        BusSeat seat = new BusSeat();
        seat.setId(1L);
        seat.setStatus("HELD");
        when(seatRepo.findById(1L)).thenReturn(Optional.of(seat));

        assertThatThrownBy(() -> service.holdSeat(1L, 100L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("not free");
        verify(seatRepo, never()).save(any());
    }

    @Test
    void findAvailableSeats_returnsOnlyFree() {
        BusSeat free = new BusSeat();
        free.setStatus("FREE");
        when(seatRepo.findByBusTripIdAndStatus(5L, "FREE")).thenReturn(List.of(free));

        List<BusSeat> seats = service.findAvailableSeats(5L);
        assertThat(seats).hasSize(1);
    }

    @Test
    void cleanExpiredHolds_removesExpiredAndFreesSeat() {
        BusHold expired = new BusHold();
        expired.setId(10L);
        expired.setBusSeatId(1L);
        expired.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        BusHold valid = new BusHold();
        valid.setId(11L);
        valid.setBusSeatId(2L);
        valid.setExpiresAt(LocalDateTime.now().plusMinutes(10));

        when(holdRepo.findAll()).thenReturn(List.of(expired, valid));

        BusSeat heldSeat = new BusSeat();
        heldSeat.setId(1L);
        heldSeat.setStatus("HELD");
        when(seatRepo.findById(1L)).thenReturn(Optional.of(heldSeat));

        service.cleanExpiredHolds();

        verify(holdRepo).delete(expired);
        verify(holdRepo, never()).delete(valid);
        verify(seatRepo).save(argThat(s -> "FREE".equals(s.getStatus())));
    }
}
