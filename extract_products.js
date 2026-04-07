(async () => {
  const products = Array.from(document.querySelectorAll('.product-item, .card-item, .list-item-container')).map(el => {
    const title = el.querySelector('.product-name, .title, .name')?.innerText;
    const price = el.querySelector('.price, .product-price')?.innerText;
    const link = el.querySelector('a')?.href;
    const img = el.querySelector('img')?.src;
    const isCJsChoice = el.innerText.includes("CJ's Choice");
    const lists = el.querySelector('.list-num, .list-count')?.innerText;
    
    return { title, price, link, img, isCJsChoice, lists };
  });
  return products;
})()