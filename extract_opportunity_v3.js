(() => {
  const items = [];
  
  // Find all elements that look like a product card.
  // In many cases, these have a common container or structure.
  const cards = Array.from(document.querySelectorAll('div')).filter(el => {
    return el.innerText && el.innerText.includes('机会分') && el.innerText.includes('月销量');
  });

  // Let's find all "机会分" text and go up to the common ancestor
  const scoreElements = Array.from(document.querySelectorAll('*')).filter(el => {
    return el.children.length === 0 && el.textContent.trim() === '机会分';
  });

  scoreElements.forEach((scoreEl) => {
    if (items.length >= 10) return;
    
    // Find the closest ancestor that contains both the name and the stats
    let container = scoreEl.parentElement;
    let found = false;
    while (container && container !== document.body) {
      if (container.innerText.includes('月销量') && container.innerText.includes('平均价格')) {
        found = true;
        break;
      }
      container = container.parentElement;
    }
    
    if (found && container) {
      const text = container.innerText;
      const lines = text.split('\n').map(s => s.trim()).filter(s => s);
      
      const item = {
        name: lines[0], // Assumption: name is at the top
        opportunityScore: '',
        salesGrowth: '',
        competitionLevel: '',
        averagePrice: '',
        amazonLink: '',
        link1688: '',
        trackLink: ''
      };
      
      // Parse data from lines
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === '机会分' && lines[i+1]) {
          item.opportunityScore = lines[i+1];
        }
        if (lines[i].includes('月销量环比')) {
          const momMatch = lines[i].match(/月销量环比\s*([\d.%+-K]+)/);
          if (momMatch) item.salesGrowth = momMatch[1];
          const priceMatch = lines[i].match(/平均价格\s*(USD[\d.]+)/);
          if (priceMatch) item.averagePrice = priceMatch[1];
        }
        if (lines[i].includes('需求') || lines[i].includes('增速') || lines[i].includes('竞争')) {
          item.competitionLevel = lines[i];
        }
      }
      
      // Find links within this container
      const links = Array.from(container.querySelectorAll('a'));
      links.forEach(a => {
        if (a.href.includes('amazon.com')) item.amazonLink = a.href;
        if (a.href.includes('1688.com')) item.link1688 = a.href;
        if (a.innerText.includes('赛道分析')) item.trackLink = a.href;
      });
      
      // If we still don't have links, maybe they are buttons with icons
      // But let's check for duplicates
      if (!items.find(i => i.name === item.name)) {
        items.push(item);
      }
    }
  });

  return items;
})()