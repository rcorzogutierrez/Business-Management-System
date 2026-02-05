// src/app/shared/utils/format.utils.ts
//
// Utilidades compartidas de formateo.
// NOTA: formatDate y formatDateShort ya existen en date-time.utils.ts - no duplicar.

/**
 * Formatea un valor numérico como moneda USD.
 * Extraído de proposals-list, work-plans-list y treasury components.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Genera y descarga un archivo desde el navegador.
 * Usado por exportToCSV, exportToJSON y exportUsers.
 */
export function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
