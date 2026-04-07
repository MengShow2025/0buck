(async () => {
  const item = Array.from(document.querySelectorAll('.click_apiname')).find(li => li.innerText.includes('查询1688供应商'));
  if (item) item.click();
  await new Promise(r => setTimeout(r, 2000));
  window.finalResults = document.querySelector('.document_right').innerText;
})();
