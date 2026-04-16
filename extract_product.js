(function() {
  const title = document.querySelector('h1')?.innerText || document.querySelector('.product-title')?.innerText || '';
  let image = "";
  const mainImgEl = document.querySelector('.main-image-container img') ||
                   document.querySelector('.image-gallery img') ||
                   document.querySelector('.magic-image') ||
                   document.querySelector('.icbu-shop-video-player-poster img') ||
                   document.querySelector('.gallery-container img') ||
                   document.querySelector('.main-image img');
  
  if (mainImgEl && mainImgEl.src && !mainImgEl.src.includes('.svg') && !mainImgEl.src.includes('tps')) {
    image = mainImgEl.src;
  } else {
    const imgs = Array.from(document.querySelectorAll('img')).filter(img => {
       const src = img.src;
       return (src.includes('/kf/') || src.includes('imgextra')) && !src.endsWith('.svg') && !src.includes('tps') && !src.includes('icon');
    });
    if (imgs.length > 0) image = imgs[0].src;
  }
  return { title, image };
})()