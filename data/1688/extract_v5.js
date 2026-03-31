(async () => {
  const products = [];
  const links = Array.from(document.querySelectorAll('a'));
  for (const a of links) {
    if (products.length >= 10) break;
    const text = a.innerText;
    if (text.includes('¥')) {
      products.push({
        title: text.split('\n')[0].trim(),
        text: text, // For debugging
        product_url: a.href
      });
    }
  }
  return { __result: products };
})()
