(async () => {
  const items = Array.from(document.querySelectorAll('.cj-product-item, .product-item, .card-item, .list-item-container')).map(el => {
    const title = el.querySelector('.product-name, .title, .name, .desc')?.innerText;
    const price = el.querySelector('.price, .product-price, .price-num')?.innerText;
    const link = el.querySelector('a')?.href;
    const img = el.querySelector('img')?.src;
    const isCJsChoice = el.innerText.includes("CJ's Choice");
    const lists = el.querySelector('.list-num, .list-count, .list-count-num')?.innerText;
    const sku = el.querySelector('.sku')?.innerText;
    
    return { title, price, link, img, isCJsChoice, lists, sku };
  });
  return items;
})()