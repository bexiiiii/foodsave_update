package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.*;
import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.entity.*;
import com.foodsave.backend.repository.*;
import com.foodsave.backend.security.AuthorizationService;
import com.foodsave.backend.util.ProductAvailability;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:deletion;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.show-sql=false",
        "spring.jpa.properties.hibernate.hbm2ddl.halt_on_error=true"
})
@org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase(replace = org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = ProductDeletionTest.Config.class)
class ProductDeletionTest {
    @Configuration
    @EntityScan(basePackageClasses = Product.class)
    @EnableJpaRepositories(basePackageClasses = ProductRepository.class)
    @org.springframework.data.jpa.repository.config.EnableJpaAuditing
    static class Config { }

    @Autowired EntityManager em;
    @Autowired ProductRepository products;
    final AuthorizationService authorization = mock(AuthorizationService.class);

    ProductService service() {
        return new ProductService(products, null, null, null, null, null, null,
                null, null, null, authorization, null, null, null);
    }

    Product fixture() {
        User user = new User();
        user.setFirstName("Deletion"); user.setLastName("Test");
        user.setEmail("deletion@example.test"); user.setPassword("not-a-login");
        user.setRole(com.foodsave.backend.domain.enums.UserRole.STORE_OWNER);
        em.persist(user);
        Store store = new Store();
        store.setName("Test store"); store.setAddress("Test address");
        store.setPhone("000000000"); store.setCategory("Test");
        store.setOwner(user); store.setActive(true); store.setStatus(StoreStatus.ACTIVE);
        em.persist(store);
        Category category = new Category(); category.setName("Test category"); em.persist(category);
        Product product = new Product();
        product.setName("History test box"); product.setStore(store); product.setCategory(category);
        product.setPrice(BigDecimal.TEN); product.setOriginalPrice(BigDecimal.valueOf(20));
        product.setStockQuantity(3); product.setExpiryDate(LocalDateTime.now().plusDays(3));
        // Production has separate inventory counters; older deployments only have stockQuantity.
        var inventory = new org.springframework.beans.BeanWrapperImpl(product);
        if (inventory.isWritableProperty("availableQuantity")) {
            inventory.setPropertyValue("availableQuantity", 3);
            inventory.setPropertyValue("totalQuantity", 4);
            inventory.setPropertyValue("reservedQuantity", 1);
        }
        product.getImages().add("/uploads/history-test.jpg");
        em.persist(product);
        Order order = new Order();
        order.setUser(user); order.setStore(store); order.setContactPhone("000000000");
        order.setSubtotal(BigDecimal.TEN); order.setTotal(BigDecimal.TEN);
        order.setOrderNumber("DELETION-TEST"); order.setPaymentMethod(PaymentMethod.CASH);
        em.persist(order);
        OrderItem orderItem = new OrderItem();
        orderItem.setOrder(order); orderItem.setProduct(product); orderItem.setQuantity(1);
        orderItem.setUnitPrice(BigDecimal.TEN); orderItem.setTotalPrice(BigDecimal.TEN);
        em.persist(orderItem);
        NotificationGroup group = new NotificationGroup();
        group.setUser(user); group.setStatus(NotificationGroupStatus.SENT);
        group.setScheduledAt(LocalDateTime.now()); group.setSentAt(LocalDateTime.now());
        em.persist(group);
        NotificationGroupItem item = new NotificationGroupItem();
        item.setNotificationGroup(group); item.setPartner(store); item.setBranch(store); item.setBox(product);
        item.setPrice(BigDecimal.TEN); item.setAvailableQuantity(3);
        em.persist(item);
        em.flush(); em.clear();
        return products.findById(product.getId()).orElseThrow();
    }

    @Test
    void deletesFromCatalogWithoutDeletingHistoricalRelationshipsOrImages() {
        Product product = fixture();
        long id = product.getId();
        long storeId = product.getStore().getId();
        assertTrue(ProductAvailability.isAvailable(product));
        service().deleteProduct(id);
        em.clear();
        Product kept = products.findById(id).orElseThrow();
        assertNotNull(kept.getDeletedAt());
        assertFalse(kept.getActive());
        assertEquals(ProductStatus.DISCONTINUED, kept.getStatus());
        assertEquals(3, kept.getStockQuantity());
        assertEquals("/uploads/history-test.jpg", kept.getImages().get(0));
        assertEquals("History test box", em.createQuery("select i.product.name from OrderItem i", String.class).getSingleResult());
        assertEquals(id, em.createQuery("select i.box.id from NotificationGroupItem i", Long.class).getSingleResult());
        assertEquals(BigDecimal.TEN.setScale(2), em.createQuery("select i.unitPrice from OrderItem i", BigDecimal.class).getSingleResult());
        assertEquals(1L, em.createQuery("select count(o) from Order o", Long.class).getSingleResult());
        assertEquals(1L, em.createQuery("select count(g) from NotificationGroup g", Long.class).getSingleResult());
        var page = PageRequest.of(0, 20);
        assertTrue(products.findAllWithStoreAndCategory(page).isEmpty());
        assertTrue(products.findByStoreId(storeId, page).isEmpty());
        assertTrue(products.findByStoreIdIn(Set.of(storeId), page).isEmpty());
        assertTrue(products.findByCategory(kept.getCategory(), page).isEmpty());
        assertTrue(products.findByStockQuantityLessThanEqual(10, page).isEmpty());
        assertThrows(EntityNotFoundException.class, () -> service().getProductById(id));
        assertThrows(IllegalStateException.class, () -> service().reserveProductStock(id, 1));
        assertThrows(EntityNotFoundException.class, () -> service().updateProduct(id, new ProductDTO()));
        assertThrows(EntityNotFoundException.class, () -> service().updateStockQuantity(id, 10));
        assertThrows(EntityNotFoundException.class, () -> service().updateProductStatus(id, ProductStatus.AVAILABLE));
        var deletedAt = kept.getDeletedAt();
        service().deleteProduct(id);
        assertEquals(deletedAt, products.findById(id).orElseThrow().getDeletedAt());
    }

    @Test
    void deniedDeletionDoesNotMutateProductOrHistory() {
        Product product = fixture();
        doThrow(new SecurityException("denied")).when(authorization).requireCanManageStore(product.getStore().getId());
        assertThrows(SecurityException.class, () -> service().deleteProduct(product.getId()));
        assertNull(product.getDeletedAt());
        assertTrue(product.getActive());
        assertEquals(1L, em.createQuery("select count(i) from OrderItem i", Long.class).getSingleResult());
    }

    @Test
    void deletedMarkerPreventsReservationEvenIfOtherFieldsAreChanged() {
        Product product = fixture();
        service().deleteProduct(product.getId());
        product.setActive(true);
        product.setStatus(ProductStatus.AVAILABLE);
        assertFalse(ProductAvailability.isAvailable(product));
    }
}
