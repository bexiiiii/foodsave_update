"use client";
import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { MoreDotIcon } from "@/icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

interface Target {
    name: string;
    current: number;
    target: number;
    unit: string;
}

export default function MonthlyTarget() {
    const [targets, setTargets] = useState<Target[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchTargets = async () => {
            try {
                // Set mock data for now since we don't have a targets API endpoint
                setTargets([
                    { name: 'Ежемесячные продажи', current: 15000, target: 20000, unit: '$' },
                    { name: 'Новые клиенты', current: 45, target: 60, unit: 'пользователей' },
                    { name: 'Выполненные заказы', current: 180, target: 250, unit: 'заказов' }
                ]);
            } catch (error) {
                toast({
                    title: 'Ошибка',
                    description: 'Не удалось загрузить цели',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTargets();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    function toggleDropdown() {
        setIsOpen(!isOpen);
    }

    function closeDropdown() {
        setIsOpen(false);
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                <div className="h-6 bg-gray-100 rounded w-1/3 animate-pulse mb-4" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between">
                                <div className="h-4 bg-gray-100 rounded w-1/4" />
                                <div className="h-4 bg-gray-100 rounded w-1/6" />
                            </div>
                            <div className="h-2 bg-gray-100 rounded w-full" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Ежемесячные цели
                    </h3>
                    <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
                        Прогресс в достижении ежемесячных целей
                    </p>
                </div>
                <div className="relative inline-block">
                    <button onClick={toggleDropdown} className="dropdown-toggle" aria-label="Больше опций">
                        <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                    </button>
                    <Dropdown
                        isOpen={isOpen}
                        onClose={closeDropdown}
                        className="w-40 p-2"
                    >
                        <DropdownItem
                            onItemClick={closeDropdown}
                            className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                        >
                            Посмотреть больше
                        </DropdownItem>
                        <DropdownItem
                            onItemClick={closeDropdown}
                            className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                        >
                            Удалить
                        </DropdownItem>
                    </Dropdown>
                </div>
            </div>
            <div className="space-y-4">
                {targets.map((target, index) => {
                    const progress = (target.current / target.target) * 100;
                    return (
                        <div key={index} className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {target.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {target.current} / {target.target} {target.unit}
                                </span>
                            </div>
                            <div className="relative block h-2 w-full rounded-sm bg-gray-200 dark:bg-gray-800">
                                <div
                                    className="absolute left-0 top-0 flex h-full items-center justify-center rounded-sm bg-brand-500 text-xs font-medium text-white"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
