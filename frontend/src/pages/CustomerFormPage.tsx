import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { customerApi } from '../api/customerApi';
import type { Customer } from '../types';

type FormData = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { level: 'standard', credit_score: 0 },
  });

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerApi.get(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (customer) reset(customer);
  }, [customer, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? customerApi.update(Number(id), data) : customerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
  });

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">{isEdit ? '編輯客戶' : '新增客戶'}</h2>

      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">客戶名稱 *</label>
          <input {...register('name', { required: '請輸入客戶名稱' })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">統一編號 *</label>
          <input {...register('tax_id', { required: '請輸入統一編號', pattern: { value: /^\d{8}$/, message: '統一編號必須為8位數字' } })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.tax_id && <p className="text-red-500 text-sm mt-1">{errors.tax_id.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">聯絡人</label>
            <input {...register('contact_name')} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
            <input {...register('contact_phone')} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" {...register('contact_email')} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
          <input {...register('address')} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客戶等級 *</label>
            <select {...register('level')} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="new">新客戶</option>
              <option value="standard">一般</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">信用評分 (0-100)</label>
            <input type="number" min={0} max={100} {...register('credit_score', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {mutation.error && (
          <p className="text-red-500 text-sm">{(mutation.error as Error).message}</p>
        )}

        <div className="flex gap-2 pt-4">
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? '儲存中...' : '儲存'}
          </button>
          <button type="button" onClick={() => navigate('/customers')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
