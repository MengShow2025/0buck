(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const results = {
    procurement: [],
    product: []
  };

  const categories = [
    { name: '采购API', type: 'procurement' },
    { name: '商品API', type: 'product' }
  ];

  for (const cat of categories) {
    const headers = Array.from(document.querySelectorAll('.subNav'));
    const header = headers.find(el => el.innerText.trim().includes(cat.name));
    if (!header) continue;
    
    header.click();
    await wait(500);
    
    const content = header.nextElementSibling;
    if (!content || content.tagName !== 'UL') continue;
    
    const items = Array.from(content.querySelectorAll('li'));
    for (const item of items) {
      const originalText = item.innerText.trim();
      item.click();
      await wait(1000);
      
      // Look for the specific action name in the newly loaded table
      // It's likely in the table where column "参数名称" is "action"
      const tables = Array.from(document.querySelectorAll('.document_right table'));
      let method = 'Unknown';
      
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tr'));
        for (const row of rows) {
          const cells = Array.from(row.cells);
          if (cells.length >= 3 && cells[0].innerText.trim() === 'action') {
            method = cells[2].innerText.trim() || cells[1].innerText.trim();
            break;
          }
        }
        if (method !== 'Unknown') break;
      }
      
      results[cat.type].push({
        method: method,
        description: originalText.replace(/\u200B/g, '')
      });
    }
  }

  window.finalResults = results;
})();
