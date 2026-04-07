(async () => {
  const findItem = (text) => {
    return Array.from(document.querySelectorAll('.navContent li')).find(li => li.innerText.trim().includes(text));
  };

  const item = findItem('查询1688供应商');
  if (item) {
    item.click();
    // Wait for content to load
    await new Promise(r => setTimeout(r, 1500));
    return { success: true, itemText: item.innerText.trim() };
  }
  return { success: false, items: Array.from(document.querySelectorAll('.navContent li')).map(li => li.innerText.trim()) };
})();
