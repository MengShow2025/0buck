(async () => {
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Scroll to trigger lazy loading
  for (let i = 0; i < 3; i++) {
    window.scrollBy(0, 800);
    await wait(300);
  }

  const data = {};

  // Title
  data.title = document.querySelector('h1')?.innerText.trim() || document.title;

  // Supplier
  data.supplier = document.querySelector('.company-name, .shop-name, .supplier-name-content')?.innerText.trim();

  // Images
  const allImgs = Array.from(document.querySelectorAll('img')).map(img => {
    const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src;
    if (!src) return null;
    return src.split('_')[0].replace(/^https?:/, '').replace(/^\/\//, 'https://');
  }).filter(src => src && src.includes('alicdn.com/kf/'));

  // Gallery images are usually in the top section
  const mainImgs = Array.from(document.querySelectorAll('.main-img-container img, .module-productGallery img, .thumb-item img'))
    .map(img => (img.getAttribute('src') || img.getAttribute('data-src') || img.src).split('_')[0].replace(/^https?:/, '').replace(/^\/\//, 'https://'))
    .filter(src => src && src.includes('alicdn.com/kf/'));
  
  data.galleryImages = [...new Set(mainImgs)].slice(0, 10);
  if (data.galleryImages.length === 0) {
    data.galleryImages = [...new Set(allImgs.slice(0, 8))];
  }

  // Detail images (Description)
  const detailImgs = Array.from(document.querySelectorAll('.product-description img, #product_description img, .detail-description img, .desc-v6-main img'))
    .map(img => (img.getAttribute('src') || img.getAttribute('data-src') || img.src).split('_')[0].replace(/^https?:/, '').replace(/^\/\//, 'https://'))
    .filter(src => src && src.includes('alicdn.com/kf/'));
  data.detailImages = [...new Set(detailImgs)];

  // Video
  data.videoUrl = document.querySelector('video')?.src || document.querySelector('video source')?.src || null;

  // Specs
  const specs = {};
  document.querySelectorAll('.attribute-item, .do-entry-item, .specification-item, .do-entry-list li').forEach(el => {
    const key = el.querySelector('.attr-name, .left, .do-entry-item-key')?.innerText.trim().replace(/:$/, '');
    const val = el.querySelector('.attr-value, .right, .do-entry-item-val')?.innerText.trim();
    if (key && val) specs[key] = val;
  });
  // Fallback specs for some layouts
  if (Object.keys(specs).length === 0) {
     document.querySelectorAll('div[class*="attribute-item"], div[class*="spec-item"]').forEach(el => {
        const key = el.querySelector('span:nth-child(1)')?.innerText.trim();
        const val = el.querySelector('span:nth-child(2)')?.innerText.trim();
        if (key && val && key.length < 50) specs[key] = val;
     });
  }
  data.specs = specs;

  // Certificates
  data.certificates = Array.from(document.querySelectorAll('.certificate-list img, .cert-item img, .cert-list-item img'))
    .map(img => img.src)
    .filter(src => src && src.includes('alicdn.com'));

  return data;
})()