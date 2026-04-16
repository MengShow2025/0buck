async function extract() {
    function getGallery() {
        // Main images are usually in the top slider
        const slider = document.querySelector('.main-image-thumb-container, .detail-image-thumb-container, .image-list, .pdp-image-gallery');
        let imgs = [];
        if (slider) {
            imgs = Array.from(slider.querySelectorAll('img')).map(img => img.src.split('_')[0]);
        }
        if (imgs.length === 0) {
            imgs = Array.from(document.querySelectorAll('.main-img, .detail-image-item img')).map(img => img.src.split('_')[0]);
        }
        return [...new Set(imgs.filter(s => s.startsWith('http')))];
    }

    function getVideo() {
        const video = document.querySelector('video source, video');
        return video ? (video.src || video.getAttribute('src')) : null;
    }

    function getDetail() {
        const containers = Array.from(document.querySelectorAll('div')).filter(div => {
            const text = div.innerText.toLowerCase();
            return text.includes('product description') || text.includes('供应商的产品说明');
        });
        let imgs = [];
        containers.forEach(c => {
            imgs = imgs.concat(Array.from(c.querySelectorAll('img')).map(img => img.src || img.getAttribute('data-src')));
        });
        return [...new Set(imgs.filter(s => s && s.startsWith('http') && !s.includes('icon') && !s.includes('logo')))];
    }

    function getSpecs() {
        const specs = {};
        const items = document.querySelectorAll('.attribute-item, .do-entry-item, .specification-item, tr');
        items.forEach(item => {
            const k = item.querySelector('.attribute-name, .do-entry-item-val, td:first-child')?.innerText?.trim();
            const v = item.querySelector('.attribute-value, .do-entry-item-val, td:last-child')?.innerText?.trim();
            if (k && v && k !== v) specs[k] = v;
        });
        return specs;
    }

    function getSupplier() {
        const link = document.querySelector('.company-name a, .supplier-name a, .shop-link, a[href*="company_profile"]');
        return {
            name: link?.innerText?.trim(),
            url: link?.href
        };
    }

    function getCerts() {
        return Array.from(document.querySelectorAll('.certificate-item, .cert-item, a[href*="certificate"]')).map(el => el.innerText.trim() || el.href).filter(Boolean);
    }

    // Scroll
    window.scrollTo(0, 1000);
    await new Promise(r => setTimeout(r, 500));
    window.scrollTo(0, 3000);
    await new Promise(r => setTimeout(r, 500));
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 1000));

    return {
        gallery: getGallery(),
        video: getVideo(),
        detail: getDetail(),
        specs: getSpecs(),
        certificates: getCerts(),
        supplier: getSupplier()
    };
}
return await extract();
