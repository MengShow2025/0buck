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
    // Attributes - finding the section after "商品属性"
    const attrHeader = Array.from(document.querySelectorAll('h1')).find(h => h.innerText.includes('商品属性'));
    if (attrHeader) {
        let parent = attrHeader.parentElement;
        while (parent && !parent.querySelector('table, .offer-attr-list, .offer-attr-table')) {
            parent = parent.nextElementSibling || parent.parentElement;
        }
        const attrTable = parent ? parent.querySelector('table, .offer-attr-list, .offer-attr-table') : null;
        if (attrTable) {
            data.attributes = Array.from(attrTable.querySelectorAll('tr, .row, .offer-attr-item')).map(el => el.innerText.replace(/\s+/g, ' ').trim());
        }
    }

    // Reviews
    data.reviews = {
        summary: (bodyText.match(/好评率\s*\d+\.?\d*%\s*\(\s*\d+\+?条评价\s*\)/) || [])[0],
        count: (bodyText.match(/(\d+\+?条评价)/) || [])[1],
        positiveRate: (bodyText.match(/好评率\s*(\d+\.?\d*%)/) || [])[1]
    };

    // Sample reviews
    data.sampleReviews = Array.from(document.querySelectorAll('.comment-item, .comment-content')).slice(0, 3).map(el => el.innerText.trim());

    // Certificates
    const certHeader = Array.from(document.querySelectorAll('h1')).find(h => h.innerText.includes('商品资质证书'));
    if (certHeader) {
        let sibling = certHeader.nextElementSibling;
        while (sibling && !sibling.querySelector('table')) sibling = sibling.nextElementSibling;
        const certTable = sibling ? sibling.querySelector('table') : null;
        if (certTable) {
            data.certificates = Array.from(certTable.querySelectorAll('tr')).map(tr => tr.innerText.trim());
        }
    }

    // Packaging Info
    const packHeader = Array.from(document.querySelectorAll('h1')).find(h => h.innerText.includes('包装信息'));
    if (packHeader) {
        let sibling = packHeader.nextElementSibling;
        while (sibling && !sibling.querySelector('table')) sibling = sibling.nextElementSibling;
        const packTable = sibling ? sibling.querySelector('table') : null;
        if (packTable) {
            data.packagingInfo = Array.from(packTable.querySelectorAll('tr')).map(tr => tr.innerText.trim());
        }
    }

    // Recommended Products
    data.recommendedProducts = Array.from(document.querySelectorAll('.od-pc-offer-recommend-item, .recommend-item, .hot-recommend-item')).slice(0, 5).map(item => ({
        text: item.innerText.trim(),
        link: item.querySelector('a')?.href
    }));

    // 4. Logistics
    data.logistics = {
        origin: (bodyText.match(/发货地\s*([^\s\n]+)/) || [])[1] || (bodyText.match(/(广东深圳|广东广州|浙江义乌|浙江杭州)/) || [])[0],
        deliveryTime: (bodyText.match(/预计([^\s\n]+)达/) || [])[1],
        shippingCost: (bodyText.match(/运费\s*¥?(\d+)/) || [])[1]
    };

    // 5. Media
    // Gallery
    data.galleryImages = Array.from(document.querySelectorAll('.od-pc-offer-main-image img, .offer-gallery img, .main-img-item img')).map(img => img.src).filter(s => s && !s.includes('spacer.gif')).slice(0, 5);
    
    // Video
    const video = document.querySelector('video');
    data.videoUrl = video ? video.src : (document.querySelector('.lib-video-player-video')?.src || null);

    // Detail Images
    const detailHeader = Array.from(document.querySelectorAll('h1')).find(h => h.innerText.includes('商品详情'));
    if (detailHeader) {
        let container = detailHeader.parentElement;
        data.detailImages = Array.from(container.querySelectorAll('img')).map(img => img.src || img.dataset.lazyload).filter(s => s && !s.includes('spacer.gif')).slice(0, 10);
    }

    // 6. Pricing/Sales
    data.pricing = {
        tiers: Array.from(document.querySelectorAll('.od-pc-offer-price-tier, .price-item')).map(el => el.innerText.trim()),
        moq: (bodyText.match(/(\d+)个起批/) || [])[1],
        salesVolume: (bodyText.match(/已售(\d+\+?个)/) || [])[1]
    };

    return data;
})()