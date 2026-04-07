(function() {
  const elements = Array.from(document.querySelectorAll('*'));
  const apiElements = elements.filter(el => 
    el.children.length === 0 && 
    (el.textContent.includes('采购') || el.textContent.includes('商品')) &&
    el.textContent.includes('API')
  );
  
  return apiElements.map(el => ({
    tagName: el.tagName,
    innerText: el.innerText,
    className: el.className,
    id: el.id,
    parentTag: el.parentElement ? el.parentElement.tagName : null,
    parentClass: el.parentElement ? el.parentElement.className : null
  }));
})();
