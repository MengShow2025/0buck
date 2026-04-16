(async () => {
  const result = {};
  
  // Title
  result.PID = "1601665039555"; // hardcoded for this call
  result.title = document.querySelector('h1')?.innerText?.trim() || document.title;

  // 1. Gallery Images
  // Typically top images
  const images = Array.from(document.querySelectorAll('img'))
    .map(img => img.src || img.dataset.src || img.dataset.lazySrc)
    .filter(src => src && src.includes('alicdn.com'))
    .map(s => s.startsWith('//') ? 'https:' + s : s);
  
  // Gallery images are usually smaller thumbnails or main big images
  // We'll take unique ones that look like product images
  result.gallery = [...new Set(images.slice(0, 10))];

  // 2. Video URL
  const video = document.querySelector('video');
  result.videoUrl = video?.src || document.querySelector('[data-video-url]')?.getAttribute('data-video-url');

  // 3. Specs/Attributes
  const specs = {};
  const entries = document.querySelectorAll('.do-entry-item, .attribute-item, [class*="attribute-item"], [class*="do-entry-item"]');
  entries.forEach(item => {
      const key = item.querySelector('[class*="key"], [class*="name"], .label')?.innerText?.trim();
      const val = item.querySelector('[class*="val"], [class*="value"], .value')?.innerText?.trim();
      if (key && val) specs[key] = val;
  });
  if (Object.keys(specs).length === 0) {
      // Fallback for current layout
      const textNodes = document.querySelector('[class*="attribute"], [class*="specification"]')?.innerText;
      if (textNodes) result.rawSpecs = textNodes;
  }
  result.specs = specs;

  // 4. Supplier
  result.supplier = document.querySelector('.company-name, .supplier-name, .shop-info .name, [class*="company-name"]')?.innerText?.trim();

  // 5. Detail Images
  const detailImgs = [];
  const descSection = document.querySelector('#product_description, [class*="description"], [class*="detail"]');
  if (descSection) {
      detailImgs.push(...Array.from(descSection.querySelectorAll('img')).map(img => img.src || img.dataset.src));
  }
  result.detailImages = [...new Set(detailImgs.filter(s => s && s.includes('alicdn.com')))].map(s => s.startsWith('//') ? 'https:' + s : s);
  
  // 6. Certificates
  result.certificates = document.querySelector('[class*="cert"]')?.innerText?.trim() || "See specs/images";

  return result;
})()