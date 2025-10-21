import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req)=>{
  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response("order_id required", {
        status: 400
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_KEY || !RESEND_API_KEY) {
      console.error("Missing environment variables");
      return new Response("Server configuration error", {
        status: 500
      });
    }
    // Buscar dados do pedido
    const res = await fetch(`${SUPABASE_URL}/rest/v1/order_summary?order_id=eq.${order_id}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      console.error("Supabase error:", await res.text());
      return new Response("Error fetching order", {
        status: 500
      });
    }
    const orders = await res.json();
    const order = orders[0];
    if (!order) {
      return new Response("order not found", {
        status: 404
      });
    }
    // Verificar se temos email
    if (!order.customer_email) {
      console.error("No customer email found for order:", order_id);
      return new Response("Customer email not found", {
        status: 400
      });
    }
    console.log("Order found:", order);
    // Preparar email
    const emailBody = {
      from: "onboarding@resend.dev",
      to: order.customer_email,
      subject: `Confirmação do pedido ${order.order_id}`,
      html: `
        <p>Olá ${order.full_name},</p>
        <p>Recebemos seu pedido <strong>${order.order_id}</strong> no valor de <strong>${order.total_amount} ${order.currency}</strong>.</p>
        <p>Obrigado por comprar conosco!</p>
      `
    };
    // Enviar email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailBody)
    });
    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error("Resend API error:", errorText);
      return new Response(`Erro ao enviar e-mail: ${errorText}`, {
        status: 500
      });
    }
    const emailResult = await emailRes.json();
    console.log("Email sent successfully:", emailResult);
    return new Response(JSON.stringify({
      success: true,
      emailId: emailResult.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(String(err), {
      status: 500
    });
  }
});
