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

  const galleryImgs = Array.from(document.querySelectorAll('img'))
    .filter(img => img.width > 200 && img.height > 200)
    .map(img => img.src.replace(/_(\d+)x(\d+)\.(jpg|png|webp|svg)$/, ''));
  result.gallery = [...new Set(galleryImgs)];

  const videoEl = document.querySelector('video');
  if (videoEl) result.video = videoEl.src || videoEl.querySelector('source')?.src || '';

  const specItems = document.querySelectorAll('.do-entry-item, .attribute-item, .product-attribute-list li');
  specItems.forEach(item => {
    const children = item.children;
    if (children.length >= 2) {
      const key = children[0].innerText.trim();
      const value = children[1].innerText.trim();
      if (key && value && key !== value) result.specs[key] = value;
    }
  });

  const supplierEl = document.querySelector('.company-name a, .supplier-info a, .name-link');
  if (supplierEl) {
    result.supplier.name = supplierEl.innerText.trim();
    result.supplier.url = supplierEl.href;
  }

  const bodyText = document.body.innerText;
  ['CE', 'ISO', 'FCC', 'RoHS'].forEach(cert => {
    if (bodyText.includes(cert)) result.certificates.push(cert);
  });

  return result;
})()