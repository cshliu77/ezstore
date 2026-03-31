import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationApi, getPricingFactor } from '../api/quotationApi';
import type { QuotationCreateInput } from '../api/quotationApi';
import { customerApi } from '../api/customerApi';
import { productApi } from '../api/productApi';
import type { Customer, Product } from '../types';

interface ItemRow {
  product_id: number;
  quantity: number;
  product_name?: string;
  list_price?: number;
  cost?: number;
  unit_price?: number;
  subtotal?: number;
}

export default function QuotationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [customerId, setCustomerId] = useState<number>(0);
  const [pricingFactor, setPricingFactor] = useState<number>(0.9);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ product_id: 0, quantity: 1 }]);

  const { data: customersData } = useQuery({
    queryKey: ['customers', 1, 100],
    queryFn: () => customerApi.list(1, 100),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 1, 100],
    queryFn: () => productApi.list(1, 100),
  });

  const { data: quotation } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.get(Number(id)),
    enabled: isEdit,
  });

  const customers: Customer[] = customersData?.data ?? [];
  const products: Product[] = productsData?.data ?? [];

  useEffect(() => {
    if (quotation) {
      setCustomerId(quotation.customer_id);
      setPricingFactor(Number(quotation.pricing_factor));
      setNotes(quotation.notes);
      setItems(quotation.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })));
    }
  }, [quotation]);

  // Auto-set pricing factor when customer changes
  const handleCustomerChange = async (cid: number) => {
    setCustomerId(cid);
    const customer = customers.find(c => c.id === cid);
    if (customer) {
      try {
        const result = await getPricingFactor(customer.level);
        setPricingFactor(Number(result.pricing_factor));
      } catch {
        // keep current factor
      }
    }
  };

  // Compute item details
  const computedItems = items.map(item => {
    const product = products.find(p => p.id === item.product_id);
    if (!product) return item;
    const listPrice = Number(product.list_price);
    const cost = Number(product.cost);
    const unitPrice = listPrice * pricingFactor;
    const subtotal = unitPrice * item.quantity;
    return {
      ...item,
      product_name: product.name,
      list_price: listPrice,
      cost,
      unit_price: unitPrice,
      subtotal,
    };
  });

  const totalPrice = computedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const profitAmount = computedItems.reduce((sum, item) => {
    if (item.unit_price && item.cost) {
      return sum + (item.unit_price - item.cost) * item.quantity;
    }
    return sum;
  }, 0);
  const profitRate = totalPrice > 0 ? profitAmount / totalPrice : 0;

  const addItem = () => setItems([...items, { product_id: 0, quantity: 1 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof ItemRow, value: number) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const mutation = useMutation({
    mutationFn: (data: QuotationCreateInput) =>
      isEdit ? quotationApi.update(Number(id), data) : quotationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/quotations');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      customer_id: customerId,
      pricing_factor: pricingFactor,
      notes,
      items: items.filter(item => item.product_id > 0).map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{isEdit ? '編輯報價單' : '新增報價單'}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">客戶 *</label>
              <select
                value={customerId}
                onChange={e => handleCustomerChange(Number(e.target.value))}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">報價因子 *</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={pricingFactor}
                onChange={e => setPricingFactor(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
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

        {/* Items table */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">報價產品明細</h3>
            <button type="button" onClick={addItem} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
              新增項目
            </button>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">產品</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">牌價</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">單價</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">數量</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">復價</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {computedItems.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">
                    <select
                      value={item.product_id}
                      onChange={e => updateItem(index, 'product_id', Number(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value={0}>選擇產品</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.product_number})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right text-sm">{item.list_price?.toFixed(2) ?? '-'}</td>
                  <td className="px-4 py-2 text-right text-sm">{item.unit_price?.toFixed(2) ?? '-'}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                      className="w-20 px-2 py-1 border rounded text-sm text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium">{item.subtotal?.toFixed(2) ?? '-'}</td>
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
        </div>

        {/* Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">報價摘要</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">總價</p>
              <p className="text-2xl font-bold">{totalPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">獲利金額</p>
              <p className={`text-2xl font-bold ${profitAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitAmount.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">獲利率</p>
              <p className={`text-2xl font-bold ${profitRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(profitRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {mutation.error && (
          <p className="text-red-500 text-sm">{(mutation.error as Error).message}</p>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? '儲存中...' : '儲存草稿'}
          </button>
          <button type="button" onClick={() => navigate('/quotations')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
