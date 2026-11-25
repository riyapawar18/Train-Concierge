package com.trainconcierge.disruption;

import com.trainconcierge.common.security.CurrentUser;
import com.trainconcierge.disruption.dto.DisruptionDetailResponse;
import com.trainconcierge.disruption.dto.DisruptionListItemResponse;
import com.trainconcierge.disruption.dto.DisruptionPreviewResponse;
import com.trainconcierge.disruption.dto.DisruptionRequest;
import com.trainconcierge.disruption.dto.DisruptionUpdateRequest;
import com.trainconcierge.disruption.dto.ImpactDetailResponse;
import com.trainconcierge.disruption.dto.TrainSuggestionResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/disruptions")
public class AdminDisruptionController {

    private final DisruptionService disruptionService;

    public AdminDisruptionController(DisruptionService disruptionService) {
        this.disruptionService = disruptionService;
    }

    @GetMapping
    public List<DisruptionListItemResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String train,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return disruptionService.list(status, train, date);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DisruptionDetailResponse create(@RequestBody DisruptionRequest request) {
        return disruptionService.create(request, CurrentUser.id());
    }

    @PostMapping("/preview")
    public DisruptionPreviewResponse preview(@RequestBody DisruptionRequest request) {
        return disruptionService.preview(request);
    }

    @GetMapping("/trains")
    public List<TrainSuggestionResponse> trains(@RequestParam(required = false) String q) {
        return disruptionService.searchTrains(q);
    }

    @GetMapping("/{id}")
    public DisruptionDetailResponse detail(@PathVariable Long id) {
        return disruptionService.detail(id);
    }

    @GetMapping("/{id}/impacts")
    public List<ImpactDetailResponse> impacts(@PathVariable Long id) {
        return disruptionService.impacts(id);
    }

    @PatchMapping("/{id}")
    public DisruptionDetailResponse update(@PathVariable Long id,
                                           @RequestBody DisruptionUpdateRequest request) {
        return disruptionService.update(id, request, CurrentUser.id());
    }

    @PatchMapping("/{id}/resolve")
    public DisruptionDetailResponse resolve(@PathVariable Long id) {
        return disruptionService.resolve(id, CurrentUser.id());
    }
}
