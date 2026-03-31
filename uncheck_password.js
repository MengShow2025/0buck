(async () => {
  const findCheckbox = () => {
    const labels = Array.from(document.querySelectorAll('label'));
    const passwordLabel = labels.find(l => l.innerText.includes('Restrict access to visitors with the password'));
    if (passwordLabel) {
      const checkbox = document.getElementById(passwordLabel.getAttribute('for')) || passwordLabel.querySelector('input[type="checkbox"]');
      return checkbox;
    }
    // Try to find by text if label doesn't work
    const checkbox = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(i => {
      const label = i.labels && i.labels[0];
      return label && label.innerText.includes('Restrict access to visitors with the password');
    });
    return checkbox;
  };

  const checkbox = findCheckbox();
  if (checkbox) {
    if (checkbox.checked) {
      checkbox.click();
      return { success: true, message: 'Checkbox unchecked' };
    } else {
      return { success: true, message: 'Checkbox already unchecked' };
    }
  } else {
    // Try to look inside iframes
    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const labels = Array.from(doc.querySelectorAll('label'));
        const passwordLabel = labels.find(l => l.innerText.includes('Restrict access to visitors with the password'));
        if (passwordLabel) {
          const checkbox = doc.getElementById(passwordLabel.getAttribute('for')) || passwordLabel.querySelector('input[type="checkbox"]');
          if (checkbox) {
            if (checkbox.checked) {
              checkbox.click();
              return { success: true, message: 'Checkbox unchecked in iframe' };
            } else {
              return { success: true, message: 'Checkbox already unchecked in iframe' };
            }
          }
        }
      } catch (e) {
        // Cross-origin probably
      }
    }
    return { success: false, message: 'Checkbox not found' };
  }
})()