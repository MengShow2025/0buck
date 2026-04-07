(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  
  const getAPIInfo = async (headerText, itemText) => {
    // Expand header
    const headers = Array.from(document.querySelectorAll('.subNav'));
    const header = headers.find(el => el.innerText.trim().includes(headerText));
    if (header) {
      header.click();
      await wait(500);
    }
    
    // Find and click item
    const content = header.nextElementSibling;
    const item = Array.from(content.querySelectorAll('li')).find(li => li.innerText.trim().includes(itemText));
    if (!item) return { error: `Item ${itemText} not found under ${headerText}` };
    
    item.click();
    await wait(1000);
    
    // Extract info from the right side
    // Look for the action name in the table
    const table = document.querySelector('.right-content table') || document.querySelector('table');
    if (!table) return { error: 'Table not found' };
    
    const rows = Array.from(table.querySelectorAll('tr'));
    const actionRow = rows.find(row => row.cells[0] && row.cells[0].innerText.trim() === 'action');
    const actionName = actionRow ? actionRow.cells[2].innerText.trim() : 'Unknown';
    
    // Look for a description - usually at the top header
    const title = document.querySelector('.right-content h2, .right-content h1, .right-content .title') || { innerText: itemText };
    
    return {
      name: actionName,
      description: title.innerText.trim(),
      originalTitle: itemText
    };
  };

  const results = {
    procurement: [],
    product: []
  };

  // List of items we found earlier
  const procItems = [
    "查询1688供应商", "查询1688商品", "查询1688账号", "创建1688订单",
    "根据供应商店域名获取供应商信息", "查询单个订单详情", "查询买家订单列表"
  ];
  
  const prodItems = ["获取库存SKU"];

  for (const it of procItems) {
    results.procurement.push(await getAPIInfo('采购API', it));
  }
  
  for (const it of prodItems) {
    results.product.push(await getAPIInfo('商品API', it));
  }

  return results;
})();
