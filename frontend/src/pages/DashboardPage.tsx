import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import { productApi } from '../api/productApi';
import { quotationApi } from '../api/quotationApi';
import { orderApi } from '../api/orderApi';

export default function DashboardPage() {
  const customers = useQuery({ queryKey: ['customers', 1, 1], queryFn: () => customerApi.list(1, 1) });
  const products = useQuery({ queryKey: ['products', 1, 1], queryFn: () => productApi.list(1, 1) });
  const quotations = useQuery({ queryKey: ['quotations', 1, 1], queryFn: () => quotationApi.list(1, 1) });
  const orders = useQuery({ queryKey: ['orders', 1, 1], queryFn: () => orderApi.list(1, 1) });

  const cards = [
    { title: '客戶數', value: customers.data?.total ?? '-', color: 'bg-blue-500', icon: '客' },
    { title: '產品數', value: products.data?.total ?? '-', color: 'bg-green-500', icon: '品' },
    { title: '報價單數', value: quotations.data?.total ?? '-', color: 'bg-yellow-500', icon: '報' },
    { title: '訂單數', value: orders.data?.total ?? '-', color: 'bg-purple-500', icon: '單' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">系統總覽</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(card => (
          <div key={card.title} className="bg-white rounded-lg shadow p-6">
            <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white text-xl font-bold mb-4`}>
              {card.icon}
            </div>
            <p className="text-gray-500 text-sm">{card.title}</p>
            <p className="text-3xl font-bold text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
