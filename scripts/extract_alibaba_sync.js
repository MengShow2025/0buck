(() => {
  const result = {
    gallery: [],
    video: '',
    detail_images: [],
    certs: []
  };

  try {
    // 1. Gallery images
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
    // Check main document first
    const getImagesFromDoc = (doc) => {
      const imgs = doc.querySelectorAll('.detail-common-description img, .product-description img, #product-detail img, .module_product_specification img, [class*="description"] img');
      return Array.from(imgs)
        .map(img => img.src || img.getAttribute('data-src') || img.getAttribute('lazy-src') || img.getAttribute('data-lazy-src'))
        .filter(src => src && src.startsWith('http') && !src.includes('clear.png') && !src.includes('loading.gif'));
    };

    result.detail_images = getImagesFromDoc(document);

    // Check iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
          result.detail_images = result.detail_images.concat(getImagesFromDoc(doc));
        }
      } catch (e) {}
    });

    result.detail_images = [...new Set(result.detail_images)].slice(0, 10);

    // 4. Certifications
    const certKeywords = ['certificate', 'certification', 'test report', 'iso', 'ce', 'rohs', 'fcc', 'ul', 'tuv'];
    const allImages = Array.from(document.querySelectorAll('img'));
    
    // Also check iframes for certs
    iframes.forEach(iframe => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
          allImages.push(...Array.from(doc.querySelectorAll('img')));
        }
      } catch (e) {}
    });

    const certImages = allImages.filter(img => {
      const alt = (img.alt || '').toLowerCase();
      const src = (img.src || img.getAttribute('data-src') || '').toLowerCase();
      const parentText = (img.parentElement?.innerText || '').toLowerCase();
      return certKeywords.some(kw => alt.includes(kw) || src.includes(kw) || parentText.includes(kw));
    });
    result.certs = Array.from(new Set(certImages.map(img => img.src || img.getAttribute('data-src')))).filter(src => src && src.startsWith('http') && !src.includes('clear.png') && !src.includes('loading.gif'));

  } catch (e) {
    return { error: e.message };
  }

  return result;
})()
