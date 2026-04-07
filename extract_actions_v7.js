(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const results = {
    procurement: [],
    product: []
  };

  const categories = [
    { name: '采购API', type: 'procurement', items: [
      '查询1688供应商', '查询1688商品', '查询1688账号', '创建1688订单',
      '根据供应商店域名获取供应商信息', '查询单个订单详情', '查询买家订单列表'
    ]},
    { name: '商品API', type: 'product', items: [
      '获取库存SKU'
    ]}
  ];

  for (const cat of categories) {
    // Find category header
    const headers = Array.from(document.querySelectorAll('.subNav'));
    const header = headers.find(el => el.innerText.trim().includes(cat.name));
    if (!header) continue;
    
    // Expand if not expanded (check if next sibling UL is visible or exists)
    const contentList = header.nextElementSibling;
    if (!contentList || contentList.tagName !== 'UL' || getComputedStyle(contentList).display === 'none') {
      header.click();
      await wait(500);
    }
    
    const items = Array.from(contentList.querySelectorAll('li'));
    for (const itemName of cat.items) {
      const itemEl = items.find(li => li.innerText.trim().includes(itemName));
      if (!itemEl) continue;
      
      itemEl.click();
      await wait(1500); // Wait for AJAX
      
      const docRight = document.querySelector('.document_right');
      let actionName = 'Unknown';
      
      // Method 1: Check tables for "action" or "方法名"
      const rows = Array.from(docRight.querySelectorAll('tr'));
      for (const row of rows) {
        const cells = Array.from(row.cells).map(c => c.innerText.trim());
        if (cells.length >= 2) {
          const firstCell = cells[0].toLowerCase();
          if (firstCell === 'action' || firstCell === '方法名') {
            // Usually it's in the 3rd column (Default Value) or 2nd
            actionName = cells[2] || cells[1];
            if (actionName && actionName !== '是' && actionName !== 'String' && actionName !== '方法名') {
              break;
            }
            actionName = 'Unknown';
          }
        }
      }
      
      // Method 2: Check "请求示例" (Request Example) JSON block
      if (actionName === 'Unknown') {
        const preBlocks = Array.from(docRight.querySelectorAll('pre, .code, div'));
        for (const block of preBlocks) {
          const text = block.innerText;
          const match = text.match(/"action"\s*:\s*"([^"]+)"/i) || text.match(/action\s*=\s*([^&\s]+)/i);
          if (match && match[1]) {
            actionName = match[1].trim();
            break;
          }
        }
      }
      
      // Method 3: Check "方法名" text in paragraph
      if (actionName === 'Unknown') {
        const match = docRight.innerText.match(/方法名\s*[:：]?\s*([a-zA-Z0-9_\-\.\/]+)/i);
        if (match) actionName = match[1].trim();
      }

      results[cat.type].push({
        description: itemName,
        action: actionName
      });
    }
  }

  return results;
})();
