// Quota site Worker: serves the static site from /public and handles the application form.
import { handleApply } from "./apply.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Send www to the main domain so there's one canonical address
    if (url.hostname === "www.quotasaleshq.com") {
      url.hostname = "quotasaleshq.com";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api/apply") {
      if (request.method === "POST") return handleApply(request, env);
      return Response.redirect(new URL("/#apply", url).toString(), 302);
    }

    // Everything else: the website files
    return env.ASSETS.fetch(request);
  },
};
