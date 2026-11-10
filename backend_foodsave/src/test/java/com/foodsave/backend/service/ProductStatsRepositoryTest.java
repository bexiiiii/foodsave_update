package com.foodsave.backend.service;

import com.foodsave.backend.entity.*;
import com.foodsave.backend.domain.enums.*;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false, properties = {
    "spring.datasource.url=jdbc:h2:mem:product-stats;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = ProductStatsRepositoryTest.Config.class)
@org.springframework.test.context.TestExecutionListeners(listeners = {
    org.springframework.test.context.support.DependencyInjectionTestExecutionListener.class,
    org.springframework.test.context.transaction.TransactionalTestExecutionListener.class
}, mergeMode = org.springframework.test.context.TestExecutionListeners.MergeMode.REPLACE_DEFAULTS)
class ProductStatsRepositoryTest {
    @Configuration @EntityScan(basePackageClasses = Product.class)
    @EnableJpaRepositories(basePackageClasses = ProductRepository.class)
    @org.springframework.data.jpa.repository.config.EnableJpaAuditing
    static class Config { }

    @Autowired EntityManager em;
    @Autowired ProductRepository products;

    @Test void emptyCatalogueHasZeroCounts() {
        var dto = ProductStatsMapping.fromAggregate(products.getProductStats());
        assertEquals(0, dto.getTotalProducts()); assertEquals(0, dto.getActiveProducts());
        assertEquals(0, dto.getOutOfStockProducts()); assertEquals(0, dto.getTotalValue().signum());
    }

    @Test void repositoryAggregatesAllRowsAndRespectsStoreScopeAndDeletion() {
        User user = new User(); user.setFirstName("Stats"); user.setLastName("Test"); user.setEmail("stats@example.test"); user.setPassword("not-a-login"); user.setRole(UserRole.STORE_OWNER); em.persist(user);
        Store first = store(user, "First"), second = store(user, "Second");
        Category category = new Category(); category.setName("Test"); em.persist(category);
        product(first, category, "Active", ProductStatus.AVAILABLE, true, 3, false);
        product(first, category, "Sold out", ProductStatus.OUT_OF_STOCK, true, 0, false);
        product(second, category, "Withdrawn", ProductStatus.DISCONTINUED, false, 2, false);
        product(second, category, "Deleted", ProductStatus.AVAILABLE, true, 10, true);
        em.flush();
        var all = ProductStatsMapping.fromAggregate(products.getProductStats());
        assertEquals(3, all.getTotalProducts()); assertEquals(1, all.getActiveProducts());
        assertEquals(1, all.getOutOfStockProducts()); assertEquals(2, all.getLowStockProducts());
        assertEquals(0, new BigDecimal("500").compareTo(all.getTotalValue()));
        var scoped = ProductStatsMapping.fromAggregate(products.getProductStatsByStoreIdIn(Set.of(first.getId())));
        assertEquals(2, scoped.getTotalProducts()); assertEquals(1, scoped.getActiveProducts());
        assertEquals(0, new BigDecimal("300").compareTo(scoped.getTotalValue()));
    }

    Store store(User owner, String name) {
        Store s = new Store(); s.setOwner(owner); s.setName(name); s.setAddress("Test"); s.setPhone("000000000"); s.setCategory("Test"); s.setStatus(StoreStatus.ACTIVE); s.setActive(true); em.persist(s); return s;
    }
    void product(Store store, Category category, String name, ProductStatus status, boolean active, int stock, boolean deleted) {
        Product p = new Product(); p.setStore(store); p.setCategory(category); p.setName(name); p.setStatus(status); p.setActive(active); p.setStockQuantity(stock); p.setPrice(new BigDecimal("100")); p.setOriginalPrice(new BigDecimal("200")); p.setExpiryDate(LocalDateTime.now().plusDays(1)); if(deleted)p.setDeletedAt(LocalDateTime.now()); em.persist(p);
    }
}
