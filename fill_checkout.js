(async () => {
  const fields = {
    'input[id="email"]': 'test@example.com',
    'input[placeholder="名字"]': 'Test',
    'input[placeholder="姓"]': 'User',
    'input[placeholder="地址"]': '123 Nathan Road',
    'input[placeholder="城市"]': 'Kowloon'
  };

  for (const [selector, value] of Object.entries(fields)) {
    const el = document.querySelector(selector);
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }

  // Select "香港特别行政区" and "九龙" if not selected
  // Based on snapshot: 
  // e13 (combobox "国家/地区") -> option "香港特别行政区" (e14)
  // e20 (combobox "区域") -> option "九龙" (e22)
  
  const countrySelect = document.querySelector('select[name="countryCode"]');
  if (countrySelect) {
    countrySelect.value = 'HK';
    countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const regionSelect = document.querySelector('select[name="zone"]');
  if (regionSelect) {
    regionSelect.value = 'KL'; // Usually 'KL' for Kowloon in Shopify
    regionSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  return { success: true };
})();
