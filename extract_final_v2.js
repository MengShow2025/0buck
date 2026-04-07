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
    await wait(1000);
    
    const content = header.nextElementSibling;
    if (!content || content.tagName !== 'UL') continue;
    
    const items = Array.from(content.querySelectorAll('li'));
    for (const item of items) {
      const originalText = item.innerText.trim();
      item.click();
      await wait(1500);
      
      const rightContent = document.querySelector('.document_right').innerText;
      
      // Extract method name
      // Pattern 1: Table with "action" or "方法名"
      // Pattern 2: Text like "方法名 get-Order-Info"
      let method = 'Unknown';
      const methodMatch = rightContent.match(/方法名\s+([a-zA-Z0-9_\-\.\/]+)/) || 
                         rightContent.match(/action\s+([a-zA-Z0-9_\-\.\/]+)/);
      if (methodMatch) {
        method = methodMatch[1];
      } else {
        // Fallback to table search
        const table = document.querySelector('.document_right table');
        if (table) {
          const rows = Array.from(table.querySelectorAll('tr'));
          const actionRow = rows.find(row => row.innerText.includes('action') || row.innerText.includes('方法名'));
          if (actionRow) {
            const cells = Array.from(actionRow.cells);
            method = cells[cells.length - 1].innerText.trim();
          }
        }
      }
      
      results[cat.type].push({
        method: method,
        description: originalText.replace(/\u200B/g, '')
      });
    }
  }

  window.finalResults = results;
})();
