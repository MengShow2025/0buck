(function() {
  const getSubItems = (headerText) => {
    const headers = Array.from(document.querySelectorAll('.subNav'));
    const header = headers.find(el => el.innerText.trim().includes(headerText));
    if (!header) return { error: `Header ${headerText} not found` };
    
    // In this site, it's:
    // <div class="subNavBox">
    //   <div class="subNav">...</div>
    //   <ul class="navContent">...</ul>
    //   <div class="subNav">...</div>
    //   <ul class="navContent">...</ul>
    // </div>
    
    let content = header.nextElementSibling;
    if (content && content.tagName === 'UL' && content.classList.contains('navContent')) {
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
