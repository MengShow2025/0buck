
(async () => {
    const products = [];
    // 1688 search result items often use these attributes or structures
    // Let's find all links that look like offer links
    const links = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('offerId=') || a.href.includes('detail.1688.com/offer/'));
    
    const seenOffers = new Set();
    const uniqueLinks = [];
    
    for (const link of links) {
        let offerId = '';
        if (link.href.includes('offerId=')) {
            const match = link.href.match(/offerId=(\d+)/);
            offerId = match ? match[1] : '';
        } else {
            const match = link.href.match(/\/offer\/(\d+)\.html/);
            offerId = match ? match[1] : '';
        }
        
        if (offerId && !seenOffers.has(offerId)) {
            seenOffers.add(offerId);
            uniqueLinks.push(link);
        }
    }

    // Sort links by their vertical position to get the top products
    uniqueLinks.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    for (const link of uniqueLinks.slice(0, 10)) {
        const text = link.innerText || '';
        if (!text.includes('¥')) continue; // Skip if no price in text (might be just image link)

        const productUrl = link.href;
        const img = link.querySelector('img') || link.parentElement.querySelector('img');
        const imageUrl = img ? img.src : '';
        
        // Parsing the text: "Title ¥ Price Count ..."
        // Example: "Aigo/爱国者Q710 ... ¥ 7 .4 红包价 8600+件 ..."
        const priceMatch = text.match(/¥\s*([\d.]+)/);
        const price = priceMatch ? priceMatch[1].trim() : '';
        
        const bookedMatch = text.match(/([\d.+万]+)件/);
        const bookedCount = bookedMatch ? bookedMatch[1] : '';
        
        // Title cleaning
        let title = text.split('¥')[0].trim();
        // Remove common badges at the start or end
        title = title.replace(/^(最高返\d+元红包|首单减\d+元|新人价|｜|商机组货：)+/g, '').trim();
        title = title.replace(/\s*｜\s*.*$/, '').trim();

        products.push({
            title,
            price,
            booked_count: bookedCount + '件',
            image_url: imageUrl,
            product_url: productUrl
        });
    }

    return products;
})();
