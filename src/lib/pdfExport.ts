import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import coverImage from '/assets/cover.png';
import bgImage from '/assets/bg.png';

interface QuoteData {
  company_name: string;
  product_name: string;
  product_description?: string;
  version_label: string;
  created_at: string;
  discount_percent: number;
  subtotal: number;
  net_total: number;
  created_by_name?: string;
  notes?: string;
  remarks?: string;
  line_items: Array<{
    label: string;
    description?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    item_type: string;
  }>;
  instruments?: Array<{
    instrument_name: string;
    quantity: number;
    man_days: number;
    integration_cost: number;
    hardware_cost: number;
  }>;
}

const renderCoverPage = (doc: jsPDF, quoteData: QuoteData) => {
  // Add cover image - full A4 page (210mm x 297mm)
  doc.addImage(coverImage, 'PNG', 0, 0, 210, 297);
  
  // Product name - where "LIMS & Instrument Integration" is
  doc.setFontSize(22);
  doc.setFont('helvetica', 'normal');
  doc.text(quoteData.product_name, 16, 170);
  // doc.text(quoteData.product_name, 16, 170);
  
  // Company name - under "PREPARED FOR:" (left side)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(quoteData.company_name, 15, 258);
  // doc.text(quoteData.company_name, 15, 258);
  
  // Creator name - under "PREPARED BY:" (right side)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(quoteData.created_by_name || 'N/A', 147.5, 258);
  // doc.text(quoteData.created_by_name || 'N/A', 147.5, 258);
};

// Helper function to add background to content pages
const addPageBackground = (doc: jsPDF) => {
  // Use alias to reuse the same image across pages (reduces file size)
  doc.addImage(bgImage, 'PNG', 0, 0, 210, 297, 'bgImage', 'FAST');
};

const renderProductOverviewPage = (doc: jsPDF, quoteData: QuoteData) => {
  // Add background
  addPageBackground(doc);
  
  let yPos = 25;
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Product Overview', 105, yPos, { align: 'center' });
  
  yPos += 15;
  
  // Product Name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(quoteData.product_name, 20, yPos);
  
  yPos += 12;
  
  // Product Description with rich text support
  if (quoteData.product_description) {
    yPos = renderRichText(doc, quoteData.product_description, 20, yPos, 170);
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('No product description available.', 20, yPos);
  }
};

const renderNotesPage = (doc: jsPDF, quoteData: QuoteData) => {
  // Add background
  addPageBackground(doc);
  
  let yPos = 25;
  const maxWidth = 170;
  const lineHeight = 6;
  
  // Notes Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Notes', 20, yPos);
  yPos += 10;
  
  if (quoteData.notes) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(quoteData.notes, maxWidth);
    
    for (const line of notesLines) {
      if (yPos > 280) {
        doc.addPage();
        addPageBackground(doc);
        yPos = 25;
      }
      doc.text(line, 20, yPos);
      yPos += lineHeight;
    }
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('No notes provided.', 20, yPos);
    yPos += lineHeight;
  }
  
  yPos += 10; // Add spacing between sections
  
  // Payment Milestones Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  
  if (yPos > 270) {
    doc.addPage();
    addPageBackground(doc);
    yPos = 25;
  }
  
  doc.text('Payment Milestones', 20, yPos);
  yPos += 10;
  
  if (quoteData.remarks) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const remarksLines = doc.splitTextToSize(quoteData.remarks, maxWidth);
    
    for (const line of remarksLines) {
      if (yPos > 280) {
        doc.addPage();
        addPageBackground(doc);
        yPos = 25;
      }
      doc.text(line, 20, yPos);
      yPos += lineHeight;
    }
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('No payment milestones provided.', 20, yPos);
  }
};

// Helper function to render rich text (HTML) in PDF
const renderRichText = (doc: jsPDF, htmlText: string, x: number, startY: number, maxWidth: number): number => {
  let yPos = startY;
  const fontSize = 13;
  const lineHeight = fontSize * 0.5;
  
  doc.setFontSize(fontSize);
  
  // Remove HTML tags and parse formatting
  // Simple parser for basic HTML tags: <b>, <strong>, <i>, <em>, <u>, <br>, <p>
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlText;
  
  // Process text nodes with formatting
  const processNode = (node: Node, currentStyle: { bold: boolean; italic: boolean }) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        // Set font style based on current formatting
        let fontStyle = 'normal';
        if (currentStyle.bold && currentStyle.italic) {
          fontStyle = 'bolditalic';
        } else if (currentStyle.bold) {
          fontStyle = 'bold';
        } else if (currentStyle.italic) {
          fontStyle = 'italic';
        }
        
        doc.setFont('helvetica', fontStyle);
        
        // Split text to fit width
        const lines = doc.splitTextToSize(text, maxWidth);
        
        for (const line of lines) {
          if (yPos > 280) { // Check if we need a new page
            doc.addPage();
            addPageBackground(doc);
            yPos = 20;
          }
          doc.text(line, x, yPos);
          yPos += lineHeight;
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      // Handle different HTML tags
      if (tagName === 'br') {
        yPos += lineHeight;
      } else if (tagName === 'p') {
        // Add spacing before paragraph
        if (yPos > startY) {
          yPos += lineHeight * 0.5;
        }
        
        // Process children
        const newStyle = { ...currentStyle };
        element.childNodes.forEach(child => processNode(child, newStyle));
        
        // Add spacing after paragraph
        yPos += lineHeight * 0.5;
      } else if (tagName === 'b' || tagName === 'strong') {
        const newStyle = { ...currentStyle, bold: true };
        element.childNodes.forEach(child => processNode(child, newStyle));
      } else if (tagName === 'i' || tagName === 'em') {
        const newStyle = { ...currentStyle, italic: true };
        element.childNodes.forEach(child => processNode(child, newStyle));
      } else if (tagName === 'ul' || tagName === 'ol') {
        // Handle lists
        yPos += lineHeight * 0.3;
        const listItems = element.querySelectorAll('li');
        listItems.forEach((li, index) => {
          const bullet = tagName === 'ul' ? '•' : `${index + 1}.`;
          doc.setFont('helvetica', 'normal');
          doc.text(bullet, x, yPos);
          
          const itemText = li.textContent || '';
          const lines = doc.splitTextToSize(itemText, maxWidth - 10);
          
          for (let i = 0; i < lines.length; i++) {
            if (yPos > 280) {
              doc.addPage();
              addPageBackground(doc);
              yPos = 20;
            }
            doc.text(lines[i], x + 10, yPos);
            yPos += lineHeight;
          }
        });
        yPos += lineHeight * 0.3;
      } else {
        // For other tags, just process children
        element.childNodes.forEach(child => processNode(child, currentStyle));
      }
    }
  };
  
  // Start processing from root
  tempDiv.childNodes.forEach(node => processNode(node, { bold: false, italic: false }));
  
  return yPos;
};

export const generateQuotePDF = (quoteData: QuoteData) => {
  const doc = new jsPDF();
  
  // Render cover page
  renderCoverPage(doc, quoteData);
  
  // Add Product Overview page
  doc.addPage();
  renderProductOverviewPage(doc, quoteData);
  
  // Add new page for quotation content
  doc.addPage();
  addPageBackground(doc);
  
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
  
  let yPos = 30;
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Quotation Summary', 105, yPos, { align: 'center' });
  
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
  
  // Add Instrument Integration Cost if instruments exist
  if (quoteData.instruments && quoteData.instruments.length > 0) {
    const totalInstrumentCost = quoteData.instruments.reduce((sum, inst) => 
      sum + (inst.integration_cost || 0) + (inst.hardware_cost || 0), 0
    );
    
    tableData.push([
      'Instrument Integration Cost',
      fmt(totalInstrumentCost),
      '1',
      fmt(totalInstrumentCost)
    ]);
  }
  
  // Items Table - Simple and clean
  autoTable(doc, {
    startY: yPos,
    head: [['Item', 'Unit Price', 'Qty', 'Amount']],
    body: tableData,
    foot: [['', '', 'Total', fmt(quoteData.net_total)]],
    theme: 'striped',
    headStyles: {
      fillColor: [52, 58, 64],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left'
    },
    footStyles: {
      fillColor: [52, 58, 64],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11,
      halign: 'right'
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
  let finalY = ((doc as any).lastAutoTable?.finalY || yPos) + 10;
  
  // Instruments Table (if instruments exist)
  if (quoteData.instruments && quoteData.instruments.length > 0) {
    finalY += 5; // Add some spacing
    
    // Add "Instrument Integration Summary" header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Instrument Integration Summary', 20, finalY);
    finalY += 8;
    
    // Instruments table data
    const instrumentsTableData = quoteData.instruments.map((inst) => {
      const rowTotal = (inst.integration_cost || 0) + (inst.hardware_cost || 0);
      return [
        inst.instrument_name,
        inst.quantity.toString(),
        inst.man_days.toString(),
        fmt(inst.integration_cost),
        fmt(inst.hardware_cost),
        fmt(rowTotal)
      ];
    });
    
    // Calculate total
    const instrumentsTotal = quoteData.instruments.reduce((sum, inst) => 
      sum + (inst.integration_cost || 0) + (inst.hardware_cost || 0), 0
    );
    
    autoTable(doc, {
      startY: finalY,
      head: [['Instrument Name', 'Qty', 'Man Days', 'Integration Cost', 'Hardware Cost', 'Total']],
      body: instrumentsTableData,
      foot: [['', '', '', '', 'Total', fmt(instrumentsTotal)]],
      theme: 'striped',
      headStyles: {
        fillColor: [52, 58, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'right'
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
        0: { cellWidth: 50, halign: 'left' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: 15, right: 15 }
    });
    
    finalY = ((doc as any).lastAutoTable?.finalY || finalY) + 10;
  }
  
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
  
  // Add Notes page
  doc.addPage();
  renderNotesPage(doc, quoteData);
  
  // Save the PDF
  const fileName = `Quote_${quoteData.version_label.replace(/\//g, '_')}_${quoteData.company_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
