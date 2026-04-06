(async () => {
    const data = {};

    // 1. Product Title
    data.title = document.querySelector('h1')?.innerText.trim();

    // 2. Supplier Info
    const supplierText = document.querySelector('.od-pc-offer-company-info')?.innerText || document.body.innerText;
    data.supplier = {
        name: document.querySelector('.company-name')?.innerText.trim() || document.querySelector('.od-pc-offer-company-info h1')?.innerText.trim(),
        rating: supplierText.match(/店铺服务分\s*(\d+\.\d+分)/)?.[1],
        coreBusiness: supplierText.match(/主营：(.*)/)?.[1]?.split('\n')[0].trim(),
        returnRate: supplierText.match(/回头率\s*(\d+%)/)?.[1],
        onTimeDeliveryRate: supplierText.match(/准时发货率\s*(\d+%)/)?.[1],
        positiveRate: supplierText.match(/店铺好评率\s*(\d+\.?\d*%)/)?.[1],
    };

    // 3. Product Details
    // Attributes - finding the table
    const attrTables = Array.from(document.querySelectorAll('table, .offer-attr-list, .offer-attr-table'));
    const attrTable = attrTables.find(t => t.innerText.includes('产地') || t.innerText.includes('品牌'));
    if (attrTable) {
        data.attributes = Array.from(attrTable.querySelectorAll('tr, .row, .offer-attr-item')).map(el => el.innerText.replace(/\s+/g, ' ').trim());
    }

    // Reviews
    data.reviews = {
        summary: document.querySelector('.od-pc-offer-comment-summary')?.innerText.trim(),
        count: document.body.innerText.match(/(\d+\+?条评价)/)?.[1],
        positiveRate: document.body.innerText.match(/好评率\s*(\d+\.?\d*%)/)?.[1]
    };

    // Recommended Products
    data.recommendedProducts = Array.from(document.querySelectorAll('.od-pc-offer-recommend-item, .recommend-item, .hot-recommend-item')).map(item => ({
        text: item.innerText.trim(),
        link: item.querySelector('a')?.href
    }));

    // 4. Logistics
    data.logistics = {
        origin: document.body.innerText.match(/发货地\s*([^\s\n]+)/)?.[1] || document.body.innerText.match(/(广东深圳|广东广州|浙江义乌|浙江杭州)/)?.[0],
        deliveryTime: document.body.innerText.match(/预计([^\s\n]+)达/)?.[1],
        shippingCost: document.body.innerText.match(/运费\s*¥?(\d+)/)?.[1]
    };

    // 5. Media
    // Gallery
    data.galleryImages = Array.from(document.querySelectorAll('.od-pc-offer-main-image img, .offer-gallery img, .main-img-item img')).map(img => img.src).filter(s => s && !s.includes('spacer.gif'));
    
    // Video
    data.videoUrl = document.querySelector('video')?.src;

    // Detail Images - usually in a specific div
    const detailContainer = document.querySelector('.od-pc-offer-description, #desc-lazyload-container');
    if (detailContainer) {
        data.detailImages = Array.from(detailContainer.querySelectorAll('img')).map(img => img.src || img.dataset.lazyload).filter(s => s && !s.includes('spacer.gif'));
    }

    // 6. Pricing/Sales
    data.pricing = {
        tiers: Array.from(document.querySelectorAll('.od-pc-offer-price-tier, .price-item')).map(el => el.innerText.trim()),
        moq: document.body.innerText.match(/(\d+)个起批/)?.[1],
        salesVolume: document.body.innerText.match(/已售(\d+\+?个)/)?.[1]
    };

    return data;
})()