import LineChartOne from "@/components/charts/line/LineChartOne";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "",
  description:
    "",
};
export default function LineChart() {
  const sampleData = [
    { month: 'Jan', amount: 15000, orders: 100 },
    { month: 'Feb', amount: 18000, orders: 120 },
    { month: 'Mar', amount: 12000, orders: 80 },
    { month: 'Apr', amount: 21000, orders: 140 },
    { month: 'May', amount: 16500, orders: 110 },
    { month: 'Jun', amount: 24000, orders: 160 },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Линейный график" />
      <div className="space-y-6">
        <ComponentCard title="Линейный график 1">
          <LineChartOne data={sampleData} />
        </ComponentCard>
      </div>
    </div>
  );
}
