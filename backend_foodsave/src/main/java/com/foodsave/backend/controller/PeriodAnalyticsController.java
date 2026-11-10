package com.foodsave.backend.controller;
import com.foodsave.backend.security.SecurityUtil;
import com.foodsave.backend.service.PeriodAnalyticsQuery;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.Map;
@RestController
public class PeriodAnalyticsController {
    private final PeriodAnalyticsQuery reports;
    public PeriodAnalyticsController(PeriodAnalyticsQuery reports){this.reports=reports;}
    @GetMapping("/api/analytics/issued-period")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','STORE_OWNER','STORE_MANAGER')")
    public Map<String,Object> report(
        @RequestParam(name="startDate") @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate start,
        @RequestParam(name="endDate") @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate end,
        @RequestParam(name="storeId",required=false) Long storeId) {
        return reports.report(SecurityUtil.getCurrentUserRole(),SecurityUtil.getCurrentUserId(),start,end,storeId);
    }
}
