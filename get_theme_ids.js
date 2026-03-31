(async () => {
  const findThemes = () => {
    // Look for theme ids in the document or iframes
    const ids = [];
    const walk = (doc) => {
      const anchors = Array.from(doc.querySelectorAll('a[href*="/themes/"]'));
      anchors.forEach(a => {
        const match = a.href.match(/\/themes\/(\d+)/);
        if (match) ids.push(match[1]);
      });
      const iframes = Array.from(doc.querySelectorAll('iframe'));
      iframes.forEach(i => {
        try {
          walk(i.contentDocument || i.contentWindow.document);
        } catch(e) {}
      });
    };
    walk(document);
    return [...new Set(ids)];
  };
  return findThemes();
})()