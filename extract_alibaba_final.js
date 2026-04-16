(() => {
  const result = {};
  
  result.title = document.querySelector('h1')?.innerText?.trim() || document.title;

  // 1. Gallery
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

  // 2. Video
  const video = document.querySelector('video');
  result.videoUrl = video?.src || document.querySelector('[data-video-url]')?.getAttribute('data-video-url') || document.querySelector('[data-video-src]')?.getAttribute('data-video-src');

  // 3. Specs - Be more careful about what we pick as specs
  const specs = {};
  // The "重要属性" or "Specifications" section often has a specific class or structure
  // In the snapshot it was after a heading.
  const entryItems = document.querySelectorAll('.do-entry-item, .attribute-item, .specification-item, .do-entry-separate-item');
  entryItems.forEach(item => {
      const keyEl = item.querySelector('.do-entry-item-key, .label, .attr-name');
      const valEl = item.querySelector('.do-entry-item-val, .value, .attr-value');
      if (keyEl && valEl) {
          const k = keyEl.innerText.trim();
          const v = valEl.innerText.trim();
          if (k && v && k.length < 100 && !k.includes('{') && !k.includes('<')) {
              specs[k] = v;
          }
      }
  });

  // If still empty, look for specific keywords in text
  if (Object.keys(specs).length === 0) {
      const allText = document.body.innerText;
      const specMatch = allText.match(/(?:重要属性|Specifications|Attributes)([\s\S]{1,2000}?)供应商的产品说明/);
      if (specMatch) {
          result.rawSpecs = specMatch[1].trim();
      }
  }
  result.specs = specs;

  // 4. Supplier
  result.supplier = document.querySelector('.company-name, .supplier-name, .shop-info .name, .company-head .name')?.innerText?.trim();

  // 5. Description Iframe
  const descIframe = document.querySelector('iframe[src*="descIframe.html"]');
  result.descriptionIframeSrc = descIframe?.src;
  
  // 6. Certificates
  result.certificates = document.querySelector('.certificate-list, .cert-info, .qualification-list, [class*="cert"]')?.innerText?.trim() || "See specs/images";

  return result;
})()