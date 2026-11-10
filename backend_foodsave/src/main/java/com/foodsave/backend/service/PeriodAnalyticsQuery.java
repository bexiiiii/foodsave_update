package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.UserRole;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Turnover of issued orders, never commission or confirmed cash receipts. */
@Service
public class PeriodAnalyticsQuery {
    private final NamedParameterJdbcTemplate jdbc;
    public PeriodAnalyticsQuery(JdbcTemplate jdbc) { this.jdbc = new NamedParameterJdbcTemplate(jdbc); }
    @Transactional(readOnly = true)
    public Map<String,Object> report(UserRole role, Long userId, LocalDate start, LocalDate end, Long storeId) {
        if (userId == null || role == null || !Set.of(UserRole.SUPER_ADMIN,UserRole.STORE_OWNER,UserRole.STORE_MANAGER).contains(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (start == null || end == null || end.isBefore(start) || ChronoUnit.DAYS.between(start,end)>366 || (storeId!=null&&storeId<1))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid reporting period");
        var params = new MapSqlParameterSource("start",Timestamp.valueOf(start.atStartOfDay()))
                .addValue("end",Timestamp.valueOf(end.plusDays(1).atStartOfDay()));
        String scope = " FROM orders o JOIN stores s ON s.id=o.store_id WHERE o.status IN ('PICKED_UP','DELIVERED','COMPLETED')"
                + " AND COALESCE(o.picked_up_at,o.completed_at,o.created_at)>=:start AND COALESCE(o.picked_up_at,o.completed_at,o.created_at)<:end";
        if(role!=UserRole.SUPER_ADMIN) {
            scope += " AND s."+(role==UserRole.STORE_OWNER?"owner_id":"manager_id")+"=:userId";params.addValue("userId",userId);
        }
        if(storeId!=null){scope+=" AND s.id=:storeId";params.addValue("storeId",storeId);}
        long excluded = jdbc.queryForObject("SELECT COUNT(*)"+scope+" AND (o.total IS NULL OR o.total<0 OR o.total>1000000)",params,Long.class);
        String valid = scope+" AND o.total BETWEEN 0 AND 1000000";
        List<Map<String,Object>> orders = jdbc.queryForList("SELECT o.id,o.total,o.status,o.payment_method,s.id AS store_id,s.name AS store_name,COALESCE(o.picked_up_at,o.completed_at,o.created_at) AS issued_at"+valid,params);
        BigDecimal revenue=BigDecimal.ZERO;
        Map<LocalDate,BigDecimal> amounts=new TreeMap<>();Map<LocalDate,Integer> counts=new HashMap<>();Map<Long,Map<String,Object>> stores=new LinkedHashMap<>();
        List<Long> ids=new ArrayList<>();
        for(var row:orders){long id=((Number)row.get("id")).longValue();ids.add(id);BigDecimal amount=(BigDecimal)row.get("total");revenue=revenue.add(amount);
            LocalDate day=((Timestamp)row.get("issued_at")).toLocalDateTime().toLocalDate();amounts.merge(day,amount,BigDecimal::add);counts.merge(day,1,Integer::sum);
            long sid=((Number)row.get("store_id")).longValue();add(stores,sid,String.valueOf(row.get("store_name")),1,amount,"orders");
        }
        List<Map<String,Object>> chart=new ArrayList<>();
        for(LocalDate day=start;!day.isAfter(end);day=day.plusDays(1))chart.add(Map.of("month",day.format(java.time.format.DateTimeFormatter.ofPattern("dd.MM")),"date",day.toString(),"amount",amounts.getOrDefault(day,BigDecimal.ZERO),"orders",counts.getOrDefault(day,0)));
        Map<Long,Map<String,Object>> products=new LinkedHashMap<>();Map<String,Map<String,Object>> categories=new LinkedHashMap<>();
        if(!ids.isEmpty()){
            params.addValue("ids",ids);
            List<Map<String,Object>> items=jdbc.queryForList("SELECT i.product_id,p.name,COALESCE(c.name,'Без категории') AS category,i.quantity,i.total_price FROM order_items i LEFT JOIN products p ON p.id=i.product_id LEFT JOIN categories c ON c.id=p.category_id WHERE i.order_id IN (:ids)",params);
            for(var item:items){if(item.get("total_price")==null)continue;BigDecimal amount=(BigDecimal)item.get("total_price");if(amount.signum()<0||amount.compareTo(new BigDecimal("1000000"))>0)continue;
                int qty=((Number)item.get("quantity")).intValue();String category=String.valueOf(item.get("category"));add(categories,category,category,qty,amount,"sales");
                if(item.get("product_id")!=null)add(products,((Number)item.get("product_id")).longValue(),String.valueOf(item.get("name")),qty,amount,"sales");
            }
        }
        Map<String,Object> result=new LinkedHashMap<>();result.put("totalRevenue",revenue);result.put("totalOrders",orders.size());result.put("averageOrderValue",orders.isEmpty()?BigDecimal.ZERO:revenue.divide(BigDecimal.valueOf(orders.size()),2,java.math.RoundingMode.HALF_UP));result.put("excludedOrders",excluded);
        result.put("orderStatusDistribution",distribution(orders,"status","status"));result.put("paymentMethodDistribution",distribution(orders,"payment_method","method"));
        result.put("salesByMonth",chart);result.put("topProducts",rank(products));result.put("topStores",rank(stores));result.put("topCategories",rank(categories));result.put("periodStart",start.toString());result.put("periodEnd",end.toString());return result;
    }
    private static List<Map<String,Object>> distribution(List<Map<String,Object>> orders,String column,String key) {
        Map<String,Integer> counts=new TreeMap<>();
        for(var row:orders) counts.merge(Objects.toString(row.get(column),"Не указан"),1,Integer::sum);
        List<Map<String,Object>> result=new ArrayList<>();
        counts.forEach((name,count)->result.add(Map.of(key,name,"count",count,"percentage",100.0*count/orders.size())));
        return result;
    }
    private static <K> void add(Map<K,Map<String,Object>> target,K key,String name,int count,BigDecimal amount,String countKey){
        var row=target.computeIfAbsent(key,k->{Map<String,Object> r=new LinkedHashMap<>();r.put("id",k);r.put("name",name);r.put(countKey,0);r.put("revenue",BigDecimal.ZERO);return r;});
        row.put(countKey,((Number)row.get(countKey)).intValue()+count);row.put("revenue",((BigDecimal)row.get("revenue")).add(amount));
    }
    private static List<Map<String,Object>> rank(Map<?,Map<String,Object>> rows){return rows.values().stream().sorted(Comparator.comparing((Map<String,Object> row)->(BigDecimal)row.get("revenue")).reversed()).limit(10).toList();}
}
