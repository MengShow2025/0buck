(async () => {
  const result = {
    title: document.querySelector('h1')?.innerText?.trim() || '',
    gallery: [],
    video: '',
    detail_images: [],
    specs: {},
    certificates: [],
    supplier: { name: '', url: '' }
  };

  // 1. Gallery
  const images = Array.from(document.querySelectorAll('img'))
    .filter(img => {
       const rect = img.getBoundingClientRect();
       return rect.width > 200 && rect.height > 200;
    })
    .map(img => img.src.split('?')[0].replace(/_(\d+)x(\d+)\.(jpg|png|webp|svg)$/, ''))
    .filter(src => src && src.includes('alicdn.com'));
  result.gallery = [...new Set(images)];

  // 2. Video
  const videoEl = document.querySelector('video');
  if (videoEl) {
    result.video = videoEl.src || videoEl.querySelector('source')?.src || '';
  } else {
     const videoSrc = document.body.innerHTML.match(/videoUrl":"(.*?)"/);
     if (videoSrc) result.video = videoSrc[1].replace(/\\/g, '');
  }

  // 3. Specs
  const attrSection = document.querySelector('.module_attribute, .product-attribute-list, .do-entry-list');
  if (attrSection) {
      // Look for grid rows
      const rows = attrSection.querySelectorAll('[class*="id-grid-cols"]');
      if (rows.length > 0) {
          rows.forEach(row => {
              const children = row.children;
              if (children.length >= 2) {
                  const key = children[0].innerText.trim();
                  const value = children[1].innerText.trim();
                  if (key && value && key !== value) result.specs[key] = value;
              }
          });
      } else {
          // Fallback to li/tr
          const items = attrSection.querySelectorAll('li, tr');
          items.forEach(item => {
              const text = item.innerText.split('\n').map(s => s.trim()).filter(Boolean);
              if (text.length >= 2) result.specs[text[0]] = text[1];
          });
      }
  }
  
  // 4. Supplier
  const supplierLink = Array.from(document.querySelectorAll('a[href*=".en.alibaba.com"]')).find(a => a.innerText.length > 5);
  if (supplierLink) {
    result.supplier.name = supplierLink.innerText.trim();
    result.supplier.url = supplierLink.href;
  }

  // 5. Scroll and get Detail Images
  // We'll do a quick scroll
  window.scrollTo(0, 0);
  for (let i = 0; i < 5; i++) {
      window.scrollBy(0, 1000);
      await new Promise(r => setTimeout(r, 200));
  }

  const descSection = document.querySelector('#product_description, .description-detail-content, .icbu-shop-product-description, .module_product_description');
  if (descSection) {
      const dImgs = Array.from(descSection.querySelectorAll('img'))
        .map(img => (img.src || img.getAttribute('data-src') || '').split('?')[0])
        .filter(src => src && src.includes('alicdn.com'));
      result.detail_images = [...new Set(dImgs)];
  }

  // 6. Certificates
  ['CE', 'ISO', 'FCC', 'RoHS'].forEach(cert => {
    if (document.body.innerText.includes(cert)) result.certificates.push(cert);
  });

  return result;
})()