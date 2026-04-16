(() => {
  const result = {};
  
  // Title
  result.title = document.querySelector('h1')?.innerText?.trim() || document.title;

  // 1. Gallery Images
  const images = Array.from(document.querySelectorAll('img'))
    .map(img => {
      const src = img.src || img.dataset.src || img.dataset.lazySrc;
      const rect = img.getBoundingClientRect();
      return { src, width: rect.width, height: rect.height, top: rect.top + window.scrollY };
    })
    .filter(img => img.src && img.src.includes('alicdn.com'))
    .map(img => ({ ...img, src: img.src.startsWith('//') ? 'https:' + img.src : img.src }));
  
  result.gallery = [...new Set(images
    .filter(img => img.top < 2000 && img.width > 200 && img.height > 200)
    .map(img => img.src.replace(/_(\d+)x(\d+).*/, ''))
  )];

  // 2. Video URL
  const video = document.querySelector('video');
  result.videoUrl = video?.src || document.querySelector('[data-video-url]')?.getAttribute('data-video-url') || document.querySelector('[data-video-src]')?.getAttribute('data-video-src');

  // 3. Specs/Attributes
  const specs = {};
  // Try to find the section by heading
  const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, span, div'))
    .filter(el => /Attributes|Specifications|重要属性|商品规格/i.test(el.innerText));
  
  headers.forEach(h => {
      // Look for data in siblings or following text
      let curr = h.nextElementSibling;
      while (curr && !/h1|h2/i.test(curr.tagName)) {
          const text = curr.innerText.trim();
          if (text) {
              // Try to parse pairs
              const lines = text.split(/\n/);
              lines.forEach(line => {
                  const parts = line.split(/[:\t]/);
                  if (parts.length >= 2) {
                      const key = parts[0].trim();
                      const val = parts.slice(1).join(':').trim();
                      if (key && val && key.length < 50) specs[key] = val;
                  }
              });
          }
          curr = curr.nextElementSibling;
      }
  });
  
  // Also try getting all do-entry-item
  document.querySelectorAll('.do-entry-item, .attribute-item, .specification-item, .do-entry-separate-item').forEach(item => {
      const key = item.querySelector('.do-entry-item-key, .label, .attr-name')?.innerText?.trim();
      const val = item.querySelector('.do-entry-item-val, .value, .attr-value')?.innerText?.trim();
      if (key && val) specs[key] = val;
  });

  result.specs = specs;

  // 4. Supplier
  result.supplier = document.querySelector('.company-name, .supplier-name, .shop-info .name, .company-head .name')?.innerText?.trim();

  // 5. Description Iframe URL
  const descIframe = document.querySelector('iframe[src*="descIframe.html"]');
  result.descriptionIframeSrc = descIframe?.src;
  
  // 6. Certificates
  result.certificates = document.querySelector('.certificate-list, .cert-info, .qualification-list, [class*="cert"]')?.innerText?.trim() || "See specs/images";

  return result;
})()