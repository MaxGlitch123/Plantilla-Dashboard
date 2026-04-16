import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Clock, CreditCard, Banknote, ArrowRightLeft, TrendingUp, AlertCircle, CheckCircle, History, Play, Square, Search, Printer, CalendarDays } from 'lucide-react';
import { POSService } from '../services/posService';
import apiClient from '../api/apiClient';

interface Shift {
  id: number;
  employeeName: string;
  employeeId: number;
  startTime: string;
  endTime: string | null;
  status: string;
  openingCash: number;
  closingCash: number | null;
  notes: string | null;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  salesCount: number;
  expectedCash: number;
  difference: number | null;
}

const CashRegisterPage: React.FC = () => {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showHistoryDetail, setShowHistoryDetail] = useState<Shift | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [toast, setToast] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const empInfo = await POSService.getEmployeeInfo();

      // Obtener turno activo
      const shiftRes = await apiClient.get('/api/pos/shifts/active', {
        params: { employeeId: empInfo.id }
      });

      if (shiftRes.data && shiftRes.data.id) {
        setActiveShift(shiftRes.data);
      } else {
        setActiveShift(null);
      }

      // Obtener historial
      const historyRes = await apiClient.get('/api/pos/shifts/history');
      setShiftHistory(historyRes.data || []);
    } catch (err) {
      console.error('Error loading shift data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refrescar datos del turno activo cada 30 segundos
  useEffect(() => {
    if (!activeShift) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/pos/shifts/${activeShift.id}`);
        if (res.data && res.data.id) {
          setActiveShift(res.data);
        }
      } catch { /* ignore */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeShift?.id]);

  const handleOpenShift = async () => {
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Ingresá un monto válido');
      return;
    }
    try {
      setError('');
      const empInfo = await POSService.getEmployeeInfo();
      const res = await apiClient.post('/api/pos/shifts/open', {
        employeeId: empInfo.id,
        openingCash: amount
      });
      setActiveShift(res.data);
      setOpeningAmount('');
      showToast('Caja abierta correctamente');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al abrir turno');
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    const amount = parseFloat(closingAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Ingresá el monto final de la caja');
      return;
    }
    try {
      setError('');
      await apiClient.post(`/api/pos/shifts/${activeShift.id}/close`, {
        closingCash: amount,
        notes: closingNotes || undefined
      });
      setShowCloseModal(false);
      setClosingAmount('');
      setClosingNotes('');
      showToast('Caja cerrada correctamente');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cerrar turno');
    }
  };

  const formatCurrency = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getElapsedTime = (startStr: string) => {
    const start = new Date(startStr).getTime();
    const now = Date.now();
    const diff = now - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const filteredHistory = shiftHistory.filter((s) => {
    const matchesSearch = !historySearch ||
      s.employeeName.toLowerCase().includes(historySearch.toLowerCase());
    const matchesDate = !historyDateFilter ||
      new Date(s.startTime).toISOString().slice(0, 10) === historyDateFilter;
    return matchesSearch && matchesDate;
  });

  const handlePrintShift = (shift: Shift) => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Cierre de Caja #${shift.id}</title>
      <style>body{font-family:monospace;padding:20px;font-size:13px}
      h2{text-align:center;margin:0 0 4px}
      .line{border-top:1px dashed #000;margin:8px 0}
      .row{display:flex;justify-content:space-between}
      .bold{font-weight:bold}
      </style></head><body>
      <h2>CIERRE DE CAJA</h2>
      <p style="text-align:center;margin:0 0 8px">Turno #${shift.id}</p>
      <div class="line"></div>
      <div class="row"><span>Cajero:</span><span>${shift.employeeName}</span></div>
      <div class="row"><span>Apertura:</span><span>${formatDate(shift.startTime)} ${formatTime(shift.startTime)}</span></div>
      <div class="row"><span>Cierre:</span><span>${shift.endTime ? `${formatDate(shift.endTime)} ${formatTime(shift.endTime)}` : '-'}</span></div>
      <div class="line"></div>
      <div class="row bold"><span>Total Vendido:</span><span>${formatCurrency(shift.totalSales)}</span></div>
      <div class="row"><span>Ventas:</span><span>${shift.salesCount}</span></div>
      <div class="line"></div>
      <div class="row"><span>Efectivo:</span><span>${formatCurrency(shift.cashSales)}</span></div>
      <div class="row"><span>Tarjeta:</span><span>${formatCurrency(shift.cardSales)}</span></div>
      <div class="row"><span>Transferencia:</span><span>${formatCurrency(shift.transferSales)}</span></div>
      <div class="line"></div>
      <div class="row"><span>Inicio de caja:</span><span>${formatCurrency(shift.openingCash)}</span></div>
      <div class="row"><span>Efectivo esperado:</span><span>${formatCurrency(shift.expectedCash)}</span></div>
      ${shift.closingCash !== null ? `<div class="row"><span>Efectivo contado:</span><span>${formatCurrency(shift.closingCash)}</span></div>` : ''}
      ${shift.difference !== null ? `<div class="row bold"><span>Diferencia:</span><span>${shift.difference === 0 ? 'Cuadra ✓' : formatCurrency(shift.difference)}</span></div>` : ''}
      ${shift.notes ? `<div class="line"></div><p>Notas: ${shift.notes}</p>` : ''}
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Cierre de Caja</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setTab('current')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'current' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Play className="inline h-4 w-4 mr-1" /> Turno Actual
            </button>
            <button
              onClick={() => setTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'history' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <History className="inline h-4 w-4 mr-1" /> Historial
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {tab === 'current' && (
          <>
            {/* Sin turno abierto: formulario de apertura */}
            {!activeShift && (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center max-w-md mx-auto">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Banknote className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Abrir Caja</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Contá el efectivo en la caja e ingresá el monto para iniciar el turno.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Monto inicial en caja
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleOpenShift()}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  onClick={handleOpenShift}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Abrir Turno
                </button>
              </div>
            )}

            {/* Turno abierto: dashboard */}
            {activeShift && (
              <div className="space-y-6">
                {/* Info del turno */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 rounded-full p-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">Turno Abierto</h2>
                        <p className="text-sm text-gray-500">{activeShift.employeeName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Inicio: {formatTime(activeShift.startTime)}</span>
                      </div>
                      <p className="text-sm font-medium text-green-600">
                        {getElapsedTime(activeShift.startTime)} activo
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <span className="text-gray-500">Monto inicial:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(activeShift.openingCash)}</span>
                  </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-gray-500">Total Ventas</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(activeShift.totalSales)}</p>
                    <p className="text-xs text-gray-400 mt-1">{activeShift.salesCount} ventas</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Banknote className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-500">Efectivo</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(activeShift.cashSales)}</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard className="h-5 w-5 text-purple-500" />
                      <span className="text-sm text-gray-500">Tarjeta</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(activeShift.cardSales)}</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <ArrowRightLeft className="h-5 w-5 text-orange-500" />
                      <span className="text-sm text-gray-500">Transferencia</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(activeShift.transferSales)}</p>
                  </div>
                </div>

                {/* Efectivo esperado */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="font-semibold mb-3">Resumen de Efectivo</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Inicio de caja:</span>
                      <span className="font-medium">{formatCurrency(activeShift.openingCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ventas en efectivo:</span>
                      <span className="font-medium text-green-600">+ {formatCurrency(activeShift.cashSales)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Efectivo esperado en caja:</span>
                      <span className="font-bold text-lg">{formatCurrency(activeShift.expectedCash)}</span>
                    </div>
                  </div>
                </div>

                {/* Botón cerrar caja */}
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Square className="h-5 w-5" />
                  <span>Cerrar Caja</span>
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold mb-3">Historial de Turnos</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por cajero..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                {(historySearch || historyDateFilter) && (
                  <button
                    onClick={() => { setHistorySearch(''); setHistoryDateFilter(''); }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                {shiftHistory.length === 0
                  ? 'No hay turnos registrados aún.'
                  : 'No se encontraron turnos con los filtros aplicados.'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredHistory.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setShowHistoryDetail(shift)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{shift.employeeName}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(shift.startTime)} · {formatTime(shift.startTime)}
                          {shift.endTime && ` - ${formatTime(shift.endTime)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(shift.totalSales)}</p>
                        <div className="flex items-center space-x-1">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            shift.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {shift.status === 'ACTIVE' ? 'Abierto' : 'Cerrado'}
                          </span>
                          {shift.difference !== null && shift.difference !== undefined && (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              shift.difference === 0
                                ? 'bg-green-100 text-green-700'
                                : shift.difference > 0
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {shift.difference === 0
                                ? 'Cuadra'
                                : shift.difference > 0
                                  ? `+${formatCurrency(shift.difference)}`
                                  : formatCurrency(shift.difference)
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal cerrar caja */}
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cerrar Caja</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800">Efectivo esperado en caja:</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(activeShift.expectedCash)}</p>
                <p className="text-blue-600 text-xs mt-1">
                  (Inicio: {formatCurrency(activeShift.openingCash)} + Ventas efectivo: {formatCurrency(activeShift.cashSales)})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto real contado en caja
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              {closingAmount && !isNaN(parseFloat(closingAmount)) && (
                <div className={`rounded-lg p-3 text-sm ${
                  parseFloat(closingAmount) === activeShift.expectedCash
                    ? 'bg-green-50 border border-green-200'
                    : parseFloat(closingAmount) > activeShift.expectedCash
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="font-medium">
                    {parseFloat(closingAmount) === activeShift.expectedCash
                      ? '✓ La caja cuadra perfectamente'
                      : parseFloat(closingAmount) > activeShift.expectedCash
                        ? `↑ Sobrante: ${formatCurrency(parseFloat(closingAmount) - activeShift.expectedCash)}`
                        : `↓ Faltante: ${formatCurrency(activeShift.expectedCash - parseFloat(closingAmount))}`
                    }
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="Notas sobre el cierre..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCloseShift}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Confirmar Cierre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle de turno del historial */}
      {showHistoryDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Detalle del Turno</h3>
              <button onClick={() => setShowHistoryDetail(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Cajero:</span>
                  <p className="font-medium">{showHistoryDetail.employeeName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>
                  <p>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      showHistoryDetail.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {showHistoryDetail.status === 'ACTIVE' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Apertura:</span>
                  <p className="font-medium">{formatDate(showHistoryDetail.startTime)} {formatTime(showHistoryDetail.startTime)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Cierre:</span>
                  <p className="font-medium">
                    {showHistoryDetail.endTime
                      ? `${formatDate(showHistoryDetail.endTime)} ${formatTime(showHistoryDetail.endTime)}`
                      : '-'
                    }
                  </p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Inicio de caja:</span>
                  <span className="font-medium">{formatCurrency(showHistoryDetail.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total vendido:</span>
                  <span className="font-bold">{formatCurrency(showHistoryDetail.totalSales)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Efectivo:</span>
                  <span>{formatCurrency(showHistoryDetail.cashSales)}</span>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span>Tarjeta:</span>
                  <span>{formatCurrency(showHistoryDetail.cardSales)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Transferencia:</span>
                  <span>{formatCurrency(showHistoryDetail.transferSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cantidad de ventas:</span>
                  <span className="font-medium">{showHistoryDetail.salesCount}</span>
                </div>
              </div>

              {showHistoryDetail.closingCash !== null && (
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Efectivo esperado:</span>
                    <span className="font-medium">{formatCurrency(showHistoryDetail.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Efectivo contado:</span>
                    <span className="font-medium">{formatCurrency(showHistoryDetail.closingCash)}</span>
                  </div>
                  {showHistoryDetail.difference !== null && (
                    <div className={`flex justify-between font-semibold ${
                      showHistoryDetail.difference === 0
                        ? 'text-green-600'
                        : showHistoryDetail.difference > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      <span>Diferencia:</span>
                      <span>
                        {showHistoryDetail.difference === 0
                          ? 'Cuadra ✓'
                          : showHistoryDetail.difference > 0
                            ? `+${formatCurrency(showHistoryDetail.difference)} (sobrante)`
                            : `${formatCurrency(showHistoryDetail.difference)} (faltante)`
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}

              {showHistoryDetail.notes && (
                <div className="border-t pt-3">
                  <span className="text-sm text-gray-500">Notas:</span>
                  <p className="text-sm mt-1">{showHistoryDetail.notes}</p>
                </div>
              )}

              <button
                onClick={() => setShowHistoryDetail(null)}
                className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 mt-2"
              >
                Cerrar
              </button>

              {showHistoryDetail.status !== 'ACTIVE' && (
                <button
                  onClick={() => handlePrintShift(showHistoryDetail)}
                  className="w-full py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 mt-2 flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  Imprimir resumen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CashRegisterPage;
