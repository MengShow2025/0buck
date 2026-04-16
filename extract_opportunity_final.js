(() => {
  const text = document.body.innerText;
  const items = [];
  
  // Find all segments starting with a name and ending with links
  // Based on the snapshot, it looks like:
  // [Name]
  // [Tags]
  // 机会分 [Score]
  // [Stats]
  // 赛道分析 1688供给

  // Let's use the pattern of names followed by "机会分"
  const blocks = text.split(/赛道分析\s*1688供给/);
  
  blocks.forEach(block => {
    if (items.length >= 10) return;
    
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 3) return;
    
    const item = {
      name: lines[0],
      opportunityScore: 'N/A',
      competitionLevel: 'N/A',
      salesGrowth: 'N/A',
      averagePrice: 'N/A'
    };

    const scoreIndex = lines.findIndex(l => l.includes('机会分'));
    if (scoreIndex !== -1 && lines[scoreIndex+1]) {
      item.opportunityScore = lines[scoreIndex+1];
    }

    const tagsIndex = lines.findIndex(l => l.includes('需求') || l.includes('竞争'));
    if (tagsIndex !== -1) {
      item.competitionLevel = lines[tagsIndex];
    }

    const statsLine = lines.find(l => l.includes('月销量环比'));
    if (statsLine) {
      const momMatch = statsLine.match(/月销量环比\s*([\d.K%M+-]+)/);
      if (momMatch) item.salesGrowth = momMatch[1];
      const priceMatch = statsLine.match(/平均价格\s*(USD[\d.]+)/);
      if (priceMatch) item.averagePrice = priceMatch[1];
    }
    
    if (item.opportunityScore !== 'N/A') {
      items.push(item);
    }
  });

  return items;
})()