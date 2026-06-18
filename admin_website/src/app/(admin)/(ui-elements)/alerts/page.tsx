import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Alert from "@/components/ui/alert/Alert";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "",
  description:
    "",
  // other metadata
};

export default function Alerts() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Оповещения" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Оповещение об успехе">
          <Alert
            variant="success"
            title="Сообщение об успехе"
            message="Будьте осторожны при выполнении этого действия."
            showLink={true}
            linkHref="/"
            linkText="Узнать больше"
          />
          <Alert
            variant="success"
            title="Сообщение об успехе"
            message="Будьте осторожны при выполнении этого действия."
            showLink={false}
          />
        </ComponentCard>
        <ComponentCard title="Предупреждающее оповещение">
          <Alert
            variant="warning"
            title="Предупреждающее сообщение"
            message="Будьте осторожны при выполнении этого действия."
            showLink={true}
            linkHref="/"
            linkText="Узнать больше"
          />
          <Alert
            variant="warning"
            title="Предупреждающее сообщение"
            message="Будьте осторожны при выполнении этого действия."
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title="Оповещение об ошибке">
          <Alert
            variant="error"
            title="Сообщение об ошибке"
            message="Будьте осторожны при выполнении этого действия."
            showLink={true}
            linkHref="/"
            linkText="Узнать больше"
          />
          <Alert
            variant="error"
            title="Сообщение об ошибке"
            message="Будьте осторожны при выполнении этого действия."
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title="Информационное оповещение">
          <Alert
            variant="info"
            title="Информационное сообщение"
            message="Будьте осторожны при выполнении этого действия."
            showLink={true}
            linkHref="/"
            linkText="Узнать больше"
          />
          <Alert
            variant="info"
            title="Информационное сообщение"
            message="Будьте осторожны при выполнении этого действия."
            showLink={false}
          />
        </ComponentCard>
      </div>
    </div>
  );
}
