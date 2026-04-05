(async () => {
  try {
    const r = await fetch('/api/v1/butler/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Hello' })
    });
    const status = r.status;
    const body = await r.text();
    console.log({ status, body });
    return { __result: { status, body } };
  } catch (e) {
    console.error(e);
    return { __result: { error: e.message, stack: e.stack } };
  }
})();
