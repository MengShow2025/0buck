(async () => {
  const result = {
    gallery: [],
    video: '',
    detail_images: [],
    certs: []
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const cleanUrl = (src) => {
    if (!src) return '';
    let url = src.split('?')[0]; 
    url = url.replace(/_\d+x\d+.*$/, ''); 
    if (url.startsWith('//')) url = 'https:' + url;
    return url;
  };

  const extractFromDoc = (doc, isMain = false) => {
    if (isMain) {
        const allImgs = Array.from(doc.querySelectorAll('img'));
        const galleryCandidates = allImgs.filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.top < 1500 && rect.width > 200 && rect.height > 200;
        });
        galleryCandidates.forEach(img => {
            const src = cleanUrl(img.src || img.getAttribute('data-src') || img.getAttribute('lazyload-src'));
            if (src && !result.gallery.includes(src) && !src.includes('placeholder')) {
                result.gallery.push(src);
            }
        });
        if (result.gallery.length === 0) {
            doc.querySelectorAll('.main-image-thumb-item img, .slider-item img, .image-item img, .bc-main-image img').forEach(img => {
                const src = cleanUrl(img.src || img.getAttribute('data-src'));
                if (src && !result.gallery.includes(src)) result.gallery.push(src);
            });
        }
    }
    if (isMain && !result.video) {
        const videoElem = doc.querySelector('video');
        if (videoElem && videoElem.src) {
            result.video = videoElem.src.startsWith('//') ? 'https:' + videoElem.src : videoElem.src;
        } else {
            const videoData = doc.querySelector('[data-video-url]');
            if (videoData) result.video = videoData.getAttribute('data-video-url');
            else {
                const scripts = Array.from(doc.querySelectorAll('script'));
                const videoMatch = scripts.find(s => s.innerText.includes('.mp4'));
                if (videoMatch) {
                    const match = videoMatch.innerText.match(/https:[^"]+\.mp4/);
                    if (match) result.video = match[0];
                }
            }
        }
    }
    const descSelectors = ['.detail-description', '#product_description', '.rich-text-description', '.desc-richetxt', '.module-pdp-description', '.icbu-pdp-desc'];
    descSelectors.forEach(sel => {
        doc.querySelectorAll(sel + ' img').forEach(img => {
            if (result.detail_images.length >= 10) return;
            const src = cleanUrl(img.src || img.getAttribute('data-src') || img.getAttribute('lazyload-src'));
            if (src && !result.detail_images.includes(src) && !src.includes('placeholder')) {
                result.detail_images.push(src);
            }
        });
    });
    if (result.detail_images.length < 5) {
         doc.querySelectorAll('img').forEach(img => {
            if (result.detail_images.length >= 10) return;
            const rect = img.getBoundingClientRect();
            if (rect.width > 400 && rect.top > 1000) {
                const src = cleanUrl(img.src || img.getAttribute('data-src'));
                if (src && !result.detail_images.includes(src) && !result.gallery.includes(src)) {
                    result.detail_images.push(src);
                }
            }
         });
    }
    const certKeywords = ['certificate', 'certification', 'test report', 'iso9001', 'ce', 'rohs', 'fcc'];
    doc.querySelectorAll('img').forEach(img => {
        const alt = (img.alt || '').toLowerCase();
        const src = (img.src || '').toLowerCase();
        const rect = img.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 100) return;
        if (certKeywords.some(kw => alt.includes(kw) || src.includes(kw))) {
            const fullSrc = cleanUrl(img.src || img.getAttribute('data-src'));
            if (fullSrc && !result.certs.includes(fullSrc)) result.certs.push(fullSrc);
        }
    });
  };

  try {
    // 1. Scroll down to trigger lazy load
    window.scrollTo(0, document.body.scrollHeight / 2);
    await sleep(500);
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(500);

    // 2. Click Description tab
    const descTab = document.querySelector('[data-id="description"], .tab-item[data-id="description"]');
    if (descTab) {
        descTab.click();
        await sleep(1000);
    }

    // 3. Extract
    extractFromDoc(document, true);
    document.querySelectorAll('iframe').forEach(iframe => {
        try {
            const idoc = iframe.contentDocument || iframe.contentWindow.document;
            if (idoc) extractFromDoc(idoc, false);
        } catch (e) {}
    });

  } catch (e) {
    console.error(e);
  }

  return { __result: result };
})();
