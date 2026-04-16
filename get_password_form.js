(async () => {
  try {
    const r = await fetch('https://pxjkad-zt.myshopify.com/password');
    const t = await r.text();
    const doc = new DOMParser().parseFromString(t, 'text/html');
    const form = doc.querySelector('form[action*="/password"]');
    const result = form ? form.outerHTML : "no form found";
    return { __result: result };
  } catch (e) {
    return { __result: "error: " + e.message };
  }
})();
