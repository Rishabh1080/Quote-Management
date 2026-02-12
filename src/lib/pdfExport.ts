import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QuoteData {
  company_name: string;
  product_name: string;
  version_label: string;
  created_at: string;
  discount_percent: number;
  subtotal: number;
  net_total: number;
  line_items: Array<{
    label: string;
    description?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    item_type: string;
  }>;
}

export const generateQuotePDF = (quoteData: QuoteData) => {
  const doc = new jsPDF();
  
  // Format currency - fix the rupee symbol issue
  const fmt = (n: number) => "Rs. " + Number(n).toLocaleString("en-IN", { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  let yPos = 20;
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', 105, yPos, { align: 'center' });
  
  yPos += 15;
  
  // Company Details Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Details:', 20, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Company: ${quoteData.company_name}`, 20, yPos);
  
  yPos += 6;
  doc.text(`Date: ${formatDate(quoteData.created_at)}`, 20, yPos);
  
  yPos += 6;
  doc.text(`Quote Version: ${quoteData.version_label}`, 20, yPos);
  
  yPos += 6;
  doc.text(`Product: ${quoteData.product_name}`, 20, yPos);
  
  yPos += 12;
  
  // Prepare table data - description in same row
  const tableData: any[] = [];
  
  quoteData.line_items.forEach((item) => {
    // Create item cell with label and description
    let itemContent = item.label;
    if (item.description && item.description.trim()) {
      itemContent += '\n\n' + item.description;
    }
    
    // Reordered: Item, Unit Price, Qty, Amount
    const row = [
      itemContent,
      fmt(item.unit_price),
      item.quantity.toString(),
      fmt(item.line_total)
    ];
    tableData.push(row);
  });
  
  // Items Table - Simple and clean
  autoTable(doc, {
    startY: yPos,
    head: [['Item', 'Unit Price', 'Qty', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [52, 58, 64],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left'
    },
    styles: {
      fontSize: 10,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'top',
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { 
        cellWidth: 70, 
        halign: 'left',
        fontSize: 10
      },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 45, halign: 'right' }
    },
    margin: { left: 15, right: 15 }
  });
  
  // Get the final Y position after the table
  const finalY = ((doc as any).lastAutoTable?.finalY || yPos) + 10;
  
  // Summary Section
  const summaryX = 130;
  let summaryY = finalY;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.text('Subtotal:', summaryX, summaryY);
  doc.text(fmt(quoteData.subtotal), 185, summaryY, { align: 'right' });
  
  summaryY += 7;
  
  // Discount
  const discountAmount = quoteData.subtotal - quoteData.net_total;
  doc.text(`Discount (${quoteData.discount_percent}%):`, summaryX, summaryY);
  doc.text(`-${fmt(discountAmount)}`, 185, summaryY, { align: 'right' });
  
  summaryY += 10;
  
  // Net Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Net Total:', summaryX, summaryY);
  doc.text(fmt(quoteData.net_total), 185, summaryY, { align: 'right' });
  
  // Save the PDF
  const fileName = `Quote_${quoteData.version_label.replace(/\//g, '_')}_${quoteData.company_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
