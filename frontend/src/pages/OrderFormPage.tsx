import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../api/orderApi';
import type { OrderCreateInput } from '../api/orderApi';
import { customerApi } from '../api/customerApi';
import { productApi } from '../api/productApi';
import type { Customer, Product } from '../types';

interface ItemRow {
  product_id: number;
  unit_price: number;
  quantity: number;
}

export default function OrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [customerId, setCustomerId] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ product_id: 0, unit_price: 0, quantity: 1 }]);

  const { data: customersData } = useQuery({
    queryKey: ['customers', 1, 100],
    queryFn: () => customerApi.list(1, 100),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 1, 100],
    queryFn: () => productApi.list(1, 100),
  });

  const { data: order } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.get(Number(id)),
    enabled: isEdit,
  });

  const customers: Customer[] = customersData?.data ?? [];
  const products: Product[] = productsData?.data ?? [];

  useEffect(() => {
    if (order) {
      setCustomerId(order.customer_id);
      setNotes(order.notes);
      setItems(order.items.map(item => ({
        product_id: item.product_id,
        unit_price: Number(item.unit_price),
        quantity: item.quantity,
      })));
    }
  }, [order]);

  const handleProductChange = (index: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    setItems(items.map((item, i) =>
      i === index ? { ...item, product_id: productId, unit_price: product ? Number(product.list_price) : 0 } : item
    ));
  };

  const totalPrice = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const addItem = () => setItems([...items, { product_id: 0, unit_price: 0, quantity: 1 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof ItemRow, value: number) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const mutation = useMutation({
    mutationFn: (data: OrderCreateInput) =>
      isEdit ? orderApi.update(Number(id), data) : orderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      customer_id: customerId,
      notes,
      items: items.filter(item => item.product_id > 0).map(item => ({
        product_id: item.product_id,
        unit_price: item.unit_price,
        quantity: item.quantity,
      })),
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{isEdit ? '編輯訂單' : '新增訂單'}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客戶 *</label>
            <select
              value={customerId}
              onChange={e => setCustomerId(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value={0}>請選擇客戶</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.tax_id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">訂單明細</h3>
            <button type="button" onClick={addItem} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
              新增項目
            </button>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">產品</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">單價</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">數量</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">復價</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">
                    <select
                      value={item.product_id}
                      onChange={e => handleProductChange(index, Number(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value={0}>選擇產品</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.product_number})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.unit_price}
                      onChange={e => updateItem(index, 'unit_price', Number(e.target.value))}
                      className="w-28 px-2 py-1 border rounded text-sm text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                      className="w-20 px-2 py-1 border rounded text-sm text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium">
                    {(item.unit_price * item.quantity).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 text-sm">
                        移除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 text-right">
            <span className="text-gray-500">總價：</span>
            <span className="text-2xl font-bold ml-2">{totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {mutation.error && (
          <p className="text-red-500 text-sm">{(mutation.error as Error).message}</p>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? '儲存中...' : '儲存'}
          </button>
          <button type="button" onClick={() => navigate('/orders')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
