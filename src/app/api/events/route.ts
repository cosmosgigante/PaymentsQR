import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { subscribe } from "@/lib/events";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("No autorizado", { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // cliente desconectado
        }
      };

      // ping cada 30s para mantener la conexión
      const ping = setInterval(() => send({ type: "PING" }), 30000);

      const unsub = subscribe(session.restaurantId, send);

      req.signal.addEventListener("abort", () => {
        clearInterval(ping);
        unsub();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
