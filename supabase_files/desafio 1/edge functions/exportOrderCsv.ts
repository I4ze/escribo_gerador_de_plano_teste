import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req)=>{
  try {
    const url = new URL(req.url);
    const order_id = url.searchParams.get("order_id");
    if (!order_id) return new Response("order_id required", {
      status: 400
    });
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const r = await fetch(`${SUPABASE_URL}/rest/v1/order_items?select=*,products(name,sku)&order_id=eq.${order_id}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    const items = await r.json();
    if (!items.length) return new Response("no items", {
      status: 404
    });
    const header = [
      "sku",
      "product_name",
      "unit_price",
      "quantity",
      "line_total"
    ];
    const rows = items.map((it)=>[
        it.products?.sku ?? "",
        it.products?.name ?? "",
        it.unit_price,
        it.quantity,
        it.line_total
      ]);
    const csv = [
      header.join(","),
      ...rows.map((r)=>r.join(","))
    ].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="order_${order_id}.csv"`
      }
    });
  } catch (err) {
    return new Response(String(err), {
      status: 500
    });
  }
});
