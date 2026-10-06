import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import type { Product } from '../types';
import type { Column } from '../components/shared/DataTable';

const columns: Column<Product>[] = [
  { key: 'product_number', title: '產品編號' },
  { key: 'name', title: '產品名稱' },
  { key: 'cost', title: '成本' },
  { key: 'list_price', title: '牌價' },
  { key: 'inventory', title: '庫存' },
  { key: 'supplier', title: '供應商' },
  { key: 'actions', title: '操作' },
];

export default function ProductListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => productApi.list(page, 20, search),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteId(null);
    },
  });

  const columnsWithActions: Column<Product>[] = columns.map(col => {
    if (col.key === 'actions') {
      return {
        ...col,
        render: (product: Product) => (
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/products/${product.id}/edit`); }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              編輯
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteId(product.id); }}
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
        <h2 className="text-2xl font-bold">產品管理</h2>
        <button
          onClick={() => navigate('/products/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增產品
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="搜尋產品名稱或編號..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <DataTable columns={columnsWithActions} data={data?.data ?? []} loading={isLoading} />
      <Pagination page={page} pageSize={20} total={data?.total ?? 0} onPageChange={setPage} />

      <ConfirmDialog
        open={deleteId !== null}
        title="確認刪除"
        message="確定要刪除此產品嗎？"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
