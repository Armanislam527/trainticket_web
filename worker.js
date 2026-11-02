/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// export default {
//   async fetch(request, env, ctx) {
//     // You can view your logs in the Observability dashboard
//     console.info({ message: 'Hello World Worker received a request!' }); 
//     return new Response('Hello World!');
//   }
// };
export default {
  async fetch(request, env, ctx) {
    // 1. Setup proper CORS headers (Crucial for browsers to accept the data)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Allows local development & production to work instantly
      //my personal domain name 
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-device-id", // Added common Shohoz headers
    };

    // 2. Handle browser preflight checks
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 3. Dynamically catch the route sent from your frontend
    const url = new URL(request.url);
    const targetBase = "https://railspaapi.shohoz.com/v1.0/web";
    const targetUrl = targetBase + url.pathname + url.search;

    try {
      // 4. Forward the request exactly as your frontend sent it (preserving POST body data)
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Content-Type": request.headers.get("Content-Type") || "application/json"
        },
        body: request.method !== "GET" && request.method !== "HEAD" ? await request.clone().arrayBuffer() : null
      });

      const data = await response.text();
      
      // 5. Send data back safely with the bypass headers
      return new Response(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Proxy Failed", details: error.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  },
};
