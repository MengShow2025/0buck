(async () => {
  const elements = Array.from(document.querySelectorAll('*'));
  const links = elements.filter(el => 
    (el.tagName === 'A' || el.tagName === 'LI' || el.tagName === 'SPAN' || el.tagName === 'DIV') && 
    (el.innerText && (el.innerText.includes('采购API') || el.innerText.includes('商品API')))
  ).map(el => ({
    tagName: el.tagName,
    innerText: el.innerText.trim(),
    className: el.className,
    href: el.href || null
  }));
  
  return { links };
})();
