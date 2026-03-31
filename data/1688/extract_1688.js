
(async () => {
    const items = Array.from(document.querySelectorAll('.sm-offer-item, .offer-item, .pc-offer-item, [class*="offer-item"]'));
    const results = [];
    
    // Fallback: if class-based selection fails, try to find by structure
    const targetItems = items.length > 0 ? items : Array.from(document.querySelectorAll('a[href*="detail.m.1688.com"], a[href*="detail.1688.com"], a[href*="dj.1688.com"]')).filter(a => a.innerText.includes('¥')).slice(0, 15);

    for (let i = 0; i < Math.min(targetItems.length, 20); i++) {
        const el = targetItems[i];
        try {
            // Find title - usually a long text or in a specific title class
            // In 1688, titles are often in .title or just the main text of the card
            let title = "";
            let price = "";
            let bookedCount = "";
            let productUrl = "";
            let imageUrl = "";

            if (el.tagName === 'A') {
                productUrl = el.href;
                const text = el.innerText;
                // Simple regex or split for 1688 search result text structure
                // Structure often: Title ¥ Price ... 已售 Count
                const titleMatch = text.match(/^(.*?)(?= ¥)/s);
                title = titleMatch ? titleMatch[1].trim() : text.substring(0, 50).trim();
                
                const priceMatch = text.match(/¥\s*([\d\.]+)/);
                price = priceMatch ? priceMatch[1] : "";
                
                const bookedMatch = text.match(/已售\s*([\d\+]+)件/);
                bookedCount = bookedMatch ? bookedMatch[1] : "";
                
                const img = el.querySelector('img');
                imageUrl = img ? img.src : "";
            } else {
                // Class based search
                const titleEl = el.querySelector('.title, .offer-title, [class*="title"]');
                title = titleEl ? titleEl.innerText.trim() : "";
                
                const priceEl = el.querySelector('.price, .offer-price, [class*="price"]');
                price = priceEl ? priceEl.innerText.replace('¥', '').trim() : "";
                
                const bookedEl = el.querySelector('.booked, .offer-booked, [class*="booked"], [class*="sold"]');
                bookedCount = bookedEl ? bookedEl.innerText.replace('已售', '').replace('件', '').trim() : "";
                
                const linkEl = el.querySelector('a');
                productUrl = linkEl ? linkEl.href : "";
                
                const imgEl = el.querySelector('img');
                imageUrl = imgEl ? imgEl.src : "";
            }

            if (title && price && results.length < 10) {
                results.push({
                    title,
                    price,
                    booked_count: bookedCount,
                    image_url: imageUrl,
                    product_url: productUrl
                });
            }
        } catch (e) {}
    }
    return results;
})();
