/**
 * Product Export Utility: Generates Print-ready PDF Brochure and CSV/Excel datasheet.
 */

export const shareProductOnWhatsApp = async (product, groups = [], brands = [], pdfFile = null) => {
  if (!product) return;

  const brand = brands.find((item) => String(item.id) === String(product.brand_id));
  const brandName = brand?.name || product.Brand?.name || '-';

  const groupPath = [];
  let currentId = product.group_id;
  const visitedGroupIds = new Set();
  while (currentId && !visitedGroupIds.has(String(currentId))) {
    visitedGroupIds.add(String(currentId));
    const group = groups.find((item) => String(item.id) === String(currentId));
    if (!group) break;
    groupPath.unshift(group.name);
    currentId = group.parent_id;
  }
  const categoryPath = groupPath.length > 0 ? groupPath.join(' › ') : (product.Group?.name || '-');
  const attributes = Array.isArray(product.attributes)
    ? product.attributes
    : (product.attributes && typeof product.attributes === 'object'
      ? Object.entries(product.attributes).map(([name, value]) => ({ name, value }))
      : []);
  const attributeList = attributes.map((attribute) => {
    const name = attribute?.name || attribute?.attribute_name || attribute?.Attribute?.name;
    const value = attribute?.value ?? attribute?.attribute_value ?? attribute?.attributeValue;
    return name && value !== undefined && value !== null && String(value).trim()
      ? `• ${name}: ${value}`
      : null;
  }).filter(Boolean).join('\n') || '-';

  const currency = product.currency || 'INR';
  const brochureUrl = product.brochure_url || product.company_brochure_url || product.brochureUrl;
  const messageLines = [
    `📦 *Product:* ${product.name || product.product_name || '-'}`,
    `🏷️ *SKU / Code:* ${product.sku || product.internal_sku || product.product_code || '-'}`,
    `🏢 *Brand:* ${brandName}`,
    `📂 *Category:* ${categoryPath}`,
    `💰 *MRP:* ${currency} ${product.mrp ?? '-'}`,
    `🏷️ *Selling Price:* ${currency} ${product.selling_price ?? '-'}`,
    `📋 *Key Specifications / Attributes:*\n${attributeList}`,
  ];
  if (brochureUrl) messageLines.push(`📄 *Brochure / Catalog Link:* ${brochureUrl}`);

  if (pdfFile && navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: `${product.name || product.product_name || 'Product'} brochure`,
        text: messageLines.join('\n'),
      });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  messageLines.push('*Review PDF:* Save the brochure PDF opened separately and attach it in this chat.');
  const encodedText = encodeURIComponent(messageLines.join('\n'));
  window.open(`https://wa.me/?text=${encodedText}`, '_blank', 'noopener,noreferrer');
};

const reviewPdfText = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[^\x20-\x7E]/g, '?')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

export const createProductReviewPdfFile = (product, groups = [], brands = []) => {
  if (!product) return null;
  const brand = brands.find((item) => String(item.id) === String(product.brand_id));
  const brandName = brand?.name || product.Brand?.name || '-';
  const categoryParts = [];
  let groupId = product.group_id;
  const visited = new Set();
  while (groupId && !visited.has(String(groupId))) {
    visited.add(String(groupId));
    const group = groups.find((item) => String(item.id) === String(groupId));
    if (!group) break;
    categoryParts.unshift(group.name);
    groupId = group.parent_id;
  }
  const category = categoryParts.join(' > ') || product.Group?.name || '-';
  const pageStreams = [];
  let commands = [];
  let y = 800;
  const beginPage = () => {
    commands = ['1 1 1 rg 0 0 595 842 re f'];
    pageStreams.push(commands);
    y = 800;
  };
  const color = (hex) => {
    const value = hex.replace('#', '');
    return [0, 2, 4].map((i) => (parseInt(value.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  };
  const text = (x, baseline, value, size = 10, hex = '#1e293b', bold = false) => {
    commands.push(`${color(hex)} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${baseline} Td (${reviewPdfText(value)}) Tj ET`);
  };
  const rect = (x, bottom, width, height, fill, stroke = null) => {
    commands.push(`${color(fill)} rg ${x} ${bottom} ${width} ${height} re f`);
    if (stroke) commands.push(`${color(stroke)} RG 0.7 w ${x} ${bottom} ${width} ${height} re S`);
  };
  const line = (x1, y1, x2, y2, hex = '#e2e8f0', width = 0.7) => {
    commands.push(`${color(hex)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const wrap = (value, maxChars = 74) => {
    const safe = reviewPdfText(value || '-');
    const result = [];
    let remaining = safe;
    while (remaining.length > maxChars) {
      let splitAt = remaining.lastIndexOf(' ', maxChars);
      if (splitAt < 1) splitAt = maxChars;
      result.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt).trimStart();
    }
    result.push(remaining);
    return result;
  };
  const ensureSpace = (height) => {
    if (y - height < 48) {
      beginPage();
      text(42, 810, `${product.name || product.product_name || 'Product'} - Review (continued)`, 9, '#64748b', true);
      line(42, 798, 553, 798);
      y = 778;
    }
  };
  const section = (title) => {
    ensureSpace(30);
    y -= 22;
    rect(42, y - 2, 4, 16, '#0f172a');
    text(53, y, title.toUpperCase(), 10, '#0f172a', true);
    y -= 10;
  };
  const tableRow = (label, value) => {
    const valueLines = wrap(value, 63);
    const rowHeight = Math.max(27, valueLines.length * 12 + 12);
    ensureSpace(rowHeight);
    rect(42, y - rowHeight, 143, rowHeight, '#f1f5f9', '#e2e8f0');
    rect(185, y - rowHeight, 368, rowHeight, '#ffffff', '#e2e8f0');
    text(51, y - 17, label, 8.5, '#334155', true);
    valueLines.forEach((valueLine, index) => text(195, y - 17 - index * 12, valueLine, 8.5));
    y -= rowHeight;
  };
  const twoPairRow = (label1, value1, label2, value2) => {
    const value1Lines = wrap(value1, 24);
    const value2Lines = wrap(value2, 24);
    const rowHeight = Math.max(28, Math.max(value1Lines.length, value2Lines.length) * 12 + 12);
    ensureSpace(rowHeight);
    rect(42, y - rowHeight, 108, rowHeight, '#f1f5f9', '#e2e8f0');
    rect(150, y - rowHeight, 147, rowHeight, '#ffffff', '#e2e8f0');
    rect(297, y - rowHeight, 108, rowHeight, '#f1f5f9', '#e2e8f0');
    rect(405, y - rowHeight, 148, rowHeight, '#ffffff', '#e2e8f0');
    text(48, y - 17, label1, 7.5, '#334155', true);
    text(303, y - 17, label2, 7.5, '#334155', true);
    value1Lines.forEach((valueLine, index) => text(156, y - 17 - index * 12, valueLine, 8));
    value2Lines.forEach((valueLine, index) => text(411, y - 17 - index * 12, valueLine, 8));
    y -= rowHeight;
  };

  beginPage();
  rect(42, 789, 130, 20, '#0f172a');
  text(50, 796, 'OFFICIAL PRODUCT BROCHURE', 7, '#ffffff', true);
  rect(178, 789, 54, 20, '#10b981');
  text(188, 796, product.status || 'Active', 8, '#ffffff', true);
  text(42, 755, product.name || product.product_name || 'Product', 22, '#0f172a', true);
  text(42, 735, `SKU: ${product.sku || product.internal_sku || '-'}  |  Product Code: ${product.product_code || '-'}  |  Brand: ${brandName}`, 8.5, '#64748b');
  line(42, 723, 553, 723, '#0f172a', 1.5);

  rect(42, 566, 511, 142, '#f8fafc', '#e2e8f0');
  rect(54, 578, 150, 118, '#ffffff', '#cbd5e1');
  text(83, 635, 'PRODUCT IMAGE', 9, '#94a3b8', true);
  const currency = product.currency || 'INR';
  const cardXs = [218, 329, 440];
  const priceCards = [
    ['SELLING PRICE', `${currency} ${parseFloat(product.selling_price || 0).toLocaleString()}`, true],
    ['M.R.P.', `${currency} ${parseFloat(product.mrp || 0).toLocaleString()}`, false],
    ['GST RATE', `${product.gst_rate || 0}%`, false],
  ];
  priceCards.forEach(([label, value, primary], index) => {
    rect(cardXs[index], 641, 103, 55, primary ? '#0f172a' : '#ffffff', primary ? '#0f172a' : '#e2e8f0');
    text(cardXs[index] + 8, 677, label, 7, primary ? '#94a3b8' : '#64748b', true);
    text(cardXs[index] + 8, 654, value, 10, primary ? '#38bdf8' : '#0f172a', true);
  });
  const occasionText = product.occasions?.length
    ? product.occasions.map((occasion) => `${occasion.occasion_name || occasion.name || ''}${occasion.occasion_type ? ` (${occasion.occasion_type})` : ''}`).join(', ')
    : 'None';
  const summaryRows = [
    ['Category / Group', category],
    ['Item Classification', product.item_type || 'Goods'],
    ['Stock On Hand', `${product.purchase_quantity || 0} Units (Reorder: ${product.reorder_level || 0})`],
    ['Occasions / Season', occasionText],
  ];
  summaryRows.forEach(([label, value], index) => {
    const rowY = 625 - index * 14;
    text(218, rowY, `${label}:`, 7.4, '#334155', true);
    text(304, rowY, wrap(value, 40)[0], 7.4);
  });
  y = 546;

  section('Commercial & Lot Specifications');
  twoPairRow('Lot Number', product.lot_number || '-', 'Batch Number', product.batch_number || '-');
  twoPairRow('Manufacturing Date', product.manufacturing_date || '-', 'Expiry Date', product.expiry_date || '-');
  twoPairRow('Purchase Price', `${currency} ${parseFloat(product.purchase_price || 0).toLocaleString()}`, 'GTIN / EAN / UPC', product.gtin_ean_upc || '-');

  section('Physical Dimensions & Packaging');
  twoPairRow('Appearance / Shape', product.physical_appearance || product.physical_shape || '-', 'Size / Dimensions', product.size || [product.length, product.breadth, product.thickness].filter(Boolean).join(' x ') || '-');
  twoPairRow('Packaging Type', product.packaging || '-', 'Net / Gross Weight', `${product.net_weight || '-'} / ${product.gross_weight || '-'}`);

  if (product.short_description) {
    section('Product Description');
    tableRow('Description', product.short_description);
  }
  if (product.product_info) {
    section('Product Information & Specifications');
    tableRow('Product Information', product.product_info);
  }
  if (Array.isArray(product.attributes) && product.attributes.length) {
    section('Custom Specifications & Attributes');
    product.attributes.forEach((attribute) => tableRow(attribute.Attribute?.name || attribute.name || 'Feature', attribute.value || '-'));
  }
  section('Additional Review Details');
  const excluded = new Set(['name', 'product_name', 'brand_id', 'group_id', 'Brand', 'Group', 'currency', 'sku', 'internal_sku', 'product_code', 'status', 'item_type', 'purchase_quantity', 'reorder_level', 'occasions', 'lot_number', 'batch_number', 'manufacturing_date', 'expiry_date', 'purchase_price', 'gtin_ean_upc', 'physical_appearance', 'physical_shape', 'size', 'length', 'breadth', 'thickness', 'packaging', 'net_weight', 'gross_weight', 'short_description', 'product_info', 'attributes', 'selling_price', 'mrp', 'gst_rate']);
  Object.entries(product).forEach(([key, value]) => {
    if (excluded.has(key) || value === null || value === undefined || value === '') return;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    const formatted = Array.isArray(value)
      ? value.map((entry) => typeof entry === 'object' ? Object.entries(entry || {}).map(([k, v]) => `${k}: ${v ?? '-'}`).join(', ') : entry).join('; ')
      : (typeof value === 'object' ? Object.entries(value).map(([k, v]) => `${k}: ${v ?? '-'}`).join(', ') : value);
    if (formatted !== '') tableRow(label, formatted);
  });
  ensureSpace(26);
  line(42, y - 8, 553, y - 8, '#e2e8f0');
  text(42, y - 24, 'Generated by Inventory Management System', 8, '#94a3b8');
  text(430, y - 24, `Date: ${new Date().toLocaleDateString()}`, 8, '#94a3b8');

  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  const pageObjectIds = pageStreams.map((_, index) => 5 + index * 2);
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageStreams.length} >>`;
  pageStreams.forEach((page, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    const stream = page.join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const baseName = (product.name || product.product_name || 'product-review').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'product-review';
  return new File([pdf], `${baseName}-review.pdf`, { type: 'application/pdf' });
};

export const shareProductReviewPdf = async (product, groups = [], brands = []) => {
  const pdfFile = createProductReviewPdfFile(product, groups, brands);
  if (!pdfFile) return;
  if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
    try {
      await navigator.share({ files: [pdfFile], title: `${product.name || product.product_name || 'Product'} review PDF` });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  const fileUrl = URL.createObjectURL(pdfFile);
  const downloadLink = document.createElement('a');
  downloadLink.href = fileUrl;
  downloadLink.download = pdfFile.name;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
  window.alert('This browser cannot share PDF files directly. The review PDF was downloaded; attach it in WhatsApp.');
};

export const downloadProductBrochurePDF = (product, groups = [], brands = []) => {
  if (!product) return;

  const brandObj = brands.find(b => b.id == product.brand_id);
  const brandName = brandObj ? brandObj.name : (product.Brand?.name || '-');

  let groupPath = [];
  let currentId = product.group_id;
  while (currentId) {
    const g = groups.find(x => x.id == currentId);
    if (g) {
      groupPath.unshift(g.name);
      currentId = g.parent_id;
    } else {
      break;
    }
  }
  const groupName = groupPath.length > 0 ? groupPath.join(' › ') : (product.Group?.name || '-');

  const mainImage = product.image_url || (Array.isArray(product.images) && product.images[0]) || '';
  const barcodeImage = product.barcode_image_url || '';

  const occasionsText = product.occasions && product.occasions.length > 0
    ? product.occasions.map(o => `${o.occasion_name} (${o.occasion_type})`).join(', ')
    : 'None';

  const attributesList = Array.isArray(product.attributes) ? product.attributes : [];

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('Please allow popups to generate and download the product brochure PDF.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${product.name || product.product_name} - Product Brochure</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        @page {
          size: A4;
          margin: 12mm 15mm;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1e293b;
          background: #ffffff;
          margin: 0;
          padding: 24px;
          line-height: 1.5;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }

        .header-title h1 {
          margin: 0 0 6px 0;
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
        }

        .badge {
          display: inline-block;
          background: #0f172a;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-status {
          background: #10b981;
        }

        .sku-tag {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
          margin-top: 4px;
        }

        .hero-section {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 24px;
          margin-bottom: 24px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }

        .image-box {
          width: 260px;
          height: 260px;
          border-radius: 8px;
          background: #fff;
          border: 1px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .image-box img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .price-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .price-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 12px 14px;
          border-radius: 8px;
        }

        .price-card .label {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
        }

        .price-card .val {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 2px;
        }

        .price-card.primary {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
        }

        .price-card.primary .label {
          color: #94a3b8;
        }

        .price-card.primary .val {
          color: #38bdf8;
        }

        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-left: 4px solid #0f172a;
          padding-left: 8px;
          margin: 20px 0 10px 0;
        }

        table.spec-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          font-size: 12.5px;
        }

        table.spec-table th, table.spec-table td {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          text-align: left;
        }

        table.spec-table th {
          background: #f1f5f9;
          font-weight: 600;
          color: #334155;
          width: 25%;
        }

        table.spec-table td {
          background: #ffffff;
          color: #1e293b;
          font-weight: 500;
        }

        .barcode-box {
          text-align: right;
        }

        .barcode-box img {
          max-height: 55px;
          display: inline-block;
        }

        .footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
        }

        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
          🖨️ Print / Save as PDF
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #e2e8f0; color: #334155; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
          Close
        </button>
      </div>

      <div class="header">
        <div class="header-title">
          <span class="badge">Official Product Brochure</span>
          <span class="badge badge-status">${product.status || 'Active'}</span>
          <h1>${product.name || product.product_name}</h1>
          <div class="sku-tag">
            SKU: <strong>${product.sku || product.internal_sku || '-'}</strong> | 
            Product Code: <strong>${product.product_code || '-'}</strong> | 
            Brand: <strong>${brandName}</strong>
          </div>
        </div>
        ${barcodeImage ? `
          <div class="barcode-box">
            <img src="${barcodeImage}" alt="Barcode" />
            <div style="font-size: 10px; color: #64748b; font-family: monospace;">${product.gtin_ean_upc || ''}</div>
          </div>
        ` : ''}
      </div>

      <div class="hero-section">
        <div class="image-box">
          ${mainImage 
            ? `<img src="${mainImage}" alt="${product.name || 'Product Image'}" />` 
            : `<div style="color: #94a3b8; font-size: 13px; font-weight: 600;">No Product Image</div>`}
        </div>
        <div>
          <div class="price-grid">
            <div class="price-card primary">
              <div class="label">Selling Price</div>
              <div class="val">${product.currency || '₹'} ${parseFloat(product.selling_price || 0).toLocaleString()}</div>
            </div>
            <div class="price-card">
              <div class="label">M.R.P.</div>
              <div class="val">${product.currency || '₹'} ${parseFloat(product.mrp || 0).toLocaleString()}</div>
            </div>
            <div class="price-card">
              <div class="label">GST Rate</div>
              <div class="val">${product.gst_rate || 0}%</div>
            </div>
          </div>

          <table class="spec-table" style="margin: 0;">
            <tr>
              <th>Category / Group</th>
              <td>${groupName}</td>
            </tr>
            <tr>
              <th>Item Classification</th>
              <td>${product.item_type || 'Goods'}</td>
            </tr>
            <tr>
              <th>Stock On Hand</th>
              <td><strong>${product.purchase_quantity || 0} Units</strong> (Reorder: ${product.reorder_level || 0})</td>
            </tr>
            <tr>
              <th>Occasions / Season</th>
              <td>${occasionsText}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="section-title">Commercial & Lot Specifications</div>
      <table class="spec-table">
        <tr>
          <th>Lot Number</th>
          <td>${product.lot_number || '-'}</td>
          <th>Batch Number</th>
          <td>${product.batch_number || '-'}</td>
        </tr>
        <tr>
          <th>Manufacturing Date</th>
          <td>${product.manufacturing_date || '-'}</td>
          <th>Expiry Date</th>
          <td>${product.expiry_date || '-'}</td>
        </tr>
        <tr>
          <th>Purchase Price</th>
          <td>${product.currency || '₹'} ${parseFloat(product.purchase_price || 0).toLocaleString()}</td>
          <th>GTIN / EAN / UPC</th>
          <td>${product.gtin_ean_upc || '-'}</td>
        </tr>
      </table>

      <div class="section-title">Physical Dimensions & Packaging</div>
      <table class="spec-table">
        <tr>
          <th>Appearance / Shape</th>
          <td>${product.physical_appearance || product.physical_shape || '-'}</td>
          <th>Size / Dimensions</th>
          <td>${product.size || (product.length ? `${product.length} × ${product.breadth} × ${product.thickness}` : '-')}</td>
        </tr>
        <tr>
          <th>Packaging Type</th>
          <td>${product.packaging || '-'}</td>
          <th>Net / Gross Weight</th>
          <td>${product.net_weight || '-'} / ${product.gross_weight || '-'}</td>
        </tr>
      </table>

      ${product.short_description ? `
        <div class="section-title">Product Description</div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-size: 13px; color: #334155; margin-bottom: 16px;">
          ${product.short_description}
        </div>
      ` : ''}

      ${product.product_info ? `
        <div class="section-title">Product Information & Specifications</div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-size: 13px; color: #334155; margin-bottom: 16px; white-space: pre-line;">
          ${product.product_info}
        </div>
      ` : ''}

      ${attributesList.length > 0 ? `
        <div class="section-title">Custom Specifications & Attributes</div>
        <table class="spec-table">
          <thead>
            <tr>
              <th style="width: 50%;">Attribute</th>
              <th style="width: 50%;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${attributesList.map(a => `
              <tr>
                <td><strong>${a.Attribute?.name || a.name || 'Feature'}</strong></td>
                <td>${a.value || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="footer">
        <div>Generated by Inventory Management System</div>
        <div>Date: ${new Date().toLocaleDateString()}</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export const createProductDetailsExcelFile = (product, groups = [], brands = []) => {
  if (!product) return;

  const brandObj = brands.find(b => b.id == product.brand_id);
  const brandName = brandObj ? brandObj.name : (product.Brand?.name || '');

  let groupPath = [];
  let currentId = product.group_id;
  while (currentId) {
    const g = groups.find(x => x.id == currentId);
    if (g) {
      groupPath.unshift(g.name);
      currentId = g.parent_id;
    } else {
      break;
    }
  }
  const groupName = groupPath.length > 0 ? groupPath.join(' > ') : (product.Group?.name || '');

  const data = [
    ["FIELD", "VALUE"],
    ["Product Name", product.name || product.product_name || ""],
    ["SKU", product.sku || product.internal_sku || ""],
    ["Product Code", product.product_code || ""],
    ["Product Alias", product.product_alias || ""],
    ["Brand", brandName],
    ["Group / Category", groupName],
    ["Item Type", product.item_type || "Goods"],
    ["Status", product.status || "Active"],
    ["Selling Price", product.selling_price || 0],
    ["MRP", product.mrp || 0],
    ["Purchase Price", product.purchase_price || 0],
    ["Currency", product.currency || "INR"],
    ["GST Rate (%)", product.gst_rate || 0],
    ["In Stock Quantity", product.purchase_quantity || 0],
    ["Reorder Level", product.reorder_level || 0],
    ["Reorder Note", product.reorder_note || ""],
    ["Lot Number", product.lot_number || ""],
    ["Batch Number", product.batch_number || ""],
    ["Manufacturing Date", product.manufacturing_date || ""],
    ["Expiry Date", product.expiry_date || ""],
    ["GTIN / EAN / UPC", product.gtin_ean_upc || ""],
    ["Physical Appearance", product.physical_appearance || product.physical_shape || ""],
    ["Size", product.size || ""],
    ["Packaging", product.packaging || ""],
    ["Length", product.length || ""],
    ["Breadth", product.breadth || ""],
    ["Thickness", product.thickness || ""],
    ["Net Weight", product.net_weight || ""],
    ["Gross Weight", product.gross_weight || ""],
    ["Volume", product.volume || ""],
    ["Warehouse", product.warehouse_location || product.default_warehouse?.name || ""],
    ["Rack Number", product.rack_number || ""],
    ["Shelf Number", product.shelf_number || ""],
    ["Bin Location", product.bin_location || ""],
    ["Safety Stock", product.safety_stock || 0],
    ["Product BOGO Scheme", product.product_pe_product || "None"],
    ["Discount on Product (Offer)", product.discount_on_product || "None"],
    ["Product Target Scheme", product.product_target_scheme || "None"],
    ["Discount on Bill Amount", product.discount_on_bill_amount || "None"],
    ["Quarterly Turnover Discount", product.quarterly_discount_on_turnover || "None"],
    ["Yearly Turnover Discount", product.yearly_discount_on_turnover || "None"],
    ["Seasonal Scheme Name", product.seasonal_scheme_name || "None"],
    ["Seasonal Frequency", product.seasonal_frequency || ""],
    ["Seasonal Period Start", product.seasonal_period_start || ""],
    ["Seasonal Period End", product.seasonal_period_end || ""],
    ["Short Description", (product.short_description || "").replace(/"/g, '""')],
    ["Product Information", (product.product_info || "").replace(/"/g, '""')]
  ];

  if (Array.isArray(product.attributes)) {
    product.attributes.forEach(a => {
      data.push([`Attribute: ${a.Attribute?.name || a.name || 'Custom'}`, a.value || ""]);
    });
  }

  const csvRows = data.map(e => `"${e[0]}","${String(e[1] ?? '').replace(/"/g, '""')}"`).join("\r\n");
  const fileName = `${(product.name || product.product_name || 'product').toLowerCase().replace(/[^a-z0-9]/g, '_')}_details.csv`;
  return new File(["\uFEFF" + csvRows], fileName, { type: 'text/csv' });
};

export const downloadProductDetailsExcel = (product, groups = [], brands = []) => {
  const file = createProductDetailsExcelFile(product, groups, brands);
  if (!file) return;
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", file.name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const shareProductDetailsExcel = async (product, groups = [], brands = []) => {
  const file = createProductDetailsExcelFile(product, groups, brands);
  if (!file) return;
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `${product.name || product.product_name || 'Product'} details spreadsheet`,
        text: `Product spreadsheet for ${product.name || product.product_name || 'this product'}. Choose WhatsApp to send the attached file.`,
      });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  downloadProductDetailsExcel(product, groups, brands);
  window.alert('This browser cannot share spreadsheet files directly. The spreadsheet was downloaded so you can attach it in a sharing app.');
};

export const exportAllProductsExcel = (products = [], groups = [], brands = []) => {
  if (!products || products.length === 0) {
    alert("No products available to export.");
    return;
  }

  const getGroupName = (groupId) => {
    let groupPath = [];
    let currentId = groupId;
    while (currentId) {
      const g = groups.find(x => x.id == currentId);
      if (g) {
        groupPath.unshift(g.name);
        currentId = g.parent_id;
      } else break;
    }
    return groupPath.length > 0 ? groupPath.join(' › ') : '-';
  };

  const getBrandName = (brandId) => {
    const b = brands.find(x => x.id == brandId);
    return b ? b.name : '-';
  };

  const headers = [
    "ID", "Product Name", "SKU", "Group / Category", "Brand",
    "Selling Price", "MRP", "Purchase Price", "Stock Qty", "Reorder Level",
    "GST Rate (%)", "HSN Code", "Barcode", "Lot Number", "Batch Number",
    "Mfg Date", "Expiry Date", "Best Before", "Warehouse", "Rack", "Shelf", "Bin",
    "BOGO Scheme", "Discount on Product (Offer)", "Target Scheme", "Bill Discount",
    "Quarterly Turnover Discount", "Yearly Turnover Discount", "Seasonal Scheme",
    "Product Information",
    "Status"
  ];

  const rows = products.map(p => [
    p.id,
    p.name || p.product_name || '',
    p.sku || p.internal_sku || '',
    getGroupName(p.group_id),
    getBrandName(p.brand_id),
    p.selling_price || 0,
    p.mrp || 0,
    p.purchase_price || 0,
    p.purchase_quantity || 0,
    p.reorder_level || 0,
    p.gst_rate || 0,
    p.hsn_code || '',
    p.gtin_ean_upc || '',
    p.lot_number || '',
    p.batch_number || '',
    p.manufacturing_date || '',
    p.expiry_date || '',
    p.best_before_date || '',
    p.warehouse_location || p.default_warehouse?.name || '',
    p.rack_number || '',
    p.shelf_number || '',
    p.bin_location || '',
    p.product_pe_product || '',
    p.discount_on_product || '',
    p.product_target_scheme || '',
    p.discount_on_bill_amount || '',
    p.quarterly_discount_on_turnover || '',
    p.yearly_discount_on_turnover || '',
    p.seasonal_scheme_name || '',
    p.product_info || '',
    p.status || 'Active'
  ]);

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(r => r.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Products_Catalog_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
