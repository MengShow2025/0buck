(async () => {
  const url = 'https://shop.0buck.com/products/0buck-verified-artisan-0buck-artisan-4?password=0buck';
  try {
    const response = await fetch(url);
    const html = await response.text();
    // Remove the redirect script from the HTML before writing
    const cleanHtml = html.replace(/<script id="headless-redirect">[\s\S]*?<\/script>/, '');
    document.open();
    document.write(cleanHtml);
    document.close();
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
})()