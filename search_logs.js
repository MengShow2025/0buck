(async () => {
  const rows = Array.from(document.querySelectorAll('tr, [role="row"]'));
  const errorRow = rows.find(row => row.innerText.includes('500') && row.innerText.includes('/api/v1/butler/chat'));
  
  if (errorRow) {
    const allText = rows.map(r => r.innerText).join('\n');
    return { found: true, text: errorRow.innerText, context: allText };
  }
  
  // Try to search for Traceback
  const tracebackRow = rows.find(row => row.innerText.includes('Traceback'));
  if (tracebackRow) {
     const allText = rows.map(r => r.innerText).join('\n');
     return { found: true, tracebackFound: true, text: tracebackRow.innerText, context: allText };
  }

  return { found: false, rowsCount: rows.length, firstRow: rows[0]?.innerText };
})()