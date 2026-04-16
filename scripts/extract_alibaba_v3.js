(() => {
  const result = {
    title: document.querySelector('h1')?.innerText?.trim() || '',
    gallery: [],
    video: '',
    detail_images: [],
    specs: {},
    certificates: [],
    supplier: { name: '', url: '' }
  };

  // 1. Gallery - improved
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
     // Check for video in script or other elements
     const videoSrc = document.body.innerHTML.match(/videoUrl":"(.*?)"/);
     if (videoSrc) result.video = videoSrc[1].replace(/\\/g, '');
  }

  // 3. Specs - improved
  // Look for the "Attributes" section
  const attrSection = Array.from(document.querySelectorAll('div, section')).find(el => el.innerText.includes('Key attributes') || el.innerText.includes('重要属性'));
  if (attrSection) {
    const items = attrSection.querySelectorAll('li, tr, .do-entry-item, .attribute-item');
    items.forEach(item => {
      const text = item.innerText.split('\n').map(s => s.trim()).filter(Boolean);
      if (text.length >= 2) {
        result.specs[text[0]] = text[1];
      }
    });
  }
  // Fallback for specs in a single block
  if (Object.keys(result.specs).length < 2) {
      const text = document.querySelector('.product-property-list, .do-entry-list')?.innerText;
      if (text) {
          const pairs = text.split('\n').filter(s => s.trim());
          for (let i = 0; i < pairs.length; i++) {
              const line = pairs[i].trim();
              const split = line.split(/\s{2,}/); // split by multiple spaces
              if (split.length >= 2) {
                  result.specs[split[0]] = split[1];
              }
          }
      }
  }

  // 4. Supplier - improved
  const supplierLink = Array.from(document.querySelectorAll('a[href*=".en.alibaba.com"]')).find(a => a.innerText.length > 5);
  if (supplierLink) {
    result.supplier.name = supplierLink.innerText.trim();
    result.supplier.url = supplierLink.href;
  }

  // 5. Detail Images
  // We assume the caller has scrolled to the bottom.
  const descSection = document.querySelector('#product_description, .description-detail-content, .icbu-shop-product-description');
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