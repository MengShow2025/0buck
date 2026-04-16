(async () => {
  const data = [];
  
  // Find all cards
  const cards = Array.from(document.querySelectorAll('div')).filter(el => 
    el.innerText && (el.innerText.includes('机会分') || el.innerText.includes('月销量环比'))
  );
  
  // This is a bit too broad. Let's find the niche titles specifically.
  // Titles have the format "English Name（Chinese Name）"
  const titleRegex = /^[A-Za-z0-9\s/]+（[^）]+）$/;
  const titles = Array.from(document.querySelectorAll('div')).filter(el => 
    el.children.length === 0 && titleRegex.test(el.innerText)
  );

  titles.forEach(titleEl => {
    // Find the nearest parent that contains the score and trend
    let parent = titleEl.parentElement;
    while (parent && !parent.innerText.includes('机会分')) {
      parent = parent.parentElement;
    }
    
    if (parent) {
      const text = parent.innerText;
      const scoreMatch = text.match(/机会分\s*(\d+)/);
      const trendMatch = text.match(/月销量环比\s*([\d%]+)/);
      const salesMatch = text.match(/月销量\s*([\d.K]+)/);
      
      data.push({
        name: titleEl.innerText,
        score: scoreMatch ? scoreMatch[1] : null,
        trend: trendMatch ? trendMatch[1] : null,
        monthlySales: salesMatch ? salesMatch[1] : null
      });
    }
  });
  
  return data;
})()