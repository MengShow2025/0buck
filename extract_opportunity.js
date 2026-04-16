(async () => {
  const items = [];
  const cards = Array.from(document.querySelectorAll('div')).filter(el => {
    return el.innerText && el.innerText.includes('机会分') && el.innerText.includes('月销量');
  });

  // Refine selection: Usually these are in a specific container or have a common class.
  // Based on the snapshot, they seem to be distinct blocks.
  
  // Let's try to find the specific list items.
  // Using a more specific selector if possible, or mapping over the cards found.
  
  const results = [];
  // The cards found might be duplicates or fragments. Let's look for the main blocks.
  // Often these are rows or cards.
  
  // Based on the snapshot structure:
  // Name
  // Tags (e.g. 需求旺盛 增速显著)
  // 机会分 Value
  // Stats (商品量, 月销量, 月销量环比, 平均价格)
  // Links (赛道分析, 1688供给)

  // Let's find all elements that look like a product name.
  // They usually appear before "需求旺盛" or similar.
  
  const blocks = Array.from(document.querySelectorAll('.ant-list-item, .card, .item-container, div[class*="item"]')).filter(el => el.innerText.includes('机会分'));
  
  // If no blocks found with common classes, I'll use the text nodes approach.
  const allText = document.body.innerText;
  
  // Let's try to select by the "机会分" text.
  const scoreElements = Array.from(document.querySelectorAll('text, span, div')).filter(el => el.innerText === '机会分');
  
  scoreElements.forEach((scoreEl, index) => {
    if (index >= 10) return;
    
    try {
      // Find the container or parent that holds the item info
      let container = scoreEl.parentElement;
      while (container && container.innerText.length < 100) {
        container = container.parentElement;
      }
      
      if (!container) return;

      const text = container.innerText;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      
      const item = {};
      item.name = lines[0]; // Usually the first line
      
      // Find Opportunity Score
      const scoreIndex = lines.indexOf('机会分');
      if (scoreIndex !== -1 && lines[scoreIndex + 1]) {
        item.opportunityScore = lines[scoreIndex + 1];
      }
      
      // Find Competition / Tags
      const tagsLine = lines.find(l => l.includes('需求') || l.includes('竞争'));
      item.competitionLevel = tagsLine || 'N/A';
      
      // Find Stats
      const statsLine = lines.find(l => l.includes('月销量环比'));
      if (statsLine) {
        const momMatch = statsLine.match(/月销量环比\s*([\d.%+-]+)/);
        item.salesGrowth = momMatch ? momMatch[1] : 'N/A';
        
        const priceMatch = statsLine.match(/平均价格\s*(USD[\d.]+)/);
        item.averagePrice = priceMatch ? priceMatch[1] : 'N/A';
      }
      
      // Links
      const links = Array.from(container.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
      item.links = links;
      
      results.push(item);
    } catch (e) {
      // skip
    }
  });

  return results;
})()