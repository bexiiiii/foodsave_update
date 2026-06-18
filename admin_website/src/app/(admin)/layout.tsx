import type { Metadata } from "next";
import { SidebarProvider } from '@/context/SidebarContext';
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "Панель администратора FoodSave",
  description: "Панель администратора для проекта FoodSave",
};


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ClientLayout>{children}</ClientLayout>
    </SidebarProvider>
  );
}
