"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useModal } from "@/hooks/use-modal";
import { reviewApi } from '@/services/api/review';
import { ReviewDTO } from '@/types/api';
import { format } from 'date-fns';

interface ReviewFormData {
    rating: number;
    comment: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const REVIEW_STATUSES = [
    { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'APPROVED', label: 'Approved', color: 'bg-green-100 text-green-800' },
    { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' }
];

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<ReviewDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>('');
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const { isOpen, openModal, closeModal } = useModal();
    const [selectedReview, setSelectedReview] = useState<ReviewDTO | undefined>();
    const [formData, setFormData] = useState<ReviewFormData>({
        rating: 0,
        comment: '',
        status: 'PENDING'
    });

    const fetchReviews = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await reviewApi.getAll();
            setReviews(response);
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
            setError('Failed to load reviews. Please try again later.');
            toast({
                title: 'Error',
                description: 'Failed to load reviews. Please try again later.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this review?')) {
            try {
                await reviewApi.delete(id);
                toast({
                    title: 'Success',
                    description: 'Review deleted successfully',
                });
                fetchReviews();
            } catch (error) {
                console.error('Failed to delete review:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to delete review',
                    variant: 'destructive',
                });
            }
        }
    };

    const handleEdit = (review: ReviewDTO) => {
        setSelectedReview(review);
        setFormData({
            rating: review.rating,
            comment: review.comment || '',
            status: review.status
        });
        openModal();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (selectedReview) {
                await reviewApi.update(selectedReview.id, formData);
                toast({
                    title: 'Success',
                    description: 'Review updated successfully',
                });
            }
            await fetchReviews();
            closeModal();
        } catch (error) {
            console.error('Error saving review:', error);
            toast({
                title: 'Error',
                description: 'Failed to save review',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'rating' ? Number(value) : value
        }));
    };

    const filteredReviews = reviews.filter(review =>
        (review.comment?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (review.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (review.productName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="bg-white dark:bg-gray-800">
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-1/4 mb-2" />
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                    onClick={fetchReviews}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Reviews Management</h1>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">🔍</span>
                    <Input
                        type="text"
                        placeholder="Search reviews by comment, user, or product..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white dark:bg-gray-800"
                    />
                </div>
            </div>

            <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead>Comment</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredReviews.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-4">
                                        No reviews found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredReviews.map((review) => (
                                    <TableRow key={review.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{review.userName}</p>
                                                <p className="text-sm text-gray-500">{review.user.firstName} {review.user.lastName}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{review.productName}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <span className="text-yellow-500 mr-1">★</span>
                                                <span>{review.rating}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="line-clamp-2">{review.comment}</p>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={review.status === 'APPROVED' ? 'default' : 'destructive'}
                                            >
                                                {review.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(review)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(review.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Modal
                isOpen={isOpen}
                onClose={() => {
                    closeModal();
                    setSelectedReview(undefined);
                }}
                className="max-w-2xl mx-auto"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold">
                            Edit Review
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                closeModal();
                                setSelectedReview(undefined);
                            }}
                        >
                            ✕
                        </Button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="rating">Rating</Label>
                            <select
                                id="rating"
                                name="rating"
                                value={formData.rating}
                                onChange={handleChange}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-10"
                                style={{ WebkitAppearance: 'menulist' }}
                                aria-label="Select rating"
                            >
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <option key={rating} value={rating}>
                                        {rating} {rating === 1 ? 'Star' : 'Stars'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="comment">Comment</Label>
                            <Textarea
                                id="comment"
                                name="comment"
                                value={formData.comment}
                                onChange={handleChange}
                                rows={4}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer relative z-10"
                                style={{ WebkitAppearance: 'menulist' }}
                                aria-label="Select status"
                            >
                                {REVIEW_STATUSES.map((status) => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-end space-x-4 pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeModal}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {submitting ? 'Saving...' : 'Update Review'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
} 