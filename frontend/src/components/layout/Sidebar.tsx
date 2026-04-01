import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '總覽', icon: '📊' },
  { to: '/customers', label: '客戶管理', icon: '👥' },
  { to: '/products', label: '產品管理', icon: '📦' },
  { to: '/quotations', label: '報價單管理', icon: '📋' },
  { to: '/orders', label: '訂單管理', icon: '🛒' },
  { to: '/agent', label: '智能助理', icon: '🤖' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="text-2xl font-bold mb-8 px-2">EZStore</div>
      <nav className="space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
