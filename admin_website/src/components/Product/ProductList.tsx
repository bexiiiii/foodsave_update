"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ProductService } from '@/services/productService';
import { ProductDTO } from '@/types/product';
import Image from 'next/image';

const ProductList: React.FC = () => {
    const [products, setProducts] = React.useState<ProductDTO[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const fetchedProducts = await ProductService.getAllProducts();
                // Handle PageableResponse by extracting content
                if (fetchedProducts && typeof fetchedProducts === 'object' && 'content' in fetchedProducts) {
                    setProducts(fetchedProducts.content);
                } else if (Array.isArray(fetchedProducts)) {
                    setProducts(fetchedProducts);
                } else {
                    setProducts([]);
                }
            } catch (err: any) {
                console.error('Error fetching products:', err);
                setError(err.message || 'Failed to fetch products');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const getStatusColor = (status: ProductDTO['status']) => {
        switch (status) {
            case 'AVAILABLE':
                return 'default';
            case 'PENDING':
                return 'secondary';
            case 'OUT_OF_STOCK':
                return 'destructive';
            case 'DISCONTINUED':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Products</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="p-4 border rounded-lg">
                                <Skeleton className="h-48 w-full mb-4" />
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Products</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-red-500">{error}</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
                {products.length === 0 ? (
                    <div className="text-gray-500">No products found</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="p-4 border rounded-lg hover:border-gray-300 transition-colors"
                            >
                                <div className="relative h-48 mb-4">
                                    {product.images && product.images.length > 0 ? (
                                        <Image
                                            src={product.images[0]}
                                            alt={product.name}
                                            fill
                                            className="object-cover rounded-lg"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                                            <span className="text-gray-400">No image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium">{product.name}</h3>
                                    <Badge variant={getStatusColor(product.status)}>
                                        {product.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                    {product.description}
                                </p>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-600">
                                        Price: ${product.price.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Stock: {product.stockQuantity}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Category: {product.categoryName || 'N/A'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Store: {product.storeName || 'N/A'}
                                    </p>
                                </div>
                                <div className="mt-2 text-xs text-gray-400">
                                    Updated: {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProductList;