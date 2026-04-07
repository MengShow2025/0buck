(function() {
  const items = Array.from(document.querySelectorAll('.click_apiname'));
  return items.map(li => {
    const attrs = {};
    for (let i = 0; i < li.attributes.length; i++) {
      attrs[li.attributes[i].name] = li.attributes[i].value;
    }
    return {
      text: li.innerText.trim(),
      attrs: attrs,
      parentClass: li.parentElement.className
    };
  });
})();
