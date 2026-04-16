(() => {
  const items = [];
  
  // Find all elements containing "机会分"
  const nodes = Array.from(document.querySelectorAll('*')).filter(el => 
    el.children.length === 0 && el.textContent.trim() === '机会分'
  );

  nodes.forEach((node) => {
    if (items.length >= 10) return;

    let container = node.parentElement;
    // Ascend to a reasonable container level
    while (container && container.innerText.length < 50) {
      container = container.parentElement;
    }
    
    if (container) {
      const text = container.innerText;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      
      const item = {
        name: lines[0],
        opportunityScore: '',
        salesGrowth: 'N/A',
        competitionLevel: 'N/A',
        averagePrice: 'N/A',
        amazonLink: 'N/A',
        link1688: 'N/A'
      };

      // Search lines for data
      lines.forEach((line, idx) => {
        if (line === '机会分' && lines[idx+1]) {
          item.opportunityScore = lines[idx+1];
        }
        if (line.includes('需求') || line.includes('竞争') || line.includes('增速')) {
          item.competitionLevel = line;
        }
        if (line.includes('月销量环比')) {
          const mom = line.match(/月销量环比\s*([\d.K%M+-]+)/);
          if (mom) item.salesGrowth = mom[1];
          const price = line.match(/平均价格\s*(USD[\d.]+)/);
          if (price) item.averagePrice = price[1];
        }
      });

      // Find links
      const allLinks = Array.from(container.querySelectorAll('a, div, span')).filter(el => {
        const t = el.innerText || '';
        return t.includes('1688供给') || t.includes('赛道分析') || t.includes('Amazon');
      });
      
      // If we find a "1688供给" text, it's often a link or a button that opens a link.
      // Let's try to find the actual hrefs if they exist.
      const linksWithHref = Array.from(container.querySelectorAll('a'));
      linksWithHref.forEach(a => {
        if (a.href.includes('1688.com')) item.link1688 = a.href;
        if (a.href.includes('amazon.com')) item.amazonLink = a.href;
      });

      // Avoid duplicates
      if (!items.find(i => i.name === item.name)) {
        items.push(item);
      }
    }
  });

  return items;
})()