import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../api/orderApi';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import StatusBadge from '../components/shared/StatusBadge';
import type { Order } from '../types';
import type { Column } from '../components/shared/DataTable';

export default function OrderListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, statusFilter],
    queryFn: () => orderApi.list(page, 20, statusFilter),
  });

  const columns: Column<Order>[] = [
    { key: 'order_number', title: '訂單編號' },
    { key: 'customer', title: '客戶', render: (o) => o.customer?.name ?? '-' },
    { key: 'total_price', title: '總價' },
    { key: 'status', title: '狀態', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'created_at', title: '建立時間', render: (o) => new Date(o.created_at).toLocaleDateString('zh-TW') },
    { key: 'actions', title: '操作', render: (o) => (
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}`); }}
        className="text-blue-600 hover:text-blue-800 text-sm"
      >
        查看
      </button>
    )},
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">訂單管理</h2>
        <button
          onClick={() => navigate('/orders/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增訂單
        </button>
      </div>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部狀態</option>
          <option value="pending">待處理</option>
          <option value="confirmed">已確認</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} />
      <Pagination page={page} pageSize={20} total={data?.total ?? 0} onPageChange={setPage} />
    </div>
  );
}
