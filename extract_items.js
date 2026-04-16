(async () => {
  const items = Array.from(document.querySelectorAll('.s-result-item[data-asin]'));
  const results = items.slice(0, 10).map(item => {
    const title = item.querySelector('h2')?.innerText;
    const price = item.querySelector('.a-price .a-offscreen')?.innerText;
    const rating = item.querySelector('.a-icon-alt')?.innerText;
    const link = item.querySelector('h2 a')?.href;
    const isBestSeller = item.innerText.includes('Best Seller');
    const brand = item.querySelector('.a-size-base-plus')?.innerText || '';
    return { title, price, rating, link, isBestSeller, brand };
  }).filter(item => item.title);
  return results;
})()