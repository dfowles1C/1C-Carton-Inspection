// Cloudflare Worker — Monday.com file upload proxy
// Receives a file from the browser and forwards it to Monday's file API,
// working around the CORS restriction on Monday's /v2/file endpoint.

const MONDAY_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY1NTkyOTY0NCwiYWFpIjoxMSwidWlkIjo2NjIwMDk0MiwiaWFkIjoiMjAyNi0wNS0wOFQxNjo1MzozMS4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTE5OTgxMzgsInJnbiI6InVzZTEifQ.6MTB80plpdgEIa-pABoXVXRzxZCeY__Dbq6eyK2yPKc";
const ALLOWED_ORIGIN = "https://dfowles1c.github.io";

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // Parse incoming form data from the browser
      const inForm = await request.formData();
      const itemId = inForm.get("item_id");
      const columnId = inForm.get("column_id");
      const file = inForm.get("file"); // File object

      if (!itemId || !columnId || !file) {
        return new Response("Missing item_id, column_id, or file", { status: 400 });
      }

      // Build the multipart request Monday expects
      const outForm = new FormData();
      outForm.append(
        "query",
        `mutation ($file: File!) {
          add_file_to_column(item_id: ${itemId}, column_id: "${columnId}", file: $file) { id }
        }`
      );
      outForm.append("variables[file]", file, file.name);

      const mondayRes = await fetch("https://api.monday.com/v2/file", {
        method: "POST",
        headers: {
          "Authorization": MONDAY_TOKEN,
          "API-Version": "2024-01",
        },
        body: outForm,
      });

      const json = await mondayRes.json();

      return new Response(JSON.stringify(json), {
        status: mondayRes.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        },
      });
    }
  },
};
