/**
 * Netlify Function to proxy requests to ra.codefx.net API
 * This avoids CORS issues and ensures all headers are properly forwarded
 */

exports.handler = async (event, context) => {
  const { httpMethod, path, headers, body } = event;

  // Extract the API path (remove /.netlify/functions/ra-proxy)
  const apiPath = path.replace('/.netlify/functions/ra-proxy', '') || '/';
  const targetUrl = `https://ra.codefx.net${apiPath}`;

  console.log(`[RA Proxy] ${httpMethod} ${apiPath} -> ${targetUrl}`);

  // Prepare headers to forward
  const forwardHeaders = {
    'Content-Type': 'application/json',
  };

  // Forward Authorization header if present
  if (headers['authorization']) {
    forwardHeaders['Authorization'] = headers['authorization'];
  }

  try {
    const options = {
      method: httpMethod,
      headers: forwardHeaders,
    };

    // Add body for POST/PUT/PATCH requests
    if (body && (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH')) {
      options.body = body;
    }

    const response = await fetch(targetUrl, options);
    const responseText = await response.text();

    console.log(`[RA Proxy] Response: ${response.status}`);

    // Return the proxied response
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      body: responseText,
    };
  } catch (error) {
    console.error('[RA Proxy] Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Proxy error',
        message: error.message,
      }),
    };
  }
};
