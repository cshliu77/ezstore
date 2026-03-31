import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../api/orderApi';
import StatusBadge from '../components/shared/StatusBadge';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.get(Number(id)),
  });

  if (isLoading || !order) {
    return <div className="text-center py-8 text-gray-500">載入中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">訂單 {order.order_number}</h2>
          <StatusBadge status={order.status} />
        </div>
        <button onClick={() => navigate('/orders')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
          返回列表
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">客戶</p>
            <p className="font-medium">{order.customer?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">關聯報價單</p>
            <p className="font-medium">{order.quotation_id ? `#${order.quotation_id}` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">建立時間</p>
            <p className="font-medium">{new Date(order.created_at).toLocaleDateString('zh-TW')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">備註</p>
            <p className="font-medium">{order.notes || '-'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">訂單明細</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">產品名稱</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">單價</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">數量</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">復價</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm">{item.product_name}</td>
                  <td className="px-4 py-2 text-sm text-right">{item.unit_price}</td>
                  <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">{item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">總價</p>
          <p className="text-2xl font-bold">{order.total_price}</p>
        </div>
      </div>
    </div>
  );
}
