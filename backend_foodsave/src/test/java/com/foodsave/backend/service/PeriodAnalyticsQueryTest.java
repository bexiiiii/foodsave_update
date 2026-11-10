package com.foodsave.backend.service;
import com.foodsave.backend.domain.enums.UserRole;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class PeriodAnalyticsQueryTest {
 JdbcTemplate jdbc;PeriodAnalyticsQuery query;LocalDate day=LocalDate.of(2026,11,10);
 @BeforeEach void setup(){jdbc=new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=PostgreSQL;DB_CLOSE_DELAY=-1","sa",""));
 jdbc.execute("CREATE TABLE stores(id BIGINT,name VARCHAR,owner_id BIGINT,manager_id BIGINT)");
 jdbc.execute("CREATE TABLE orders(id BIGINT,store_id BIGINT,status VARCHAR,total NUMERIC(20,2),created_at TIMESTAMP,picked_up_at TIMESTAMP,completed_at TIMESTAMP,payment_method VARCHAR)");
 jdbc.execute("CREATE TABLE products(id BIGINT,name VARCHAR,category_id BIGINT)");jdbc.execute("CREATE TABLE categories(id BIGINT,name VARCHAR)");jdbc.execute("CREATE TABLE order_items(order_id BIGINT,product_id BIGINT,quantity INT,total_price NUMERIC(20,2))");
 jdbc.update("INSERT INTO stores VALUES(1,'One',10,30),(2,'Two',20,40)");jdbc.update("INSERT INTO categories VALUES(1,'Bakery')");jdbc.update("INSERT INTO products VALUES(1,'Box',1)");query=new PeriodAnalyticsQuery(jdbc);
 add(1,1,"PICKED_UP",2500,"2026-11-10 10:00:00");add(2,1,"CANCELLED",9000,null);add(3,1,"CREATED",10000,null);add(4,1,"PICKED_UP",77074403678.4,"2026-11-10 11:00:00");add(5,2,"COMPLETED",3500,"2026-11-10 12:00:00");
 }
 void add(long id,long store,String status,double total,String issued){jdbc.update("INSERT INTO orders VALUES(?,?,?,?,TIMESTAMP '2026-10-01 10:00:00',?,NULL,'CASH')",id,store,status,total,issued==null?null:java.sql.Timestamp.valueOf(issued));jdbc.update("INSERT INTO order_items VALUES(?,1,1,?)",id,total);}
 @Test void onlyIssuedOrdersContributeToAllMoneyViews(){var r=query.report(UserRole.SUPER_ADMIN,1L,day,day,null);assertEquals(2,r.get("totalOrders"));assertEquals(new BigDecimal("6000.00"),r.get("totalRevenue"));assertEquals(new BigDecimal("3000.00"),r.get("averageOrderValue"));assertEquals(1L,r.get("excludedOrders"));
 var chart=(List<Map<String,Object>>)r.get("salesByMonth");assertEquals(new BigDecimal("6000.00"),chart.get(0).get("amount"));var cats=(List<Map<String,Object>>)r.get("topCategories");assertEquals(new BigDecimal("6000.00"),cats.get(0).get("revenue"));}
 @Test void distributionsUseTheSameIssuedPeriod() {
 var r=query.report(UserRole.SUPER_ADMIN,1L,day,day,null);
 var statuses=(List<Map<String,Object>>)r.get("orderStatusDistribution");assertEquals(2,statuses.size());assertTrue(statuses.stream().noneMatch(row->"CANCELLED".equals(row.get("status"))));
 var methods=(List<Map<String,Object>>)r.get("paymentMethodDistribution");assertEquals(2,methods.get(0).get("count"));assertEquals(100.0,methods.get(0).get("percentage"));
 assertTrue(((List<?>)query.report(UserRole.SUPER_ADMIN,1L,day.plusDays(1),day.plusDays(1),null).get("orderStatusDistribution")).isEmpty());
 }
 @Test void usesIssueDayAndExclusiveNextDayBoundary(){add(6,1,"DELIVERED",1000,"2026-11-11 00:00:00");assertEquals(2,query.report(UserRole.SUPER_ADMIN,1L,day,day,null).get("totalOrders"));assertEquals(1,query.report(UserRole.SUPER_ADMIN,1L,day.plusDays(1),day.plusDays(1),null).get("totalOrders"));}
 @Test void storeScopeCannotBeBypassed(){assertEquals(new BigDecimal("2500.00"),query.report(UserRole.STORE_OWNER,10L,day,day,null).get("totalRevenue"));assertEquals(0,query.report(UserRole.STORE_OWNER,10L,day,day,2L).get("totalOrders"));assertEquals(1,query.report(UserRole.STORE_MANAGER,40L,day,day,null).get("totalOrders"));}
 @Test void emptyPeriodIsZeroAndDoesNotFallBackToLifetime(){var r=query.report(UserRole.SUPER_ADMIN,1L,day.minusDays(2),day.minusDays(1),null);assertEquals(BigDecimal.ZERO,r.get("totalRevenue"));assertEquals(0,r.get("totalOrders"));assertTrue(((List<?>)r.get("topProducts")).isEmpty());}
 @Test void rejectsUnauthorizedAndInvalidRanges(){assertThrows(ResponseStatusException.class,()->query.report(UserRole.CUSTOMER,1L,day,day,null));assertThrows(ResponseStatusException.class,()->query.report(UserRole.SUPER_ADMIN,1L,day.plusDays(1),day,null));assertThrows(ResponseStatusException.class,()->query.report(UserRole.SUPER_ADMIN,1L,day,day.plusDays(367),null));}
}
