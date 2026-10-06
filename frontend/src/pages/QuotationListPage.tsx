import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationApi } from '../api/quotationApi';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import type { Quotation } from '../types';
import type { Column } from '../components/shared/DataTable';

export default function QuotationListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', page, statusFilter],
    queryFn: () => quotationApi.list(page, 20, statusFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => quotationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setDeleteId(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => quotationApi.duplicate(id),
    onSuccess: (newQuotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate(`/quotations/${newQuotation.id}/edit`);
    },
  });

  const columns: Column<Quotation>[] = [
    { key: 'quotation_number', title: '報價單編號' },
    { key: 'customer', title: '客戶', render: (q) => q.customer?.name ?? '-' },
    { key: 'pricing_factor', title: '報價因子' },
    { key: 'total_price', title: '總價' },
    { key: 'profit_rate', title: '獲利率', render: (q) => `${(Number(q.profit_rate) * 100).toFixed(1)}%` },
    { key: 'status', title: '狀態', render: (q) => <StatusBadge status={q.status} /> },
    { key: 'actions', title: '操作', render: (q) => (
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}`); }}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          查看
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(q.id); }}
          className="text-purple-600 hover:text-purple-800 text-sm"
        >
          複製
        </button>
        {q.status === 'draft' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}/edit`); }}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              編輯
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteId(q.id); }}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              刪除
            </button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">報價單管理</h2>
        <button
          onClick={() => navigate('/quotations/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增報價單
        </button>
      </div>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部狀態</option>
          <option value="draft">草稿</option>
          <option value="published">已發佈</option>
        </select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} />
      <Pagination page={page} pageSize={20} total={data?.total ?? 0} onPageChange={setPage} />

      <ConfirmDialog
        open={deleteId !== null}
        title="確認刪除"
        message="確定要刪除此報價單嗎？"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
