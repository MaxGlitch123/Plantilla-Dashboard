import { Sale } from '../types/pos';

export class PrinterService {
    private static readonly PRINTER_SETTINGS_KEY = 'pos-printer-settings';

    private static defaultSettings = {
        printerName: 'Kretz LEX 850',
        paperWidth: 58,
        fontSize: 11, // Ajustado para papel de 58mm
        lineSpacing: 1.3,
        margins: { top: 2, bottom: 3, left: 1, right: 1 },
        enableLogo: false,
        autocut: false,
        matrixPrinter: false,
    };

    static async printSale(sale: Sale): Promise<boolean> {
        try {
            const ticket = this.generateTicketContent(sale);
            await this.printWithBrowserDialog(ticket);

            console.log(`Ticket impreso para venta ${sale.saleCode}`);
            return true;
        } catch (error) {
            console.error('Error printing ticket:', error);
            this.createPrintableFile(sale);
            alert('La impresión automática falló. Se creó un archivo para imprimir manualmente.\nRevisa la carpeta de Descargas.');
            return false;
        }
    }

    private static generateTicketContent(sale: Sale): string {
        const date = new Date(sale.saleDate);
        const settings = this.getPrinterSettings();

        if (settings.matrixPrinter) {
            return this.generateMatrixPrinterTicket(sale, date);
        }

        const fs = settings.fontSize; // alias corto

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
        size: 58mm 200mm;
        margin: 0mm 0mm;
      }
      body {
        margin: 0px;
        font-family: 'Arial', sans-serif;
        font-size: ${fs}px;
        line-height: 1.3;
        background: white;
        color: #000;
        width: 56mm; /* margen interno de seguridad */
        zoom: 1.0;
      }
      .no-print { display: none !important; }
    }

    body {
      font-family: 'Arial', sans-serif;
      font-size: ${fs}px;
      max-width: 56mm;
      margin: 0 auto;
      padding: 2px;
      background: white;
      color: #000;
    }

    .ticket-container {
      background: white;
      width: 100%;
    }

    /* ENCABEZADO */
    .header {
      text-align: center;
      padding-bottom: 6px;
      border-bottom: 2px dashed #000;
      margin-bottom: 6px;
    }

    .business-name {
      font-size: ${fs + 2}px;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .business-subtitle {
      font-size: ${fs - 1}px;
    }

    /* SECCIÓN FECHA/CAJERO */
    .section {
      margin: 6px 0;
      padding-bottom: 6px;
      border-bottom: 1px dashed #000;
    }

    .sale-info {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
      font-size: ${fs - 1}px;
    }

    .sale-info span:first-child { color: #444; }
    .sale-info span:last-child  { font-weight: bold; }

    /* ITEMS */
    .items-section { margin: 6px 0; }

    .items-header {
      font-weight: bold;
      font-size: ${fs}px;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      border-bottom: 1px dashed #ccc;
      font-size: ${fs - 1}px;
    }

    .item-row:last-child { border-bottom: none; }

    .item-row.header {
      font-weight: bold;
      font-size: ${fs - 2}px;
      color: #000;
      border-bottom: 1px solid #000;
    }

    .item-name { flex: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-qty  { width: 25px; text-align: center; font-weight: bold; font-size: ${fs - 2}px; }
    .item-price{ width: 50px; text-align: right; font-weight: bold; font-size: ${fs - 2}px; }

    /* TOTALES */
    .totals {
      margin: 6px 0;
      padding-top: 4px;
      border-top: 1px solid #000;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
      font-size: ${fs - 1}px;
    }

    .total-final {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 4px 0;
      font-size: ${fs + 1}px;
      font-weight: bold;
      margin-top: 4px;
      text-align: center;
    }

    .payment-method {
      text-align: center;
      margin-top: 4px;
      font-weight: bold;
      font-size: ${fs - 1}px;
    }

    /* NOTAS */
    .notes {
      border: 1px solid #000;
      padding: 5px;
      margin: 6px 0;
      font-style: italic;
      font-size: ${fs - 1}px;
    }

    /* PIE */
    .footer {
      text-align: center;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 2px dashed #000;
    }

    .footer-message {
      font-size: ${fs}px;
      font-weight: bold;
      margin-bottom: 3px;
    }

    .footer-website {
      font-size: ${fs - 2}px;
      margin-bottom: 6px;
    }

    .footer-timestamp {
      font-size: ${fs - 3}px;
      margin-top: 4px;
      color: #555;
    }

  </style>
</head>
<body>
  <div class="ticket-container">

    <!-- ENCABEZADO -->
    <div class="header">
      <div class="business-name">City Fast</div>
      <div class="business-subtitle">Restaurant &amp; Delivery</div>
    </div>

    <!-- FECHA / CAJERO -->
    <div class="section">
      <div class="sale-info">
        <span>Fecha:</span>
        <span>${date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
      </div>
      <div class="sale-info">
        <span>Hora:</span>
        <span>${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="sale-info">
        <span>Cajero:</span>
        <span>${sale.employeeName}</span>
      </div>
      ${sale.customerName ? `
      <div class="sale-info">
        <span>Cliente:</span>
        <span>${sale.customerName}</span>
      </div>` : ''}
    </div>

    <!-- PRODUCTOS -->
    <div class="items-section">
      <div class="items-header">Detalle del pedido</div>
      <div class="item-row header">
        <div class="item-name">Producto</div>
        <div class="item-qty">Cant</div>
        <div class="item-price">Total</div>
      </div>
      ${sale.items.map(item => `
      <div class="item-row">
        <div class="item-name">${item.productName}</div>
        <div class="item-qty">${item.quantity}</div>
        <div class="item-price">$${(item.price * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
      </div>`).join('')}
    </div>

    <!-- TOTALES -->
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${sale.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
      </div>
      ${sale.tax > 0 ? `
      <div class="total-row">
        <span>IVA (${sale.channel === 'pedidosya' ? '27' : '0'}%):</span>
        <span>$${sale.tax.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
      </div>` : ''}
      ${sale.discount > 0 ? `
      <div class="total-row">
        <span>Descuento:</span>
        <span>-$${sale.discount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
      </div>` : ''}

      <div class="total-final">
        TOTAL: $${sale.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
      </div>

      <div class="payment-method">
        Pago: ${this.getPaymentMethodText(sale.paymentMethod)}
      </div>
    </div>

    <!-- NOTAS -->
    ${sale.notes ? `
    <div class="notes">
      <strong>Notas:</strong><br>${sale.notes}
    </div>` : ''}

    <!-- PIE -->
    <div class="footer">
      <div class="footer-message">Gracias por su compra</div>
      <div class="footer-website">www.cityfast.com</div>
      <div class="footer-message">Esperamos verle pronto</div>
      <div class="footer-timestamp">${date.toLocaleString('es-AR')}</div>
    </div>

  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
        setTimeout(function () { window.close(); }, 1500);
      }, 600);
    };
  </script>
</body>
</html>`;
    }

    // ── Matricial (sin cambios de lógica, solo se quitaron emojis) ────────────
    private static generateMatrixPrinterTicket(sale: Sale, date: Date): string {
        const line      = '='.repeat(48);
        const separator = '-'.repeat(48);
        let ticket = '';

        ticket += this.centerText('CITY FAST', 48) + '\n';
        ticket += this.centerText('Restaurant & Delivery', 48) + '\n';
        ticket += line + '\n\n';

        ticket += `Fecha:  ${date.toLocaleDateString('es-AR')} ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n`;
        ticket += `Cajero: ${sale.employeeName}\n`;
        if (sale.customerName) ticket += `Cliente: ${sale.customerName}\n`;
        ticket += separator + '\n';

        ticket += 'Producto                      Cant   Total\n';
        ticket += separator + '\n';

        sale.items.forEach(item => {
            const name  = item.productName.length > 25
                ? item.productName.substring(0, 25)
                : item.productName.padEnd(25);
            const qty   = item.quantity.toString().padStart(4);
            const total = `$${(item.price * item.quantity).toFixed(2)}`.padStart(8);
            ticket += `${name} ${qty} ${total}\n`;
        });

        ticket += separator + '\n';
        ticket += `${'Subtotal:'.padEnd(33)} $${sale.subtotal.toFixed(2).padStart(8)}\n`;

        if (sale.tax > 0) {
            const label = `IVA (${sale.channel === 'pedidosya' ? '27' : '0'}%):`;
            ticket += `${label.padEnd(33)} $${sale.tax.toFixed(2).padStart(8)}\n`;
        }
        if (sale.discount > 0) {
            ticket += `${'Descuento:'.padEnd(33)} -$${sale.discount.toFixed(2).padStart(7)}\n`;
        }

        ticket += line + '\n';
        ticket += `${'TOTAL:'.padEnd(33)} $${sale.total.toFixed(2).padStart(8)}\n`;
        ticket += `${'Pago:'.padEnd(33)} ${this.getPaymentMethodText(sale.paymentMethod).padStart(9)}\n`;
        ticket += line + '\n\n';

        if (sale.notes) {
            ticket += 'Notas:\n' + sale.notes + '\n\n';
        }

        ticket += this.centerText('Gracias por su compra', 48) + '\n';
        ticket += this.centerText(date.toLocaleString('es-AR'), 48) + '\n';
        ticket += '\n\n\n\n';

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @media print { @page { size: auto; margin: 0; } body { margin: 0; } }
    body { font-family: 'Arial', sans-serif; font-size: 14px; white-space: pre; line-height: 1.4; }
  </style>
</head>
<body>${ticket}</body>
</html>`;
    }

    private static centerText(text: string, width: number): string {
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return ' '.repeat(padding) + text;
    }

    private static async printWithTextFile(sale: Sale): Promise<boolean> {
        try {
            const textContent = this.generatePlainTextTicket(sale);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            iframe.onload = function () {
                const doc = iframe.contentDocument;
                if (doc) {
                    doc.open();
                    doc.write(`<html><head><style>
            body { font-family: 'Arial', sans-serif; font-size: 14px; white-space: pre; margin: 0; line-height: 1.4; }
            @media print { @page { size: auto; margin: 2mm; } }
          </style></head><body>${textContent}</body></html>`);
                    doc.close();
                    iframe.contentWindow?.print();
                }
                setTimeout(() => { document.body.removeChild(iframe); }, 2000);
            };

            iframe.src = 'about:blank';
            return true;
        } catch (error) {
            console.error('Error with text file printing:', error);
            return false;
        }
    }

    private static generatePlainTextTicket(sale: Sale): string {
        const date      = new Date(sale.saleDate);
        const line      = '='.repeat(48);
        const separator = '-'.repeat(48);
        let ticket = '';

        ticket += this.centerText('CITY FAST', 48) + '\n';
        ticket += this.centerText('Restaurant & Delivery', 48) + '\n';
        ticket += line + '\n\n';

        ticket += `Fecha:  ${date.toLocaleDateString('es-AR')} ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n`;
        ticket += `Cajero: ${sale.employeeName}\n`;
        if (sale.customerName) ticket += `Cliente: ${sale.customerName}\n`;
        ticket += separator + '\n';

        ticket += 'Producto                    Cant   Total\n';
        ticket += separator + '\n';

        sale.items.forEach(item => {
            const name  = item.productName.length > 24
                ? item.productName.substring(0, 24)
                : item.productName.padEnd(24);
            const qty   = item.quantity.toString().padStart(4);
            const total = `$${(item.price * item.quantity).toFixed(2)}`.padStart(9);
            ticket += `${name} ${qty} ${total}\n`;
        });

        ticket += separator + '\n';
        ticket += `${'Subtotal:'.padEnd(35)} $${sale.subtotal.toFixed(2)}\n`;
        if (sale.tax > 0) {
            const label = `IVA (${sale.channel === 'pedidosya' ? '27' : '0'}%):`;
            ticket += `${label.padEnd(35)} $${sale.tax.toFixed(2)}\n`;
        }
        if (sale.discount > 0) {
            ticket += `${'Descuento:'.padEnd(35)} -$${sale.discount.toFixed(2)}\n`;
        }
        ticket += line + '\n';
        ticket += `${'TOTAL:'.padEnd(35)} $${sale.total.toFixed(2)}\n`;
        ticket += `${'Pago:'.padEnd(35)} ${this.getPaymentMethodText(sale.paymentMethod)}\n`;
        ticket += line + '\n\n';
        ticket += this.centerText('Gracias por su compra', 48) + '\n';
        ticket += '\n\n\n';

        return ticket;
    }

    private static createPrintableFile(sale: Sale): void {
        const textContent = this.generatePlainTextTicket(sale);
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `ticket-${sale.saleCode}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    private static async printWithBrowserDialog(content: string): Promise<void> {
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (printWindow) {
            printWindow.document.write(content);
            printWindow.document.close();
            printWindow.focus();
            printWindow.onload = function () { printWindow.print(); };
        }
    }

    private static getPaymentMethodText(method: string): string {
        const methods: Record<string, string> = {
            cash:     'Efectivo',
            card:     'Tarjeta',
            transfer: 'Transferencia',
        };
        return methods[method] ?? method;
    }

    static getPrinterSettings() {
        try {
            const saved = localStorage.getItem(this.PRINTER_SETTINGS_KEY);
            return saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : this.defaultSettings;
        } catch {
            return this.defaultSettings;
        }
    }

    static savePrinterSettings(settings: any): void {
        try {
            const updated = { ...this.getPrinterSettings(), ...settings };
            localStorage.setItem(this.PRINTER_SETTINGS_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving printer settings:', error);
        }
    }

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