'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Product, ProductFormData } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    regularPrice: 0,
    stockQuantity: 0,
    storeId: 1,
    category: '',
    active: true,
  });

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) {
        throw new Error('Не удалось получить товар');
      }
      const product: Product = await response.json();
      setFormData({
        name: product.name,
        description: product.description || '',
        regularPrice: product.price,
        stockQuantity: product.stockQuantity,
        storeId: product.storeId,
        category: product.categoryName || '',
        active: product.active,
      });
    } catch (error) {
      toast.error('Не удалось получить товар');
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      toast.error('Название и описание обязательны');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить товар');
      }

      toast.success('Товар успешно обновлен');
      router.push('/products');
    } catch (error) {
      toast.error('Не удалось обновить товар');
      console.error('Error updating product:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Редактировать товар</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div>
              <Label htmlFor="name">Название товара</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="regularPrice">Цена</Label>
              <Input
                id="regularPrice"
                type="number"
                step="0.01"
                value={formData.regularPrice}
                onChange={(e) => setFormData({ ...formData, regularPrice: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="stockQuantity">Количество на складе</Label>
              <Input
                id="stockQuantity"
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Активен</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Сохранение...' : 'Обновить товар'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/products')}
              >
                Отмена
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
