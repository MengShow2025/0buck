(() => {
  const items = [];
  const bodyText = document.body.innerText;
  
  // Find all occurrences of "机会分" and get the surrounding data
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  const scoreNodes = [];
  while (node = walker.nextNode()) {
    if (node.textContent.includes('机会分')) {
      scoreNodes.push(node);
    }
  }

  scoreNodes.forEach((scoreNode, index) => {
    if (items.length >= 10) return;
    
    // Find the closest container that contains the name and stats
    let container = scoreNode.parentElement;
    // Walk up until we find a container that has at least "月销量" and "平均价格"
    while (container && (!container.innerText.includes('月销量') || !container.innerText.includes('平均价格'))) {
      container = container.parentElement;
    }
    
    if (container) {
      const text = container.innerText;
      const lines = text.split('\n').map(s => s.trim()).filter(s => s);
      
      const item = {
        name: lines[0], // Assumption: name is at the top
        opportunityScore: '',
        salesGrowth: '',
        competitionLevel: '',
        averagePrice: '',
        links: []
      };
      
      // Parse data from lines
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('机会分')) {
          item.opportunityScore = lines[i+1] || '';
        }
        if (lines[i].includes('月销量环比')) {
          const match = lines[i].match(/月销量环比\s*([\d.%+-]+)/);
          if (match) item.salesGrowth = match[1];
          const priceMatch = lines[i].match(/平均价格\s*(USD[\d.]+)/);
          if (priceMatch) item.averagePrice = priceMatch[1];
        }
        if (lines[i].includes('需求') || lines[i].includes('增速') || lines[i].includes('竞争')) {
          item.competitionLevel = lines[i];
        }
      }
      
      // Links
      const amazonLink = container.querySelector('a[href*="amazon.com"]');
      const 1688Link = container.querySelector('a[href*="1688.com"]');
      const trackLink = Array.from(container.querySelectorAll('a')).find(a => a.innerText.includes('赛道分析'));
      
      if (amazonLink) item.amazonLink = amazonLink.href;
      if (1688Link) item.1688Link = 1688Link.href;
      if (trackLink) item.trackLink = trackLink.href;
      
      // Check for duplicates
      if (!items.find(i => i.name === item.name)) {
        items.push(item);
      }
    }
  });

  return items;
})()