(async () => {
  const result = {};
  
  // 1. Title
  result.title = document.querySelector('h1')?.innerText?.trim() || '';
  
  // 2. Gallery Images
  const galleryImgs = Array.from(document.querySelectorAll('.main-layout .main-gallery img, .main-layout .gallery-items img, .product-image img'))
    .map(img => img.src.replace(/_(\d+)x(\d+)\.jpg$/, ''))
    .filter(src => src && !src.includes('placeholder'));
  result.gallery = [...new Set(galleryImgs)];
  
  // 3. Video
  const video = document.querySelector('video');
  result.video = video ? video.src : '';
  
  // 4. Specs
  const specs = {};
  const specItems = document.querySelectorAll('.do-entry-item, .attribute-item, .product-attribute-list li');
  specItems.forEach(item => {
    const key = item.querySelector('.do-entry-item-val, .attr-name')?.innerText?.trim();
    const value = item.querySelector('.do-entry-item-val, .attr-value')?.innerText?.trim();
    if (key && value) specs[key] = value;
  });
  // Fallback for specs in text block
  if (Object.keys(specs).length === 0) {
    const textSpecs = document.querySelector('.product-property-list, .do-entry-list')?.innerText;
    if (textSpecs) {
      const lines = textSpecs.split('\n');
      lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) specs[parts[0].trim()] = parts.slice(1).join(':').trim();
      });
    }
  }
  result.specs = specs;
  
  // 5. Certificates
  const certs = [];
  const bodyText = document.body.innerText;
  const certKeywords = ['CE', 'ISO', 'FCC', 'RoHS'];
  certKeywords.forEach(kw => {
    if (bodyText.includes(kw)) certs.push(kw);
  });
  result.certificates = certs;
  
  // 6. Supplier
  const supplierLink = document.querySelector('.company-name a, .supplier-info a');
  result.supplier = {
    name: supplierLink?.innerText?.trim() || '',
    url: supplierLink?.href || ''
  };
  
  // 7. Detail Images (long images in description)
  const detailImages = Array.from(document.querySelectorAll('#product_description img, .description-detail-content img, .detail-images img'))
    .map(img => img.src || img.getAttribute('data-src'))
    .filter(src => src && !src.includes('placeholder'));
  result.detail_images = [...new Set(detailImages)];
  
  return result;
})()