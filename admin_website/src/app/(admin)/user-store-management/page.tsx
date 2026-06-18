"use client";

import React from 'react';
import { UserStoreAssignment } from '@/components/Store/UserStoreAssignment';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { RoleGuard, AdminOnly } from '@/components/auth/RoleGuard';

export default function UserStoreManagementPage() {
  const breadcrumbItems = [
    { title: "Управление пользователями", href: "/users" },
    { title: "Привязка к заведениям", href: "/user-store-management" }
  ];

  return (
    <AdminOnly>
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Привязка пользователей к заведениям" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-black dark:text-white">
                Управление доступом к заведениям
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Привязывайте пользователей к заведениям для предоставления доступа к управлению и статистике.
                Только администраторы могут управлять этими связями.
              </p>
            </div>

            <UserStoreAssignment
              onAssignmentChange={() => {
                // Можно добавить обновление других компонентов при изменении
                console.log('Привязка пользователь-заведение изменена');
              }}
            />
          </div>
        </div>
      </div>
    </AdminOnly>
  );
}
