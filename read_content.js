(async () => {
  const item = Array.from(document.querySelectorAll('.click_apiname')).find(li => li.innerText.includes('查询1688供应商'));
  if (item) item.click();
  await new Promise(r => setTimeout(r, 2000));
  
  // Get all text from the main content area
  const content = document.querySelector('.right-content') || document.body;
  return content.innerText;
})();
