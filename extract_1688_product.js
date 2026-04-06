(async () => {
    const data = {};

    // 1. Product Title
    const titleEl = document.querySelector('.od-pc-offer-title h1, .offer-title, h1');
    data.title = titleEl ? titleEl.innerText.trim() : null;

    // 2. Supplier Info
    const supplierEl = document.querySelector('.od-pc-offer-company-info, .company-info, .shop-info');
    if (supplierEl) {
        data.supplier = {
            name: (document.querySelector('.company-name') || supplierEl.querySelector('h1, a')).innerText.trim(),
            rating: (document.querySelector('.shop-score-info') || supplierEl).innerText.match(/(\d+\.\d+)分/) ? supplierEl.innerText.match(/(\d+\.\d+)分/)[0] : null,
            coreBusiness: (supplierEl.innerText.match(/主营：(.*)/) || [])[1],
            returnRate: (supplierEl.innerText.match(/回头率\s*(\d+%)/) || [])[1],
            serviceScore: (supplierEl.innerText.match(/店铺服务分\s*(\d+\.\d+分)/) || [])[1],
            onTimeDeliveryRate: (supplierEl.innerText.match(/准时发货率\s*(\d+%)/) || [])[1],
            positiveRate: (supplierEl.innerText.match(/店铺好评率\s*(\d+\.?\d*%)/) || [])[1],
        };
    } else {
        // Fallback for supplier info
        const headerInfo = document.querySelector('.header-container-pc');
        if (headerInfo) {
            data.supplier = {
                name: headerInfo.querySelector('.company-name')?.innerText.trim(),
                returnRate: headerInfo.innerText.match(/回头率\s*(\d+%)/)?.[1],
                serviceScore: headerInfo.innerText.match(/服务分\s*(\d+\.\d+分)/)?.[1],
                onTimeDeliveryRate: headerInfo.innerText.match(/发货率\s*(\d+%)/)?.[1],
                positiveRate: headerInfo.innerText.match(/好评率\s*(\d+\.?\d*%)/)?.[1],
            };
        }
    }

    // 3. Product Details
    // Attributes
    const attrRows = document.querySelectorAll('.offer-attr-item, .offer-attr-list .row, tr');
    data.attributes = Array.from(attrRows).map(row => row.innerText.trim()).filter(t => t.includes(' '));

    // Reviews
    const reviewSummary = document.querySelector('.od-pc-offer-comment-summary, .comment-summary');
    data.reviews = {
        summary: reviewSummary ? reviewSummary.innerText.trim() : null,
        count: (document.body.innerText.match(/\d+条评价/) || [])[0],
        positiveRate: (document.body.innerText.match(/好评率\s*(\d+\.?\d*%)/) || [])[1]
    };
    const sampleReviews = document.querySelectorAll('.comment-item');
    data.sampleReviews = Array.from(sampleReviews).slice(0, 5).map(item => item.innerText.trim());

    // Certificates
    const certTable = document.querySelector('.od-pc-offer-certificate-table, .certificate-table');
    data.certificates = certTable ? Array.from(certTable.querySelectorAll('tr')).map(tr => tr.innerText.trim()) : [];

    // Packaging Info
    const packTable = document.querySelector('.od-pc-offer-package-table, .package-table');
    data.packagingInfo = packTable ? Array.from(packTable.querySelectorAll('tr')).map(tr => tr.innerText.trim()) : [];

    // Recommended Products
    const recommendList = document.querySelectorAll('.od-pc-offer-recommend-item, .recommend-item, .hot-recommend-item');
    data.recommendedProducts = Array.from(recommendList).map(item => ({
        title: item.innerText.trim(),
        link: item.querySelector('a')?.href
    }));

    // 4. Logistics
    const logisticsEl = document.querySelector('.od-pc-offer-logistics, .logistics-info');
    if (logisticsEl) {
        data.logistics = {
            origin: (logisticsEl.innerText.match(/发货地：?([^\s]+)/) || [])[1],
            deliveryTime: (logisticsEl.innerText.match(/预计([^\s]+)达/) || [])[1],
            shippingCost: (logisticsEl.innerText.match(/运费\s*¥?(\d+)/) || [])[1]
        };
    } else {
        // Look in body text
        const bodyText = document.body.innerText;
        data.logistics = {
            origin: (bodyText.match(/(广东深圳|广东广州|浙江义乌|浙江杭州)/) || [])[0],
            deliveryTime: (bodyText.match(/预计(后天|明天)达/) || [])[0],
            shippingCost: (bodyText.match(/运费\s*¥?(\d+)/) || [])[1]
        };
    }

    // 5. Media
    // Gallery Images
    const galleryImages = document.querySelectorAll('.od-pc-offer-main-image img, .offer-gallery img, .main-img-item img');
    data.galleryImages = Array.from(galleryImages).map(img => img.src || img.dataset.lazyload || img.dataset.src).filter(s => s);

    // Video
    const videoEl = document.querySelector('video, .lib-video-player-video, .main-video');
    data.videoUrl = videoEl ? videoEl.src : null;

    // Detail Images (Lazy-loaded)
    const detailImages = document.querySelectorAll('.od-pc-offer-description img, .desc-img, .detail-desc img');
    data.detailImages = Array.from(detailImages).map(img => img.src || img.dataset.lazyload || img.dataset.src).filter(s => s);

    // 6. Pricing/Sales
    const priceTiers = document.querySelectorAll('.od-pc-offer-price-tier, .price-tier, .price-item');
    data.pricing = {
        tiers: Array.from(priceTiers).map(tier => tier.innerText.trim()),
        moq: (document.body.innerText.match(/(\d+)个起批/) || [])[0],
        salesVolume: (document.body.innerText.match(/已售(\d+\+?)个/) || [])[0]
    };

    return data;
})()