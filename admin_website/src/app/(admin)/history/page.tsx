"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DownloadIcon, SearchIcon } from '@/components/icons';
import HistoryList from '@/components/History/HistoryList';
import { DateRange } from 'react-day-picker';

const HistoryPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Order History</h1>
                <Button variant="outline" className="gap-2">
                    <DownloadIcon className="h-4 w-4" />
                    Экспорт
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-1 items-center gap-2">
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Поиск заказов..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Статус" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="PAID">Paid</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="FAILED">Failed</SelectItem>
                                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                                </SelectContent>
                            </Select>
                            <DatePickerWithRange
                                date={dateRange}
                                onDateChange={setDateRange}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <HistoryList
                        searchQuery={searchQuery}
                        statusFilter={statusFilter}
                        dateRange={dateRange}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default HistoryPage;