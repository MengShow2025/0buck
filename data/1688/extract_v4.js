(async () => {
  const products = [];
  const items = Array.from(document.querySelectorAll('a')).filter(a => a.innerText.includes('¥'));
  const logs = [];
  
  for (const a of items) {
    if (products.length >= 10) break;
    const text = a.innerText;
    const url = a.href;
    
    // Title is the first non-empty line
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const title = lines[0];
    
    // Search for the price (the line after ¥ or including ¥)
    let price = '';
    const priceIndex = lines.findIndex(l => l === '¥');
    if (priceIndex !== -1 && lines[priceIndex+1]) {
      price = lines[priceIndex+1];
    } else {
      const pMatch = text.match(/¥\s*([\d.]+)/);
      if (pMatch) price = pMatch[1];
    }
    
    // Search for booked_count
    let booked_count = '';
    const bookedLine = lines.find(l => l.includes('件'));
    if (bookedLine) {
      const bMatch = bookedLine.match(/([\d.]+万?\+?)/);
      if (bMatch) booked_count = bMatch[1];
    }
    
    // Image URL
    // Often there is an image in the same item but maybe not inside this specific <a>
    // Let's look for an image in the parent or nearby
    let image_url = '';
    const img = a.querySelector('img');
    if (img) image_url = img.src;
    else {
      // Look for previous siblings or nearby elements
      const parent = a.closest('div');
      const nearbyImg = parent ? parent.querySelector('img') : null;
      if (nearbyImg) image_url = nearbyImg.src;
    }
    
    if (title && price && !products.some(p => p.product_url === url)) {
      products.push({
        title,
        price,
        booked_count,
        image_url,
        product_url: url
      });
    }
  }
  return { __debug: logs, __result: products };
})()
