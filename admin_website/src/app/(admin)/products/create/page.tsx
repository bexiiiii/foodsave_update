'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductFormData, ProductCreateRequest } from '@/types/product';
import { ProductService } from '@/services/productService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function CreateProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    regularPrice: 0,
    stockQuantity: 0,
    storeId: 1, // TODO: Get from context or props
    category: '',
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast.error('Название товара обязательно');
        return;
      }
      if (!formData.description.trim()) {
        toast.error('Описание товара обязательно');
        return;
      }
      if (formData.regularPrice <= 0) {
        toast.error('Цена должна быть больше 0');
        return;
      }
      if (!formData.category.trim()) {
        toast.error('Категория обязательна');
        return;
      }

      // Map ProductFormData to ProductCreateRequest
      const createRequest: ProductCreateRequest = {
        name: formData.name,
        description: formData.description,
        price: formData.regularPrice,
        originalPrice: formData.regularPrice,
        discountPercentage: formData.discountPercentage,
        stockQuantity: formData.stockQuantity,
        storeId: formData.storeId,
        categoryId: parseInt(formData.category) || 1, // Convert category string to number
        images: formData.imageUrl ? [formData.imageUrl] : [],
        status: 'AVAILABLE', // Default status
        active: formData.active,
      };

      await ProductService.createProduct(createRequest);
      toast.success('Товар успешно создан');
      router.push('/products');
    } catch (error: any) {
      console.error('Error creating product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Не удалось создать товар';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'regularPrice' || name === 'stockQuantity' ? Number(value) : value,
    }));
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'discountPrice' || name === 'discountPercentage' ? Number(value) : value,
    }));
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Создать новый товар</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL изображения</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                value={formData.imageUrl || ''}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regularPrice">Обычная цена</Label>
                <Input
                  id="regularPrice"
                  name="regularPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.regularPrice}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Количество на складе</Label>
                <Input
                  id="stockQuantity"
                  name="stockQuantity"
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="showDiscount"
                checked={showDiscount}
                onCheckedChange={setShowDiscount}
              />
              <Label htmlFor="showDiscount">Добавить скидку</Label>
            </div>

            {showDiscount && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-medium">Детали скидки</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountPrice">Цена со скидкой</Label>
                    <Input
                      id="discountPrice"
                      name="discountPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discountPrice || ''}
                      onChange={handleDiscountChange}
                      required={showDiscount}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountPercentage">Процент скидки</Label>
                    <Input
                      id="discountPercentage"
                      name="discountPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discountPercentage || ''}
                      onChange={handleDiscountChange}
                      required={showDiscount}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountStartDate">Дата начала</Label>
                    <Input
                      id="discountStartDate"
                      name="discountStartDate"
                      type="datetime-local"
                      value={formData.discountStartDate || ''}
                      onChange={handleDiscountChange}
                      required={showDiscount}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountEndDate">Дата окончания</Label>
                    <Input
                      id="discountEndDate"
                      name="discountEndDate"
                      type="datetime-local"
                      value={formData.discountEndDate || ''}
                      onChange={handleDiscountChange}
                      required={showDiscount}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, active: checked }))
                }
              />
              <Label htmlFor="active">Активен</Label>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Создание...' : 'Создать товар'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}