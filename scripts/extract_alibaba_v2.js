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

  // Gallery
  const galleryContainer = document.querySelector('.main-layout .main-gallery, .gallery-items, .product-image, .magic-gallery');
  if (galleryContainer) {
    const images = Array.from(galleryContainer.querySelectorAll('img'))
      .map(img => img.src.replace(/_(\d+)x(\d+)\.(jpg|png|webp|svg)$/, ''))
      .filter(src => src && !src.includes('placeholder') && !src.includes('icon'));
    result.gallery = [...new Set(images)];
  } else {
    // Fallback: search for gallery-like images
    const images = Array.from(document.querySelectorAll('img'))
      .filter(img => img.width > 200 && img.height > 200 && (img.closest('.main-layout') || img.closest('.product-detail')))
      .map(img => img.src.replace(/_(\d+)x(\d+)\.(jpg|png|webp|svg)$/, ''));
    result.gallery = [...new Set(images)];
  }

  // Video
  const videoEl = document.querySelector('video');
  if (videoEl) result.video = videoEl.src || videoEl.querySelector('source')?.src || '';

  // Specs
  const specItems = document.querySelectorAll('.do-entry-item, .attribute-item, .product-attribute-list li, .attr-item');
  specItems.forEach(item => {
    const key = (item.querySelector('.do-entry-item-key, .attr-name, .key') || item.children[0])?.innerText?.trim();
    const value = (item.querySelector('.do-entry-item-val, .attr-value, .value') || item.children[1])?.innerText?.trim();
    if (key && value && key !== value) result.specs[key] = value;
  });
  
  // Supplier
  const supplierEl = document.querySelector('.company-name a, .supplier-info a, .name-link');
  if (supplierEl) {
    result.supplier.name = supplierEl.innerText.trim();
    result.supplier.url = supplierEl.href;
  }

  // Description Images
  // Need to scroll first to load lazy images
  window.scrollTo(0, document.body.scrollHeight / 2);
  await new Promise(r => setTimeout(r, 1000));
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(r => setTimeout(r, 1000));

  const descContainer = document.querySelector('#product_description, .description-detail-content, .detail-images, .icbu-shop-product-description');
  if (descContainer) {
    const images = Array.from(descContainer.querySelectorAll('img'))
      .map(img => img.src || img.getAttribute('data-src'))
      .filter(src => src && !src.includes('placeholder') && !src.includes('icon'));
    result.detail_images = [...new Set(images)];
  }

  // Certificates
  const bodyText = document.body.innerText;
  ['CE', 'ISO', 'FCC', 'RoHS'].forEach(cert => {
    if (bodyText.includes(cert)) result.certificates.push(cert);
  });

  return result;
})()