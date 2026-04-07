(async () => {
  const findTab = (text) => {
    const elements = Array.from(document.querySelectorAll('a, span, div, li'));
    return elements.find(el => el.textContent.trim() === text);
  };

  const采购Tab = findTab('采购API');
  const商品Tab = findTab('商品API');

  const results = {
    procurement: [],
    product: []
  };

  async function extractMethods() {
    // Wait for the table to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    const table = document.querySelector('table');
    if (!table) return [];
    
    const rows = Array.from(table.querySelectorAll('tr')).slice(1); // skip header
    return rows.map(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        return {
          action: cells[0].textContent.trim(),
          description: cells[1].textContent.trim()
        };
      }
      return null;
    }).filter(x => x && x.action);
  }

  if (采购Tab) {
    采购Tab.click();
    results.procurement = await extractMethods();
  }

  if (商品Tab) {
    商品Tab.click();
    results.product = await extractMethods();
  }

  return results;
})();
