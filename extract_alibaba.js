(async () => {
  const products = [];
  const items = document.querySelectorAll('.card-info, .list-info, .search-card-item, .offer-list-item');
  items.forEach(item => {
    const titleEl = item.querySelector('.title, .name, .product-title');
    const priceEl = item.querySelector('.price, .price-number');
    const imgEls = item.querySelectorAll('img');
    const linkEl = item.querySelector('a');
    if (titleEl) {
      products.push({
        title: titleEl.innerText,
        price: priceEl ? priceEl.innerText : 'N/A',
        images: Array.from(imgEls).map(img => img.src).filter(src => src && src.startsWith('http')),
        link: linkEl ? linkEl.href : ''
      });
    }
  });
  return { __result: products };
})()
