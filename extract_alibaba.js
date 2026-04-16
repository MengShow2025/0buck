(async () => {
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Scroll to bottom to trigger lazy loading of detail images
  window.scrollTo(0, document.body.scrollHeight / 2);
  await wait(500);
  window.scrollTo(0, document.body.scrollHeight);
  await wait(1000);

  const data = {};

  // Supplier
  data.supplier = document.querySelector('.company-name, .shop-name, .supplier-info-name')?.innerText.trim();

  // Gallery
  const gallery = Array.from(document.querySelectorAll('.main-img-container img, .module-productGallery img, .thumb-item img, .detail-main-info img'))
    .map(img => img.src.replace(/_(\d+)x(\d+).*/, '').replace(/_\.webp$/, ''))
    .filter((v, i, a) => v && v.startsWith('http') && a.indexOf(v) === i && !v.includes('avatar') && !v.includes('logo'));
  data.galleryImages = gallery.slice(0, 15);

  // Video
  data.videoUrl = document.querySelector('video')?.src || document.querySelector('video source')?.src || null;

  // Specs
  const specs = {};
  document.querySelectorAll('.attribute-item, .do-entry-item, .specification-item, .do-entry-list li').forEach(el => {
    const key = el.querySelector('.attr-name, .left, .do-entry-item-key')?.innerText.trim().replace(/:$/, '');
    const val = el.querySelector('.attr-value, .right, .do-entry-item-val')?.innerText.trim();
    if (key && val) specs[key] = val;
  });
  data.specs = specs;

  // Detail Images
  const detailImgs = Array.from(document.querySelectorAll('.product-description img, #product_description img, .detail-description img, .desc-v6-main img'))
    .map(img => (img.dataset.src || img.src || '').replace(/_(\d+)x(\d+).*/, '').replace(/_\.webp$/, ''))
    .filter(src => src && src.startsWith('http') && !src.includes('clear.gif') && !src.includes('alicdn.com/imgextra'));
  data.detailImages = [...new Set(detailImgs)];

  // Certificates
  data.certificates = Array.from(document.querySelectorAll('.certificate-list img, .cert-item img'))
    .map(img => img.src)
    .filter(src => src && src.startsWith('http'));

  return data;
})()