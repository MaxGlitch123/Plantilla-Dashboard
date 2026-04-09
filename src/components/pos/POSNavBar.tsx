import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Receipt, Package, LayoutDashboard } from 'lucide-react';

const tabs = [
  { path: '/pos', label: 'Punto de Venta', icon: ShoppingCart },
  { path: '/pos/sales', label: 'Ventas', icon: Receipt },
  { path: '/pos/products', label: 'Productos', icon: Package },
];

const POSNavBar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <nav className="flex gap-1">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <LayoutDashboard size={18} />
        Dashboard
      </Link>
    </div>
  );
};

export default POSNavBar;
