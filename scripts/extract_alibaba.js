(async () => {
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Try to find the description container and scroll into view to trigger lazy loading
  const descContainer = document.querySelector('.product-description, .detail-common-description, #product-detail, #module_product_specification, [class*="description"]');
  if (descContainer) {
    descContainer.scrollIntoView();
    await wait(1000);
  }

  const result = {
    gallery: [],
    video: '',
    detail_images: [],
    certs: []
  };

  // 1. Gallery images
  // Look for the main image area
  const thumbImages = document.querySelectorAll('.main-image-thumb-item img, .image-list img, .bc-main-image img, .gallery-list img');
  if (thumbImages.length > 0) {
    result.gallery = Array.from(thumbImages).map(img => (img.src || img.getAttribute('data-src') || '').replace(/_\d+x\d+.*$/, '')).filter(src => src.startsWith('http'));
  }
  
  if (result.gallery.length === 0) {
    const mainImg = document.querySelector('.magic-main-image img, .main-image img, [class*="main-image"] img');
    if (mainImg) result.gallery.push(mainImg.src.replace(/_\d+x\d+.*$/, ''));
  }
  result.gallery = [...new Set(result.gallery)];

  // 2. Video URL
  const videoElem = document.querySelector('video');
  if (videoElem) {
    result.video = videoElem.src || videoElem.querySelector('source')?.src || '';
  }

  // 3. Detail images (top 10)
  const detailImgElems = document.querySelectorAll('.detail-common-description img, .product-description img, #product-detail img, .module_product_specification img, [class*="description"] img');
  result.detail_images = Array.from(detailImgElems)
    .map(img => img.src || img.getAttribute('data-src') || img.getAttribute('lazy-src') || img.getAttribute('data-lazy-src'))
    .filter(src => src && src.startsWith('http') && !src.includes('clear.png') && !src.includes('loading.gif'))
    .slice(0, 10);

  // 4. Certifications
  const certKeywords = ['certificate', 'certification', 'test report', 'iso', 'ce', 'rohs', 'fcc', 'ul', 'tuv'];
  const allImages = document.querySelectorAll('img');
  const certImages = Array.from(allImages).filter(img => {
    const alt = (img.alt || '').toLowerCase();
    const src = (img.src || '').toLowerCase();
    const parentText = (img.parentElement?.innerText || '').toLowerCase();
    return certKeywords.some(kw => alt.includes(kw) || src.includes(kw) || parentText.includes(kw));
  });
  result.certs = Array.from(new Set(certImages.map(img => img.src || img.getAttribute('data-src')))).filter(src => src && src.startsWith('http'));

  return { __result: result };
})()
