
(async () => {
    const products = [];
    const allLinks = Array.from(document.getElementsByTagName('a'));
    const debug = [];
    
    debug.push(`Total links: ${allLinks.length}`);
    
    // Filter links that look like product details
    const productLinks = allLinks.filter(a => {
        const href = a.href || '';
        return href.includes('offerId=') || href.includes('detail.1688.com/offer/');
    });
    
    debug.push(`Product links found: ${productLinks.length}`);
    
    const seenOfferIds = new Set();
    const uniqueProductLinks = [];
    
    for (const link of productLinks) {
        const href = link.href;
        let offerId = '';
        const match = href.match(/offerId=(\d+)/) || href.match(/\/offer\/(\d+)\.html/);
        if (match) offerId = match[1];
        
        if (offerId && !seenOfferIds.has(offerId)) {
            const text = link.innerText || '';
            // Only count if it has a price or looks like a title
            if (text.includes('¥') || text.length > 20) {
                seenOfferIds.add(offerId);
                uniqueProductLinks.push(link);
            }
        }
    }
    
    debug.push(`Unique product links with content: ${uniqueProductLinks.length}`);
    
    for (let i = 0; i < Math.min(uniqueProductLinks.length, 10); i++) {
        const link = uniqueProductLinks[i];
        const text = link.innerText || '';
        const productUrl = link.href;
        
        // Find image: inside the link or in a sibling/parent
        let img = link.querySelector('img');
        if (!img) {
            // Check parent's children
            const parent = link.closest('.offer-item') || link.parentElement;
            if (parent) img = parent.querySelector('img');
        }
        const imageUrl = img ? (img.src || img.getAttribute('data-lazy-src') || '') : '';
        
        // Parsing text
        const priceMatch = text.match(/¥\s*([\d.]+)/);
        const price = priceMatch ? priceMatch[1] : '';
        
        const bookedMatch = text.match(/([\d.+万]+)件/);
        const bookedCount = bookedMatch ? bookedMatch[0] : '';
        
        // Title: usually the first part
        let title = text.split('¥')[0].trim();
        // Clean title
        title = title.replace(/^(最高返\d+元红包|首单减\d+元|新人价|｜|商机组货：)+/g, '').trim();
        title = title.replace(/\s*｜\s*.*$/, '').trim();
        
        products.push({
            title,
            price,
            booked_count: bookedCount,
            image_url: imageUrl,
            product_url: productUrl
        });
    }

    return { __debug: debug, __result: products };
})();
