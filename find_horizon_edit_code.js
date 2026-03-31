(async () => {
  function findInDoc(doc) {
    const texts = Array.from(doc.querySelectorAll('span, p, h1, h2, h3, a, button'));
    const horizon = texts.find(t => t.innerText.includes('Horizon'));
    if (horizon) {
      // Horizon found! Now find the actions button or edit code link nearby
      const parent = horizon.parentElement.parentElement.parentElement; // Guessing depth
      const actions = Array.from(parent.querySelectorAll('button, a')).filter(b => b.innerText.includes('...') || b.innerText.includes('Actions') || b.innerText.includes('操作'));
      if (actions.length > 0) {
        actions[0].click();
        // Wait for menu
        setTimeout(() => {
          const editCode = Array.from(doc.querySelectorAll('button, a')).find(b => b.innerText.includes('Edit code') || b.innerText.includes('编辑代码'));
          if (editCode) editCode.click();
        }, 1000);
        return true;
      }
    }
    return false;
  }

  const iframes = Array.from(document.querySelectorAll('iframe'));
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (findInDoc(doc)) return { success: true, message: 'Horizon theme found and edit code clicked' };
    } catch (e) {}
  }
  return { success: false, message: 'Horizon theme not found' };
})()