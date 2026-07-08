import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
  LayoutDashboard,
  UserCircle,
  ShoppingBag,
  Coffee,
  X,
  LogOut,
  Package,
  Tag,
  ShoppingCart,
  Receipt,
  ChefHat,
  Wallet,
  BarChart2
} from 'lucide-react';
import Button from '../ui/Button';
import { usePOSStore } from '../../store/posStore';
import { clearPOSData } from '../../services/posService';

const SIDEBAR_ITEMS = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    path: '/dashboard',
    allowedRoles: ['admin', 'manager', 'employee', 'delivery', 'cajero', 'cajero_control_de_stock'],
  },
  {
    label: 'Ventas POS',
    icon: <Receipt size={20} />,
    path: '/pos/sales',
    allowedRoles: ['admin', 'manager', 'employee'],
  },
  {
    label: 'Empleados',
    icon: <UserCircle size={20} />,
    path: '/employees',
    allowedRoles: ['admin', 'manager'],
  },
  {
    label: 'Punto de Venta',
    icon: <ShoppingCart size={20} />,
    path: '/pos',
    allowedRoles: ['cajero', 'cajero_control_de_stock'],
  },
  {
    label: 'Mis Ventas',
    icon: <Receipt size={20} />,
    path: '/pos/my-sales',
    allowedRoles: ['cajero', 'cajero_control_de_stock'],
  },

  {
    label: 'Productos POS',
    icon: <ChefHat size={20} />,
    path: '/pos/products',
    allowedRoles: ['cajero', 'cajero_control_de_stock'],
  },
  {
    label: 'Cierre de Caja',
    icon: <Wallet size={20} />,
    path: '/cash-register',
    allowedRoles: ['cajero', 'admin', 'manager','cajero_control_de_stock'],
  },
  {
    label: 'Productos',
    icon: <ShoppingBag size={20} />,
    path: '/products',
    allowedRoles: ['admin', 'manager', 'chef'],
  },
  {
    label: 'Insumos',
    icon: <Package size={20} />,
    path: '/supplies',
    allowedRoles: ['admin', 'manager', 'chef', 'cajero_control_de_stock'],
    // Only allow this specific user in addition to role-based access
    allowedUsers: ['sol_cajera@cityfast.com'],
  },
  // {
  //   label: 'Promociones',
  //   icon: <Tag size={20} />,
  //   path: '/promotions',
  //   allowedRoles: ['admin', 'manager'],
  // },
  {
    label: 'Unidades de Medida',
    icon: <Package size={20} />,
    path: '/unit-measures',
    allowedRoles: ['admin'],
  },
  {
    label: 'Reportes',
    icon: <BarChart2 size={20} />,
    path: '/reports',
    allowedRoles: ['admin', 'manager'],
  },
];

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export const getRoleFromUser = (user: any): string => {
  if (!user) return 'guest';

  const rolesKey = Object.keys(user).find(key => key.includes('roles'));
  const roleList = rolesKey && Array.isArray(user[rolesKey]) ? user[rolesKey] : [];

  if (!roleList.length) return 'guest';

  // Normalize role strings to uppercase for consistent checks
  const normalized = roleList
    .filter(r => typeof r === 'string')
    .map(r => String(r).toUpperCase().trim());

  if (!normalized.length) return 'guest';

  // If any role indicates cashier + stock control, prefer that
  if (normalized.some(r => r.includes('CAJERO') && r.includes('CONTROL'))) {
    return 'cajero_control_de_stock';
  }

  // If any role is plain cashier, use that
  if (normalized.some(r => r === 'CAJERO')) {
    return 'cajero';
  }

  // Fallback mapping based on known keywords
  const first = normalized[0].toLowerCase();
  switch (first) {
    case 'admin': return 'admin';
    case 'empleado': return 'employee';
    case 'repartidor': return 'delivery';
    case 'chef': return 'chef';
    case 'cliente': return 'client';
    case 'cajero_control_de_stock': return 'cajero_control_de_stock';
    case 'cajero y control de stock': return 'cajero_control_de_stock';
    case 'cajero control de stock': return 'cajero_control_de_stock';
    default: return first;
  }
};


const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose }) => {
  const { user, logout, isAuthenticated } = useAuth0();

  const currentUser = isAuthenticated && user
    ? {
      firstName: user.given_name || user.name?.split(' ')[0] || '',
      lastName: user.family_name || user.name?.split(' ')[1] || '',
      role: getRoleFromUser(user),
      email: user.email || user?.email || '',
    }
    : null;

  // Debug: show resolved current user and raw user object to diagnose role issues
  try {
    // eslint-disable-next-line no-console
    console.log('Sidebar debug currentUser:', { currentUser, rawUser: isAuthenticated ? user : null });
  } catch (e) {
    // ignore
  }

  const filteredItems = SIDEBAR_ITEMS.filter((item) => {
    if (!currentUser) return false;
    // Allow if role matches
    if (Array.isArray(item.allowedRoles) && item.allowedRoles.includes(currentUser.role)) return true;
    // Allow if e-mail is explicitly allowed for this item
    if (Array.isArray((item as any).allowedUsers) && (item as any).allowedUsers.includes(currentUser.email)) return true;
    return false;
  });

  const clearCart = usePOSStore(state => state.clearCart);

  const handleLogout = () => {
    clearCart();
    // Clear all POS data to prevent ghost sales
    clearPOSData();
    logout({ logoutParams: { returnTo: `${window.location.origin}/login` } });
  };

  return (
    <div className={`bg-white h-full flex flex-col border-r border-gray-200 ${isMobile ? 'w-full' : 'w-64'}`}>
      {isMobile ? (
        <div className="p-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Coffee className="w-6 h-6 text-green-600" />
            <span className="font-serif text-xl font-bold">City Fast</span>
          </div>
          <button onClick={onClose} className="p-1">
            <X size={24} className="text-gray-500" />
          </button>
        </div>
      ) : (
        <div className="p-4 flex items-center space-x-2 border-b border-gray-200">
          <Coffee className="w-6 h-6 text-green-600" />
          <span className="font-serif text-xl font-bold">City Fast</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-md transition-colors ${isActive
                    ? 'bg-green-50 text-green-600'
                    : 'hover:bg-gray-100 text-gray-700'
                  }`
                }
                onClick={isMobile ? onClose : undefined}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {currentUser && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center">
              <span className="text-gray-700 font-medium">
                {currentUser.firstName.charAt(0)}
                {currentUser.lastName.charAt(0)}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">{currentUser.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-gray-700"
            icon={<LogOut size={16} />}
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
