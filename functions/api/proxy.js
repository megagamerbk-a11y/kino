export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const target = requestUrl.searchParams.get('url');

  if (!target) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let upstreamUrl;
  try {
    upstreamUrl = new URL(target);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  const requestHeaders = new Headers();
  const range = context.request.headers.get('Range');
  if (range) requestHeaders.set('Range', range);

  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: requestHeaders,
    redirect: 'follow'
  });

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    return new Response(`Upstream error: ${upstreamResponse.status}`, {
      status: upstreamResponse.status
    });
  }

  const headers = new Headers();

  const passthroughHeaders = [
    'accept-ranges',
    'content-range',
    'content-length',
    'etag',
    'last-modified',
    'cache-control'
  ];

  for (const name of passthroughHeaders) {
    const value = upstreamResponse.headers.get(name);
    if (value) headers.set(name, value);
  }

  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

  const contentType = upstreamResponse.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  } else {
    headers.set('Content-Type', 'application/octet-stream');
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers
  });
}
