import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdfjs worker for Vite & browser
try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
} catch (e) {
  console.warn('Failed to resolve local pdf.worker URL, falling back:', e);
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
}

/**
 * Extracts plain text from a File object (PDF or Text).
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function extractTextFromBrochure(file) {
  if (!file) return '';

  const fileName = file.name || '';
  const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: true,
        isEvalSupported: false,
        useSystemFonts: true
      });
      const pdf = await loadingTask.promise;

      let fullText = '';
      const numPages = Math.min(pdf.numPages, 10); // Parse up to first 10 pages for speed & safety

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group items by line based on transform Y position or join with space
        let lastY = null;
        let pageStr = '';

        for (const item of textContent.items) {
          if (!item.str) continue;
          const currentY = item.transform ? Math.round(item.transform[5]) : null;
          
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
            pageStr += '\n' + item.str;
          } else {
            pageStr += (pageStr.endsWith(' ') || pageStr === '' ? '' : ' ') + item.str;
          }
          lastY = currentY;
        }

        fullText += pageStr + '\n\n';
      }

      return fullText.trim();
    } catch (pdfErr) {
      console.warn('PDF.js text extraction error:', pdfErr);
      // Fallback: if PDF parsing fails or has no text layer, return empty string so heuristics can fall back
      return '';
    }
  }

  // Plain text or markdown files
  if (file.type?.includes('text') || fileName.match(/\.(txt|md|csv|json)$/i)) {
    try {
      return await file.text();
    } catch (e) {
      console.warn('Text file read error:', e);
      return '';
    }
  }

  return '';
}

/**
 * Cleans string for regex matching
 */
function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Parses extracted text and file metadata to extract product fields.
 * @param {string} rawText 
 * @param {string} fileName 
 * @param {object} context 
 * @returns {object} Extracted product fields
 */
export function parseBrochureData(rawText = '', fileName = '', context = {}) {
  const {
    companies = [],
    brands = [],
    groups = [],
    productTypesList = [],
    existingBaseElements = []
  } = context;

  const text = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const cleanFileName = (fileName || '')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/brochure|catalog|datasheet|specification|spec\s*sheet/gi, '')
    .trim();

  const extracted = {};
  const filledFields = [];

  // Helper to record match
  const record = (key, val, label) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      extracted[key] = val;
      filledFields.push({ key, label, value: val });
    }
  };

  // 1. COMPANY NAME MATCHING
  if (companies.length > 0) {
    let matchedCompany = null;
    for (const comp of companies) {
      const cName = comp.name || comp.company_name;
      if (!cName || cName.length < 3) continue;
      const regex = new RegExp(`\\b${escapeRegex(cName)}\\b`, 'i');
      if (regex.test(text) || regex.test(cleanFileName)) {
        matchedCompany = comp;
        break;
      }
    }
    if (matchedCompany) {
      record('companyName', matchedCompany.name || matchedCompany.company_name, 'Company');
    }
  }

  // 2. BRAND MATCHING
  if (brands.length > 0) {
    let matchedBrand = null;
    for (const b of brands) {
      const bName = b.name;
      if (!bName || bName.length < 2) continue;
      const regex = new RegExp(`\\b${escapeRegex(bName)}\\b`, 'i');
      if (regex.test(text) || regex.test(cleanFileName) || (fileName && regex.test(fileName))) {
        matchedBrand = b;
        break;
      }
    }
    if (matchedBrand) {
      record('brandId', String(matchedBrand.id), 'Brand');
      record('brandName', matchedBrand.name, 'Brand Name');
    }
  }

  // 3. GROUP / CATEGORY MATCHING
  const flattenGroups = (groupList) => {
    let flat = [];
    for (const g of groupList) {
      flat.push(g);
      if (g.children && Array.isArray(g.children)) {
        flat = flat.concat(flattenGroups(g.children));
      }
      if (g.subgroups && Array.isArray(g.subgroups)) {
        flat = flat.concat(flattenGroups(g.subgroups));
      }
    }
    return flat;
  };
  const flatGroups = flattenGroups(groups);
  if (flatGroups.length > 0) {
    let matchedGroup = null;
    for (const g of flatGroups) {
      const gName = g.name;
      if (!gName || gName.length < 2) continue;
      const regex = new RegExp(`\\b${escapeRegex(gName)}\\b`, 'i');
      if (regex.test(text) || regex.test(cleanFileName) || (fileName && regex.test(fileName))) {
        matchedGroup = g;
        break;
      }
    }
    if (matchedGroup) {
      record('groupId', String(matchedGroup.id), 'Group');
      record('groupName', matchedGroup.name, 'Group Name');
    }
  }

  // 4. ELEMENT TYPE
  if (productTypesList.length > 0) {
    let matchedType = null;
    const typePatterns = [
      /(?:Item|Element|Product)\s*Type\s*[:\-]\s*([a-zA-Z\s]+)/i,
      /\b(Goods|Service|Finished Goods|Raw Material|Semi-Finished|Consumable)\b/i
    ];
    for (const pat of typePatterns) {
      const m = text.match(pat);
      if (m) {
        const foundStr = m[1].trim().toLowerCase();
        matchedType = productTypesList.find(t => t.name.toLowerCase() === foundStr);
        if (matchedType) break;
      }
    }
    if (matchedType) {
      record('productTypeId', Number(matchedType.id), 'Element Type');
      record('productType', matchedType.name, 'Element Type Name');
    }
  }

  // 5. PRODUCT / ELEMENT NAME
  let detectedName = '';
  // Try explicit labels first: Product Name: XYZ, Item Name: XYZ, Title: XYZ, Element Name: XYZ
  const nameLabelMatch = text.match(/(?:Product|Element|Item)\s*Name\s*[:\-]\s*([^\n\r,;]{3,80})/i) ||
    text.match(/(?:Title|Model|Product)\s*[:\-]\s*([^\n\r,;]{3,80})/i);
  
  if (nameLabelMatch && nameLabelMatch[1]) {
    detectedName = nameLabelMatch[1].trim();
  } else if (lines.length > 0) {
    // Pick first substantial line that doesn't look like a header/meta
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      if (
        line.length >= 4 &&
        line.length <= 80 &&
        !line.match(/^(page\s*\d+|brochure|catalog|datasheet|confidential|table of contents|spec sheet)/i) &&
        !line.match(/^[0-9\s:/-]+$/)
      ) {
        detectedName = line;
        break;
      }
    }
  }

  if (!detectedName && cleanFileName && cleanFileName.length >= 3) {
    detectedName = cleanFileName;
  }

  // Clean detectedName
  if (detectedName) {
    detectedName = detectedName.replace(/^(product\s*name|element\s*name|item\s*name|name)\s*[:\-]\s*/i, '').trim();
    record('productName', detectedName, 'Element Name');
  }

  // 6. BASE PRODUCT NAME
  let detectedBaseName = '';
  if (existingBaseElements && existingBaseElements.length > 0) {
    for (const base of existingBaseElements) {
      if (base && base.length >= 3) {
        const reg = new RegExp(`\\b${escapeRegex(base)}\\b`, 'i');
        if (reg.test(detectedName) || reg.test(text)) {
          detectedBaseName = base;
          break;
        }
      }
    }
  }
  if (!detectedBaseName && detectedName) {
    // Strip trailing weights/units/numbers e.g. "Basmati Rice 5kg" -> "Basmati Rice"
    detectedBaseName = detectedName
      .replace(/\s*\b\d+(\.\d+)?\s*(kg|g|gm|ml|l|ltr|pcs|pack|box|tablets?|capsules?)\b.*$/i, '')
      .trim();
  }
  if (detectedBaseName) {
    record('baseProductName', detectedBaseName, 'Base Element Name');
  }

  // 7. SKU / INTERNAL SKU / MODEL CODE
  const skuMatch = text.match(/(?:SKU|Item\s*Code|Part\s*No\.?|Model\s*No\.?|Cat(?:\.?|alog)\s*No\.?|Code)\s*[:\-]\s*([A-Za-z0-9\-_/]{3,30})/i);
  if (skuMatch && skuMatch[1]) {
    record('internalSku', skuMatch[1].trim(), 'SKU');
  } else if (cleanFileName.match(/[A-Z0-9]{3,}-[A-Z0-9]{2,}/)) {
    const skuCand = cleanFileName.match(/[A-Z0-9]{3,}-[A-Z0-9]{2,}/)[0];
    record('internalSku', skuCand, 'SKU');
  }

  // 8. HSN / SAC CODE
  const hsnMatch = text.match(/(?:HSN(?:\/SAC)?(?:\s*Code)?)\s*[:\-]?\s*([0-9]{2,8}(?:\.[0-9]{2,4})*)/i);
  if (hsnMatch && hsnMatch[1]) {
    record('hsnCode', hsnMatch[1].trim(), 'HSN Code');
  }

  // 9. BARCODE / EAN / UPC / GTIN
  const barcodeMatch = text.match(/(?:Barcode|EAN(?:-?13)?|UPC(?:-?A)?|GTIN)\s*[:\-]?\s*([0-9]{8,14})/i);
  if (barcodeMatch && barcodeMatch[1]) {
    record('barcode', barcodeMatch[1].trim(), 'Barcode (EAN/UPC)');
  }

  // 10. PRICING & MRP
  // MRP
  const mrpMatch = text.match(/(?:MRP|M\.R\.P\.?|Max(?:imum)?\s*Retail\s*Price)\s*[:\-]?\s*(?:₹|Rs\.?|INR|\$)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (mrpMatch && mrpMatch[1]) {
    const mrpVal = parseFloat(mrpMatch[1]);
    if (!isNaN(mrpVal) && mrpVal > 0) {
      record('mrp', mrpVal.toFixed(2), 'MRP');
    }
  }

  // Purchase Price / Cost
  const costMatch = text.match(/(?:Purchase\s*Price|Cost\s*Price|Cost|Buy\s*Price|Buying\s*Rate)\s*[:\-]?\s*(?:₹|Rs\.?|INR|\$)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (costMatch && costMatch[1]) {
    const costVal = parseFloat(costMatch[1]);
    if (!isNaN(costVal) && costVal > 0) {
      record('purchasePrice', costVal.toFixed(2), 'Purchase Price');
    }
  }

  // Selling Price / Retail Price
  const spMatch = text.match(/(?:Selling\s*Price|Retail\s*Price|Offer\s*Price|Special\s*Price|Sale\s*Price)\s*[:\-]?\s*(?:₹|Rs\.?|INR|\$)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (spMatch && spMatch[1]) {
    const spVal = parseFloat(spMatch[1]);
    if (!isNaN(spVal) && spVal > 0) {
      record('sellingPriceRetail', spVal.toFixed(2), 'Retail Selling Price');
      record('sellingPrice', spVal.toFixed(2), 'Selling Price');
    }
  }

  // Wholesale Price
  const wsMatch = text.match(/(?:Wholesale\s*Price|Wholesale\s*Rate)\s*[:\-]?\s*(?:₹|Rs\.?|INR|\$)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (wsMatch && wsMatch[1]) {
    const wsVal = parseFloat(wsMatch[1]);
    if (!isNaN(wsVal) && wsVal > 0) {
      record('sellingPriceWholesale', wsVal.toFixed(2), 'Wholesale Price');
    }
  }

  // Distributor Price
  const distMatch = text.match(/(?:Distributor\s*Price|Dealer\s*Price|Trade\s*Price)\s*[:\-]?\s*(?:₹|Rs\.?|INR|\$)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (distMatch && distMatch[1]) {
    const distVal = parseFloat(distMatch[1]);
    if (!isNaN(distVal) && distVal > 0) {
      record('distributorPrice', distVal.toFixed(2), 'Distributor Price');
    }
  }

  // GST Rate
  const gstMatch = text.match(/(?:GST|Tax|IGST|CGST\s*\+\s*SGST)\s*[:\-]?\s*([0-9]{1,2}(?:\.[0-9]+)?)\s*%/i);
  if (gstMatch && gstMatch[1]) {
    record('gstRate', String(parseFloat(gstMatch[1])), 'GST Rate (%)');
  }

  // 11. PHYSICAL ATTRIBUTES
  // Net Weight
  const netWtMatch = text.match(/(?:Net\s*Wt\.?|Net\s*Weight|Weight)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gm|gms|mg|lb|oz)\b/i) ||
    text.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gm|gms|mg)\b/i);
  if (netWtMatch && netWtMatch[1]) {
    record('netWeight', netWtMatch[1], 'Net Weight');
    let u = netWtMatch[2].toLowerCase();
    if (u === 'gm' || u === 'gms') u = 'g';
    record('weightUnit', u, 'Weight Unit');
  }

  // Gross Weight
  const grossWtMatch = text.match(/(?:Gross\s*Wt\.?|Gross\s*Weight)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gm|gms|mg|lb|oz)\b/i);
  if (grossWtMatch && grossWtMatch[1]) {
    record('grossWeight', grossWtMatch[1], 'Gross Weight');
  }

  // Volume
  const volMatch = text.match(/(?:Volume|Net\s*Vol\.?|Net\s*Volume|Capacity)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(ml|l|ltr|litres?|liters?)\b/i) ||
    text.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(ml|ltr|liters?)\b/i);
  if (volMatch && volMatch[1]) {
    record('volume', volMatch[1], 'Volume');
    let vu = volMatch[2].toLowerCase();
    if (vu.startsWith('l') && vu !== 'lb') vu = 'l';
    record('volumeUnit', vu, 'Volume Unit');
  }

  // Dimensions (L x W x H)
  const dim3DMatch = text.match(/(?:Dimensions?|Size)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*[xX*×]\s*([0-9]+(?:\.[0-9]+)?)\s*[xX*×]\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm|m|inch|in|ft)?/i);
  if (dim3DMatch) {
    record('length', dim3DMatch[1], 'Length');
    record('breadth', dim3DMatch[2], 'Breadth');
    record('thickness', dim3DMatch[3], 'Thickness');
    if (dim3DMatch[4]) {
      let du = dim3DMatch[4].toLowerCase();
      if (du === 'in') du = 'inch';
      record('dimensionUnit', du, 'Dimension Unit');
    }
  } else {
    // Explicit Length, Breadth, Thickness
    const lenM = text.match(/(?:Length|L)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm|m|inch)?/i);
    const brdM = text.match(/(?:Breadth|Width|W)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm|m|inch)?/i);
    const thkM = text.match(/(?:Thickness|Height|Depth|H)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm|m|inch)?/i);
    if (lenM) record('length', lenM[1], 'Length');
    if (brdM) record('breadth', brdM[1], 'Breadth');
    if (thkM) record('thickness', thkM[1], 'Thickness');
  }

  // Packaging Type
  const packMatch = text.match(/(?:Packaging|Package[ \t]*Type|Packing)[ \t]*[:\-]?[ \t]*([A-Za-z]+(?:[ \t]+[A-Za-z]+)?)/i) ||
    text.match(/\b(Bottle|Box|Pouch|Carton|Bag|Tin|Can|Jar|Packet|Sachet|Tube|Bucket|Drum|Pack)\b/i);
  if (packMatch && packMatch[1]) {
    record('packaging', packMatch[1].trim(), 'Packaging');
  }

  // Physical Shape / Form
  const formMatch = text.match(/(?:Form|Appearance|Physical[ \t]*(?:State|Form|Appearance))[ \t]*[:\-]?[ \t]*([A-Za-z]+(?:[ \t]+[A-Za-z]+)?)/i) ||
    text.match(/\b(Liquid|Powder|Granules|Tablet|Capsule|Solid|Gel|Cream|Paste|Flakes|Spray)\b/i);
  if (formMatch && formMatch[1]) {
    record('physicalAppearance', formMatch[1].trim(), 'Physical Appearance');
  }

  // 12. ALIAS / BOTANICAL / SCIENTIFIC NAME
  const aliasMatch = text.match(/(?:Alias|Also\s*Known\s*As|Botanical\s*Name|Scientific\s*Name|Local\s*Name|Vernacular\s*Name)\s*[:\-]?\s*([^\n\r,;]{3,60})/i);
  if (aliasMatch && aliasMatch[1]) {
    record('productAlias', aliasMatch[1].trim(), 'Product Alias');
  }

  // 13. DESCRIPTION & PRODUCT INFO
  const descMatch = text.match(/(?:Description|Overview|Features|About\s*the\s*Product|Product\s*Info(?:rmation)?|Specifications)\s*[:\-]?\s*([^\n\r]{10,400})/i);
  if (descMatch && descMatch[1]) {
    const cleanDesc = descMatch[1].replace(/\s+/g, ' ').trim();
    if (cleanDesc.length >= 10) {
      record('productDescription', cleanDesc.slice(0, 500), 'Description');
      record('product_info', cleanDesc.slice(0, 800), 'Product Info');
    }
  } else if (lines.length > 2) {
    const summaryLines = lines.slice(1, 4).filter(l => l.length > 20 && !l.includes(':')).join('. ');
    if (summaryLines.length >= 20) {
      record('productDescription', summaryLines.slice(0, 300), 'Description');
      record('product_info', summaryLines.slice(0, 600), 'Product Info');
    }
  }

  // 14. BATCH, LOT, MANUFACTURING & EXPIRY DATES (Tab: Labelling & Media)
  // Batch number
  const batchMatch = text.match(/(?:Batch(?:\s*No\.?|\s*Number)?)\s*[:\-]?\s*([A-Za-z0-9\-_]{2,20})/i);
  if (batchMatch && batchMatch[1]) {
    record('batchNumber', batchMatch[1].trim(), 'Batch Number');
  }

  // Lot number
  const lotMatch = text.match(/(?:Lot(?:\s*No\.?|\s*Number)?)\s*[:\-]?\s*([A-Za-z0-9\-_]{2,20})/i);
  if (lotMatch && lotMatch[1]) {
    record('lotNumber', lotMatch[1].trim(), 'Lot Number');
  }

  // Date parsing helper
  const parseFlexibleDate = (str) => {
    if (!str) return '';
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      return `${dmy[3]}-${month}-${day}`;
    }
    // MM/YYYY
    const my = str.match(/^(\d{1,2})[/\-.](\d{4})$/);
    if (my) {
      return `${my[2]}-${my[1].padStart(2, '0')}-01`;
    }
    return '';
  };

  // Manufacturing date (MFG)
  const mfgMatch = text.match(/(?:Mfg(?:\.?\s*Date)?|Manufacturing\s*Date|Date\s*of\s*Mfg\.?|PKD(?:\.?\s*Date)?)\s*[:\-]?\s*([0-9]{1,4}[/\-.][0-9]{1,2}[/\-.][0-9]{2,4})/i);
  if (mfgMatch && mfgMatch[1]) {
    const formatted = parseFlexibleDate(mfgMatch[1].trim());
    if (formatted) record('manufacturingDate', formatted, 'Manufacturing Date');
  }

  // Expiry date (EXP)
  const expMatch = text.match(/(?:Exp(?:\.?\s*Date)?|Expiry\s*Date|Expiration\s*Date|Use\s*By)\s*[:\-]?\s*([0-9]{1,4}[/\-.][0-9]{1,2}[/\-.][0-9]{2,4})/i);
  if (expMatch && expMatch[1]) {
    const formatted = parseFlexibleDate(expMatch[1].trim());
    if (formatted) record('expiryDate', formatted, 'Expiry Date');
  }

  // Best before date
  const bbMatch = text.match(/(?:Best\s*Before(?:\s*Date)?)\s*[:\-]?\s*([0-9]{1,4}[/\-.][0-9]{1,2}[/\-.][0-9]{2,4})/i);
  if (bbMatch && bbMatch[1]) {
    const formatted = parseFlexibleDate(bbMatch[1].trim());
    if (formatted) record('bestBeforeDate', formatted, 'Best Before Date');
  }

  // 15. REORDER & INVENTORY BUFFERS (Tab: Reorder & Buffers)
  const reorderLvlMatch = text.match(/(?:Reorder\s*Level|Reorder\s*Point|ROP|Min(?:\.?|imum)\s*Order\s*Level)\s*[:\-]?\s*([0-9]+)/i);
  if (reorderLvlMatch && reorderLvlMatch[1]) {
    record('reorderLevel', reorderLvlMatch[1].trim(), 'Reorder Level');
  }

  const reorderQtyMatch = text.match(/(?:Reorder\s*(?:Quantity|Qty)|Standard\s*Batch\s*(?:Size|Qty)|Order\s*Qty)\s*[:\-]?\s*([0-9]+)/i);
  if (reorderQtyMatch && reorderQtyMatch[1]) {
    record('reorderQty', reorderQtyMatch[1].trim(), 'Reorder Quantity');
  }

  const safetyStockMatch = text.match(/(?:Safety\s*Stock|Buffer\s*Stock|Min(?:\.?|imum)\s*Reserve)\s*[:\-]?\s*([0-9]+)/i);
  if (safetyStockMatch && safetyStockMatch[1]) {
    record('safetyStock', safetyStockMatch[1].trim(), 'Safety Stock');
  }

  const minStockMatch = text.match(/(?:Min(?:\.?|imum)\s*Stock(?:\s*Level)?)\s*[:\-]?\s*([0-9]+)/i);
  if (minStockMatch && minStockMatch[1]) {
    record('minStockLevel', minStockMatch[1].trim(), 'Min Stock Level');
  }

  const maxStockMatch = text.match(/(?:Max(?:\.?|imum)\s*Stock(?:\s*Level)?|Capacity\s*Cap)\s*[:\-]?\s*([0-9]+)/i);
  if (maxStockMatch && maxStockMatch[1]) {
    record('maxStockLevel', maxStockMatch[1].trim(), 'Max Stock Level');
  }

  const leadTimeMatch = text.match(/(?:Lead\s*Time|Delivery\s*Time|Turnaround)\s*[:\-]?\s*([0-9]+)\s*(?:days?|d)?/i);
  if (leadTimeMatch && leadTimeMatch[1]) {
    record('leadTimeDays', leadTimeMatch[1].trim(), 'Lead Time (Days)');
  }

  // 16. WAREHOUSE & RACKBIN COORDINATES (Tab: Warehouse & Racking)
  const rackMatch = text.match(/(?:Rack(?:\s*No\.?|\s*Number)?)\s*[:\-]?\s*([A-Za-z0-9\-_ ]{2,15})/i);
  if (rackMatch && rackMatch[1]) {
    record('rackNumber', rackMatch[1].trim(), 'Rack Number');
  }

  const shelfMatch = text.match(/(?:Shelf(?:\s*No\.?|\s*Number)?)\s*[:\-]?\s*([A-Za-z0-9\-_ ]{2,15})/i);
  if (shelfMatch && shelfMatch[1]) {
    record('shelfNumber', shelfMatch[1].trim(), 'Shelf Number');
  }

  const binMatch = text.match(/(?:Bin(?:\s*No\.?|\s*Location)?)\s*[:\-]?\s*([A-Za-z0-9\-_ ]{2,15})/i);
  if (binMatch && binMatch[1]) {
    record('binLocation', binMatch[1].trim(), 'Bin Location');
  }

  // 17. TRADE SCHEMES & DISCOUNTS (Tab: Schemes & Targets)
  const schemeMatch = text.match(/(?:Scheme|Offer|BOGO|Target\s*Scheme)\s*[:\-]?\s*([^\n\r]{3,80})/i);
  if (schemeMatch && schemeMatch[1]) {
    record('productPeProduct', schemeMatch[1].trim(), 'Product Scheme');
  }

  const discountMatch = text.match(/(?:Product\s*Discount|Discount\s*on\s*Product|Trade\s*Discount)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?%?)/i);
  if (discountMatch && discountMatch[1]) {
    record('discountOnProduct', discountMatch[1].trim(), 'Discount on Product');
  }

  return {
    extracted,
    filledFields,
    fieldCount: filledFields.length,
    rawTextPreview: text.slice(0, 1000)
  };
}
