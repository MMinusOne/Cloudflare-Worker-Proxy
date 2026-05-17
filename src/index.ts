/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method == 'OPTIONS') {
			return handleCors();
		}

		const url = new URL(request.url);
		const targetUrl = url.searchParams.get('url');

		if (!targetUrl) {
			return new Response(JSON.stringify({ error: 'Missing targetUrl' }), { status: 400, ...corsHeaders() });
		}

		try {
			new URL(targetUrl);
		} catch {
			return new Response(JSON.stringify({ error: 'Invalid target URL provided.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json', ...corsHeaders() },
			});
		}

		try {
			const body = request.method === 'GET' || request.method == 'HEAD' ? null : await request.text();
			const headers = new Headers();

			headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
			headers.set('Accept', request.headers.get('Content-Type') || 'application/json');

			const auth = request.headers.get('Authorization');

			if (auth) {
				headers.set('Authorization', auth);
			}

			const upstreamResponse = await fetch(targetUrl, { method: request.method, headers, body });

			const responseHeaders = new Headers(upstreamResponse.headers);
			Object.entries(corsHeaders()).forEach(([key, value]) => {
				responseHeaders.set(key, value);
			});

			return new Response(upstreamResponse.body, {
				status: upstreamResponse.status,
				statusText: upstreamResponse.statusText,
				headers: responseHeaders,
			});
		} catch (error: any) {
			return new Response(JSON.stringify({ error: 'Internal Proxy Error', details: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json', ...corsHeaders() },
			});
		}
	},
};
//  satisfies ExportedHandler<Env>;

function corsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400',
	};
}

function handleCors(): Response {
	return new Response(null, {
		status: 204,
		headers: corsHeaders(),
	});
}
