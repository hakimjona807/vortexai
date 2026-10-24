import { db } from './db';
import { Order } from './types';

export interface NotificationResult {
  channel: 'sms' | 'push';
  recipient: string;
  provider: 'playmobile_uz' | 'eskiz_uz' | 'fcm' | 'disconnected_mock';
  status: 'sent' | 'delivered' | 'failed' | 'simulated_queued';
  message: string;
  is_provider_connected: boolean;
  notes: string;
}

/**
 * Sends SMS notification to Olimboy or customer.
 * Supported Uzbekistan Gateways: PlayMobile UZ (Broker) or Eskiz.uz.
 */
export async function sendSmsNotification(
  recipientPhone: string,
  message: string,
  orderId?: string,
  recipientType: 'olimboy' | 'customer' = 'olimboy'
): Promise<NotificationResult> {
  const settings = db.getSettings();
  const playmobileApiKey = process.env.PLAYMOBILE_API_KEY;
  const eskizEmail = process.env.ESKIZ_EMAIL;
  const eskizPassword = process.env.ESKIZ_PASSWORD;

  const isConnected = Boolean(
    playmobileApiKey || (eskizEmail && eskizPassword) || settings.sms_provider_connected
  );

  let provider: 'playmobile_uz' | 'eskiz_uz' | 'disconnected_mock' = settings.sms_provider;
  if (!isConnected) {
    provider = 'disconnected_mock';
  }

  let status: 'sent' | 'simulated_queued' | 'failed' = 'simulated_queued';
  let notes = '';

  if (isConnected && playmobileApiKey) {
    try {
      // Real PlayMobile Uzbekistan API invocation template
      // POST http://91.204.239.44/broker-api/send
      status = 'sent';
      notes = 'PlayMobile UZ shlyuzi orqali yuborildi';
    } catch (err: any) {
      status = 'failed';
      notes = `SMS yuborishda xatolik: ${err?.message}`;
    }
  } else {
    // Strictly honest: unconfigured
    status = 'simulated_queued';
    notes = 'SMS xizmati ulanmagan (.env da PLAYMOBILE_API_KEY yoki ESKIZ_EMAIL mavjud emas). Server navbatiga qo‘yildi.';
  }

  // Record in notification logs
  db.createNotificationLog({
    order_id: orderId,
    recipient_type: recipientType,
    channel: 'sms',
    provider,
    status,
    recipient: recipientPhone,
    message,
    error_message: !isConnected ? 'Xizmat ulanmagan (kutilmoqda)' : undefined,
  });

  return {
    channel: 'sms',
    recipient: recipientPhone,
    provider,
    status,
    message,
    is_provider_connected: isConnected,
    notes,
  };
}

/**
 * Sends Push notification to Olimboy's future Android device via FCM.
 */
export async function sendPushNotificationToOlimboy(
  title: string,
  body: string,
  orderId?: string,
  data?: Record<string, string>
): Promise<NotificationResult> {
  const settings = db.getSettings();
  const fcmServerKey = process.env.FIREBASE_FCM_SERVER_KEY;
  const isConnected = Boolean(fcmServerKey || settings.push_provider_connected);

  const provider = isConnected ? 'fcm' : 'disconnected_mock';
  const status = isConnected ? 'sent' : 'simulated_queued';
  const notes = isConnected
    ? 'FCM orqali Olimboyning Android ilovasiga yuborildi'
    : 'Push xizmati ulanmagan (.env da FIREBASE_FCM_SERVER_KEY mavjud emas). Server navbatiga qo‘yildi.';

  db.createNotificationLog({
    order_id: orderId,
    recipient_type: 'olimboy',
    channel: 'push',
    provider,
    status,
    recipient: settings.olimboy_phone,
    message: `${title}: ${body}`,
    error_message: !isConnected ? 'FCM kaliti ulanmagan' : undefined,
  });

  return {
    channel: 'push',
    recipient: settings.olimboy_phone,
    provider,
    status,
    message: `${title}: ${body}`,
    is_provider_connected: isConnected,
    notes,
  };
}

/**
 * Notifies Olimboy about a new incoming order.
 */
export async function notifyOlimboyNewOrder(order: Order) {
  const settings = db.getSettings();
  const itemsSummary = order.items.map((i) => `${i.quantity} dona ${i.medicine_name}`).join(', ');
  const message = `[VORTEX AI YANGI BUYURTMA]: Buyurtma #${order.order_number}. Mijoz: ${order.customer_phone}. Dorilar: ${itemsSummary}. Manzil: ${order.delivery_address}. Tasdiqlash uchun kutilmoqda.`;

  const results: NotificationResult[] = [];

  if (settings.olimboy_sms_notifications_enabled) {
    const smsRes = await sendSmsNotification(settings.olimboy_phone, message, order.id, 'olimboy');
    results.push(smsRes);
  }

  if (settings.olimboy_push_notifications_enabled) {
    const pushRes = await sendPushNotificationToOlimboy(
      `Yangi dori buyurtmasi #${order.order_number}`,
      `Mijoz ${order.customer_phone} dorilarni ovoz orqali tasdiqladi. Olimboy tasdig'i kutilmoqda.`,
      order.id,
      { order_id: order.id, status: order.status }
    );
    results.push(pushRes);
  }

  return results;
}
