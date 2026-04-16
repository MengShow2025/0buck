(() => {
  const extractFromList = (selector) => {
    const list = document.querySelectorAll(selector);
    const results = [];
    list.forEach(item => {
      const nameEl = item.querySelector('div[style*="font-weight: 500"]') || item.querySelector('span[style*="font-weight: 500"]');
      const name = nameEl ? nameEl.innerText.trim() : item.innerText.split('\n')[0];
      
      const scoreEl = Array.from(item.querySelectorAll('div, span')).find(el => el.innerText.match(/^\d+$/) && el.parentElement.innerText.includes('机会分'));
      const score = scoreEl ? scoreEl.innerText : 'N/A';
      
      const tags = Array.from(item.querySelectorAll('div, span')).filter(el => 
        ['需求旺盛', '增速显著', '竞争激烈', '低需求', '高需求', '低竞争', '中竞争'].some(t => el.innerText.includes(t))
      ).map(el => el.innerText).join(' ');
      
      const statsText = item.innerText;
      const momMatch = statsText.match(/月销量环比\s*([\d.%+-K]+)/);
      const priceMatch = statsText.match(/平均价格\s*(USD[\d.]+)/);
      
      const links = Array.from(item.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
      const link1688 = links.find(l => l.text.includes('1688'))?.href || 'N/A';
      const amazonLink = links.find(l => l.text.includes('Amazon') || l.href.includes('amazon.com'))?.href || 'N/A';
      const trackLink = links.find(l => l.text.includes('赛道分析'))?.href || 'N/A';

      results.push({
        name,
        score,
        competition: tags,
        growth: momMatch ? momMatch[1] : 'N/A',
        price: priceMatch ? priceMatch[1] : 'N/A',
        link1688,
        amazonLink,
        trackLink
      });
    });
    return results;
  };

  // Based on the screenshot, there are two columns. 
  // Let's find the cards. They are children of the two main column divs.
  // The structure seems to be: 蓝海词榜 (left) and 热销词榜 (right)
  const columns = document.querySelectorAll('.ant-card-body > div > div'); 
  // This might be too generic. Let's look for the containers with "1/25"
  const colContainers = Array.from(document.querySelectorAll('div')).filter(el => el.innerText.includes('1/25') && el.children.length > 5);
  
  const blueOcean = [];
  const hotKeywords = [];
  
  // Alternative: select by the specific layout divs
  const items = Array.from(document.querySelectorAll('div')).filter(el => el.innerText.includes('机会分') && el.innerText.includes('月销量环比') && el.innerText.length < 1000);
  
  // Filter out the large container itself
  const productCards = items.filter(el => !el.children[0]?.innerText?.includes('机会分'));

  return productCards.map(card => {
    const text = card.innerText;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    // First line is usually rank number + name, or just name
    let name = lines[0];
    if (name.match(/^\d+$/) && lines[1]) name = lines[1];
    
    const scoreIdx = lines.indexOf('机会分');
    const score = scoreIdx !== -1 ? lines[scoreIdx+1] : 'N/A';
    
    const growthMatch = text.match(/月销量环比\s*([\d.%+-K]+)/);
    const priceMatch = text.match(/平均价格\s*(USD[\d.]+)/);
    
    const compTags = lines.filter(l => ['需求旺盛', '增速显著', '竞争激烈', '低需求', '高需求', '低竞争'].some(t => l.includes(t)));
    
    const links = Array.from(card.querySelectorAll('a'));
    
    return {
      name,
      score,
      competition: compTags.join(' '),
      growth: growthMatch ? growthMatch[1] : 'N/A',
      price: priceMatch ? priceMatch[1] : 'N/A',
      link1688: links.find(a => a.innerText.includes('1688'))?.href || 'N/A',
      amazonLink: links.find(a => a.href.includes('amazon.com'))?.href || 'N/A'
    };
  });
})()