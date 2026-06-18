"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EcommerceMetrics from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import { StoreOrderStatsTable } from "@/components/stats/StoreOrderStatsTable";
import { OrderStatsCard } from "@/components/stats/OrderStatsCard";
import { MyStoreInfo } from "@/components/Store/MyStoreInfo";
import { StoreStats, StoresList } from "@/components/dashboard/StoreStats";
import { orderApi } from "@/services/api";
import { OrderStatsDTO } from "@/types/api";
import { useRoleBasedRoutes } from "@/hooks/useRoleBasedRoutes";
import { Permission } from "@/types/permission";
import { UserRole } from "@/types/roles";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

const Ecommerce = () => {
  const router = useRouter();
  const { hasPermission, user } = useRoleBasedRoutes();
  const { user: authUser, loading } = useAuth();
  const [orderStats, setOrderStats] = useState<OrderStatsDTO | null>(null);

  const isStoreUser =
    user?.role === UserRole.STORE_OWNER || user?.role === UserRole.MANAGER;
  const isAdmin = user?.role === UserRole.ADMIN;

  const canReadOrders =
    hasPermission(Permission.ORDER_READ) || isAdmin || isStoreUser;
  const canReadAnalytics =
    hasPermission(Permission.ANALYTICS_READ) || isAdmin;

  useEffect(() => {
    if (!loading && !authUser) {
      router.replace("/auth/signin");
    }
    if (authUser?.role === "STORE_MANAGER") {
      router.push("/manager-dashboard");
    }
  }, [authUser, loading, router]);

  useEffect(() => {
    const fetchOrderStats = async () => {
      try {
        if (isAdmin) {
          const stats = await orderApi.getStats();
          setOrderStats(stats);
        } else if (hasPermission(Permission.ORDER_READ)) {
          const stats = await orderApi.getMyStoreStats();
          setOrderStats(stats);
        }
      } catch (error) {
        console.error("Error fetching order stats:", error);
      }
    };

    fetchOrderStats();
  }, [isAdmin, hasPermission]);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "STORE_OWNER"]}>
      {!authUser || authUser?.role === "STORE_MANAGER" ? null : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
          {/* Статистика магазинов (для админов) */}
          {isAdmin && (
            <div className="col-span-12">
              <StoreStats className="mb-6" />
            </div>
          )}

          {/* Левая колонка */}
          <div className="col-span-12 space-y-6 xl:col-span-7">
            {isAdmin && <EcommerceMetrics />}

            {orderStats && (
              <OrderStatsCard
                title={
                  isStoreUser
                    ? "Статистика заказов моего заведения"
                    : "Общая статистика заказов"
                }
                totalOrders={orderStats.totalOrders}
                successfulOrders={orderStats.successfulOrders}
                failedOrders={orderStats.failedOrders}
                pendingOrders={orderStats.pendingOrders}
              />
            )}

            <MonthlySalesChart />
          </div>

          {/* Правая колонка */}
          <div className="col-span-12 space-y-6 xl:col-span-5">
            {isStoreUser && <MyStoreInfo />}

            {isAdmin && <StoresList className="mb-6" />}

            {isAdmin && (
              <>
                <MonthlyTarget />
                <StatisticsChart />
                <DemographicCard />
              </>
            )}
          </div>

          <div className="col-span-12">
            <RecentOrders />
          </div>

          {isAdmin && (
            <div className="col-span-12">
              <StoreOrderStatsTable />
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
};

export default Ecommerce;
