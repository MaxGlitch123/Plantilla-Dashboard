import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
  User,
  Users,
  Settings,
  CreditCard,
  Bell,
  Lock,
  Mail,
  Smartphone,
  Save,
  Clock,
  Map,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Shield,
  FileText,
  Receipt
} from 'lucide-react';
import { fetchEmployees } from '../api/employees';
import { fetchRoles } from '../api/roles';
import type { Employee, Role } from '../types/employee';

// ── Types ────────────────────────────────────────────────

interface ProfileSettings {
  nombre: string;
  eslogan: string;
  email: string;
  telefono: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  pais: string;
}

interface BusinessSettings {
  horarios: { [day: string]: { abierto: boolean; desde: string; hasta: string } };
  deliveryHabilitado: boolean;
  retiroHabilitado: boolean;
  mesaHabilitado: boolean;
  radioEntrega: number;
  costoEnvio: number;
  tiempoEntrega: number;
  pedidoMinimo: number;
}

interface NotificationSettings {
  nuevoPedido: boolean;
  pedidoCancelado: boolean;
  stockBajo: boolean;
  nuevoCliente: boolean;
  emailNotificaciones: boolean;
  sonidoNotificaciones: boolean;
}

interface BillingSettings {
  razonSocial: string;
  cuit: string;
  condicionIva: string;
  tipoFactura: string;
  puntoDeVenta: string;
  domicilioFiscal: string;
  inicioActividades: string;
}

// ── Defaults ─────────────────────────────────────────────

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HOURS = ['Cerrado', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];

const defaultProfile: ProfileSettings = {
  nombre: '',
  eslogan: '',
  email: '',
  telefono: '',
  descripcion: '',
  direccion: '',
  ciudad: '',
  provincia: '',
  codigoPostal: '',
  pais: 'Argentina',
};

const defaultBusiness: BusinessSettings = {
  horarios: Object.fromEntries(
    DAYS.map((d) => [d, { abierto: d !== 'Domingo', desde: '10:00', hasta: '22:00' }])
  ),
  deliveryHabilitado: true,
  retiroHabilitado: true,
  mesaHabilitado: true,
  radioEntrega: 10,
  costoEnvio: 500,
  tiempoEntrega: 30,
  pedidoMinimo: 2000,
};

const defaultNotifications: NotificationSettings = {
  nuevoPedido: true,
  pedidoCancelado: true,
  stockBajo: true,
  nuevoCliente: false,
  emailNotificaciones: false,
  sonidoNotificaciones: true,
};

const defaultBilling: BillingSettings = {
  razonSocial: '',
  cuit: '',
  condicionIva: 'Responsable Inscripto',
  tipoFactura: 'A',
  puntoDeVenta: '0001',
  domicilioFiscal: '',
  inicioActividades: '',
};

// ── Helpers ──────────────────────────────────────────────

const STORAGE_KEYS = {
  profile: 'settings_profile',
  business: 'settings_business',
  notifications: 'settings_notifications',
  billing: 'settings_billing',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Component ────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<ProfileSettings>(() => load(STORAGE_KEYS.profile, defaultProfile));
  // Business state
  const [business, setBusiness] = useState<BusinessSettings>(() => load(STORAGE_KEYS.business, defaultBusiness));
  // Notification state
  const [notifications, setNotifications] = useState<NotificationSettings>(() => load(STORAGE_KEYS.notifications, defaultNotifications));
  // Billing state
  const [billing, setBilling] = useState<BillingSettings>(() => load(STORAGE_KEYS.billing, defaultBilling));
  // Users tab state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      setUsersLoading(true);
      Promise.all([fetchEmployees(), fetchRoles()])
        .then(([emps, rols]) => {
          setEmployees(emps.filter(e => !e.deleted));
          setRoles(rols.filter(r => !r.deleted));
        })
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    }
  }, [activeTab]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = () => {
    save(STORAGE_KEYS.profile, profile);
    showToast('Perfil guardado correctamente');
  };

  const handleSaveBusiness = () => {
    save(STORAGE_KEYS.business, business);
    showToast('Configuración de operaciones guardada');
  };

  const handleSaveNotifications = () => {
    save(STORAGE_KEYS.notifications, notifications);
    showToast('Preferencias de notificaciones guardadas');
  };

  const handleSaveBilling = () => {
    save(STORAGE_KEYS.billing, billing);
    showToast('Datos de facturación guardados');
  };

  const updateProfile = (field: keyof ProfileSettings, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const updateHorario = (day: string, field: 'abierto' | 'desde' | 'hasta', value: string | boolean) => {
    setBusiness((prev) => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [day]: { ...prev.horarios[day], [field]: value },
      },
    }));
  };

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle size={18} />
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-gray-800">Configuración</h1>
        <p className="text-gray-600">Administra la configuración del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Tabs sidebar */}
        <div className="md:col-span-1">
          <Card className="sticky top-20">
            <nav className="space-y-1">
              {[
                { id: 'profile', icon: User, label: 'Perfil de empresa' },
                { id: 'business', icon: Settings, label: 'Operaciones' },
                { id: 'notifications', icon: Bell, label: 'Notificaciones' },
                { id: 'security', icon: Lock, label: 'Seguridad' },
                { id: 'users', icon: Users, label: 'Usuarios y permisos' },
                { id: 'billing', icon: CreditCard, label: 'Facturación' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                    activeTab === tab.id
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="mr-3 h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-6">
          {/* ── Profile ── */}
          {activeTab === 'profile' && (
            <>
              <Card title="Información del restaurante">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <Input
                        label="Nombre del restaurante"
                        placeholder="Nombre de tu negocio"
                        value={profile.nombre}
                        onChange={(e) => updateProfile('nombre', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        label="Eslogan"
                        placeholder="Tu eslogan aquí"
                        value={profile.eslogan}
                        onChange={(e) => updateProfile('eslogan', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <Input
                        label="Correo electrónico"
                        type="email"
                        placeholder="info@ejemplo.com"
                        value={profile.email}
                        onChange={(e) => updateProfile('email', e.target.value)}
                        leftIcon={<Mail size={18} />}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        label="Teléfono"
                        type="tel"
                        placeholder="(261) 123-4567"
                        value={profile.telefono}
                        onChange={(e) => updateProfile('telefono', e.target.value)}
                        leftIcon={<Smartphone size={18} />}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Describe tu negocio..."
                      value={profile.descripcion}
                      onChange={(e) => updateProfile('descripcion', e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveProfile}>
                    Guardar cambios
                  </Button>
                </div>
              </Card>

              <Card title="Dirección">
                <div className="space-y-4">
                  <Input
                    label="Dirección"
                    placeholder="Av. San Martín 123"
                    value={profile.direccion}
                    onChange={(e) => updateProfile('direccion', e.target.value)}
                    leftIcon={<Map size={18} />}
                  />

                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <Input
                        label="Ciudad"
                        placeholder="Mendoza"
                        value={profile.ciudad}
                        onChange={(e) => updateProfile('ciudad', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        label="Provincia"
                        placeholder="Mendoza"
                        value={profile.provincia}
                        onChange={(e) => updateProfile('provincia', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        label="Código postal"
                        placeholder="5500"
                        value={profile.codigoPostal}
                        onChange={(e) => updateProfile('codigoPostal', e.target.value)}
                      />
                    </div>
                  </div>

                  <Input
                    label="País"
                    placeholder="Argentina"
                    value={profile.pais}
                    onChange={(e) => updateProfile('pais', e.target.value)}
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveProfile}>
                    Guardar cambios
                  </Button>
                </div>
              </Card>
            </>
          )}

          {/* ── Business / Operaciones ── */}
          {activeTab === 'business' && (
            <>
              <Card title="Horario de operación">
                <div className="space-y-3">
                  {DAYS.map((day) => {
                    const h = business.horarios[day] || { abierto: false, desde: '10:00', hasta: '22:00' };
                    return (
                      <div key={day} className="flex items-center justify-between">
                        <div className="w-28">
                          <span className="text-sm font-medium text-gray-700">{day}</span>
                        </div>
                        <div className="flex-1 flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Clock size={16} className="text-gray-400" />
                            <select
                              className="border border-gray-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                              value={h.desde}
                              onChange={(e) => updateHorario(day, 'desde', e.target.value)}
                              disabled={!h.abierto}
                            >
                              {HOURS.filter((hr) => hr !== 'Cerrado').map((hr) => (
                                <option key={hr} value={hr}>{hr}</option>
                              ))}
                            </select>
                          </div>
                          <span className="text-gray-400">a</span>
                          <div className="flex items-center space-x-2">
                            <Clock size={16} className="text-gray-400" />
                            <select
                              className="border border-gray-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                              value={h.hasta}
                              onChange={(e) => updateHorario(day, 'hasta', e.target.value)}
                              disabled={!h.abierto}
                            >
                              {HOURS.filter((hr) => hr !== 'Cerrado').map((hr) => (
                                <option key={hr} value={hr}>{hr}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <label className="inline-flex items-center ml-4">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            checked={h.abierto}
                            onChange={(e) => updateHorario(day, 'abierto', e.target.checked)}
                          />
                          <span className="ml-2 text-sm text-gray-600">Abierto</span>
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveBusiness}>
                    Guardar cambios
                  </Button>
                </div>
              </Card>

              <Card title="Entrega y recogida">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Opciones de servicio</h4>
                    <div className="space-y-2">
                      {[
                        { key: 'deliveryHabilitado' as const, label: 'Entrega a domicilio' },
                        { key: 'retiroHabilitado' as const, label: 'Recogida en local' },
                        { key: 'mesaHabilitado' as const, label: 'Servicio en mesa' },
                      ].map((opt) => (
                        <label key={opt.key} className="inline-flex items-center mr-6">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            checked={business[opt.key]}
                            onChange={(e) => setBusiness((p) => ({ ...p, [opt.key]: e.target.checked }))}
                          />
                          <span className="ml-2 text-sm text-gray-600">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Configuración de entrega</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Radio de entrega (km)"
                        type="number"
                        value={String(business.radioEntrega)}
                        onChange={(e) => setBusiness((p) => ({ ...p, radioEntrega: Number(e.target.value) }))}
                      />
                      <Input
                        label="Costo de envío ($)"
                        type="number"
                        value={String(business.costoEnvio)}
                        onChange={(e) => setBusiness((p) => ({ ...p, costoEnvio: Number(e.target.value) }))}
                      />
                      <Input
                        label="Tiempo estimado entrega (min)"
                        type="number"
                        value={String(business.tiempoEntrega)}
                        onChange={(e) => setBusiness((p) => ({ ...p, tiempoEntrega: Number(e.target.value) }))}
                      />
                      <Input
                        label="Pedido mínimo ($)"
                        type="number"
                        value={String(business.pedidoMinimo)}
                        onChange={(e) => setBusiness((p) => ({ ...p, pedidoMinimo: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveBusiness}>
                    Guardar cambios
                  </Button>
                </div>
              </Card>
            </>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <Card title="Preferencias de notificaciones">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Notificaciones del sistema</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'nuevoPedido' as const, label: 'Nuevo pedido recibido', desc: 'Recibir alerta cuando se crea un pedido nuevo' },
                      { key: 'pedidoCancelado' as const, label: 'Pedido cancelado', desc: 'Notificar cuando un pedido es cancelado' },
                      { key: 'stockBajo' as const, label: 'Stock bajo', desc: 'Alerta cuando un insumo alcanza el stock mínimo' },
                      { key: 'nuevoCliente' as const, label: 'Nuevo cliente registrado', desc: 'Notificar cuando se registra un nuevo cliente' },
                    ].map((n) => (
                      <div key={n.key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{n.label}</p>
                          <p className="text-xs text-gray-500">{n.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={notifications[n.key]}
                            onChange={(e) =>
                              setNotifications((p) => ({ ...p, [n.key]: e.target.checked }))
                            }
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Canales</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Notificaciones por email</p>
                        <p className="text-xs text-gray-500">Enviar resúmenes al correo configurado</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={notifications.emailNotificaciones}
                          onChange={(e) =>
                            setNotifications((p) => ({ ...p, emailNotificaciones: e.target.checked }))
                          }
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Sonido de notificación</p>
                        <p className="text-xs text-gray-500">Reproducir sonido al recibir alertas</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={notifications.sonidoNotificaciones}
                          onChange={(e) =>
                            setNotifications((p) => ({ ...p, sonidoNotificaciones: e.target.checked }))
                          }
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveNotifications}>
                  Guardar preferencias
                </Button>
              </div>
            </Card>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <Card title="Seguridad de la cuenta">
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Lock size={20} className="text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Autenticación gestionada por Auth0</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Las contraseñas y la autenticación en dos pasos se gestionan desde el proveedor de identidad Auth0.
                        Para cambiar tu contraseña, usá la opción de recuperación desde la pantalla de login.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recomendaciones de seguridad</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      Usá contraseñas de al menos 8 caracteres con mayúsculas y números
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      No compartas tu contraseña con nadie
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      Cerrá sesión cuando uses un dispositivo compartido
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      Cambiá tu contraseña periódicamente
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 rounded-md border border-amber-200">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <p className="ml-3 text-sm text-amber-700">
                    Si necesitás restablecer tu contraseña o tenés problemas de acceso, contactá al administrador del sistema.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ── Users ── */}
          {activeTab === 'users' && (
            <>
              <Card title="Usuarios y permisos">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Resumen de los empleados y roles configurados en el sistema. Para gestionar usuarios, visitá la sección de Empleados.
                  </p>

                  {usersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                    </div>
                  ) : (
                    <>
                      {/* Roles summary */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Shield size={16} className="text-gray-400" />
                          Roles configurados ({roles.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {roles.map((role) => {
                            const count = employees.filter(e => e.roles.some(r => r.id === role.id)).length;
                            return (
                              <div key={role.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{role.name}</p>
                                  <p className="text-xs text-gray-500">{role.description}</p>
                                </div>
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                  {count} {count === 1 ? 'usuario' : 'usuarios'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Employees summary */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          Empleados activos ({employees.length})
                        </h4>
                        <div className="max-h-64 overflow-y-auto divide-y border rounded-lg">
                          {employees.map((emp) => (
                            <div key={emp.id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{emp.name} {emp.lastName ?? ''}</p>
                                <p className="text-xs text-gray-500">{emp.userEmail}</p>
                              </div>
                              <div className="flex gap-1 flex-wrap justify-end">
                                {emp.roles.map((r) => (
                                  <span key={r.id} className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                          {employees.length === 0 && (
                            <div className="p-4 text-center text-gray-400 text-sm">No hay empleados registrados</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <Link to="/employees">
                    <Button variant="primary" icon={<ExternalLink size={18} />}>
                      Ir a Gestión de Empleados
                    </Button>
                  </Link>
                </div>
              </Card>
            </>
          )}

          {/* ── Billing ── */}
          {activeTab === 'billing' && (
            <>
              <Card title="Datos fiscales">
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
                    <FileText size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      Estos datos se utilizan para la generación de comprobantes y tickets de venta.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <Input
                        label="Razón Social"
                        placeholder="Mi Empresa S.R.L."
                        value={billing.razonSocial}
                        onChange={(e) => setBilling(p => ({ ...p, razonSocial: e.target.value }))}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        label="CUIT"
                        placeholder="20-12345678-9"
                        value={billing.cuit}
                        onChange={(e) => setBilling(p => ({ ...p, cuit: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condición frente al IVA</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                        value={billing.condicionIva}
                        onChange={(e) => setBilling(p => ({ ...p, condicionIva: e.target.value }))}
                      >
                        <option value="Responsable Inscripto">Responsable Inscripto</option>
                        <option value="Monotributista">Monotributista</option>
                        <option value="Exento">Exento</option>
                        <option value="Consumidor Final">Consumidor Final</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de factura</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                        value={billing.tipoFactura}
                        onChange={(e) => setBilling(p => ({ ...p, tipoFactura: e.target.value }))}
                      >
                        <option value="A">Factura A</option>
                        <option value="B">Factura B</option>
                        <option value="C">Factura C</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <Input
                        label="Punto de venta"
                        placeholder="0001"
                        value={billing.puntoDeVenta}
                        onChange={(e) => setBilling(p => ({ ...p, puntoDeVenta: e.target.value }))}
                        leftIcon={<Receipt size={18} />}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        label="Inicio de actividades"
                        type="date"
                        value={billing.inicioActividades}
                        onChange={(e) => setBilling(p => ({ ...p, inicioActividades: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Input
                    label="Domicilio fiscal"
                    placeholder="Av. San Martín 123, Mendoza"
                    value={billing.domicilioFiscal}
                    onChange={(e) => setBilling(p => ({ ...p, domicilioFiscal: e.target.value }))}
                    leftIcon={<Map size={18} />}
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveBilling}>
                    Guardar datos fiscales
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
