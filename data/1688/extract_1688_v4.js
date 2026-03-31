
(() => {
    const products = [];
    const allLinks = Array.from(document.querySelectorAll('a'));
    const results = [];
    
    for (const link of allLinks) {
        const href = link.href || '';
        const text = link.innerText || '';
        
        // Match product links
        if (href.includes('offerId=') && text.includes('¥')) {
            const offerIdMatch = href.match(/offerId=(\d+)/);
            const offerId = offerIdMatch ? offerIdMatch[1] : '';
            
            if (offerId && !results.find(p => p.offerId === offerId)) {
                // Price and booked count
                const priceMatch = text.match(/¥\s*([\d.]+)/);
                const price = priceMatch ? priceMatch[1] : '';
                
                const bookedMatch = text.match(/([\d.+万]+)件/);
                const bookedCount = bookedMatch ? bookedMatch[1] : '';
                
                // Title cleaning
                let title = text.split('¥')[0].trim();
                title = title.replace(/^(最高返\d+元红包|首单减\d+元|新人价|｜|商机组货：)+/g, '').trim();
                title = title.replace(/\s*｜\s*.*$/, '').trim();
                
                // Image
                let img = link.querySelector('img');
                if (!img) {
                    const parent = link.closest('.offer-item') || link.parentElement;
                    if (parent) img = parent.querySelector('img');
                }
                const imageUrl = img ? (img.src || img.getAttribute('data-lazy-src') || '') : '';
                
                results.push({
                    offerId,
                    title,
                    price,
                    booked_count: bookedCount + '件',
                    image_url: imageUrl,
                    product_url: href
                });
            }
        }
        if (results.length >= 10) break;
    }
    
    return results;
})();
