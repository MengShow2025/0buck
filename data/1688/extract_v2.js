(async () => {
  const items = Array.from(document.querySelectorAll('a')).filter(a => a.innerText.includes('¥'));
  const products = [];
  const seen = new Set();
  
  for (const a of items) {
    if (products.length >= 10) break;
    const url = a.href;
    if (seen.has(url)) continue;
    seen.add(url);
    
    const text = a.innerText;
    const title = text.split('\n')[0].trim();
    const priceMatch = text.match(/¥\s*([\d.]+)/);
    const bookedMatch = text.match(/([\d.]+万?\+?)\s*件/);
    const img = a.querySelector('img');
    const image_url = img ? img.src : '';
    
    if (title && priceMatch) {
      products.push({
        title,
        price: priceMatch[1],
        booked_count: bookedMatch ? bookedMatch[1] : '',
        image_url,
        product_url: url
      });
    }
  }
  return products;
})()
