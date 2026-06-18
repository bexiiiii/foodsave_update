"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/useApi';
import { toast } from 'react-hot-toast';
import { ReviewDTO } from '@/types/api';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const ReviewList: React.FC = () => {
    const { getReviews, loading, error } = useApi();
    const [reviews, setReviews] = React.useState<ReviewDTO[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    React.useEffect(() => {
        const fetchReviews = async () => {
            const response = await getReviews();
            if (response) {
                setReviews(response);
            }
        };
        fetchReviews();
    }, [getReviews]);

    const api = useApi();

    const handleApprove = async (reviewId: number) => {
        try {
            await api.approveReview(reviewId);
            toast.success('Review approved successfully');
            const response = await getReviews();
            if (response) {
                setReviews(response);
            }
        } catch (error) {
            console.error('Failed to approve review:', error);
            toast.error('Failed to approve review');
        }
    };

    const handleReject = async (reviewId: number) => {
        try {
            await api.rejectReview(reviewId);
            toast.success('Review rejected successfully');
            const response = await getReviews();
            if (response) {
                setReviews(response);
            }
        } catch (error) {
            console.error('Failed to reject review:', error);
            toast.error('Failed to reject review');
        }
    };

    const handleDelete = async (reviewId: number) => {
        if (!confirm('Are you sure you want to delete this review?')) return;

        try {
            await api.deleteReview(reviewId);
            toast.success('Review deleted successfully');
            const response = await getReviews();
            if (response) {
                setReviews(response);
            }
        } catch (error) {
            console.error('Failed to delete review:', error);
            toast.error('Failed to delete review');
        }
    };

    const filteredReviews = reviews.filter(review => {
        const matchesSearch = 
            review.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            review.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            review.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (review.comment && review.comment.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesStatus = statusFilter === 'ALL' || review.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="mb-4">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-red-500">{error}</div>
                </CardContent>
            </Card>
        );
    }

    const getStatusColor = (status: ReviewDTO['status']) => {
        switch (status) {
            case 'APPROVED':
                return 'default';
            case 'REJECTED':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reviews</CardTitle>
                <div className="flex gap-4 mt-4">
                    <Input
                        placeholder="Search reviews..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Statuses</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {filteredReviews.map((review) => (
                        <div key={review.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="font-medium">
                                        {review.user.firstName} {review.user.lastName}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Product: {review.product.name}
                                    </p>
                                </div>
                                <Badge variant={getStatusColor(review.status)}>
                                    {review.status}
                                </Badge>
                            </div>
                            <div className="mt-2">
                                <div className="flex items-center mb-2">
                                    <span className="text-yellow-500 mr-1">★</span>
                                    <span>{review.rating}/5</span>
                                </div>
                                <p className="text-sm">{review.comment}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            {review.status === 'PENDING' && (
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApprove(review.id)}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleReject(review.id)}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(review.id)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default ReviewList; 