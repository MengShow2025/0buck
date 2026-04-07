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
      const originalText = item.innerText.trim().replace(/\u200B/g, '');
      item.click();
      await wait(1000);
      
      const text = document.querySelector('.document_right').innerText;
      
      // Try to find "方法名" or "action"
      // Often looks like: "方法名    get-Order-Info" or in a table
      let method = 'Unknown';
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('方法名') || line.includes('action')) {
          const parts = line.split(/\s+/);
          // If the line is "方法名 get-Order-Info", index 1 is the method
          // If it's in a table row, we might need a different approach
          if (parts.length >= 2) {
             const val = parts[parts.length - 1];
             if (val && val !== '方法名' && val !== 'action' && val !== '是' && val !== 'String') {
               method = val;
             }
          }
        }
      }
      
      // If still unknown, check tables
      if (method === 'Unknown' || method === '方法名') {
          const rows = Array.from(document.querySelectorAll('.document_right tr'));
          for (const row of rows) {
              const cells = Array.from(row.cells);
              if (cells.length >= 2 && (cells[0].innerText.trim() === 'action' || cells[0].innerText.trim() === '方法名')) {
                  method = cells[cells.length - 1].innerText.trim();
                  break;
              }
              // Check if method is in the third column of "action" row (common in their docs)
              if (cells.length >= 3 && cells[0].innerText.trim() === 'action') {
                  method = cells[2].innerText.trim();
                  break;
              }
          }
      }

      results[cat.type].push({
        method: method,
        description: originalText
      });
    }
  }

  return results;
})();
