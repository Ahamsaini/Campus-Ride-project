package com.campusride;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class CampusRideApplication {

    public static void main(String[] args) {
        SpringApplication.run(CampusRideApplication.class, args);
    }
}
