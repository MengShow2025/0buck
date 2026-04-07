(function() {
  const item = Array.from(document.querySelectorAll('.navContent li')).find(li => li.innerText.includes('查询1688供应商'));
  if (item) item.click();
  
  const table = document.querySelector('table');
  if (!table) return { error: 'Table not found' };
  
  const rows = Array.from(table.querySelectorAll('tr'));
  return rows.map(row => Array.from(row.cells).map(cell => cell.innerText.trim()));
})();
