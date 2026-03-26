import { Sale } from '../types/pos';

export class PrinterService {
  private static readonly PRINTER_SETTINGS_KEY = 'pos-printer-settings';

  // Configuración específica para Kretz LEX 850 USE
  private static defaultSettings = {
    printerName: 'Kretz LEX 850',
    paperWidth: 80, // caracteres (impresora matricial)
    fontSize: 10, // Tamaño óptimo para matricial
    lineSpacing: 1.0, // Espaciado simple para matricial
    margins: { top: 2, bottom: 3, left: 2, right: 2 },
    enableLogo: false, // Sin logo para matricial
    autocut: false, // Corte manual
    matrixPrinter: true // Identificar como matricial
  };

  // Imprimir ticket de venta
  static async printSale(sale: Sale): Promise<boolean> {
    try {
      // Método 1: Intentar impresión directa con formato optimizado
      const success = await this.printWithTextFile(sale);
      if (success) {
        console.log(`🖨️ Ticket impreso para venta ${sale.saleCode}`);
        return true;
      }
      
      // Método 2: Fallback a HTML
      const ticket = this.generateTicketContent(sale);
      await this.printWithBrowserDialog(ticket);
      
      console.log(`🖨️ Ticket impreso para venta ${sale.saleCode}` );
      return true;
    } catch (error) {
      console.error('Error printing ticket:', error);
      // Método 3: Crear archivo para impresión manual
      this.createPrintableFile(sale);
      alert('La impresión automática falló. Se creó un archivo para imprimir manualmente.\nRevisa la carpeta de Descargas.');
      return false;
    }
  }

  // Generar contenido del ticket específico para Kretz LEX 850
  private static generateTicketContent(sale: Sale): string {
    const date = new Date(sale.saleDate);
    const settings = this.getPrinterSettings();
    
    // Para impresora matricial, usar formato de texto simple optimizado
    if (settings.matrixPrinter) {
      return this.generateMatrixPrinterTicket(sale, date);
    }
    
    // HTML para otras impresoras con diseño mejorado
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket - ${sale.saleCode}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body { 
        margin: 0; 
        font-family: 'Arial', 'Segoe UI', sans-serif;
        font-size: ${settings.fontSize}px;
        line-height: 1.4;
        background: white;
      }
      .no-print { display: none !important; }
    }
    
    body {
      font-family: 'Arial', 'Segoe UI', sans-serif;
      font-size: ${settings.fontSize}px;
      max-width: 300px;
      margin: 0 auto;
      padding: 15px;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      color: #333;
    }
    
    .ticket-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 20px;
      border: 1px solid #e9ecef;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px dashed #4a90e2;
      background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
      color: white;
      padding: 15px;
      border-radius: 8px 8px 0 0;
      margin: -20px -20px 20px -20px;
    }
    
    .business-name {
      font-size: ${Math.round(settings.fontSize * 1.6)}px;
      font-weight: bold;
      margin-bottom: 8px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
      letter-spacing: 1px;
    }
    
    .business-info {
      font-size: ${Math.round(settings.fontSize * 0.85)}px;
      margin: 3px 0;
      opacity: 0.95;
    }
    
    .section {
      margin: 20px 0;
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      border-left: 4px solid #4a90e2;
    }
    
    .sale-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 8px 0;
      padding: 5px 0;
      font-size: ${Math.round(settings.fontSize * 0.95)}px;
    }
    
    .sale-info span:first-child {
      color: #666;
      font-weight: 500;
    }
    
    .sale-info span:last-child {
      font-weight: bold;
      color: #333;
    }
    
    .items-section {
      margin: 20px 0;
    }
    
    .items-header {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      font-weight: bold;
      margin-bottom: 10px;
      font-size: ${Math.round(settings.fontSize * 1.1)}px;
    }
    
    .items-table {
      background: white;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #f1f3f4;
      transition: background-color 0.2s ease;
    }
    
    .item-row:hover {
      background-color: #f8f9fa;
    }
    
    .item-row:last-child {
      border-bottom: none;
    }
    
    .item-row.header {
      background: #e9ecef;
      font-weight: bold;
      color: #495057;
      font-size: ${Math.round(settings.fontSize * 0.85)}px;
    }
    
    .item-name {
      flex: 2;
      font-size: ${Math.round(settings.fontSize * 0.9)}px;
      color: #333;
      font-weight: 500;
    }
    
    .item-qty {
      width: 40px;
      text-align: center;
      font-size: ${Math.round(settings.fontSize * 0.9)}px;
      background: #e3f2fd;
      color: #1976d2;
      border-radius: 4px;
      padding: 2px 4px;
      font-weight: bold;
    }
    
    .item-price {
      width: 70px;
      text-align: right;
      font-size: ${Math.round(settings.fontSize * 0.9)}px;
      font-weight: bold;
      color: #28a745;
    }
    
    .totals {
      margin: 20px 0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 8px 0;
      padding: 5px 0;
      font-size: ${Math.round(settings.fontSize * 0.95)}px;
    }
    
    .total-row span:first-child {
      color: #666;
      font-weight: 500;
    }
    
    .total-row span:last-child {
      font-weight: bold;
      color: #333;
    }
    
    .total-final {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white !important;
      padding: 12px;
      border-radius: 6px;
      font-size: ${Math.round(settings.fontSize * 1.2)}px;
      font-weight: bold;
      margin-top: 10px;
      text-align: center;
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
    }
    
    .total-final span {
      color: white !important;
    }
    
    .payment-method {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 8px 12px;
      border-radius: 4px;
      text-align: center;
      margin-top: 10px;
      font-weight: bold;
    }
    
    .notes {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
      padding: 12px;
      border-radius: 6px;
      margin: 15px 0;
      font-style: italic;
    }
    
    .footer {
      text-align: center;
      margin-top: 25px;
      padding-top: 20px;
      border-top: 2px dashed #4a90e2;
      background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
      color: white;
      padding: 15px;
      border-radius: 0 0 8px 8px;
      margin: 25px -20px -20px -20px;
    }
    
    .footer-message {
      font-size: ${Math.round(settings.fontSize * 1.1)}px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .footer-website {
      font-size: ${Math.round(settings.fontSize * 0.85)}px;
      opacity: 0.9;
      margin-bottom: 10px;
    }
    
    .footer-timestamp {
      font-size: ${Math.round(settings.fontSize * 0.75)}px;
      opacity: 0.8;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed rgba(255,255,255,0.3);
    }
    
    .ticket-animation {
      animation: fadeIn 0.5s ease-in;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="ticket-container ticket-animation">
    <div class="header">
      <div class="business-name">🍴 Buen Sabor</div>
      <div class="business-info">🏠 Restaurant & Delivery Premium</div>
      <div class="business-info">📞 Tel: (123) 456-7890</div>
      <div class="business-info">📧 delivery@buensabor.com</div>
    </div>

    <div class="section">
      <div class="sale-info">
        <span>🎫 Ticket:</span>
        <span><strong>${sale.saleCode}</strong></span>
      </div>
      <div class="sale-info">
        <span>📅 Fecha:</span>
        <span>${date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div class="sale-info">
        <span>🕰️ Hora:</span>
        <span>${date.toLocaleTimeString('es-ES')}</span>
      </div>
      <div class="sale-info">
        <span>👨‍💼 Cajero:</span>
        <span>${sale.employeeName}</span>
      </div>
      ${sale.customerName ? `
      <div class="sale-info">
        <span>👤 Cliente:</span>
        <span>${sale.customerName}</span>
      </div>
      ` : ''}
    </div>

    <div class="items-section">
      <div class="items-header">
        📋 Detalle de Productos
      </div>
      
      <div class="items-table">
        <div class="item-row header">
          <div class="item-name">Producto</div>
          <div class="item-qty">Cant</div>
          <div class="item-price">Total</div>
        </div>
        ${sale.items.map(item => `
        <div class="item-row">
          <div class="item-name">${item.productName}</div>
          <div class="item-qty">${item.quantity}</div>
          <div class="item-price">$${(item.price * item.quantity).toLocaleString('es-ES', {minimumFractionDigits: 2})}</div>
        </div>
        `).join('')}
      </div>
    </div>

    <div class="totals">
      <div class="total-row">
        <span>📈 Subtotal:</span>
        <span>$${sale.subtotal.toLocaleString('es-ES', {minimumFractionDigits: 2})}</span>
      </div>
      <div class="total-row">
        <span>📊 IVA (21%):</span>
        <span>$${sale.tax.toLocaleString('es-ES', {minimumFractionDigits: 2})}</span>
      </div>
      ${sale.discount > 0 ? `
      <div class="total-row">
        <span>🎁 Descuento:</span>
        <span style="color: #dc3545;">-$${sale.discount.toLocaleString('es-ES', {minimumFractionDigits: 2})}</span>
      </div>
      ` : ''}
      
      <div class="total-final">
        <span>💰 TOTAL A PAGAR: $${sale.total.toLocaleString('es-ES', {minimumFractionDigits: 2})}</span>
      </div>
      
      <div class="payment-method">
        💳 Método de pago: ${this.getPaymentMethodText(sale.paymentMethod)}
      </div>
    </div>

    ${sale.notes ? `
    <div class="notes">
      <strong>📝 Notas:</strong><br>
      ${sale.notes}
    </div>
    ` : ''}

    <div class="footer">
      <div class="footer-message">🙏 ¡Gracias por su compra!</div>
      <div class="footer-website">🌐 Visite www.buensabor.com</div>
      <div class="footer-message">💖 ¡Esperamos verle pronto!</div>
      <div class="footer-timestamp">
        🕒 Generado: ${date.toLocaleString('es-ES')}
      </div>
    </div>

  </div>

  <script>
    // Auto imprimir al cargar
    window.onload = function() {
      // Pequeña animación antes de imprimir
      setTimeout(function() {
        window.print();
        // Cerrar ventana después de imprimir
        setTimeout(function() {
          window.close();
        }, 1500);
      }, 800);
    };
  </script>
</body>
</html>
    `;
  }

  // Generar ticket optimizado para impresora matricial Kretz LEX 850
  private static generateMatrixPrinterTicket(sale: Sale, date: Date): string {
    const line = '='.repeat(48); // 48 caracteres para papel 80 columnas
    const separator = '-'.repeat(48);
    
    let ticket = '';
    
    // Encabezado centrado
    ticket += this.centerText('BUEN SABOR', 48) + '\n';
    ticket += this.centerText('Restaurant & Delivery', 48) + '\n';
    ticket += this.centerText('Tel: (123) 456-7890', 48) + '\n';
    ticket += line + '\n\n';
    
    // Información de la venta
    ticket += `Ticket: ${sale.saleCode.padEnd(20)} ${date.toLocaleDateString()}\n`;
    ticket += `Fecha: ${date.toLocaleDateString().padEnd(22)} ${date.toLocaleTimeString()}\n`;
    ticket += `Cajero: ${sale.employeeName}\n`;
    if (sale.customerName) {
      ticket += `Cliente: ${sale.customerName}\n`;
    }
    ticket += separator + '\n';
    
    // Productos
    ticket += 'Producto                      Cant   Total\n';
    ticket += separator + '\n';
    
    sale.items.forEach(item => {
      const name = item.productName.length > 25 
        ? item.productName.substring(0, 25) 
        : item.productName.padEnd(25);
      const quantity = item.quantity.toString().padStart(4);
      const total = `$${(item.price * item.quantity).toFixed(2)}`.padStart(8);
      ticket += `${name} ${quantity} ${total}\n`;
    });
    
    ticket += separator + '\n';
    
    // Totales
    ticket += `${'Subtotal:'.padEnd(33)} $${sale.subtotal.toFixed(2).padStart(8)}\n`;
    ticket += `${'IVA (21%):'.padEnd(33)} $${sale.tax.toFixed(2).padStart(8)}\n`;
    
    if (sale.discount > 0) {
      ticket += `${'Descuento:'.padEnd(33)} -$${sale.discount.toFixed(2).padStart(7)}\n`;
    }
    
    ticket += line + '\n';
    ticket += `${'TOTAL:'.padEnd(33)} $${sale.total.toFixed(2).padStart(8)}\n`;
    ticket += `${'Pago:'.padEnd(33)} ${this.getPaymentMethodText(sale.paymentMethod).padStart(9)}\n`;
    ticket += line + '\n\n';
    
    // Notas
    if (sale.notes) {
      ticket += 'Notas:\n';
      ticket += sale.notes + '\n\n';
    }
    
    // Pie de página
    ticket += this.centerText('¡Gracias por su compra!', 48) + '\n';
    ticket += this.centerText('www.buensabor.com', 48) + '\n\n';
    ticket += this.centerText(date.toLocaleString(), 48) + '\n';
    
    // Saltos de línea finales para corte de papel
    ticket += '\n\n\n\n';
    
    // Para matricial, envolver en HTML mínimo
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @media print {
      @page { size: auto; margin: 0; }
      body { margin: 0; font-family: 'Courier New', monospace; font-size: 10px; }
    }
    body { font-family: 'Courier New', monospace; font-size: 10px; white-space: pre; }
  </style>
</head>
<body>${ticket}</body>
</html>`;
  }

  // Centrar texto para impresora matricial
  private static centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  // Método optimizado: Crear archivo de texto para Kretz LEX 850
  private static async printWithTextFile(sale: Sale): Promise<boolean> {
    try {
      const textContent = this.generatePlainTextTicket(sale);
      
      // Crear blob de texto plano
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Crear iframe para impresión
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Escribir contenido como texto plano
      iframe.onload = function() {
        const doc = iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(`<html><head><style>
            body { font-family: 'Courier New', monospace; font-size: 10px; white-space: pre; margin: 0; }
            @media print { @page { size: auto; margin: 2mm; } }
          </style></head><body>${textContent}</body></html>`);
          doc.close();
          iframe.contentWindow?.print();
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 2000);
      };
      
      iframe.src = 'about:blank';
      return true;
    } catch (error) {
      console.error('Error with text file printing:', error);
      return false;
    }
  }

  // Generar ticket en texto plano puro para Kretz LEX 850
  private static generatePlainTextTicket(sale: Sale): string {
    const date = new Date(sale.saleDate);
    const line = '='.repeat(48);
    const separator = '-'.repeat(48);
    
    let ticket = '';
    
    // Encabezado
    ticket += this.centerText('BUEN SABOR', 48) + '\n';
    ticket += this.centerText('Restaurant & Delivery', 48) + '\n';
    ticket += this.centerText('Tel: (123) 456-7890', 48) + '\n';
    ticket += line + '\n\n';
    
    // Info de venta
    ticket += `Ticket: ${sale.saleCode}\n`;
    ticket += `Fecha: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`;
    ticket += `Cajero: ${sale.employeeName}\n`;
    if (sale.customerName) {
      ticket += `Cliente: ${sale.customerName}\n`;
    }
    ticket += separator + '\n';
    
    // Productos  
    ticket += 'Producto                    Cant   Total\n';
    ticket += separator + '\n';
    
    sale.items.forEach(item => {
      const name = item.productName.length > 24 
        ? item.productName.substring(0, 24)
        : item.productName.padEnd(24);
      const qty = item.quantity.toString().padStart(4);
      const total = `$${(item.price * item.quantity).toFixed(2)}`.padStart(9);
      ticket += `${name} ${qty} ${total}\n`;
    });
    
    ticket += separator + '\n';
    
    // Totales
    ticket += `${'Subtotal:'.padEnd(35)} $${sale.subtotal.toFixed(2)}\n`;
    ticket += `${'IVA (21%):'.padEnd(35)} $${sale.tax.toFixed(2)}\n`;
    if (sale.discount > 0) {
      ticket += `${'Descuento:'.padEnd(35)} -$${sale.discount.toFixed(2)}\n`;
    }
    ticket += line + '\n';
    ticket += `${'TOTAL:'.padEnd(35)} $${sale.total.toFixed(2)}\n`;
    ticket += `${'Pago:'.padEnd(35)} ${this.getPaymentMethodText(sale.paymentMethod)}\n`;
    ticket += line + '\n\n';
    
    // Pie
    ticket += this.centerText('¡Gracias por su compra!', 48) + '\n';
    ticket += this.centerText('www.buensabor.com', 48) + '\n\n';
    
    // Saltos para corte manual
    ticket += '\n\n\n';
    
    return ticket;
  }

  // Crear archivo descargable para impresión manual
  private static createPrintableFile(sale: Sale): void {
    const textContent = this.generatePlainTextTicket(sale);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${sale.saleCode}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Imprimir usando la API Web
  private static async printWithWebAPI(content: string): Promise<void> {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    
    document.body.appendChild(iframe);
    
    iframe.onload = function() {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 1000);
    };
  }

  // Imprimir usando diálogo del navegador  
  private static async printWithBrowserDialog(content: string): Promise<void> {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      
      // Esperar a que cargue y luego imprimir
      printWindow.onload = function() {
        printWindow.print();
      };
    }
  }

  // Obtener texto del método de pago
  private static getPaymentMethodText(method: string): string {
    const methods = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia'
    };
    return methods[method as keyof typeof methods] || method;
  }

  // Obtener configuración de impresora
  static getPrinterSettings() {
    try {
      const saved = localStorage.getItem(this.PRINTER_SETTINGS_KEY);
      return saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : this.defaultSettings;
    } catch (error) {
      console.error('Error loading printer settings:', error);
      return this.defaultSettings;
    }
  }

  // Guardar configuración de impresora
  static savePrinterSettings(settings: any): void {
    try {
      const current = this.getPrinterSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(this.PRINTER_SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving printer settings:', error);
    }
  }

  // Reimprimir último ticket
  static async reprintLastSale(): Promise<boolean> {
    try {
      const lastSaleData = localStorage.getItem('pos-last-sale');
      if (lastSaleData) {
        const sale: Sale = JSON.parse(lastSaleData);
        return await this.printSale(sale);
      }
      return false;
    } catch (error) {
      console.error('Error reprinting last sale:', error);
      return false;
    }
  }
}