(() => {
  const result = {};
  
  // Title
  result.PID = "1601665039555";
  result.title = document.querySelector('h1')?.innerText?.trim() || document.title;

  // 1. Gallery Images
  const gallery = [];
  const galleryImgs = Array.from(document.querySelectorAll('.main-layout .image-list .image-item img, .module-productMain .main-image img, .image-list img, .main-image img, .icbu-shop-main-image img'));
  galleryImgs.forEach(img => {
      const src = img.src || img.dataset.src || img.dataset.lazySrc;
      if (src && src.includes('alicdn.com')) gallery.push(src.replace(/_(\d+)x(\d+).*/, ''));
  });
  result.gallery = [...new Set(gallery)].map(s => s.startsWith('//') ? 'https:' + s : s);

  // 2. Video URL
  const video = document.querySelector('video');
  result.videoUrl = video?.src || document.querySelector('[data-video-url]')?.getAttribute('data-video-url') || document.querySelector('[data-video-src]')?.getAttribute('data-video-src');

  // 3. Specs/Attributes
  const specs = {};
  const entries = document.querySelectorAll('.do-entry-item, .attribute-item, .specification-item, .do-entry-item-val');
  const labels = document.querySelectorAll('.attr-name, .label, .do-entry-item-key');
  const values = document.querySelectorAll('.attr-value, .value, .do-entry-item-val');
  
  labels.forEach((l, i) => {
      const key = l.innerText.trim().replace(/:$/, '');
      const val = values[i]?.innerText?.trim();
      if (key && val) specs[key] = val;
  });
  
  // Alternative for new layout
  if (Object.keys(specs).length === 0) {
      const specNodes = document.querySelectorAll('.do-entry-separate-item, .specification-entry-item');
      specNodes.forEach(item => {
          const key = item.querySelector('.do-entry-item-key, .label')?.innerText?.trim();
          const val = item.querySelector('.do-entry-item-val, .value')?.innerText?.trim();
          if (key && val) specs[key] = val;
      });
  }
  result.specs = specs;

  // 4. Supplier
  result.supplier = document.querySelector('.company-name, .supplier-name, .shop-info .name, .company-head .name')?.innerText?.trim();

  // 5. Detail Images
  const detailImgs = [];
  const descriptionModule = document.querySelector('#product_description, .product-description, .module-productDescription, .icbu-shop-product-description');
  if (descriptionModule) {
      Array.from(descriptionModule.querySelectorAll('img')).forEach(img => {
          const src = img.src || img.dataset.src;
          if (src && src.includes('alicdn.com')) detailImgs.push(src.startsWith('//') ? 'https:' + s : s);
      });
  }
  result.detailImages = [...new Set(detailImgs)];
  
  // 6. Certificates
  result.certificates = document.querySelector('.certificate-list, .cert-info, .qualification-list')?.innerText?.trim() || "See specs/images";

  return result;
})()