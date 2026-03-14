package com.campusride.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final RedisTemplate<String, String> redisTemplate;

    private static final Duration TTL = Duration.ofMinutes(5);

    private static final String GEO_KEY = "rides:active:locations";

    public void saveLocation(UUID rideId, double lat, double lng) {
        String key = "ride:location:" + rideId;
        String jsonValue = String.format("{\"lat\":%.6f,\"lng\":%.6f,\"timestamp\":%d}", lat, lng,
                System.currentTimeMillis());
        redisTemplate.opsForValue().set(key, jsonValue, TTL);

        // Update Geo index for proximity search
        redisTemplate.opsForGeo().add(GEO_KEY, new org.springframework.data.geo.Point(lng, lat), rideId.toString());
    }

    public String getLocation(UUID rideId) {
        return redisTemplate.opsForValue().get("ride:location:" + rideId);
    }

    public java.util.List<UUID> findNearbyRides(double lat, double lng, double radiusKm) {
        org.springframework.data.geo.Circle circle = new org.springframework.data.geo.Circle(
                new org.springframework.data.geo.Point(lng, lat),
                new org.springframework.data.geo.Distance(radiusKm,
                        org.springframework.data.redis.domain.geo.Metrics.KILOMETERS));

        org.springframework.data.redis.connection.RedisGeoCommands.GeoRadiusCommandArgs args = org.springframework.data.redis.connection.RedisGeoCommands.GeoRadiusCommandArgs
                .newGeoRadiusArgs().includeDistance();

        org.springframework.data.geo.GeoResults<org.springframework.data.redis.connection.RedisGeoCommands.GeoLocation<String>> results = redisTemplate
                .opsForGeo().radius(GEO_KEY, circle, args);

        java.util.List<UUID> rideIds = new java.util.ArrayList<>();
        if (results != null) {
            for (org.springframework.data.geo.GeoResult<org.springframework.data.redis.connection.RedisGeoCommands.GeoLocation<String>> result : results) {
                rideIds.add(UUID.fromString(result.getContent().getName()));
            }
        }
        return rideIds;
    }

    public void removeLocation(UUID rideId) {
        redisTemplate.delete("ride:location:" + rideId);
        redisTemplate.opsForZSet().remove(GEO_KEY, rideId.toString());
    }
}
