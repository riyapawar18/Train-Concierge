package com.trainconcierge.disruption;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Impact and recommendation settings. Every rule reads its weight from here so the
 * ordering can be tuned without touching rule code.
 */
@Component
@ConfigurationProperties(prefix = "app.disruptions")
public class DisruptionProperties {

    private int hotelUnlockHour = 22;
    private int hotelUnlockWaitHours = 6;
    private int rebookingBufferMinutes = 30;
    private int stationTransferMinutes = 20;
    private int shortDelayMinutes = 60;
    private int fareTolerancePercent = 20;
    private int maxTrains = 5;
    private int maxBuses = 3;
    private int maxRecommendations = 8;
    private int savingsStepMinutes = 30;
    private int savingsStepPoints = 5;
    private int savingsCapPoints = 20;
    private int earlierArrivalPoints = 40;
    private int sameClassPoints = 20;
    private int higherClassPoints = 5;
    private int lowerClassPoints = 10;
    private int fareWithinPoints = 10;
    private int directServicePoints = 15;
    private int trainTypePoints = 5;
    private int busDurationPoints = 20;
    private int waitOptionPoints = 60;

    public int getHotelUnlockHour() {
        return hotelUnlockHour;
    }

    public void setHotelUnlockHour(int hotelUnlockHour) {
        this.hotelUnlockHour = hotelUnlockHour;
    }

    public int getHotelUnlockWaitHours() {
        return hotelUnlockWaitHours;
    }

    public void setHotelUnlockWaitHours(int hotelUnlockWaitHours) {
        this.hotelUnlockWaitHours = hotelUnlockWaitHours;
    }

    public int getRebookingBufferMinutes() {
        return rebookingBufferMinutes;
    }

    public void setRebookingBufferMinutes(int rebookingBufferMinutes) {
        this.rebookingBufferMinutes = rebookingBufferMinutes;
    }

    public int getStationTransferMinutes() {
        return stationTransferMinutes;
    }

    public void setStationTransferMinutes(int stationTransferMinutes) {
        this.stationTransferMinutes = stationTransferMinutes;
    }

    public int getShortDelayMinutes() {
        return shortDelayMinutes;
    }

    public void setShortDelayMinutes(int shortDelayMinutes) {
        this.shortDelayMinutes = shortDelayMinutes;
    }

    public int getFareTolerancePercent() {
        return fareTolerancePercent;
    }

    public void setFareTolerancePercent(int fareTolerancePercent) {
        this.fareTolerancePercent = fareTolerancePercent;
    }

    public int getMaxTrains() {
        return maxTrains;
    }

    public void setMaxTrains(int maxTrains) {
        this.maxTrains = maxTrains;
    }

    public int getMaxBuses() {
        return maxBuses;
    }

    public void setMaxBuses(int maxBuses) {
        this.maxBuses = maxBuses;
    }

    public int getMaxRecommendations() {
        return maxRecommendations;
    }

    public void setMaxRecommendations(int maxRecommendations) {
        this.maxRecommendations = maxRecommendations;
    }

    public int getSavingsStepMinutes() {
        return savingsStepMinutes;
    }

    public void setSavingsStepMinutes(int savingsStepMinutes) {
        this.savingsStepMinutes = savingsStepMinutes;
    }

    public int getSavingsStepPoints() {
        return savingsStepPoints;
    }

    public void setSavingsStepPoints(int savingsStepPoints) {
        this.savingsStepPoints = savingsStepPoints;
    }

    public int getSavingsCapPoints() {
        return savingsCapPoints;
    }

    public void setSavingsCapPoints(int savingsCapPoints) {
        this.savingsCapPoints = savingsCapPoints;
    }

    public int getEarlierArrivalPoints() {
        return earlierArrivalPoints;
    }

    public void setEarlierArrivalPoints(int earlierArrivalPoints) {
        this.earlierArrivalPoints = earlierArrivalPoints;
    }

    public int getSameClassPoints() {
        return sameClassPoints;
    }

    public void setSameClassPoints(int sameClassPoints) {
        this.sameClassPoints = sameClassPoints;
    }

    public int getHigherClassPoints() {
        return higherClassPoints;
    }

    public void setHigherClassPoints(int higherClassPoints) {
        this.higherClassPoints = higherClassPoints;
    }

    public int getLowerClassPoints() {
        return lowerClassPoints;
    }

    public void setLowerClassPoints(int lowerClassPoints) {
        this.lowerClassPoints = lowerClassPoints;
    }

    public int getFareWithinPoints() {
        return fareWithinPoints;
    }

    public void setFareWithinPoints(int fareWithinPoints) {
        this.fareWithinPoints = fareWithinPoints;
    }

    public int getDirectServicePoints() {
        return directServicePoints;
    }

    public void setDirectServicePoints(int directServicePoints) {
        this.directServicePoints = directServicePoints;
    }

    public int getTrainTypePoints() {
        return trainTypePoints;
    }

    public void setTrainTypePoints(int trainTypePoints) {
        this.trainTypePoints = trainTypePoints;
    }

    public int getBusDurationPoints() {
        return busDurationPoints;
    }

    public void setBusDurationPoints(int busDurationPoints) {
        this.busDurationPoints = busDurationPoints;
    }

    public int getWaitOptionPoints() {
        return waitOptionPoints;
    }

    public void setWaitOptionPoints(int waitOptionPoints) {
        this.waitOptionPoints = waitOptionPoints;
    }
}
