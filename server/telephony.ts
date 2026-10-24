import { db } from './db';
import { processVoiceTurn, handleAbruptHangup, synthesizeSpeechUzbek } from './voiceEngine';
import { CallSession } from './types';

export interface TelephonyIncomingPayload {
  call_sid: string;
  caller_phone: string;
  dialed_number: string;
  provider?: 'voximplant_uz' | 'uztelecom_sip' | 'beeline_sip' | 'twilio_sip';
  timestamp?: string;
  sip_call_id?: string;
}

export interface TelephonyVoiceTurnPayload {
  session_id: string;
  speech_text?: string;
  confidence?: number;
  is_final?: boolean;
}

export interface TelephonyHangupPayload {
  session_id: string;
  call_sid: string;
  reason?: 'client_hangup' | 'server_hangup' | 'timeout' | 'network_error';
  duration_seconds?: number;
}

/**
 * Handles incoming call webhook from telephony provider.
 */
export async function handleIncomingCall(payload: TelephonyIncomingPayload): Promise<{
  session: CallSession;
  greeting_text: string;
  audio_base64?: string;
  telephony_action: 'gather_speech';
}> {
  const settings = db.getSettings();

  // Create new active CallSession
  const session = db.createCallSession({
    call_sid: payload.call_sid,
    caller_phone: payload.caller_phone,
    dialed_number: payload.dialed_number || settings.dedicated_phone_number,
    direction: 'inbound',
  });

  const greetingText =
    'Assalomu alaykum! VORTEX AI dorixona buyurtmalarini qabul qilish xizmatiga xush kelibsiz. Sizga qanday dorilar kerak?';

  db.addTranscriptTurn(session.id, {
    speaker: 'vortex_ai',
    text: greetingText,
    intent: 'greeting',
  });

  const audio = await synthesizeSpeechUzbek(greetingText);

  return {
    session,
    greeting_text: greetingText,
    audio_base64: audio,
    telephony_action: 'gather_speech',
  };
}

/**
 * Handles speech recognition turn from telephony provider.
 */
export async function handleVoiceTurn(payload: TelephonyVoiceTurnPayload) {
  const { session_id, speech_text } = payload;
  if (!speech_text || !speech_text.trim()) {
    const promptRepetition =
      'Kechirasiz, ovozingizni eshitolmadim. Sizga qanday dori kerakligini ayta olasizmi?';
    db.addTranscriptTurn(session_id, {
      speaker: 'vortex_ai',
      text: promptRepetition,
      intent: 'empty_audio_reprompt',
    });
    const audio = await synthesizeSpeechUzbek(promptRepetition);
    return {
      ai_reply_text: promptRepetition,
      audio_base64: audio,
      is_call_ended: false,
      order_id: undefined,
    };
  }

  const result = await processVoiceTurn(session_id, speech_text);
  return result;
}

/**
 * Handles telephony hangup webhook.
 */
export function handleHangup(payload: TelephonyHangupPayload) {
  const session = db.getCallSessionById(payload.session_id);
  if (!session) {
    return { status: 'not_found' };
  }

  if (session.status === 'completed') {
    return { status: 'already_completed', session };
  }

  // If customer hangs up before order confirmation
  const hangupResult = handleAbruptHangup(payload.session_id);
  return {
    status: 'abrupt_hangup_processed',
    ...hangupResult,
  };
}

/**
 * Triggers outbound callback call to customer (Section 10).
 */
export async function executeOutboundCallback(jobId: string) {
  const job = db.getCallbackJobs().find((j) => j.id === jobId);
  if (!job) throw new Error('Callback job not found');

  const customer = db.getCustomerByPhone(job.customer_phone);
  if (customer && !customer.consent_to_call) {
    db.updateCallbackJob(jobId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      call_result: 'Mijoz qayta qo‘ng‘iroqqa rozilik bermaganligi sababli bekor qilindi',
    });
    return { status: 'cancelled', reason: 'consent_refused' };
  }

  if (job.retry_count >= job.max_retries) {
    db.updateCallbackJob(jobId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      call_result: 'Qayta urinishlar soni cheklovga yetdi',
    });
    return { status: 'failed', reason: 'max_retries_reached' };
  }

  db.updateCallbackJob(jobId, {
    status: 'in_progress',
    retry_count: job.retry_count + 1,
  });

  let messageText = '';
  if (job.reason === 'order_status_update' && job.order_id) {
    const order = db.getOrderById(job.order_id);
    const statusTextUz = getStatusDescriptionUz(order?.status || 'confirmed');
    messageText = `Assalomu alaykum! VORTEX AI dorixona xizmatidan qo‘ng‘iroq qilyapmiz. Buyurtmangiz holati: ${statusTextUz}.`;
  } else if (job.reason === 'incomplete_call_followup') {
    messageText =
      'Assalomu alaykum! VORTEX AI dorixona xizmatidan qo‘ng‘iroq qilyapmiz. Avvalgi qo‘ng‘irog‘ingiz uzilib qolgan edi. Dori buyurtmangizni davom ettirishni xohlaysizmi?';
  } else {
    messageText =
      'Assalomu alaykum! VORTEX AI xizmatidan dorixona so‘rovingiz bo‘yicha qo‘ng‘iroq qilmoqdamiz.';
  }

  const audio = await synthesizeSpeechUzbek(messageText);

  // Complete job
  db.updateCallbackJob(jobId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    call_result: 'Mijozga avtomatik qo‘ng‘iroq orqali xabar yetkazildi',
  });

  db.createAuditLog({
    actor_type: 'telephony',
    actor_id: 'outbound_dialer',
    action: 'OUTBOUND_CALLBACK_EXECUTED',
    resource: `callback_jobs/${job.id}`,
    details: {
      phone: job.customer_phone,
      reason: job.reason,
      message: messageText,
    },
  });

  return {
    status: 'completed',
    message: messageText,
    audio_base64: audio,
  };
}

export function getStatusDescriptionUz(status: string): string {
  const map: Record<string, string> = {
    new: 'Yangi buyurtma',
    pending_confirmation: 'Olimboy tasdig‘i kutilmoqda',
    pending_price: 'Narx kutilmoqda',
    confirmed: 'Tasdiqlandi',
    preparing: 'Dorilar yig‘ilmoqda',
    ready_for_delivery: 'Yetkazib berishga tayyor',
    delivering: 'Kuryer yo‘lda (yetkazib berilmoqda)',
    delivered: 'Yetkazib berildi',
    rejected: 'Rad etildi',
    cancelled: 'Bekor qilindi',
    incomplete: 'Tugallanmagan (aloqa uzilgan)',
  };
  return map[status] || status;
}
