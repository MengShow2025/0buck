(async () => {
  const rows = Array.from(document.querySelectorAll('tr.Polaris-ResourceItem'));
  const products = rows.map(row => {
    const title = row.querySelector('a')?.innerText || '';
    // Price might not be visible in the table. Let's look for any text that looks like a price.
    const text = row.innerText;
    return { title, text };
  });

  // Try to find total count from the pagination area
  const paginationText = document.querySelector('.Polaris-Pagination')?.innerText || '';
  
  return { products, paginationText, html: document.body.innerHTML.substring(0, 1000) };
})()