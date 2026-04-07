(async () => {
  const getSubItems = (headerText) => {
    const header = Array.from(document.querySelectorAll('.subNav')).find(el => el.innerText.trim().includes(headerText));
    if (!header) return { error: `Header ${headerText} not found` };
    
    // Header might be a sibling of the content, or the content might be a sibling of the header's parent
    // Often it's structured like: <div class="subNav">...</div> <ul class="navContent">...</ul>
    const content = header.nextElementSibling;
    if (content && content.tagName === 'UL') {
      return Array.from(content.querySelectorAll('li')).map(li => ({
        text: li.innerText.trim(),
        id: li.id,
        className: li.className
      }));
    }
    return { error: `Content not found for ${headerText}` };
  };

  return {
    procurementItems: getSubItems('采购API'),
    productItems: getSubItems('商品API')
  };
})();
