package com.trainconcierge.catalog;

import com.trainconcierge.catalog.dto.StationResponse;
import com.trainconcierge.catalog.dto.TrainResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/stations")
    public List<StationResponse> searchStations(@RequestParam(name = "q", required = false) String query) {
        return catalogService.searchStations(query);
    }

    @GetMapping("/stations/{code}")
    public StationResponse getStation(@PathVariable String code) {
        return catalogService.getStation(code);
    }

    @GetMapping("/trains/{number}")
    public TrainResponse getTrain(@PathVariable String number) {
        return catalogService.getTrain(number);
    }
}
