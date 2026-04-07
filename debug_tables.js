(async () => {
  const findItem = (text) => {
    return Array.from(document.querySelectorAll('.navContent li')).find(li => li.innerText.trim().includes(text));
  };

  const item = findItem('获取库存SKU');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 1000));
  
  const tables = Array.from(document.querySelectorAll('table'));
  return tables.map(table => {
    return Array.from(table.querySelectorAll('tr')).map(row => 
      Array.from(row.cells).map(cell => cell.innerText.trim())
    );
  });
})();
