package com.foodsave.backend.service;

import com.foodsave.backend.dto.AnalyticsDTO;
import com.foodsave.backend.entity.Order;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.OrderRepository;
import com.foodsave.backend.repository.ProductRepository;
import com.foodsave.backend.repository.StoreRepository;
import com.foodsave.backend.repository.UserRepository;
import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.StringJoiner;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class AnalyticsService {

    private static final DateTimeFormatter REPORT_DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
    private static final DecimalFormat MONEY_FORMAT;

    static {
        DecimalFormatSymbols symbols = DecimalFormatSymbols.getInstance();
        symbols.setGroupingSeparator(' ');
        MONEY_FORMAT = new DecimalFormat("#,##0 ₸", symbols);
    }

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final SecurityUtil securityUtil;

    public List<AnalyticsDTO.DailySalesAnalytics> getDailySalesAnalytics(LocalDate startDate, LocalDate endDate) {
        return getDailySalesAnalytics(startDate, endDate, null);
    }
    
    public List<AnalyticsDTO.DailySalesAnalytics> getDailySalesAnalytics(LocalDate startDate, LocalDate endDate, Long storeId) {
        log.info("Getting daily sales analytics for period {} to {}, storeId: {}", startDate, endDate, storeId);
        
        List<Store> stores = getAccessibleStores();
        
        if (stores.isEmpty()) {
            log.warn("No accessible stores found for current user");
            return List.of();
        }
        
        // Filter by specific store if provided
        if (storeId != null) {
            stores = stores.stream()
                    .filter(store -> store.getId().equals(storeId))
                    .collect(Collectors.toList());
            
            if (stores.isEmpty()) {
                log.warn("Store with ID {} not found or not accessible for current user", storeId);
                return List.of();
            }
        }
        
        log.info("Found {} accessible stores", stores.size());
        
        // Получаем ID магазинов для оптимизированного запроса
        List<Long> storeIds = stores.stream()
                .map(Store::getId)
                .collect(Collectors.toList());
        
        // Делаем один запрос для получения всех заказов за период
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        log.info("Fetching orders for stores {} from {} to {}", storeIds, startDateTime, endDateTime);
        
        List<Order> allOrders = orderRepository.findByStoreIdInAndCreatedAtBetween(
                storeIds, startDateTime, endDateTime);
        
        log.info("Found {} orders for the period", allOrders.size());
        
        // Группируем заказы по магазину и дате
        Map<String, List<Order>> ordersByStoreAndDate = allOrders.stream()
                .collect(Collectors.groupingBy(order -> {
                    LocalDate orderDate = order.getCreatedAt().toLocalDate();
                    return order.getStore().getId() + "_" + orderDate.toString();
                }));
        
        // Создаем результат для каждого дня и магазина
        List<AnalyticsDTO.DailySalesAnalytics> result = new ArrayList<>();
        
        for (Store store : stores) {
            startDate.datesUntil(endDate.plusDays(1)).forEach(date -> {
                String key = store.getId() + "_" + date.toString();
                List<Order> dayOrders = ordersByStoreAndDate.getOrDefault(key, List.of());
                
                List<Order> completedOrders = dayOrders.stream()
                        .filter(order -> order.getStatus() == OrderStatus.DELIVERED)
                        .collect(Collectors.toList());
                
                List<Order> canceledOrders = dayOrders.stream()
                        .filter(order -> order.getStatus() == OrderStatus.CANCELLED)
                        .collect(Collectors.toList());
                
                BigDecimal totalRevenue = dayOrders.stream()
                        .map(Order::getTotal)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                BigDecimal completedRevenue = completedOrders.stream()
                        .map(Order::getTotal)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                BigDecimal canceledRevenue = canceledOrders.stream()
                        .map(Order::getTotal)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                result.add(AnalyticsDTO.DailySalesAnalytics.builder()
                        .storeId(store.getId())
                        .storeName(store.getName())
                        .date(date)
                        .totalOrders(dayOrders.size())
                        .completedOrders(completedOrders.size())
                        .canceledOrders(canceledOrders.size())
                        .totalRevenue(totalRevenue)
                        .completedRevenue(completedRevenue)
                        .canceledRevenue(canceledRevenue)
                        .build());
            });
        }
        
        log.info("Generated {} daily analytics records", result.size());
        return result;
    }

    public List<AnalyticsDTO.DailySalesOrderDetail> getDailySalesOrderDetails(LocalDate startDate, LocalDate endDate, Long storeId) {
        log.info("Getting daily sales order details for period {} to {}, storeId: {}", startDate, endDate, storeId);

        List<Store> stores = getAccessibleStores();
        if (storeId != null) {
            stores = stores.stream()
                    .filter(store -> Objects.equals(store.getId(), storeId))
                    .collect(Collectors.toList());
        }

        if (stores.isEmpty()) {
            return List.of();
        }

        List<Long> storeIds = stores.stream().map(Store::getId).collect(Collectors.toList());
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        return orderRepository.findDetailedByStoreIdInAndCreatedAtBetween(storeIds, startDateTime, endDateTime)
                .stream()
                .map(this::toDailySalesOrderDetail)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getGeneralAnalytics() {
        UserRole currentUserRole = securityUtil.getCurrentUserRole();
        
        Map<String, Object> data = new HashMap<>();
        
        if (currentUserRole == UserRole.SUPER_ADMIN) {
            // Супер админ видит все данные
            data.put("totalOrders", orderRepository.count());
            data.put("totalProducts", productRepository.count());
            data.put("totalStores", storeRepository.count());
            data.put("totalUsers", userRepository.count());
            
            // Calculate total revenue (handle null case)
            BigDecimal totalRevenue = orderRepository.sumTotal();
            data.put("totalRevenue", totalRevenue != null ? totalRevenue : BigDecimal.ZERO);
        } else {
            // Менеджеры и владельцы видят только данные своих магазинов
            List<Store> accessibleStores = getAccessibleStores();
            List<Long> storeIds = accessibleStores.stream()
                .map(Store::getId)
                .collect(Collectors.toList());
            
            if (!storeIds.isEmpty()) {
                long totalOrders = orderRepository.countByStoreIdIn(storeIds);
                long totalProducts = productRepository.countByStoreIdIn(storeIds);
                BigDecimal totalRevenue = orderRepository.sumTotalByStoreIdIn(storeIds);
                
                data.put("totalOrders", totalOrders);
                data.put("totalProducts", totalProducts);
                data.put("totalStores", accessibleStores.size());
                data.put("totalUsers", 0); // Менеджеры не видят общее количество пользователей
                data.put("totalRevenue", totalRevenue != null ? totalRevenue : BigDecimal.ZERO);
                
                // Добавляем детальную статистику для сегодняшнего дня
                LocalDateTime today = LocalDate.now().atStartOfDay();
                LocalDateTime endOfToday = LocalDate.now().atTime(23, 59, 59);
                
                List<Order> todayOrders = orderRepository.findByStoreIdInAndCreatedAtBetween(storeIds, today, endOfToday);
                long todayCompletedOrders = todayOrders.stream()
                    .filter(order -> order.getStatus() == OrderStatus.DELIVERED)
                    .count();
                long todayCancelledOrders = todayOrders.stream()
                    .filter(order -> order.getStatus() == OrderStatus.CANCELLED)
                    .count();
                
                BigDecimal todayRevenue = todayOrders.stream()
                    .filter(order -> order.getStatus() == OrderStatus.DELIVERED)
                    .map(Order::getTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                data.put("todayOrders", todayOrders.size());
                data.put("todayCompletedOrders", todayCompletedOrders);
                data.put("todayCancelledOrders", todayCancelledOrders);
                data.put("todayRevenue", todayRevenue);
            } else {
                // Если у пользователя нет доступных магазинов
                data.put("totalOrders", 0);
                data.put("totalProducts", 0);
                data.put("totalStores", 0);
                data.put("totalUsers", 0);
                data.put("totalRevenue", BigDecimal.ZERO);
                data.put("todayOrders", 0);
                data.put("todayCompletedOrders", 0);
                data.put("todayCancelledOrders", 0);
                data.put("todayRevenue", BigDecimal.ZERO);
            }
        }

        appendGeneralBreakdowns(data, getAccessibleStores().stream()
                .map(Store::getId)
                .collect(Collectors.toList()));
        
        return data;
    }

    private AnalyticsDTO.DailySalesOrderDetail toDailySalesOrderDetail(Order order) {
        User buyer = order.getUser();
        Store store = order.getStore();

        List<AnalyticsDTO.DailySalesOrderItem> items = order.getItems() == null
                ? List.of()
                : order.getItems().stream()
                        .map(item -> {
                            var product = item.getProduct();
                            return AnalyticsDTO.DailySalesOrderItem.builder()
                                    .productId(product != null ? product.getId() : null)
                                    .productName(product != null ? product.getName() : null)
                                    .productDescription(product != null ? product.getDescription() : null)
                                    .quantity(item.getQuantity())
                                    .unitPrice(item.getUnitPrice())
                                    .totalPrice(item.getTotalPrice() != null ? item.getTotalPrice() : item.getTotal())
                                    .itemSummary(buildItemSummary(
                                            product != null ? product.getId() : null,
                                            product != null ? product.getName() : null,
                                            product != null ? product.getDescription() : null,
                                            item.getQuantity(),
                                            item.getUnitPrice(),
                                            item.getTotalPrice() != null ? item.getTotalPrice() : item.getTotal()
                                    ))
                                    .build();
                        })
                        .collect(Collectors.toList());

        String orderSummary = buildOrderSummary(order);
        String buyerSummary = buildBuyerSummary(buyer, order.getContactPhone());
        String telegramSummary = buildTelegramSummary(buyer);
        String storeSummary = buildStoreSummary(store);
        String addressSummary = buildAddressSummary(store, order);

        return AnalyticsDTO.DailySalesOrderDetail.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .orderDate(order.getCreatedAt() != null ? order.getCreatedAt().toLocalDate() : null)
                .orderCreatedAt(order.getCreatedAt())
                .orderStatus(order.getStatus() != null ? order.getStatus().name() : null)
                .buyerId(buyer != null ? buyer.getId() : null)
                .buyerName(resolveBuyerName(buyer))
                .buyerPhone(buyer != null ? buyer.getPhone() : null)
                .buyerTelegramUserId(buyer != null ? buyer.getTelegramUserId() : null)
                .buyerTelegramUsername(buyer != null ? buyer.getTelegramUsername() : null)
                .contactPhone(order.getContactPhone())
                .orderSummary(orderSummary)
                .buyerSummary(buyerSummary)
                .telegramSummary(telegramSummary)
                .storeSummary(storeSummary)
                .addressSummary(addressSummary)
                .detailSummary(joinParts(orderSummary, buyerSummary, telegramSummary, storeSummary, addressSummary))
                .storeId(store != null ? store.getId() : null)
                .storeName(store != null ? store.getName() : null)
                .storeAddress(store != null ? store.getAddress() : null)
                .deliveryAddress(order.getDeliveryAddress())
                .orderTotal(order.getTotal())
                .items(items)
                .build();
    }

    private void appendGeneralBreakdowns(Map<String, Object> data, List<Long> storeIds) {
        if (storeIds == null || storeIds.isEmpty()) {
            data.put("salesByDay", List.of());
            data.put("salesByMonth", List.of());
            data.put("topProducts", List.of());
            data.put("topStores", List.of());
            data.put("topCategories", List.of());
            data.put("orderStatusDistribution", List.of());
            data.put("paymentMethodDistribution", List.of());
            return;
        }

        LocalDate today = LocalDate.now();
        LocalDate yearStart = today.withDayOfYear(1);
        LocalDate last30Start = today.minusDays(29);

        List<Order> yearOrders = orderRepository.findDetailedByStoreIdInAndCreatedAtBetween(
                storeIds, yearStart.atStartOfDay(), today.atTime(23, 59, 59));

        data.put("salesByDay", buildSalesByDay(yearOrders, last30Start, today));
        data.put("salesByMonth", buildSalesByMonth(yearOrders, yearStart, today));
        data.put("topProducts", buildTopProducts(yearOrders));
        data.put("topStores", buildTopStores(yearOrders));
        data.put("topCategories", buildTopCategories(yearOrders));
        data.put("orderStatusDistribution", buildStatusDistribution(yearOrders));
        data.put("paymentMethodDistribution", buildPaymentMethodDistribution(yearOrders));
    }

    private List<Map<String, Object>> buildSalesByDay(List<Order> orders, LocalDate start, LocalDate end) {
        Map<LocalDate, List<Order>> byDate = orders.stream()
                .filter(order -> order.getCreatedAt() != null)
                .filter(order -> !order.getCreatedAt().toLocalDate().isBefore(start))
                .collect(Collectors.groupingBy(order -> order.getCreatedAt().toLocalDate()));

        List<Map<String, Object>> result = new ArrayList<>();
        start.datesUntil(end.plusDays(1)).forEach(date -> {
            List<Order> dayOrders = byDate.getOrDefault(date, List.of());
            result.add(Map.of(
                    "date", date.toString(),
                    "amount", sumOrderTotals(dayOrders),
                    "orders", dayOrders.size()
            ));
        });
        return result;
    }

    private List<Map<String, Object>> buildSalesByMonth(List<Order> orders, LocalDate start, LocalDate end) {
        Map<String, List<Order>> byMonth = orders.stream()
                .filter(order -> order.getCreatedAt() != null)
                .collect(Collectors.groupingBy(order -> {
                    LocalDate date = order.getCreatedAt().toLocalDate();
                    return String.format("%02d.%d", date.getMonthValue(), date.getYear());
                }, LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate cursor = start.withDayOfMonth(1);
        LocalDate last = end.withDayOfMonth(1);
        while (!cursor.isAfter(last)) {
            String month = String.format("%02d.%d", cursor.getMonthValue(), cursor.getYear());
            List<Order> monthOrders = byMonth.getOrDefault(month, List.of());
            result.add(Map.of(
                    "month", month,
                    "amount", sumOrderTotals(monthOrders),
                    "orders", monthOrders.size()
            ));
            cursor = cursor.plusMonths(1);
        }
        return result;
    }

    private List<Map<String, Object>> buildTopProducts(List<Order> orders) {
        Map<Long, Aggregate> aggregates = new HashMap<>();
        for (Order order : orders) {
            if (order.getItems() == null) continue;
            for (var item : order.getItems()) {
                if (item.getProduct() == null || item.getProduct().getId() == null) continue;
                Long productId = item.getProduct().getId();
                Aggregate aggregate = aggregates.computeIfAbsent(productId,
                        ignored -> new Aggregate(productId, item.getProduct().getName()));
                aggregate.add(item.getQuantity(), item.getTotalPrice() != null ? item.getTotalPrice() : item.getTotal());
            }
        }
        return aggregates.values().stream()
                .sorted(Comparator.comparing(Aggregate::revenue).reversed())
                .limit(10)
                .map(Aggregate::toProductMap)
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildTopStores(List<Order> orders) {
        Map<Long, Aggregate> aggregates = new HashMap<>();
        for (Order order : orders) {
            if (order.getStore() == null || order.getStore().getId() == null) continue;
            Long storeId = order.getStore().getId();
            Aggregate aggregate = aggregates.computeIfAbsent(storeId,
                    ignored -> new Aggregate(storeId, order.getStore().getName()));
            aggregate.add(1, order.getTotal());
        }
        return aggregates.values().stream()
                .sorted(Comparator.comparing(Aggregate::revenue).reversed())
                .limit(10)
                .map(Aggregate::toStoreMap)
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildTopCategories(List<Order> orders) {
        Map<String, Aggregate> aggregates = new HashMap<>();
        for (Order order : orders) {
            if (order.getItems() == null) continue;
            for (var item : order.getItems()) {
                if (item.getProduct() == null || item.getProduct().getCategory() == null) continue;
                String categoryName = item.getProduct().getCategory().getName();
                Aggregate aggregate = aggregates.computeIfAbsent(categoryName,
                        ignored -> new Aggregate(null, categoryName));
                aggregate.add(item.getQuantity(), item.getTotalPrice() != null ? item.getTotalPrice() : item.getTotal());
            }
        }
        return aggregates.values().stream()
                .sorted(Comparator.comparing(Aggregate::revenue).reversed())
                .limit(10)
                .map(Aggregate::toCategoryMap)
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildStatusDistribution(List<Order> orders) {
        long total = orders.size();
        return orders.stream()
                .filter(order -> order.getStatus() != null)
                .collect(Collectors.groupingBy(order -> order.getStatus().name(), Collectors.counting()))
                .entrySet()
                .stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> Map.<String, Object>of(
                        "status", entry.getKey(),
                        "count", entry.getValue(),
                        "percentage", percentage(entry.getValue(), total)
                ))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildPaymentMethodDistribution(List<Order> orders) {
        long total = orders.size();
        return orders.stream()
                .filter(order -> order.getPaymentMethod() != null)
                .collect(Collectors.groupingBy(order -> order.getPaymentMethod().name(), Collectors.counting()))
                .entrySet()
                .stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> Map.<String, Object>of(
                        "method", entry.getKey(),
                        "count", entry.getValue(),
                        "percentage", percentage(entry.getValue(), total)
                ))
                .collect(Collectors.toList());
    }

    private BigDecimal sumOrderTotals(List<Order> orders) {
        return orders.stream()
                .map(order -> order.getTotal() != null ? order.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private double percentage(long value, long total) {
        return total == 0 ? 0 : (value * 100.0) / total;
    }

    private String resolveBuyerName(User buyer) {
        if (buyer == null) {
            return null;
        }
        String name = java.util.stream.Stream.of(buyer.getFirstName(), buyer.getLastName())
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining(" "));
        if (!name.isBlank()) {
            return name;
        }
        if (buyer.getTelegramUsername() != null && !buyer.getTelegramUsername().isBlank()) {
            return "@" + buyer.getTelegramUsername();
        }
        return buyer.getTelegramUserId() != null ? "TG ID " + buyer.getTelegramUserId() : null;
    }

    private String buildOrderSummary(Order order) {
        String date = order.getCreatedAt() != null ? order.getCreatedAt().format(REPORT_DATE_TIME_FORMAT) : null;
        String status = order.getStatus() != null ? order.getStatus().name() : null;
        return joinParts(
                order.getOrderNumber() != null ? "Код " + order.getOrderNumber() : order.getId() != null ? "ID заказа " + order.getId() : null,
                date,
                status,
                order.getTotal() != null ? formatMoney(order.getTotal()) : null
        );
    }

    private String buildBuyerSummary(User buyer, String contactPhone) {
        if (buyer == null) {
            return contactPhone != null ? "Телефон заказа " + contactPhone : null;
        }
        return joinParts(
                buyer.getId() != null ? "ID " + buyer.getId() : null,
                resolveBuyerName(buyer),
                buyer.getPhone() != null ? "Телефон " + buyer.getPhone() : null,
                contactPhone != null && !Objects.equals(contactPhone, buyer.getPhone()) ? "Телефон заказа " + contactPhone : null
        );
    }

    private String buildTelegramSummary(User buyer) {
        if (buyer == null) {
            return null;
        }
        String username = buyer.getTelegramUsername();
        if (username != null && !username.isBlank() && !username.startsWith("@")) {
            username = "@" + username;
        }
        return joinParts(
                buyer.getTelegramUserId() != null ? "TG ID " + buyer.getTelegramUserId() : null,
                username
        );
    }

    private String buildStoreSummary(Store store) {
        if (store == null) {
            return null;
        }
        return joinParts(
                store.getId() != null ? "ID " + store.getId() : null,
                store.getName()
        );
    }

    private String buildAddressSummary(Store store, Order order) {
        return joinParts(
                store != null && store.getAddress() != null ? "Заведение: " + store.getAddress() : null,
                order.getDeliveryAddress() != null ? "Заказ: " + order.getDeliveryAddress() : null
        );
    }

    private String buildItemSummary(Long productId,
                                    String productName,
                                    String productDescription,
                                    Integer quantity,
                                    BigDecimal unitPrice,
                                    BigDecimal totalPrice) {
        return joinParts(
                productId != null ? "ID " + productId : null,
                productName,
                quantity != null ? "x" + quantity : null,
                unitPrice != null ? formatMoney(unitPrice) : null,
                totalPrice != null ? "итого " + formatMoney(totalPrice) : null,
                productDescription
        );
    }

    private String joinParts(String... parts) {
        StringJoiner joiner = new StringJoiner(" · ");
        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                joiner.add(part.trim());
            }
        }
        String value = joiner.toString();
        return value.isBlank() ? null : value;
    }

    private String formatMoney(BigDecimal value) {
        if (value == null) {
            return null;
        }
        synchronized (MONEY_FORMAT) {
            return MONEY_FORMAT.format(value);
        }
    }
    
    /**
     * Получить магазины, доступные текущему пользователю
     */
    private List<Store> getAccessibleStores() {
        UserRole currentUserRole = securityUtil.getCurrentUserRole();
        Long currentUserId = securityUtil.getCurrentUserId();
        
        if (currentUserRole == UserRole.SUPER_ADMIN) {
            return storeRepository.findAll();
        } else if (currentUserRole == UserRole.STORE_MANAGER) {
            // Менеджер видит только магазин, которым управляет
            User manager = userRepository.findById(currentUserId).orElse(null);
            if (manager != null) {
                List<Store> managedStores = storeRepository.findByManager(manager, org.springframework.data.domain.Pageable.unpaged()).getContent();
                log.info("Manager {} has access to {} stores", currentUserId, managedStores.size());
                return managedStores;
            }
        } else if (currentUserRole == UserRole.STORE_OWNER) {
            // Владелец видит свои магазины
            User owner = userRepository.findById(currentUserId).orElse(null);
            if (owner != null) {
                List<Store> ownedStores = storeRepository.findByOwner(owner, org.springframework.data.domain.Pageable.unpaged()).getContent();
                log.info("Owner {} has access to {} stores", currentUserId, ownedStores.size());
                return ownedStores;
            }
        }
        
        return List.of(); // Пустой список для всех остальных ролей
    }

    private static class Aggregate {
        private final Long id;
        private final String name;
        private long sales;
        private BigDecimal revenue = BigDecimal.ZERO;

        private Aggregate(Long id, String name) {
            this.id = id;
            this.name = name;
        }

        private void add(Integer quantity, BigDecimal amount) {
            this.sales += quantity != null ? quantity : 0;
            this.revenue = this.revenue.add(amount != null ? amount : BigDecimal.ZERO);
        }

        private BigDecimal revenue() {
            return revenue;
        }

        private Map<String, Object> toProductMap() {
            return Map.of("id", id, "name", name != null ? name : "—", "sales", sales, "revenue", revenue);
        }

        private Map<String, Object> toStoreMap() {
            return Map.of("id", id, "name", name != null ? name : "—", "sales", sales, "revenue", revenue);
        }

        private Map<String, Object> toCategoryMap() {
            return Map.of("name", name != null ? name : "—", "sales", sales, "revenue", revenue);
        }
    }
}
