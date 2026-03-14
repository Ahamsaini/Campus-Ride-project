package com.campusride.repository;

import com.campusride.entity.RideTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface RideTemplateRepository extends JpaRepository<RideTemplate, UUID> {
    List<RideTemplate> findByCreatorId(UUID creatorId);

    List<RideTemplate> findByActiveTrue();
}
