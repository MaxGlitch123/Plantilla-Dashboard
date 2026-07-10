import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Clock, CreditCard, Banknote, ArrowRightLeft, TrendingUp, AlertCircle, CheckCircle, History, Play, Square, Search, Printer, CalendarDays, Users } from 'lucide-react';
import { POSService } from '../services/posService';
import apiClient from '../api/apiClient';
import { useAuthStore } from '../store/useAuthStore';

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
  const rol = useAuthStore(state => state.rol);
  const isAdmin = rol === 'Admin' || rol === 'admin';

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showHistoryDetail, setShowHistoryDetail] = useState<Shift | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'current' | 'history' | 'consolidated'>(isAdmin ? 'history' : 'current');
  const [toast, setToast] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyTimeFrom, setHistoryTimeFrom] = useState('');
  const [historyTimeTo, setHistoryTimeTo] = useState('');
  const [selectedShifts, setSelectedShifts] = useState<Set<number>>(new Set());

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
      } catch (err) { console.warn('Shift refresh error:', err); }
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
      console.log('Closing shift:', activeShift.id, 'with closing cash:', amount);
      
      const response = await apiClient.post(`/api/pos/shifts/${activeShift.id}/close`, {
        closingCash: amount,
        notes: closingNotes || undefined
      });
      
      console.log('Close response:', response.data);
      
      // Verify the shift was actually closed before clearing
      if (response.data && response.data.endTime) {
        setShowCloseModal(false);
        setClosingAmount('');
        setClosingNotes('');
        showToast('✅ Caja cerrada correctamente');
        await loadData();
      } else {
        setError('❌ El servidor no confirmó el cierre. Intenta nuevamente.');
        console.error('Close response missing endTime:', response.data);
      }
    } catch (err: any) {
      console.error('Close shift error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Error al cerrar turno';
      setError(`❌ ${errorMsg}`);
      console.error('Full error:', err.response?.data);
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

  const toggleShiftSelection = (shiftId: number) => {
    const newSelected = new Set(selectedShifts);
    if (newSelected.has(shiftId)) {
      newSelected.delete(shiftId);
    } else {
      newSelected.add(shiftId);
    }
    setSelectedShifts(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedShifts.size === filteredHistory.length) {
      setSelectedShifts(new Set());
    } else {
      setSelectedShifts(new Set(filteredHistory.map(s => s.id)));
    }
  };

  const handlePrintByPeriod = (period: 'all' | 'today' | 'week') => {
    let shiftsToprint: Shift[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === 'all') {
      shiftsToprint = shiftHistory;
    } else if (period === 'today') {
      shiftsToprint = shiftHistory.filter(s => {
        const shiftDate = new Date(s.startTime);
        shiftDate.setHours(0, 0, 0, 0);
        return shiftDate.getTime() === today.getTime();
      });
    } else if (period === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      shiftsToprint = shiftHistory.filter(s => {
        const shiftDate = new Date(s.startTime);
        return shiftDate >= weekAgo;
      });
    }

    if (shiftsToprint.length === 0) {
      alert('No hay cierres de caja para imprimir en este período');
      return;
    }

    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;

    const periodTitle = period === 'all' ? 'TODOS LOS CIERRES' : period === 'today' ? 'CIERRES DEL DÍA' : 'CIERRES DE LA SEMANA';
    const totalSales = shiftsToprint.reduce((acc, s) => acc + s.totalSales, 0);
    const totalCash = shiftsToprint.reduce((acc, s) => acc + s.cashSales, 0);
    const totalCard = shiftsToprint.reduce((acc, s) => acc + s.cardSales, 0);
    const totalTransfer = shiftsToprint.reduce((acc, s) => acc + s.transferSales, 0);

    w.document.write(`
      <html><head><title>${periodTitle}</title>
      <style>
        body{font-family:monospace;padding:20px;font-size:12px}
        h2{text-align:center;margin:0 0 4px}
        .line{border-top:1px dashed #000;margin:8px 0}
        .row{display:flex;justify-content:space-between;margin:2px 0}
        .bold{font-weight:bold}
        .header{background:#f0f0f0;padding:4px;margin:4px 0}
        .total{font-weight:bold;background:#e8f5e9;padding:4px}
        table{width:100%;border-collapse:collapse;margin:8px 0}
        td{padding:4px;border-bottom:1px solid #ddd}
      </style></head><body>
      <h2>${periodTitle}</h2>
      <p style="text-align:center;margin:0 0 8px">${new Date().toLocaleString()}</p>
      <div class="line"></div>
      <table>
        <tr class="bold header">
          <td>Turno</td>
          <td>Cajero</td>
          <td>Hora</td>
          <td style="text-align:right">Total</td>
          <td style="text-align:right">Efectivo</td>
        </tr>
        ${shiftsToprint.map(s => `
          <tr>
            <td>#${s.id}</td>
            <td>${s.employeeName}</td>
            <td>${formatTime(s.endTime || s.startTime)}</td>
            <td style="text-align:right">$${s.totalSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right">$${s.cashSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </table>
      <div class="line"></div>
      <div class="total"><div class="row"><span>TOTAL VENDIDO:</span><span>$${totalSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div></div>
      <div class="row"><span>Efectivo:</span><span>$${totalCash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>Tarjeta:</span><span>$${totalCard.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>Transferencia:</span><span>$${totalTransfer.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>Cantidad de cierres:</span><span>${shiftsToprint.length}</span></div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handlePrintSelectedShifts = () => {
    if (selectedShifts.size === 0) {
      alert('Selecciona al menos un cierre para imprimir');
      return;
    }

    const shiftsToprint = shiftHistory.filter(s => selectedShifts.has(s.id));
    const totalSales = shiftsToprint.reduce((acc, s) => acc + s.totalSales, 0);
    const totalCash = shiftsToprint.reduce((acc, s) => acc + s.cashSales, 0);
    const totalCard = shiftsToprint.reduce((acc, s) => acc + s.cardSales, 0);
    const totalTransfer = shiftsToprint.reduce((acc, s) => acc + s.transferSales, 0);

    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;

    w.document.write(`
      <html><head><title>CIERRES SELECCIONADOS</title>
      <style>
        body{font-family:monospace;padding:20px;font-size:12px}
        h2{text-align:center;margin:0 0 4px}
        .line{border-top:1px dashed #000;margin:8px 0}
        .row{display:flex;justify-content:space-between;margin:2px 0}
        .bold{font-weight:bold}
        .header{background:#f0f0f0;padding:4px;margin:4px 0}
        .total{font-weight:bold;background:#e8f5e9;padding:4px}
        table{width:100%;border-collapse:collapse;margin:8px 0}
        td{padding:4px;border-bottom:1px solid #ddd}
      </style></head><body>
      <h2>CIERRES SELECCIONADOS</h2>
      <p style="text-align:center;margin:0 0 8px">${new Date().toLocaleString()}</p>
      <div class="line"></div>
      <table>
        <tr class="bold header">
          <td>Turno</td>
          <td>Cajero</td>
          <td>Hora</td>
          <td style="text-align:right">Total</td>
          <td style="text-align:right">Efectivo</td>
        </tr>
        ${shiftsToprint.map(s => `
          <tr>
            <td>#${s.id}</td>
            <td>${s.employeeName}</td>
            <td>${formatTime(s.endTime || s.startTime)}</td>
            <td style="text-align:right">$${s.totalSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right">$${s.cashSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </table>
      <div class="line"></div>
      <div class="total"><div class="row"><span>TOTAL VENDIDO:</span><span>$${totalSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div></div>
      <div class="row"><span>Efectivo:</span><span>$${totalCash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>Tarjeta:</span><span>$${totalCard.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>Transferencia:</span><span>$${totalTransfer.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span>Cantidad de cierres:</span><span>${shiftsToprint.length}</span></div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const filteredHistory = shiftHistory.filter((s) => {
    const matchesSearch = !historySearch ||
      s.employeeName.toLowerCase().includes(historySearch.toLowerCase());
    const matchesDate = !historyDateFilter ||
      new Date(s.startTime).toISOString().slice(0, 10) === historyDateFilter;
    let matchesTime = true;
    if (historyTimeFrom || historyTimeTo) {
      const getHHMM = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };
      const startHHMM = getHHMM(s.startTime);
      const endHHMM = s.endTime ? getHHMM(s.endTime) : '23:59';
      if (historyTimeFrom) matchesTime = matchesTime && endHHMM >= historyTimeFrom;
      if (historyTimeTo) matchesTime = matchesTime && startHHMM <= historyTimeTo;
    }
    return matchesSearch && matchesDate && matchesTime;
  });

  const activeShifts = shiftHistory.filter(s => s.status === 'ACTIVE');

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
            {!isAdmin && (
              <button
                onClick={() => setTab('current')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'current' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Play className="inline h-4 w-4 mr-1" /> Turno Actual
              </button>
            )}
            <button
              onClick={() => setTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'history' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <History className="inline h-4 w-4 mr-1" /> Historial
            </button>
            <button
              onClick={() => setTab('consolidated')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'consolidated' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="inline h-4 w-4 mr-1" /> Consolidado
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

                  {/* ⚠️ Warning if shift is over 8 hours */}
                  {(() => {
                    const startTime = new Date(activeShift.startTime).getTime();
                    const now = Date.now();
                    const diff = now - startTime;
                    const hours = Math.floor(diff / 3600000);
                    if (hours >= 8) {
                      return (
                        <div className={`p-3 rounded-lg mb-4 flex items-center space-x-2 ${
                          hours >= 12 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                        }`}>
                          <AlertCircle className={hours >= 12 ? 'h-5 w-5 text-red-600' : 'h-5 w-5 text-yellow-600'} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${hours >= 12 ? 'text-red-700' : 'text-yellow-700'}`}>
                              ⏰ Este turno lleva {hours} horas abierto
                            </p>
                            <p className={`text-xs ${hours >= 12 ? 'text-red-600' : 'text-yellow-600'}`}>
                              {hours >= 12 
                                ? '🔴 URGENTE: Cierra el turno ahora. El sistema auto-cerrará a las 23:00.' 
                                : '⚠️ Recordá cerrar antes de las 23:00.'}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

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
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Historial de Turnos</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintByPeriod('today')}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                    title="Imprimir cierres de hoy"
                  >
                    <Printer size={16} />
                    <span className="hidden sm:inline">Hoy</span>
                  </button>
                  <button
                    onClick={() => handlePrintByPeriod('week')}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
                    title="Imprimir cierres de la semana"
                  >
                    <Printer size={16} />
                    <span className="hidden sm:inline">Semana</span>
                  </button>
                  <button
                    onClick={() => handlePrintByPeriod('all')}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                    title="Imprimir todos los cierres"
                  >
                    <Printer size={16} />
                    <span className="hidden sm:inline">Todos</span>
                  </button>
                </div>
              </div>
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
                <div className="relative" title="Hora desde">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={historyTimeFrom}
                    onChange={(e) => setHistoryTimeFrom(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="relative" title="Hora hasta">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={historyTimeTo}
                    onChange={(e) => setHistoryTimeTo(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                {(historySearch || historyDateFilter || historyTimeFrom || historyTimeTo) && (
                  <button
                    onClick={() => { setHistorySearch(''); setHistoryDateFilter(''); setHistoryTimeFrom(''); setHistoryTimeTo(''); }}
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
                {/* Header con checkbox para seleccionar todos */}
                <div className="p-4 bg-gray-50 border-b flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedShifts.size === filteredHistory.length && filteredHistory.length > 0}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 rounded cursor-pointer"
                    title="Seleccionar/deseleccionar todos"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {selectedShifts.size > 0 ? `${selectedShifts.size} seleccionado${selectedShifts.size !== 1 ? 's' : ''}` : 'Seleccionar todos'}
                  </span>
                  {selectedShifts.size > 0 && (
                    <button
                      onClick={handlePrintSelectedShifts}
                      className="ml-auto flex items-center gap-2 px-3 py-2 text-sm bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200 font-medium"
                      title="Imprimir los seleccionados"
                    >
                      <Printer size={16} />
                      <span>Imprimir ({selectedShifts.size})</span>
                    </button>
                  )}
                </div>
                {filteredHistory.map((shift) => (
                  <div
                    key={shift.id}
                    className={`p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedShifts.has(shift.id) ? 'bg-blue-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedShifts.has(shift.id)}
                      onChange={() => toggleShiftSelection(shift.id)}
                      className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
                    />
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setShowHistoryDetail(shift)}
                    >
                      <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{shift.employeeName}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(shift.startTime)} · {formatTime(shift.startTime)}
                          {shift.endTime && (
                            ` - ${
                              formatDate(shift.startTime) === formatDate(shift.endTime)
                                ? formatTime(shift.endTime)
                                : `${formatDate(shift.endTime)} · ${formatTime(shift.endTime)}`
                            }`
                          )}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'consolidated' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Cajeros Activos</h2>
              <p className="text-sm text-gray-500 mt-0.5">Vista consolidada de todos los turnos abiertos ahora</p>
            </div>
            {activeShifts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No hay cajeros con turno abierto en este momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cajero</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desde</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo activo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">N° ventas</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Efectivo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tarjeta</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transf.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeShifts.map((shift) => (
                      <tr key={shift.id} className={shift.id === activeShift?.id ? 'bg-green-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {shift.employeeName}
                          {shift.id === activeShift?.id && (
                            <span className="ml-2 text-xs text-green-600 font-normal">(vos)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatTime(shift.startTime)}</td>
                        <td className="px-4 py-3 text-gray-600">{getElapsedTime(shift.startTime)}</td>
                        <td className="px-4 py-3 text-right text-gray-900">{shift.salesCount}</td>
                        <td className="px-4 py-3 text-right text-green-700">{formatCurrency(shift.cashSales)}</td>
                        <td className="px-4 py-3 text-right text-purple-700">{formatCurrency(shift.cardSales)}</td>
                        <td className="px-4 py-3 text-right text-orange-700">{formatCurrency(shift.transferSales)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(shift.totalSales)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {activeShifts.length > 1 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-4 py-3 font-bold text-gray-800" colSpan={3}>
                          Total ({activeShifts.length} cajeros)
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">
                          {activeShifts.reduce((s, x) => s + x.salesCount, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">
                          {formatCurrency(activeShifts.reduce((s, x) => s + x.cashSales, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-purple-700">
                          {formatCurrency(activeShifts.reduce((s, x) => s + x.cardSales, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-orange-700">
                          {formatCurrency(activeShifts.reduce((s, x) => s + x.transferSales, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {formatCurrency(activeShifts.reduce((s, x) => s + x.totalSales, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
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
