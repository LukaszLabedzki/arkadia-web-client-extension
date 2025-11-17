/**
 * Netlify Function to proxy requests to ra.codefx.net API
 * This avoids CORS issues and ensures all headers are properly forwarded
 */

exports.handler = async (event, context) => {
  const { httpMethod, path, headers, body, queryStringParameters } = event;

  // Handle OPTIONS preflight
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    };
  }

  // Extract the API path from query parameters (Netlify passes splat as query param)
  // The redirect: /api/ra/* -> /.netlify/functions/ra-proxy/:splat
  // Results in splat being available in the path or as a param
  let apiPath = '/';

  // Try to get splat from the path
  if (path.includes('/.netlify/functions/ra-proxy/')) {
    apiPath = path.split('/.netlify/functions/ra-proxy/')[1] || '/';
  } else if (path.includes('/.netlify/functions/ra-proxy')) {
    apiPath = path.replace('/.netlify/functions/ra-proxy', '') || '/';
  }

  const targetUrl = `https://ra.codefx.net${apiPath}`;

  console.log(`[RA Proxy] Incoming: ${httpMethod} ${path}`);
  console.log(`[RA Proxy] Target: ${targetUrl}`);
  console.log(`[RA Proxy] Headers:`, JSON.stringify(headers));

  // Prepare headers to forward
  const forwardHeaders = {
    'Content-Type': 'application/json',
  };

  // Forward Authorization header if present (case-insensitive)
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (authHeader) {
    forwardHeaders['Authorization'] = authHeader;
  }

  try {
    const options = {
      method: httpMethod,
      headers: forwardHeaders,
    };

    // Add body for POST/PUT/PATCH requests
    if (body && (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH')) {
      options.body = body;
      console.log(`[RA Proxy] Body:`, body.substring(0, 200));
    }

    console.log(`[RA Proxy] Fetch options:`, JSON.stringify(options));

    const response = await fetch(targetUrl, options);
    const responseText = await response.text();

    console.log(`[RA Proxy] Response: ${response.status}`);
    console.log(`[RA Proxy] Response body:`, responseText.substring(0, 200));

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
        stack: error.stack,
      }),
    };
  }
};
