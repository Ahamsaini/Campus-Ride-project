package com.campusride.repository;

import com.campusride.entity.SearchEngagementLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface SearchEngagementLogRepository extends JpaRepository<SearchEngagementLog, UUID> {

    @Query(value = "SELECT * FROM search_engagement_logs WHERE results_found = false", nativeQuery = true)
    List<SearchEngagementLog> findUnmetDemand();

    @Query(value = "SELECT ST_AsText(pickup_location) as location, count(*) as count FROM search_engagement_logs GROUP BY location", nativeQuery = true)
    List<Object[]> getSearchHeatmapData();
}
