(async () => {
  const result = { success: false, message: 'Nothing found' };
  
  function scan(doc) {
    const labels = Array.from(doc.querySelectorAll('label'));
    const passwordLabel = labels.find(l => l.innerText.toLowerCase().includes('restrict access') || l.innerText.includes('限制访问'));
    if (passwordLabel) {
      const checkbox = doc.getElementById(passwordLabel.getAttribute('for')) || passwordLabel.querySelector('input[type="checkbox"]');
      if (checkbox) {
        if (checkbox.checked) {
          checkbox.click();
          result.success = true;
          result.message = 'Checkbox unchecked';
          
          // Try to click save button
          const saveButtons = Array.from(doc.querySelectorAll('button')).filter(b => b.innerText.toLowerCase().includes('save') || b.innerText.includes('保存'));
          if (saveButtons.length > 0) {
            saveButtons[0].click();
            result.message += ' and Save clicked';
          }
        } else {
          result.success = true;
          result.message = 'Checkbox already unchecked';
        }
        return true;
      }
    }
    return false;
  }

  // Scan main document
  if (scan(document)) return result;

  // Scan iframes
  const iframes = Array.from(document.querySelectorAll('iframe'));
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (scan(doc)) return result;
    } catch (e) {
      // Cross-origin
    }
  }

  return result;
})()