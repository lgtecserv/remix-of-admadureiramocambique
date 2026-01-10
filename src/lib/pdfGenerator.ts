import jsPDF from "jspdf";
import { format } from "date-fns";

// Church name constant
const CHURCH_NAME = "AD Madureira Moçambique";

// Colors
const PRIMARY_COLOR: [number, number, number] = [59, 130, 246]; // Blue
const SECONDARY_COLOR: [number, number, number] = [100, 116, 139]; // Slate
const SUCCESS_COLOR: [number, number, number] = [34, 197, 94]; // Green
const DANGER_COLOR: [number, number, number] = [239, 68, 68]; // Red

interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
}

interface PDFOptions {
  title: string;
  subtitle?: string;
  dateRange?: { from: Date; to: Date };
}

export const createPDFDocument = (options: PDFOptions): jsPDF => {
  const doc = new jsPDF();
  
  // Header background
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 35, "F");
  
  // Church name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(CHURCH_NAME, 105, 15, { align: "center" });
  
  // Report title
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(options.title, 105, 24, { align: "center" });
  
  // Date range if provided
  if (options.dateRange) {
    doc.setFontSize(9);
    const dateText = `Período: ${format(options.dateRange.from, "dd/MM/yyyy")} - ${format(options.dateRange.to, "dd/MM/yyyy")}`;
    doc.text(dateText, 105, 31, { align: "center" });
  }
  
  // Generation date
  doc.setTextColor(...SECONDARY_COLOR);
  doc.setFontSize(8);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 195, 42, { align: "right" });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  return doc;
};

export const addSectionTitle = (doc: jsPDF, title: string, yPos: number): number => {
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(15, yPos - 5, 180, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  return yPos + 12;
};

export const addTable = (
  doc: jsPDF,
  columns: TableColumn[],
  data: Record<string, any>[],
  startY: number
): number => {
  const pageWidth = 210;
  const margin = 15;
  const tableWidth = pageWidth - margin * 2;
  const rowHeight = 8;
  const headerHeight = 10;
  
  // Calculate column widths
  const totalDefinedWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
  const remainingWidth = tableWidth - totalDefinedWidth;
  const colsWithoutWidth = columns.filter(col => !col.width).length;
  const defaultWidth = colsWithoutWidth > 0 ? remainingWidth / colsWithoutWidth : 0;
  
  const columnWidths = columns.map(col => col.width || defaultWidth);
  
  let currentY = startY;
  
  // Draw header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, currentY, tableWidth, headerHeight, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SECONDARY_COLOR);
  
  let xPos = margin + 2;
  columns.forEach((col, index) => {
    const align = col.align || "left";
    const textX = align === "center" ? xPos + columnWidths[index] / 2 : 
                  align === "right" ? xPos + columnWidths[index] - 4 : xPos;
    doc.text(col.header, textX, currentY + 6.5, { align });
    xPos += columnWidths[index];
  });
  
  currentY += headerHeight;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  
  // Draw data rows
  data.forEach((row, rowIndex) => {
    // Check if we need a new page
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    
    // Alternate row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY, tableWidth, rowHeight, "F");
    }
    
    xPos = margin + 2;
    columns.forEach((col, index) => {
      const value = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : "";
      const truncatedValue = value.length > 30 ? value.substring(0, 27) + "..." : value;
      const align = col.align || "left";
      const textX = align === "center" ? xPos + columnWidths[index] / 2 : 
                    align === "right" ? xPos + columnWidths[index] - 4 : xPos;
      doc.text(truncatedValue, textX, currentY + 5.5, { align });
      xPos += columnWidths[index];
    });
    
    currentY += rowHeight;
  });
  
  // Draw border
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, startY, tableWidth, currentY - startY);
  
  return currentY + 5;
};

export const addSummaryBox = (
  doc: jsPDF,
  items: { label: string; value: string; color?: "default" | "success" | "danger" }[],
  startY: number
): number => {
  const boxHeight = 10 + items.length * 8;
  
  doc.setFillColor(245, 247, 250);
  doc.rect(15, startY, 180, boxHeight, "F");
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.rect(15, startY, 180, boxHeight);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("Resumo", 20, startY + 7);
  
  let yPos = startY + 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  items.forEach(item => {
    doc.setTextColor(...SECONDARY_COLOR);
    doc.text(item.label + ":", 20, yPos);
    
    const color = item.color === "success" ? SUCCESS_COLOR : 
                  item.color === "danger" ? DANGER_COLOR : [0, 0, 0] as [number, number, number];
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, 190, yPos, { align: "right" });
    doc.setFont("helvetica", "normal");
    
    yPos += 8;
  });
  
  doc.setTextColor(0, 0, 0);
  return startY + boxHeight + 10;
};

export const addFooter = (doc: jsPDF): void => {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
    doc.text(CHURCH_NAME, 15, 290);
  }
};

export const formatCurrencyMZN = (value: number): string => {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
  }).format(value);
};

export const formatDateBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
};

export const downloadPDF = (doc: jsPDF, filename: string): void => {
  doc.save(`${filename}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};
