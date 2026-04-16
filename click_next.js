(async () => {
  const paginators = Array.from(document.querySelectorAll('span')).filter(el => el.innerText.trim() === '1/25');
  if (paginators.length > 0) {
    // Find the next arrow relative to the first paginator
    const nextArrow = paginators[0].nextElementSibling;
    if (nextArrow) {
      nextArrow.click();
      return "Clicked next arrow for first list";
    }
  }
  return "Paginator or arrow not found";
})()