import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { BoxIcon } from "@/icons";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Buttons | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Buttons page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function Buttons() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Buttons" />
      <div className="space-y-5 sm:space-y-6">
        {/* Primary Button */}
        <ComponentCard title="Primary Button">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary">
              Button Text
            </Button>
            <Button size="md" variant="primary">
              Button Text
            </Button>
          </div>
        </ComponentCard>
        {/* Primary Button with Start Icon */}
        <ComponentCard title="Primary Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary" className="flex items-center gap-2">
              <BoxIcon />
              Button Text
            </Button>
            <Button size="md" variant="primary" className="flex items-center gap-2">
              <BoxIcon />
              Button Text
            </Button>
          </div>
        </ComponentCard>{" "}
        {/* Primary Button with Start Icon */}
        <ComponentCard title="Primary Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary" className="flex items-center gap-2">
              Button Text
              <BoxIcon />
            </Button>
            <Button size="md" variant="primary" className="flex items-center gap-2">
              Button Text
              <BoxIcon />
            </Button>
          </div>
        </ComponentCard>
        {/* Outline Button */}
        <ComponentCard title="Secondary Button">
          <div className="flex items-center gap-5">
            {/* Outline Button */}
            <Button size="sm" variant="outline">
              Button Text
            </Button>
            <Button size="md" variant="outline">
              Button Text
            </Button>
          </div>
        </ComponentCard>
        {/* Outline Button with Start Icon */}
        <ComponentCard title="Outline Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline" className="flex items-center gap-2">
              <BoxIcon />
              Button Text
            </Button>
            <Button size="md" variant="outline" className="flex items-center gap-2">
              <BoxIcon />
              Button Text
            </Button>
          </div>
        </ComponentCard>{" "}
        {/* Outline Button with Start Icon */}
        <ComponentCard title="Outline Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline" className="flex items-center gap-2">
              Button Text
              <BoxIcon />
            </Button>
            <Button size="md" variant="outline" className="flex items-center gap-2">
              Button Text
              <BoxIcon />
            </Button>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
