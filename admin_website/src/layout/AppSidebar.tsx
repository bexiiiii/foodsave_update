"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  PlugInIcon,
  UserCircleIcon,
  DollarLineIcon,
  BoxIcon,
  BoxIconLine,
  UserIcon,
  TimeIcon,
  UserGroupIcon,
} from "../icons/index";
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from "@/types/permission";
import { useAuth } from '@/hooks/useAuth';

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  permission?: Permission;
  allowedRoles?: string[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Дешборд",
    subItems: [
      { name: "Ecommerce", path: "/", pro: false }
    ],
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER", "STORE_MANAGER"],
  },
  {
    icon: <GridIcon />,
    name: "Мое заведение",
    path: "/my-store-dashboard",
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER"],
  },
  {
    icon: <GridIcon />,
    name: "Менеджер заведения",
    path: "/manager-dashboard",
    allowedRoles: ["STORE_MANAGER"],
  },
  {
    icon: <CalenderIcon />,
    name: "Календарь",
    path: "/calendar",
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER"],
  },
  {
    icon: <UserCircleIcon />,
    name: "Профиль пользователя",
    path: "/profile",
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER", "STORE_MANAGER"],
  },
  {
    icon: <PieChartIcon />,
    name: "Аналитика",
    path: "/analytics",
    allowedRoles: ["SUPER_ADMIN", "STORE_MANAGER", "STORE_OWNER"],
  },
  {
    icon: <BoxIcon />,
    name: "Заказы",
    path: "/orders",
    allowedRoles: ["SUPER_ADMIN", "STORE_MANAGER", "STORE_OWNER"],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Продукты",
    path: "/products",
    allowedRoles: ["SUPER_ADMIN", "STORE_MANAGER", "STORE_OWNER"],
  },
  {
    icon: <GridIcon />,
    name: "Категории",
    path: "/categories",
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER"],
  },
  {
    icon: <BoxIconLine />,
    name: "Магазины",
    path: "/stores",
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER"],
  },
  {
    icon: <UserIcon />,
    name: "Пользователи",
    path: "/users",
    allowedRoles: ["SUPER_ADMIN"],
  },
  // {
  //   icon: <UserGroupIcon className="h-6 w-6" />,
  //   name: "User-Store Management",
  //   path: "/user-store-management",
  //   permission: Permission.STORE_UPDATE,
  //   allowedRoles: ["SUPER_ADMIN", "STORE_OWNER"],
  // },
  {
    icon: <BoxIcon />,
    name: "Корзины",
    path: "/carts",
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER"],
  },
  {
    icon: <TimeIcon />,
    name: "История заказов",
    path: "/history",
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER"],
  },
  {
    icon: <ListIcon />,
    name: "Уведомления",
    path: "/notifications",
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER"],
  },
  {
    icon: <PlugInIcon />,
    name: "Состояние системы",
    path: "/health",
    allowedRoles: ["SUPER_ADMIN"],
  },
  {
    icon: <UserGroupIcon className="h-6 w-6" />,
    name: "Роли",
    path: "/roles",
    permission: Permission.ROLE_READ,
    allowedRoles: ["SUPER_ADMIN"],
  },
  {
    icon: <UserIcon />,
    name: "Dev Auth",
    path: "/dev-auth",
    allowedRoles: ["SUPER_ADMIN", "STORE_OWNER", "CUSTOMER"],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const { user, loading: authLoading } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const isItemVisible = useCallback((nav: NavItem): boolean => {
    // Проверяем разрешения
    if (nav.permission && !hasPermission(nav.permission)) {
      return false;
    }
    
    // Проверяем роли
    if (nav.allowedRoles && user?.role) {
      return nav.allowedRoles.includes(user.role);
    }
    
    // Если нет ограничений по ролям, показываем всем
    return true;
  }, [hasPermission, user?.role]);

  // Показываем загрузку пока аутентификация не завершена
  if (authLoading) {
    return null;
  }

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => {
    return (
      <ul className="flex flex-col gap-4">
        {items.map((nav, index) => {
          if (!isItemVisible(nav)) {
            return null;
          }

          return (
            <li key={nav.name}>
              {nav.subItems ? (
                <button
                  onClick={() => handleSubmenuToggle(index, menuType)}
                  className={`menu-item group ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "menu-item-active"
                      : "menu-item-inactive"
                  } cursor-pointer ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "lg:justify-start"
                  }`}
                >
                  <span
                    className={`${
                      openSubmenu?.type === menuType && openSubmenu?.index === index
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </button>
              ) : (
                nav.path && (
                  <Link
                    href={nav.path}
                    className={`menu-item group ${
                      isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                    }`}
                  >
                    <span
                      className={`${
                        isActive(nav.path)
                          ? "menu-item-icon-active"
                          : "menu-item-icon-inactive"
                      }`}
                    >
                      {nav.icon}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="menu-item-text">{nav.name}</span>
                    )}
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
