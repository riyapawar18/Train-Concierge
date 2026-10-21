package com.trainconcierge.provider;

import com.trainconcierge.dto.TrainSearchResult;

import java.time.LocalDate;
import java.util.List;

/**
 * Abstraction over any train data source (database, external API, etc.).
 * Implementations: DatabaseTrainProvider (always available),
 *                  RailRadarTrainProvider (when API key is configured).
 */
public interface TrainDataProvider {

    /**
     * Return a human-readable name for this provider (used in search response metadata).
     */
    String providerName();

    /**
     * Search for trains running between from and to on the given date
     * with at least the requested number of available seats.
     *
     * @param from   Source station name or code (case-insensitive).
     * @param to     Destination station name or code (case-insensitive).
     * @param date   Journey date.
     * @param seats  Minimum seats required.
     * @return       List of matching trains normalised into {@link TrainSearchResult}.
     * @throws TrainProviderException on provider error (distinct from empty results).
     */
    List<TrainSearchResult> search(String from, String to, LocalDate date, int seats);
}
