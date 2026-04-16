(async () => {
  const cards = Array.from(document.querySelectorAll('a[href^="/skills/detail"]'));
  const results = cards.map(card => {
    const title = card.querySelector('h3')?.innerText || '';
    const description = card.querySelector('p')?.innerText || '';
    const url = card.href;
    return { title, description, url };
  });
  return results;
})();
