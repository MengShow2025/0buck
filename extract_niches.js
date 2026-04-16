(async () => {
  const items = [];
  const cards = document.querySelectorAll('.ant-card-body');
  
  // Try to find the lists
  // There are two lists usually. I'll just select all items that look like niches.
  // Looking at the snapshot, the items are inside some container.
  
  const extractItemsFromColumn = (columnTitle) => {
    // Find the column by title
    const columns = Array.from(document.querySelectorAll('div')).filter(d => d.innerText && d.innerText.includes(columnTitle));
    // This is a bit brittle, let's try a better way.
    // Each niche seems to be in a div with index numbers 1, 2, 3, 4.
  };

  // Let's use a selector for the items based on the text structure
  const allText = document.body.innerText;
  
  // I'll use the DOM structure from the snapshot to find elements.
  // Titles are in divs with text like "red shredded paper filler"
  // Scores are in divs with text "机会分"
  
  const nicheElements = Array.from(document.querySelectorAll('div')).filter(el => {
    return el.children.length === 0 && el.innerText && /^[a-zA-Z0-9\s/]+（.*）$/.test(el.innerText);
  });
  
  // Wait, let's just use the known structure from the snapshot.
  // The items are in cards.
  const cardsList = Array.from(document.querySelectorAll('.ant-card')); // If it uses Ant Design
  
  // Let's try to get all niche names first
  const data = [];
  const itemsNodes = document.querySelectorAll('div > div > div'); // Rough guess
  
  // Better: search for the index circles (1, 2, 3, 4)
  const indices = Array.from(document.querySelectorAll('div')).filter(el => el.innerText && /^[1-4]$/.test(el.innerText) && el.children.length === 0);
  
  indices.forEach(idxEl => {
    const parent = idxEl.parentElement;
    if (!parent) return;
    const textContent = parent.innerText;
    // Extract name, score, trend
    const lines = textContent.split('\n');
    const nameLine = lines.find(l => l.includes('（'));
    const scoreLineIdx = lines.findIndex(l => l.includes('机会分'));
    const score = scoreLineIdx !== -1 ? lines[scoreLineIdx + 1] : null;
    const trendLine = lines.find(l => l.includes('月销量环比'));
    const trend = trendLine ? trendLine.match(/月销量环比\s*([\d%]+)/)?.[1] : null;
    
    if (nameLine && score) {
      data.push({
        name: nameLine,
        score: score,
        trend: trend
      });
    }
  });

  return data;
})()