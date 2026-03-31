(async () => {
  const iframes = Array.from(document.querySelectorAll('iframe[id^="card-fields-"]'));
  const results = iframes.map(f => ({
    id: f.id,
    title: f.title,
    rect: f.getBoundingClientRect()
  }));
  return results;
})()