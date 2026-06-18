package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Notification;
import com.foodsave.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Найти уведомления пользователя с пагинацией
    Page<Notification> findByUser_Id(Long userId, Pageable pageable);

    // Найти непрочитанные уведомления пользователя
    @Query("SELECT n FROM Notification n WHERE n.user.id = ?1 AND n.read = false")
    Page<Notification> findUnreadByUserId(Long userId, Pageable pageable);

    // Подсчитать количество непрочитанных уведомлений
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = ?1 AND n.read = false")
    Long countUnreadByUserId(Long userId);

    // Найти уведомления по типу
    @Query("SELECT n FROM Notification n WHERE n.type = ?1")
    List<Notification> findByType(String type);

    // Найти уведомления по ID пользователя с сортировкой по дате
    List<Notification> findByUser_IdOrderByCreatedAtDesc(Long userId);

    // Подсчитать количество непрочитанных уведомлений у пользователя
    Long countByUser_IdAndReadFalse(Long userId);

    // Найти уведомления для пользователя с сортировкой по дате
    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    // Подсчитать количество непрочитанных уведомлений у пользователя
    Long countByUserAndReadFalse(User user);

    // Найти непрочитанные уведомления для пользователя
    List<Notification> findByUserAndReadFalse(User user);

    // Исправленный метод для поиска уведомлений по списку ID и пользователю
    List<Notification> findAllByIdInAndUser(List<Long> ids, User user);

    // Найти уведомление по ID и пользователю
    Optional<Notification> findByIdAndUser(Long id, User user);
}
