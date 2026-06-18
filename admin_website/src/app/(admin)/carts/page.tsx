    "use client";

    import React, { useState, useEffect } from 'react';
    import { Card, CardContent } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { toast } from 'react-hot-toast';
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
    import { useModal } from '@/hooks/useModal';
    import ApiService from '@/services/api';
    import { CartDTO, CartItemDTO, CartAddItemRequest, ProductDTO } from '@/types/api';
    import { API_ENDPOINTS } from '@/config/api';
    import { productApi } from '@/services/api';

    export default function CartsPage() {
        const [carts, setCarts] = useState<CartDTO[]>([]);
        const [loading, setLoading] = useState(true);
        const [searchQuery, setSearchQuery] = useState('');
        const { isOpen, openModal, closeModal } = useModal();
        const [selectedCart, setSelectedCart] = useState<CartDTO | undefined>();
        const [selectedProduct, setSelectedProduct] = useState<number>(0);
        const [quantity, setQuantity] = useState<number>(1);
        const [products, setProducts] = useState<ProductDTO[]>([]);
        const [loadingProducts, setLoadingProducts] = useState(false);

        const api = ApiService.getInstance();

        useEffect(() => {
            fetchCarts();
        }, []);

    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            const response = await productApi.getAll();
            setProducts(response.content || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoadingProducts(false);
        }
    };

    const fetchCarts = async () => {
        try {
            const response = await api.getAllCarts();
            setCarts(Array.isArray(response) ? response : [response]);
        } catch (error) {
            console.error('Failed to fetch carts:', error);
            toast.error('Failed to load carts');
            setCarts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!selectedProduct || !quantity) {
            toast.error('Please select a product and quantity');
            return;
        }

            const itemData = {
                productId: selectedProduct,
                quantity: quantity
            };

        try {
            console.log('Adding item to cart:', itemData);
            const response = await api.addToCart(itemData);
            console.log('Add to cart response:', response);
            toast.success('Item added to cart successfully');
            fetchCarts();
            closeModal();
            setSelectedCart(undefined);
            setSelectedProduct(0);
            setQuantity(1);
        } catch (error) {
            console.error('Error adding item to cart:', error);
            toast.error('Failed to add item to cart');
        }
    };

    const handleRemoveItem = async (cartId: number, itemId: number) => {
        try {
            await api.removeFromCart(itemId.toString());
            toast.success('Item removed from cart');
            fetchCarts();
        } catch (error) {
            console.error('Failed to remove item:', error);
            toast.error('Failed to remove item from cart');
        }
    };

    const handleClearCart = async (cartId: number) => {
        try {
            await api.clearCart();
            toast.success('Cart cleared successfully');
            fetchCarts();
        } catch (error) {
            console.error('Failed to clear cart:', error);
            toast.error('Failed to clear cart');
        }
    };

    const handleUpdateItemQuantity = async (itemId: number, newQuantity: number) => {
        if (newQuantity < 1) {
            toast.error('Quantity must be at least 1');
            return;
        }

        try {
            await api.updateCartItem(itemId.toString(), { quantity: newQuantity });
            toast.success('Item quantity updated');
            fetchCarts();
        } catch (error) {
            console.error('Failed to update item quantity:', error);
            toast.error('Failed to update item quantity');
        }
    };

        const formatDate = (dateString: string) => {
            return new Date(dateString).toLocaleDateString();
        };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

        const filteredCarts = carts.filter(cart =>
            cart.userId?.toString().includes(searchQuery) ||
            cart.items.some(item =>
                item.productName?.toLowerCase().includes(searchQuery.toLowerCase())
            )
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

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Корзина </h1>
                <Button
                    onClick={() => {
                        setSelectedCart(undefined);
                        fetchProducts();
                        openModal();
                    }}
                    className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                    Create New Cart
                </Button>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">🔍</span>
                    <Input
                        type="text"
                        placeholder="Search carts by product name..."
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
                                <TableHead>Cart ID</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCarts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4">
                                        No carts found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCarts.map((cart) => (
                                    <TableRow key={cart.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    Cart #{cart.id}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    User ID: {cart.userId}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {cart.items.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between">
                                                        <span className="text-sm">
                                                            {item.productName}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleUpdateItemQuantity(item.id || 0, item.quantity - 1)}
                                                                    className="text-gray-500 hover:text-gray-700"
                                                                >
                                                                    -
                                                                </Button>
                                                                <span className="text-sm w-8 text-center">
                                                                    {item.quantity}
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleUpdateItemQuantity(item.id || 0, item.quantity + 1)}
                                                                    className="text-gray-500 hover:text-gray-700"
                                                                >
                                                                    +
                                                                </Button>
                                                            </div>
                                                            <span className="text-sm text-gray-500">
                                                                {formatPrice(item.totalPrice)}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRemoveItem(cart.id, item.id || 0)}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">
                                                {formatPrice(cart.totalAmount)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span suppressHydrationWarning>
                                                {formatDate(cart.updatedAt)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedCart(cart);
                                                        fetchProducts();
                                                        openModal();
                                                    }}
                                                >
                                                    Add Item
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleClearCart(cart.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    Clear Cart
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
                    setSelectedCart(undefined);
                    setSelectedProduct(0);
                    setQuantity(1);
                }}
                className="max-w-md mx-auto"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                            Add Item to Cart
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                closeModal();
                                setSelectedCart(undefined);
                                setSelectedProduct(0);
                                setQuantity(1);
                            }}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            ✕
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="product" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                Product
                            </Label>
                            {loadingProducts ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <select
                                    id="product"
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(Number(e.target.value))}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    required
                                    aria-label="Select a product"
                                >
                                    <option value={0}>Select a product</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} - {formatPrice(product.price)} (Stock: {product.stockQuantity})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                Quantity
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="bg-white dark:bg-gray-800"
                                required
                            />
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    closeModal();
                                    setSelectedCart(undefined);
                                    setSelectedProduct(0);
                                    setQuantity(1);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleAddItem}
                                className="bg-brand-500 hover:bg-brand-600 text-white"
                            >
                                Add Item
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
} 