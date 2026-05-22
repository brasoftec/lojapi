import prisma from '../config/prisma';

export const triggerWebhook = async (
  storeId: string,
  event: string,
  payload: unknown
): Promise<void> => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { webhookUrl: true },
    });

    if (!store?.webhookUrl) return;

    // Registra o log
    const log = await prisma.webhookLog.create({
      data: {
        storeId,
        event,
        payload: JSON.stringify(payload),
        attempts: 1,
      },
    });

    // Dispara o webhook de forma assíncrona
    fetch(store.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Store-ID': storeId,
        'X-Webhook-Event': event,
      },
      body: JSON.stringify({
        event,
        storeId,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
    })
      .then(async (res) => {
        await prisma.webhookLog.update({
          where: { id: log.id },
          data: { status: res.status, response: res.statusText },
        });
      })
      .catch(async (err) => {
        await prisma.webhookLog.update({
          where: { id: log.id },
          data: { status: 0, response: err.message },
        });
      });
  } catch (err) {
    console.error('Erro ao disparar webhook:', err);
  }
};
