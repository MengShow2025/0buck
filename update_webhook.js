(async () => {
     const urlField = document.querySelector('s-internal-url-field') || document.querySelector('[name="webhook[address]"]');
     if (!urlField) {
       // Try generic input if special components not found
       const allInputs = Array.from(document.querySelectorAll('input'));
       const targetInput = allInputs.find(i => i.value && (i.value.includes('ngrok') || i.value.includes('hook')));
       if (targetInput) {
         targetInput.value = 'https://eea1-38-175-103-191.ngrok-free.app/api/v1/webhooks/shopify/orders/paid';
         targetInput.dispatchEvent(new Event('input', { bubbles: true }));
         targetInput.dispatchEvent(new Event('change', { bubbles: true }));
       }
     } else {
       const input = urlField.shadowRoot ? urlField.shadowRoot.querySelector('input') : urlField.querySelector('input') || urlField;
       input.value = 'https://eea1-38-175-103-191.ngrok-free.app/api/v1/webhooks/shopify/orders/paid';
       input.dispatchEvent(new Event('input', { bubbles: true }));
       input.dispatchEvent(new Event('change', { bubbles: true }));
     }
     await new Promise(r => setTimeout(r, 1000));
     const saveButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Save') || b.textContent.includes('保存'));
     if (saveButton) saveButton.click();
   })();