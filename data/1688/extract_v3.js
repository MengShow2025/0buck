(async () => {
  const products = [];
  const items = Array.from(document.querySelectorAll('a')).filter(a => a.innerText.includes('¥'));
  const seen = new Set();
  
  for (const a of items) {
    if (products.length >= 10) break;
    const url = a.href;
    if (seen.has(url)) continue;
    seen.add(url);
    
    const text = a.innerText;
    // The first line is usually the title in the snapshot.
    const title = text.split('\n')[0].trim();
    
    // Price
    const priceMatch = text.match(/¥\n*([\d.]+)/);
    const price = priceMatch ? priceMatch[1] : '';
    
    // Booked count
    const bookedMatch = text.match(/([\d.]+万?\+?)\n*件/);
    const booked_count = bookedMatch ? bookedMatch[1] : '';
    
    // Image
    const img = a.querySelector('img');
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
