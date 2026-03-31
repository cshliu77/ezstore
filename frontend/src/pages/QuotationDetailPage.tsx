import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationApi } from '../api/quotationApi';
import StatusBadge from '../components/shared/StatusBadge';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.get(Number(id)),
  });

  const publishMutation = useMutation({
    mutationFn: () => quotationApi.publish(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => quotationApi.duplicate(Number(id)),
    onSuccess: (newQuotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate(`/quotations/${newQuotation.id}/edit`);
    },
  });

  if (isLoading || !quotation) {
    return <div className="text-center py-8 text-gray-500">載入中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">報價單 {quotation.quotation_number}</h2>
          <StatusBadge status={quotation.status} />
        </div>
        <div className="flex gap-2">
          {quotation.status === 'draft' && (
            <>
              <button
                onClick={() => navigate(`/quotations/${id}/edit`)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                編輯
              </button>
              <button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {publishMutation.isPending ? '發佈中...' : '發佈'}
              </button>
            </>
          )}
          <button
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {duplicateMutation.isPending ? '複製中...' : '複製'}
          </button>
          <button onClick={() => navigate('/quotations')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            返回列表
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">客戶</p>
            <p className="font-medium">{quotation.customer?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">客戶等級</p>
            <p className="font-medium">{quotation.customer_level}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">報價因子</p>
            <p className="font-medium">{quotation.pricing_factor}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">備註</p>
            <p className="font-medium">{quotation.notes || '-'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">報價產品明細</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">產品名稱</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">牌價</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">單價</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">數量</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">復價</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quotation.items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm">{item.product_name}</td>
                  <td className="px-4 py-2 text-sm text-right">{item.list_price}</td>
                  <td className="px-4 py-2 text-sm text-right">{item.unit_price}</td>
                  <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">{item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">總價</p>
              <p className="text-2xl font-bold">{quotation.total_price}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">獲利金額</p>
              <p className="text-2xl font-bold text-green-600">{quotation.profit_amount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">獲利率</p>
              <p className="text-2xl font-bold text-green-600">{(Number(quotation.profit_rate) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
