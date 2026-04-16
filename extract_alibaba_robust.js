(() => {
  const result = {};
  
  // Title
  result.title = document.querySelector('h1')?.innerText?.trim() || document.title;

  // 1. Gallery Images
  // Look for images in the top part of the page or in sliders
  const images = Array.from(document.querySelectorAll('img'))
    .map(img => {
      const src = img.src || img.dataset.src || img.dataset.lazySrc;
      const rect = img.getBoundingClientRect();
      return { src, width: rect.width, height: rect.height, top: rect.top + window.scrollY };
    })
    .filter(img => img.src && img.src.includes('alicdn.com'))
    .map(img => ({ ...img, src: img.src.startsWith('//') ? 'https:' + img.src : img.src }));
  
  // Gallery images are usually in the top 1000px and square-ish
  result.gallery = [...new Set(images
    .filter(img => img.top < 2000 && img.width > 200 && img.height > 200)
    .map(img => img.src.replace(/_(\d+)x(\d+).*/, ''))
  )];

  // 2. Video URL
  const video = document.querySelector('video');
  result.videoUrl = video?.src || document.querySelector('[data-video-url]')?.getAttribute('data-video-url') || document.querySelector('[data-video-src]')?.getAttribute('data-video-src');

  // 3. Specs/Attributes
  const specs = {};
  // Find "Attributes" or "Specifications" or "重要属性"
  const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, span, div'))
    .filter(el => /Attributes|Specifications|重要属性|商品规格/i.test(el.innerText));
  
  headers.forEach(h => {
      const container = h.parentElement;
      // Get all text content in this container
      const items = container.querySelectorAll('.do-entry-item, .attribute-item, li, p');
      items.forEach(item => {
          const text = item.innerText.trim();
          if (text.includes(':') || text.includes('\t')) {
              const parts = text.split(/[:\t\n]/);
              if (parts.length >= 2) {
                  const key = parts[0].trim();
                  const val = parts.slice(1).join(' ').trim();
                  if (key && val && key.length < 50) specs[key] = val;
              }
          }
      });
  });
  
  // Fallback for the big text block in snapshot
  if (Object.keys(specs).length === 0) {
      const specSection = document.querySelector('.do-entry-separate, .specification-entry, .attribute-list');
      if (specSection) {
          result.rawSpecs = specSection.innerText.trim();
      }
  }
  result.specs = specs;

  // 4. Supplier
  result.supplier = document.querySelector('.company-name, .supplier-name, .shop-info .name, .company-head .name')?.innerText?.trim();

  // 5. Detail Images
  // Usually large images further down the page
  result.detailImages = [...new Set(images
    .filter(img => img.top > 2000 && (img.width > 400 || img.height > 400))
    .map(img => img.src)
  )];
  
  // 6. Certificates
  result.certificates = document.querySelector('.certificate-list, .cert-info, .qualification-list, [class*="cert"]')?.innerText?.trim() || "See specs/images";

  return result;
})()