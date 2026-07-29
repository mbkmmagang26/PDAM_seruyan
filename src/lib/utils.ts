import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | undefined): string {
  if (!value && value !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToPDF(data: any[], filename: string, title?: string) {
  if (!data || data.length === 0) return;

  const doc = new jsPDF('landscape');
  
  // Title
  const documentTitle = title || filename.replace(/_/g, ' ').toUpperCase();
  doc.setFontSize(14);
  doc.text(documentTitle, 14, 15);
  
  // Tanggal cetak
  doc.setFontSize(9);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 22);

  // Prepare table data
  const headers = Object.keys(data[0]);
  const body = data.map(obj => Object.values(obj).map(val => String(val)));

  autoTable(doc, {
    head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
    body: body,
    startY: 28,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' }, // blue-600
    alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
  });

  doc.save(`${filename}.pdf`);
}
