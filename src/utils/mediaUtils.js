/**
 * Universal Media Extraction & Normalization Utilities
 * Handles all JSON-stringified, array, comma-separated, and aliased media formats
 * returned by backend REST APIs.
 */

export const parseMediaArray = (val) => {
  if (!val) return [];
  
  // Already an array
  if (Array.isArray(val)) {
    return val
      .map(item => {
        if (!item) return '';
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') return item.url || item.path || item.image || item.image_url || '';
        return String(item);
      })
      .filter(Boolean);
  }

  // String handling
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];

    // Attempt JSON parse if it looks like an array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parseMediaArray(parsed);
        }
      } catch {
        // Fallback: clean out brackets and quotes
        const cleaned = trimmed.slice(1, -1).replace(/["'\\]/g, '').trim();
        if (cleaned) {
          return cleaned.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    // Comma-separated list of URLs
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }

    // Single URL or path
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:')
    ) {
      return [trimmed];
    }

    // Single filename or URL
    return [trimmed];
  }

  return [];
};

/**
 * Extract all media assets from a Company object
 */
export const extractCompanyMedia = (comp = {}) => {
  if (!comp || typeof comp !== 'object') {
    return {
      logoUrl: '',
      images: [],
      brochureUrl: '',
      brochureName: '',
      videoUrl: '',
      officers: []
    };
  }

  // 1. Gallery Images (aggregate from all possible keys)
  const allImages = [
    ...parseMediaArray(comp.images),
    ...parseMediaArray(comp.company_images),
    ...parseMediaArray(comp.image_gallery),
    ...parseMediaArray(comp.photos)
  ];
  const uniqueImages = Array.from(new Set(allImages.filter(Boolean)));

  // 2. Logo / Primary Image
  const logoUrl =
    (typeof comp.image_url === 'string' && comp.image_url.trim()) ||
    (typeof comp.image === 'string' && comp.image.trim()) ||
    (typeof comp.company_image === 'string' && comp.company_image.trim()) ||
    (typeof comp.logo === 'string' && comp.logo.trim()) ||
    (typeof comp.logo_url === 'string' && comp.logo_url.trim()) ||
    (uniqueImages.length > 0 ? uniqueImages[0] : '');

  // If uniqueImages is empty and logoUrl exists, provide logo in images as fallback
  const images = uniqueImages.length > 0 ? uniqueImages : (logoUrl ? [logoUrl] : []);

  // 3. Brochure URL & Name
  let brochureUrl = '';
  if (typeof comp.brochure_url === 'string' && comp.brochure_url.trim()) {
    const parsed = parseMediaArray(comp.brochure_url);
    brochureUrl = parsed.length > 0 ? parsed[0] : comp.brochure_url.trim();
  } else if (typeof comp.company_brochure_url === 'string' && comp.company_brochure_url.trim()) {
    const parsed = parseMediaArray(comp.company_brochure_url);
    brochureUrl = parsed.length > 0 ? parsed[0] : comp.company_brochure_url.trim();
  } else if (typeof comp.brochure === 'string' && comp.brochure.trim()) {
    const parsed = parseMediaArray(comp.brochure);
    brochureUrl = parsed.length > 0 ? parsed[0] : comp.brochure.trim();
  } else {
    // Check array fields
    const brochuresArr = [
      ...parseMediaArray(comp.brochures),
      ...parseMediaArray(comp.brochure_urls),
      ...parseMediaArray(comp.brochure_images),
      ...parseMediaArray(comp.company_brochures)
    ];
    if (brochuresArr.length > 0) {
      brochureUrl = brochuresArr[0];
    }
  }

  const compDisplayName = comp.name || comp.company_name || 'Company';
  const brochureName =
    (typeof comp.brochure_name === 'string' && comp.brochure_name.trim()) ||
    (typeof comp.company_brochure_name === 'string' && comp.company_brochure_name.trim()) ||
    (brochureUrl ? `${compDisplayName}_Brochure.pdf` : '');

  // 4. Video URL
  const videoUrl =
    (typeof comp.video_url === 'string' && comp.video_url.trim()) ||
    (typeof comp.video === 'string' && comp.video.trim()) ||
    (typeof comp.company_video_url === 'string' && comp.company_video_url.trim()) ||
    '';

  // 5. Officers / Contact Persons
  let officers = [];
  if (Array.isArray(comp.officers) && comp.officers.length > 0) {
    officers = comp.officers.map((o, idx) => ({
      name: (typeof o === 'object' ? o.name : String(o)) || '',
      designation: (typeof o === 'object' ? o.designation : '') || '',
      phone: (typeof o === 'object' ? o.phone : '') || '',
      email: (typeof o === 'object' ? o.email : '') || '',
      is_primary: typeof o === 'object' && o.is_primary !== undefined ? Boolean(o.is_primary) : idx === 0
    }));
  } else if (typeof comp.officers === 'string' && comp.officers.trim()) {
    try {
      const parsed = JSON.parse(comp.officers);
      if (Array.isArray(parsed)) {
        officers = parsed.map((o, idx) => ({
          name: (typeof o === 'object' ? o.name : String(o)) || '',
          designation: (typeof o === 'object' ? o.designation : '') || '',
          phone: (typeof o === 'object' ? o.phone : '') || '',
          email: (typeof o === 'object' ? o.email : '') || '',
          is_primary: typeof o === 'object' && o.is_primary !== undefined ? Boolean(o.is_primary) : idx === 0
        }));
      }
    } catch {
      // not JSON
    }
  }

  if (officers.length === 0 && Array.isArray(comp.company_officers) && comp.company_officers.length > 0) {
    officers = comp.company_officers.map((o, idx) => ({
      name: (typeof o === 'object' ? o.name : String(o)) || '',
      designation: (typeof o === 'object' ? o.designation : 'Primary Officer') || '',
      phone: (typeof o === 'object' ? o.phone : '') || '',
      email: (typeof o === 'object' ? o.email : '') || '',
      is_primary: idx === 0
    }));
  } else if (officers.length === 0 && comp.company_officer_name) {
    const parts = String(comp.company_officer_name).split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      officers = parts.map((name, idx) => ({
        name,
        designation: 'Primary Officer',
        phone: comp.phone || '',
        email: comp.email || '',
        is_primary: idx === 0
      }));
    }
  }

  if (officers.length === 0 && (comp.name || comp.email || comp.phone)) {
    officers = [{
      name: comp.contact_person || comp.company_officer_name || 'Primary Contact',
      designation: 'Primary Officer',
      phone: comp.phone || '',
      email: comp.email || '',
      is_primary: true
    }];
  }

  // 6. Schemes & Turnover Targets
  let schemesData = {};
  if (comp.schemes_data && typeof comp.schemes_data === 'object') {
    schemesData = comp.schemes_data;
  } else if (typeof comp.schemes_data === 'string' && comp.schemes_data.trim()) {
    try {
      schemesData = JSON.parse(comp.schemes_data);
    } catch {
      schemesData = {};
    }
  }

  const product_pe_product = comp.product_pe_product || schemesData.product_pe_product || comp.bogo_scheme || '';
  const discount_on_product = comp.discount_on_product || schemesData.discount_on_product || comp.product_discount || '';
  const product_target_scheme = comp.product_target_scheme || schemesData.product_target_scheme || comp.target_scheme || '';
  const discount_on_bill_amount = comp.discount_on_bill_amount || schemesData.discount_on_bill_amount || comp.bill_discount || '';
  const quarterly_discount_on_turnover = comp.quarterly_discount_on_turnover || schemesData.quarterly_discount_on_turnover || comp.quarterly_rebate || '';
  const yearly_discount_on_turnover = comp.yearly_discount_on_turnover || schemesData.yearly_discount_on_turnover || comp.yearly_rebate || '';
  const seasonal_scheme_name = comp.seasonal_scheme_name || schemesData.seasonal_scheme_name || comp.season_name || '';
  const seasonal_period_start = comp.seasonal_period_start || schemesData.seasonal_period_start || '';
  const seasonal_period_end = comp.seasonal_period_end || schemesData.seasonal_period_end || '';
  const seasonal_applicability = comp.seasonal_applicability || schemesData.seasonal_applicability || 'All Products';
  const seasonal_frequency = comp.seasonal_frequency || schemesData.seasonal_frequency || 'Yearly';

  const hasAnyScheme = Boolean(
    product_pe_product ||
    discount_on_product ||
    product_target_scheme ||
    discount_on_bill_amount ||
    quarterly_discount_on_turnover ||
    yearly_discount_on_turnover ||
    seasonal_scheme_name
  );

  return {
    ...comp,
    logoUrl,
    image_url: logoUrl,
    image: logoUrl,
    images,
    company_images: images,
    brochureUrl,
    brochure_url: brochureUrl,
    brochureName,
    brochure_name: brochureName,
    videoUrl,
    video_url: videoUrl,
    officers,
    product_pe_product,
    discount_on_product,
    product_target_scheme,
    discount_on_bill_amount,
    quarterly_discount_on_turnover,
    yearly_discount_on_turnover,
    seasonal_scheme_name,
    seasonal_period_start,
    seasonal_period_end,
    seasonal_applicability,
    seasonal_frequency,
    schemes: {
      product_pe_product,
      discount_on_product,
      product_target_scheme,
      discount_on_bill_amount,
      quarterly_discount_on_turnover,
      yearly_discount_on_turnover,
      seasonal_scheme_name,
      seasonal_period_start,
      seasonal_period_end,
      seasonal_applicability,
      seasonal_frequency
    },
    hasSchemes: hasAnyScheme
  };
};

/**
 * Extract all media assets from a Group object
 */
export const extractGroupMedia = (group = {}) => {
  if (!group || typeof group !== 'object') {
    return {
      images: [],
      image_url: '',
      brochureUrl: '',
      brochureName: ''
    };
  }

  const allImages = [
    ...parseMediaArray(group.images),
    ...parseMediaArray(group.group_images),
    ...parseMediaArray(group.photos)
  ];
  const uniqueImages = Array.from(new Set(allImages.filter(Boolean)));

  const imageUrl =
    (typeof group.image_url === 'string' && group.image_url.trim()) ||
    (typeof group.image === 'string' && group.image.trim()) ||
    (uniqueImages.length > 0 ? uniqueImages[0] : '');

  const images = uniqueImages.length > 0 ? uniqueImages : (imageUrl ? [imageUrl] : []);

  // Check brochure for Group if backend provides it
  let brochureUrl = '';
  if (typeof group.brochure_url === 'string' && group.brochure_url.trim()) {
    const parsed = parseMediaArray(group.brochure_url);
    brochureUrl = parsed.length > 0 ? parsed[0] : group.brochure_url.trim();
  } else if (typeof group.brochure === 'string' && group.brochure.trim()) {
    const parsed = parseMediaArray(group.brochure);
    brochureUrl = parsed.length > 0 ? parsed[0] : group.brochure.trim();
  } else {
    const arr = [
      ...parseMediaArray(group.brochures),
      ...parseMediaArray(group.brochure_urls),
      ...parseMediaArray(group.brochure_images)
    ];
    if (arr.length > 0) brochureUrl = arr[0];
  }

  const brochureName =
    (typeof group.brochure_name === 'string' && group.brochure_name.trim()) ||
    (brochureUrl ? `${group.name || 'Group'}_Brochure.pdf` : '');

  return {
    ...group,
    image_url: imageUrl,
    image: imageUrl,
    images,
    brochureUrl,
    brochure_url: brochureUrl,
    brochureName,
    brochure_name: brochureName
  };
};
