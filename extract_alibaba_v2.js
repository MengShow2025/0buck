(async () => {
  const images = Array.from(document.querySelectorAll('img')).map(img => ({
    src: img.src,
    alt: img.alt,
    parentText: img.parentElement ? img.parentElement.innerText : ''
  })).filter(img => img.src && img.src.startsWith('http'));
  const links = Array.from(document.querySelectorAll('a')).map(a => ({
    href: a.href,
    text: a.innerText
  })).filter(a => a.href && a.href.includes('product-detail'));
  return { __result: { images, links } };
})()
