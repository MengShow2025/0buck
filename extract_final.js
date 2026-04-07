(async () => {
  const findItem = (text) => {
    return Array.from(document.querySelectorAll('.navContent li')).find(li => li.innerText.trim().includes(text));
  };

  const results = {};
  const itemsToClick = [
    { cat: 'procurement', text: '查询1688供应商' },
    { cat: 'procurement', text: '查询1688商品' },
    { cat: 'procurement', text: '查询1688账号' },
    { cat: 'procurement', text: '创建1688订单' },
    { cat: 'procurement', text: '根据供应商店域名获取供应商信息' },
    { cat: 'procurement', text: '查询单个订单详情' },
    { cat: 'procurement', text: '查询买家订单列表' },
    { cat: 'product', text: '获取库存SKU' }
  ];

  for (const itemInfo of itemsToClick) {
    const item = findItem(itemInfo.text);
    if (item) {
      item.click();
      await new Promise(r => setTimeout(r, 1000));
      
      const table = document.querySelector('.right-content table') || document.querySelectorAll('table')[0];
      if (table) {
        const rows = Array.from(table.querySelectorAll('tr'));
        const actionRow = rows.find(row => row.cells[0] && row.cells[0].innerText.trim() === 'action');
        const actionName = actionRow ? actionRow.cells[2].innerText.trim() : 'Unknown';
        
        if (!results[itemInfo.cat]) results[itemInfo.cat] = [];
        results[itemInfo.cat].push({
          method: actionName,
          description: itemInfo.text
        });
      }
    }
  }

  return results;
})();
