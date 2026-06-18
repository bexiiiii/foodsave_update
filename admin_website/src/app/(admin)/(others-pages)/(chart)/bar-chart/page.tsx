import BarChartOne from "@/components/charts/bar/BarChartOne";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "",
  description:
    "",
};

export default function page() {
  const sampleData = [
    { name: 'Jan', value: 100 },
    { name: 'Feb', value: 120 },
    { name: 'Mar', value: 80 },
    { name: 'Apr', value: 140 },
    { name: 'May', value: 110 },
    { name: 'Jun', value: 160 },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Гистограмма" />
      <div className="space-y-6">
        <ComponentCard title="Гистограмма 1">
          <BarChartOne data={sampleData} />
        </ComponentCard>
      </div>
    </div>
  );
}
