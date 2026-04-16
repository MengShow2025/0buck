(async () => {
  const blueOceanItems = [];
  // Find the Blue Ocean list container (it's the first column)
  const columns = document.querySelectorAll('.ant-card-body');
  const blueOceanList = Array.from(document.querySelectorAll('div')).find(el => el.innerText.includes('蓝海词榜'));
  
  if (blueOceanList) {
    const parent = blueOceanList.closest('.ant-card') || blueOceanList.parentElement;
    const cards = parent.querySelectorAll('.ant-list-item, div[class*="item"]');
    // The items might not be in a standard list. Let's look for the ranking numbers.
    const itemContainers = Array.from(parent.querySelectorAll('div')).filter(el => {
      return /^[1-9]$/.test(el.innerText.trim()) && el.nextElementSibling && el.nextElementSibling.innerText.includes('需求');
    }).map(el => el.parentElement);

    // Let's try another approach based on the screenshot structure
    const items = Array.from(document.querySelectorAll('div')).filter(el => el.innerText.trim().match(/^[1-9]$/) && el.nextElementSibling && el.nextElementSibling.innerText.length > 5);
    
    return items.map(el => {
      const parent = el.parentElement;
      return {
        index: el.innerText.trim(),
        content: parent.innerText
      };
    });
  }
  return "Not found";
})()