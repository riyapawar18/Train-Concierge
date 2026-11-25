package com.trainconcierge.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByRole(Role role);

    Page<User> findByRole(Role role, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.role = 'PASSENGER' AND ("
            + "LOWER(u.fullName) LIKE :q OR LOWER(u.email) LIKE :q)")
    Page<User> searchPassengers(@Param("q") String q, Pageable pageable);
}
