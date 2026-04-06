(() => {
    const data = {};

    const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim());
    data.title = h1s[1] || h1s[0];

    // 2. Supplier Info
    const bodyText = document.body.innerText;
    data.supplier = {
        name: h1s[0],
        rating: (bodyText.match(/店铺服务分\s*(\d+\.\d+分)/) || [])[1],
        coreBusiness: (bodyText.match(/主营：(.*)/) || [])[1]?.split('\n')[0].trim(),
        returnRate: (bodyText.match(/店铺回头率\s*(\d+%)/) || [])[1],
        onTimeDeliveryRate: (bodyText.match(/准时发货率\s*(\d+%)/) || [])[1],
        positiveRate: (bodyText.match(/店铺好评率\s*(\d+\.?\d*%)/) || [])[1],
    };

    // 3. Product Details
    // Attributes
    const attrRows = Array.from(document.querySelectorAll('.offer-attr-item, .offer-attr-list .row, tr')).filter(el => el.innerText.includes(' '));
    data.attributes = attrRows.map(el => el.innerText.replace(/\s+/g, ' ').trim()).filter(t => t.length > 5);

    // Reviews
    data.reviews = {
        summary: (bodyText.match(/好评率\s*\d+\.?\d*%\s*\(\s*\d+\+?条评价\s*\)/) || [])[0],
        count: (bodyText.match(/(\d+\+?条评价)/) || [])[1],
        positiveRate: (bodyText.match(/好评率\s*(\d+\.?\d*%)/) || [])[1]
    };
    data.sampleReviews = Array.from(document.querySelectorAll('.comment-item, .comment-content, .comment-detail')).slice(0, 5).map(el => el.innerText.trim());

    // Certificates & Packaging - just get all tables
    data.tables = Array.from(document.querySelectorAll('table')).map(table => {
        return Array.from(table.querySelectorAll('tr')).map(tr => tr.innerText.replace(/\t/g, ' ').trim());
    });

    // Recommended Products
    data.recommendedProducts = Array.from(document.querySelectorAll('a')).filter(a => a.innerText.includes('已售') && a.href.includes('offer')).map(a => ({
        text: a.innerText.trim(),
        link: a.href
    })).slice(0, 10);

    // 4. Logistics
    data.logistics = {
        origin: (bodyText.match(/发货地\s*([^\s\n]+)/) || [])[1] || (bodyText.match(/(广东深圳|广东广州|浙江义乌|浙江杭州)/) || [])[0],
        deliveryTime: (bodyText.match(/预计([^\s\n]+)达/) || [])[1],
        shippingCost: (bodyText.match(/运费\s*¥?(\d+)/) || [])[1]
    };

    // 5. Media
    // Gallery - images with preview-img class
    data.galleryImages = Array.from(document.querySelectorAll('.preview-img, .detail-gallery-img, .main-img')).map(img => img.src).filter(s => s && s.includes('cbu01.alicdn.com')).slice(0, 5);
    
    // Video
    const video = document.querySelector('video');
    data.videoUrl = video ? video.src : (document.querySelector('.lib-video-player-video')?.src || null);

    // Detail Images - usually in a specific container or just large images at the bottom
    const detailContainer = document.querySelector('.od-pc-offer-description, #desc-lazyload-container, .offer-description');
    if (detailContainer) {
        data.detailImages = Array.from(detailContainer.querySelectorAll('img')).map(img => img.src || img.dataset.lazyload || img.dataset.src).filter(s => s && !s.includes('spacer.gif')).slice(0, 20);
    } else {
        // Fallback: get images that are likely detail images (large, in the middle/bottom)
        data.detailImages = Array.from(document.querySelectorAll('img')).filter(img => img.width > 500 || (img.src && img.src.includes('img/ibank'))).map(img => img.src).slice(0, 20);
    }

    // 6. Pricing/Sales
    // Pricing is tricky because of the formatting. Let's look for elements with ¥
    const priceElements = Array.from(document.querySelectorAll('.price-now, .price-item, .price-tier-item'));
    data.pricing = {
        tiers: priceElements.map(el => el.innerText.replace(/\n/g, ' ').trim()).filter(t => t.includes('¥')),
        moq: (bodyText.match(/(\d+)个起批/) || [])[1],
        salesVolume: (bodyText.match(/已售(\d+\+?个)/) || [])[1],
        rawPriceText: (bodyText.match(/¥\s*\d+\s*\.\d+/g) || [])
    };

    return data;
})()