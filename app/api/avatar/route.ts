// Resolves an X/Twitter profile picture for a handle and re-serves it
// same-origin, so the card studio can inline it into the exported PNG.
// Source is unavatar.io (public aggregator); if the handle has no avatar
// we pass the 404 through and the studio falls back to the monogram.
const ALLOWED = /^@?[A-Za-z0-9_]{1,15}$/;

export async function GET(request: Request) {
  const handle = (new URL(request.url).searchParams.get("handle") || "").trim().replace(/^@/, "");
  if (!ALLOWED.test(handle)) {
    return new Response("invalid handle", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://unavatar.io/x/${handle}?fallback=false`, {
      headers: { "user-agent": "ifagrithm-card-studio" },
      cache: "no-store",
    });
  } catch {
    return new Response("avatar lookup failed", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response("no avatar found", { status: 404 });
  }

  const type = upstream.headers.get("content-type") || "";
  if (!type.startsWith("image/")) {
    return new Response("not an image", { status: 415 });
  }
  const buffer = await upstream.arrayBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=3600",
    },
  });
}
