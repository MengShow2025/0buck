(async () => {
  const products = [];
  // 1688 search result items usually have a specific structure.
  // We'll look for the elements that contain product info.
  // Based on the snapshot, it seems elements with href containing 'detail.1688.com' or being a product link.
  
  const items = document.querySelectorAll('a[href*="detail.m.1688.com"], a[href*="dj.1688.com/ci_bb"]');
  const seenUrls = new Set();
  
  for (const item of items) {
    if (products.length >= 10) break;
    
    const url = item.href;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    
    // Extract title, price, booked_count, image_url
    // Title is usually in the text or an alt attribute of an image inside
    const title = item.innerText.split('\n')[0].trim();
    
    // Price usually has ¥ symbol
    const priceMatch = item.innerText.match(/¥\s*([\d.]+)/);
    const price = priceMatch ? priceMatch[1] : '';
    
    // Booked count usually has "件" or "成交"
    const bookedMatch = item.innerText.match(/(\d+(\.\d+)?[万+]?)\s*件/);
    const booked_count = bookedMatch ? bookedMatch[1] : '';
    
    // Image URL
    const img = item.querySelector('img');
    const image_url = img ? img.src : '';
    
    if (title && price) {
      products.push({
        title,
        price,
        booked_count,
        image_url,
        product_url: url
      });
    }
  }
  
  return { __result: products };
})()
