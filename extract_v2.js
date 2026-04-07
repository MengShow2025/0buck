(async () => {
  const findElementByText = (text) => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walk.nextNode()) {
      if (node.textContent.trim() === text) {
        return node.parentElement;
      }
    }
    return null;
  };

  const procurementEl = findElementByText('采购API');
  const productEl = findElementByText('商品API');

  const results = {
    procurement: [],
    product: []
  };

  const getMethods = () => {
    const table = document.querySelector('.right-content table') || document.querySelector('table');
    if (!table) return [];
    const rows = Array.from(table.querySelectorAll('tr')).slice(1);
    return rows.map(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        return {
          action: cells[0].innerText.trim(),
          description: cells[1].innerText.trim()
        };
      }
      return null;
    }).filter(x => x && x.action);
  };

  if (procurementEl) {
    procurementEl.click();
    await new Promise(r => setTimeout(r, 1000));
    results.procurement = getMethods();
  }

  if (productEl) {
    productEl.click();
    await new Promise(r => setTimeout(r, 1000));
    results.product = getMethods();
  }

  return results;
})();
