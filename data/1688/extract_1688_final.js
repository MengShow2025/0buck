
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
                // Price: handle spaces like "¥ 0 .9"
                const priceMatch = text.match(/¥\s*([\d\s.]+)/);
                let price = priceMatch ? priceMatch[1].replace(/\s+/g, '').trim() : '';
                // Ensure it ends at the first non-numeric/dot char if any
                price = price.match(/^[\d.]+/)?.[0] || price;
                
                const bookedMatch = text.match(/([\d.+万]+)件/);
                const bookedCount = bookedMatch ? bookedMatch[1] : '';
                
                // Title cleaning: split by ¥ and remove common prefix/suffix
                let title = text.split('¥')[0].trim();
                title = title.replace(/^(最高返\d+元红包|首单减\d+元|新人价|｜|商机组货：|品类店铺|TOP\d+)+/g, '').trim();
                title = title.split('\n')[0].trim(); // Take first line
                title = title.replace(/\s*｜\s*.*$/, '').trim();
                
                // Image
                let img = link.querySelector('img');
                if (!img) {
                    const parent = link.closest('.offer-item') || link.parentElement;
                    if (parent) img = parent.querySelector('img');
                }
                const imageUrl = img ? (img.src || img.getAttribute('data-lazy-src') || '') : '';
                
                results.push({
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
