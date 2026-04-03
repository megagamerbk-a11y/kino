export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const search = (url.searchParams.get('q') || '').toLowerCase().trim();

  const dataUrl = new URL('/data/videos.json', url.origin);
  const response = await fetch(dataUrl.toString());
  const items = await response.json();

  const filtered = !search
    ? items
    : items.filter((item) => {
        return [item.title, item.description, item.category, item.type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });

  return Response.json({ items: filtered }, {
    headers: {
      'Cache-Control': 'public, max-age=60'
    }
  });
}
