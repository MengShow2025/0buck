(async () => {
  const results = Array.from(document.querySelectorAll('.s-result-item[data-asin]')).map(item => {
    const titleEl = item.querySelector('h2 a');
    const priceEl = item.querySelector('.a-price-whole');
    const priceFractionEl = item.querySelector('.a-price-fraction');
    const badgeEl = item.querySelector('.a-badge-text');
    return {
      asin: item.getAttribute('data-asin'),
      title: titleEl ? titleEl.innerText : null,
      url: titleEl ? titleEl.href : null,
      price: priceEl ? priceEl.innerText + (priceFractionEl ? priceFractionEl.innerText : '') : null,
      badge: badgeEl ? badgeEl.innerText : null
    };
  });
  return results;
})();