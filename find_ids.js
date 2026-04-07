(function() {
  const items = Array.from(document.querySelectorAll('.navContent li'));
  return items.map(li => ({
    text: li.innerText.trim(),
    id: li.id,
    className: li.className,
    onclick: li.getAttribute('onclick'),
    dataId: li.getAttribute('data-id') || li.getAttribute('api-id')
  }));
})();
