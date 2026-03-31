(async () => {
  const response = await fetch('/admin/api/unstable/graphql.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': '' // Might not be needed if it uses session
    },
    body: JSON.stringify({
      query: `
        {
          shop {
            id
            name
            myshopifyDomain
          }
        }
      `
    })
  });
  const data = await response.json();
  return data;
})()