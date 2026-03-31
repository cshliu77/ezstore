import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import type { Customer } from '../types';
import type { Column } from '../components/shared/DataTable';

const columns: Column<Customer>[] = [
  { key: 'name', title: '客戶名稱' },
  { key: 'tax_id', title: '統一編號' },
  { key: 'contact_name', title: '聯絡人' },
  { key: 'contact_phone', title: '電話' },
  { key: 'level', title: '等級', render: (c) => {
    const labels: Record<string, string> = { vip: 'VIP', standard: '一般', new: '新客戶' };
    return labels[c.level] || c.level;
  }},
  { key: 'credit_score', title: '信用評分' },
  { key: 'actions', title: '操作' },
];

export default function CustomerListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customerApi.list(page, 20, search),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteId(null);
    },
  });

  const columnsWithActions: Column<Customer>[] = columns.map(col => {
    if (col.key === 'actions') {
      return {
        ...col,
        render: (customer: Customer) => (
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/customers/${customer.id}/edit`); }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              編輯
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteId(customer.id); }}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              刪除
            </button>
          </div>
        ),
      };
    }
    return col;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">客戶管理</h2>
        <button
          onClick={() => navigate('/customers/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增客戶
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="搜尋客戶名稱或統一編號..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <DataTable columns={columnsWithActions} data={data?.data ?? []} loading={isLoading} />
      <Pagination
        page={page}
        pageSize={20}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="確認刪除"
        message="確定要刪除此客戶嗎？此操作無法復原。"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
