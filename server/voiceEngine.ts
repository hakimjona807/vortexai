import { ai } from './geminiClient';
import { db } from './db';
import { CallSession, Medicine } from './types';

export interface VoiceProcessResult {
  ai_reply_text: string;
  next_step: CallSession['current_step'];
  audio_base64?: string;
  is_call_ended: boolean;
  order_id?: string;
  inquiry_ids?: string[];
  intent?: string;
  verification_summary?: {
    medicines: Array<{ name: string; quantity: number; unit_price: number | null }>;
    address: string;
    phone: string;
    total_amount: number | null;
  };
}

/**
 * Checks if current time is within business hours (Asia/Tashkent).
 */
export function isWithinBusinessHours(): { isOpen: boolean; start: string; end: string } {
  const settings = db.getSettings();
  if (settings.is_24_7) return { isOpen: true, start: settings.business_start_time, end: settings.business_end_time };

  // Current Tashkent time
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: settings.timezone || 'Asia/Tashkent',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  };
  const timeFormatter = new Intl.DateTimeFormat([], options);
  const timeString = timeFormatter.format(now); // e.g. "14:30"
  const [currentHour, currentMin] = timeString.split(':').map(Number);
  const currentTotal = currentHour * 60 + currentMin;

  const [startHour, startMin] = settings.business_start_time.split(':').map(Number);
  const startTotal = startHour * 60 + startMin;

  const [endHour, endMin] = settings.business_end_time.split(':').map(Number);
  const endTotal = endHour * 60 + endMin;

  const isOpen = currentTotal >= startTotal && currentTotal <= endTotal;
  return { isOpen, start: settings.business_start_time, end: settings.business_end_time };
}

/**
 * Generates natural Uzbek speech audio using Gemini TTS (gemini-3.8-flash-lite-tts).
 */
export async function synthesizeSpeechUzbek(text: string): Promise<string | undefined> {
  try {
    if (!process.env.GEMINI_API_KEY) return undefined;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `O‘zbek tilida tabiiy, xushmuomala, ravon va professional dorixona operatori ovozi bilan o‘qing: ${text}`,
              speechMetadata: {
                style: 'Calm, polite, helpful pharmacy voice assistant in Uzbek',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (err) {
    console.warn('Gemini TTS synthesis fallback (client speech will be used):', err);
    return undefined;
  }
}

/**
 * Main dialog manager for VORTEX AI voice telephone calls.
 */
export async function processVoiceTurn(
  sessionId: string,
  userUtterance: string
): Promise<VoiceProcessResult> {
  const session = db.getCallSessionById(sessionId);
  if (!session) {
    throw new Error(`Call session ${sessionId} not found`);
  }

  // 1. Check business hours
  const businessHours = isWithinBusinessHours();
  if (!businessHours.isOpen && session.transcript.length === 0) {
    const outOfHoursReply = `Assalomu alaykum! VORTEX AI dorixona xizmati hozirda ish vaqtidan tashqarida. Bizning ish vaqtimiz: soat ${businessHours.start} dan ${businessHours.end} gacha. Iltimos, ish vaqtimizda qayta qo‘ng‘iroq qiling yoki buyurtmangizni yozib qoldiring. Salomat bo‘ling!`;
    db.addTranscriptTurn(sessionId, {
      speaker: 'vortex_ai',
      text: outOfHoursReply,
      intent: 'out_of_hours_notification',
    });
    db.updateCallSession(sessionId, {
      status: 'completed',
      termination_reason: 'out_of_hours',
      end_time: new Date().toISOString(),
    });
    const audio = await synthesizeSpeechUzbek(outOfHoursReply);
    return {
      ai_reply_text: outOfHoursReply,
      next_step: 'completed',
      audio_base64: audio,
      is_call_ended: true,
      intent: 'out_of_hours',
    };
  }

  // Record user utterance in transcript
  db.addTranscriptTurn(sessionId, {
    speaker: 'customer',
    text: userUtterance,
  });

  const catalogMedicines = db.getMedicines();
  const catalogSummary = catalogMedicines.map((m) => ({
    id: m.id,
    name: m.name,
    dosage: m.dosage_form,
    stock: m.stock_quantity,
    is_available: m.is_available,
    price_uzs: m.price,
    category: m.category,
  }));

  // Build prompt for Gemini to analyze user intent and formulate strict Uzbek response
  const conversationHistory = session.transcript
    .slice(-6)
    .map((t) => `${t.speaker === 'vortex_ai' ? 'VORTEX AI' : 'Mijoz'}: ${t.text}`)
    .join('\n');

  const systemInstruction = `
Sen VORTEX AI nomli, O‘zbekistondagi dorixona uchun telefon orqali buyurtmalarni qabul qiluvchi aqlli ovozli yordamchisisan.
Muloqot tili: O‘zbek tili (lotin alifbosi, tabiiy, xushmuomala, aniq va ixcham).

QAT’IY VA BUZILMAS QOIDALAR:
1. Sen FAQAT dori buyurtmasi va unga aloqador savollarga javob berasan.
2. Tibbiy tashxis qo‘yma, dori dozasini belgilama, tibbiy davolash tavsiyalarini berma! Agar mijoz "boshim og‘riyapti nima ichay" desa, faqat shifokorga murojaat qilishni tavsiya qil va mijoz aniq dori nomini aytsagina buyurtmaga qo‘shish mumkinligini ayt.
3. Serverdagi tasdiqlangan dori katalogidan foydalan. Narxni O‘ZING O‘YLAB TOPMA. Narx faqat Olimboy kiritgan narx bo‘lishi shart. Agar katalogda narx bo‘lmasa (null), "Narx kutilmoqda, Olimboy tomonidan belgilanadi" deb ayt.
4. Ombordagi miqdorni taxmin qilma. Agar dori omborda qolmagan bo‘lsa (stock=0 yoki is_available=false), dori omborda tugaganini ochiq ayt.
5. Agar dori katalogda mavjud bo‘lmasa:
   - Mijozga dori hozirda dorixona katalogida topilmaganini ayt.
   - Bu so‘rov Olimboy ko‘rib chiqishi uchun dori so‘rovi (MedicineInquiry) sifatida alohida yozib olinganini bildir.
   - Uni tasdiqlangan buyurtmaga QO‘SHMA.
6. Agar dori nomi noaniq aytilgan bo‘lsa: mijozdan aniqlashtirib qayta so‘ra ("Kechirasiz, dori nomini aniq eshitmadim, qaytara olasizmi?").
7. Suhbat ketma-ketligi (savollarni BIRMA-BIR ber):
   - 1-qadam (collecting_medicines): Dori nomi va kerakli miqdori (qadoq yoki dona).
   - 2-qadam (collecting_address): Yetkazib berish manzili (ko‘cha, uy, xonadon).
   - 3-qadam (collecting_notes): Qo‘shimcha izoh yoki kuryer uchun belgi (agar bo‘lsa).
   - 4-qadam (collecting_phone_consent): Telefon raqamini tasdiqlash va buyurtma holati haqida qo‘ng‘iroq/SMS olishga rozilik.
   - 5-qadam (verifying_order): Buyurtmani ovoz chiqarib qayta o‘qib berish: dori nomlari, miqdorlari, manzil, telefon raqami. Mijozdan "Buyurtmani tasdiqlaysizmi?" deb aniq tasdiq olish.
8. Mijoz buyurtmani tasdiqlasa: "Rahmat! Buyurtmangiz qabul qilindi va 'Tasdiqlash kutilmoqda' holatida saqlangan. Olimboy buyurtmani tasdiqlagach, sizga xabar beriladi va yetkazib berish boshlanadi." deb suhbatni yakunla.
`;

  const promptContent = `
Hozirgi qo‘ng‘iroq ma’lumotlari:
- Call SID: ${session.call_sid}
- Qo‘ng‘iroq qilgan telefon raqami: ${session.caller_phone}
- Hozirgi bosqich: ${session.current_step}
- Hozirgacha yig‘ilgan qoralama ma’lumotlar: ${JSON.stringify(session.draft_data)}

Haqiqiy tasdiqlangan dori katalogi (faqat shundan foydalan):
${JSON.stringify(catalogSummary, null, 2)}

So‘nggi muloqot tarixi:
${conversationHistory}

Mijozning so‘nggi jumlasi: "${userUtterance}"

Vazifang:
Mijozning gapini tahlil qil, katalog bilan solishtir, kerakli yangi ma’lumotlarni ajratib ol va VORTEX AI ning o‘zbek tilidagi keyingi javobini JSON formatida qaytar.

Quyidagi JSON sxemasi bo‘yicha javob ber:
{
  "reply_text": "Mijozga aytiladigan o‘zbekcha tabiiy ovozli javob",
  "next_step": "greeting" | "collecting_medicines" | "collecting_address" | "collecting_notes" | "verifying_order" | "completed",
  "detected_intent": "order_medicine" | "clarify_name" | "unlisted_medicine" | "provide_address" | "confirm_order" | "reject_order" | "medical_advice_blocked" | "general_query",
  "extracted_items": [
    {
      "raw_name": "string",
      "matched_catalog_id": "string yoki null",
      "quantity": 1,
      "in_catalog": true | false,
      "is_in_stock": true | false
    }
  ],
  "unlisted_medicines": ["katalogda yo'q dori nomlari"],
  "delivery_address": "agar aytilgan bo'lsa manzil yoki null",
  "additional_notes": "agar aytilgan bo'lsa izoh yoki null",
  "confirmed_phone": "agar aytilgan bo'lsa telefon yoki null",
  "callback_consent": true | false | null,
  "is_customer_confirmed": true | false | null,
  "is_call_finished": true | false
}
`;

  try {
    let aiResponseJson: any = null;

    try {
      if (process.env.GEMINI_API_KEY) {
        const result = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptContent,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.2, // low temperature for precise factual adherence
          },
        });

        const text = result.text?.trim() || '{}';
        aiResponseJson = JSON.parse(text);
      }
    } catch (apiErr) {
      console.warn('Gemini API call failed or unavailable, using natural rule-based engine:', apiErr);
      aiResponseJson = null;
    }

    // Fallback rule-based engine if Gemini API response is not available or errored
    if (!aiResponseJson || !aiResponseJson.reply_text) {
      aiResponseJson = fallbackRuleBasedDialog(session, userUtterance, catalogMedicines);
    }

    // Process extracted unlisted medicines -> create MedicineInquiry
    const inquiryIds: string[] = [];
    if (aiResponseJson.unlisted_medicines && Array.isArray(aiResponseJson.unlisted_medicines)) {
      for (const unlistedName of aiResponseJson.unlisted_medicines) {
        if (typeof unlistedName === 'string' && unlistedName.trim().length > 1) {
          const inq = db.createInquiry({
            customer_phone: session.caller_phone,
            call_session_id: session.id,
            requested_medicine_name: unlistedName.trim(),
            status: 'pending_review',
            notes: 'Qo‘ng‘iroq paytida VORTEX AI tomonidan katalogda topilmagani sababli qayd etildi',
          });
          inquiryIds.push(inq.id);
        }
      }
    }

    // Update draft data in session
    const updatedDraft = { ...session.draft_data };

    if (aiResponseJson.extracted_items && Array.isArray(aiResponseJson.extracted_items)) {
      for (const item of aiResponseJson.extracted_items) {
        const matched = item.matched_catalog_id ? db.getMedicineById(item.matched_catalog_id) : undefined;
        if (matched) {
          const existingIdx = updatedDraft.medicines.findIndex((m) => m.matched_id === matched.id);
          const medData = {
            raw_name: item.raw_name || matched.name,
            matched_id: matched.id,
            verified_name: matched.name,
            quantity: Number(item.quantity) || 1,
            dosage_form: matched.dosage_form,
            unit_price: matched.price,
            in_catalog: true,
          };
          if (existingIdx >= 0) {
            updatedDraft.medicines[existingIdx] = medData;
          } else {
            updatedDraft.medicines.push(medData);
          }
        }
      }
    }

    if (aiResponseJson.delivery_address) {
      updatedDraft.delivery_address = aiResponseJson.delivery_address;
    }
    if (aiResponseJson.additional_notes) {
      updatedDraft.additional_notes = aiResponseJson.additional_notes;
    }
    if (aiResponseJson.confirmed_phone) {
      updatedDraft.confirmed_phone = aiResponseJson.confirmed_phone;
    } else if (!updatedDraft.confirmed_phone) {
      updatedDraft.confirmed_phone = session.caller_phone;
    }
    if (aiResponseJson.callback_consent !== null && aiResponseJson.callback_consent !== undefined) {
      updatedDraft.callback_consent = aiResponseJson.callback_consent;
    }

    let finalOrderId: string | undefined = undefined;

    // Check if customer explicitly confirmed the order at the end of verifying_order step
    if (aiResponseJson.is_customer_confirmed && updatedDraft.medicines.length > 0) {
      const hasNullPrice = updatedDraft.medicines.some(
        (m) => m.unit_price === null || m.unit_price === undefined
      );
      const initialStatus = hasNullPrice ? 'pending_price' : 'pending_confirmation';

      // Create confirmed order in pending_confirmation or pending_price status
      const createdOrder = db.createOrder({
        customer_phone: updatedDraft.confirmed_phone || session.caller_phone,
        alternative_phone:
          updatedDraft.confirmed_phone !== session.caller_phone ? updatedDraft.confirmed_phone : undefined,
        delivery_address: updatedDraft.delivery_address || "Qo'shimcha aniqlashtirilmagan manzil",
        additional_notes: updatedDraft.additional_notes,
        confirmed_by_customer: true,
        status: initialStatus,
        call_session_id: session.id,
        items: updatedDraft.medicines.map((m) => ({
          medicine_id: m.matched_id,
          medicine_name: m.verified_name || m.raw_name,
          dosage_form: m.dosage_form,
          quantity: m.quantity,
          unit_price: m.unit_price ?? null,
        })),
      });
      finalOrderId = createdOrder.id;

      // Update call session
      db.updateCallSession(session.id, {
        status: 'completed',
        termination_reason: 'completed',
        end_time: new Date().toISOString(),
        recognized_order_id: createdOrder.id,
        current_step: 'completed',
        draft_data: updatedDraft,
      });
    } else {
      // Update session step and draft
      db.updateCallSession(session.id, {
        current_step: aiResponseJson.next_step || session.current_step,
        draft_data: updatedDraft,
        inquiry_ids: [...session.inquiry_ids, ...inquiryIds],
      });
    }

    // Save AI turn
    db.addTranscriptTurn(session.id, {
      speaker: 'vortex_ai',
      text: aiResponseJson.reply_text,
      intent: aiResponseJson.detected_intent,
      extracted_data: {
        medicines_count: updatedDraft.medicines.length,
        has_address: !!updatedDraft.delivery_address,
      },
    });

    // Synthesize audio
    const audio = await synthesizeSpeechUzbek(aiResponseJson.reply_text);

    return {
      ai_reply_text: aiResponseJson.reply_text,
      next_step: aiResponseJson.next_step,
      audio_base64: audio,
      is_call_ended: Boolean(aiResponseJson.is_call_finished || finalOrderId),
      order_id: finalOrderId,
      inquiry_ids: inquiryIds,
      intent: aiResponseJson.detected_intent,
      verification_summary: {
        medicines: updatedDraft.medicines.map((m) => ({
          name: m.verified_name || m.raw_name,
          quantity: m.quantity,
          unit_price: m.unit_price ?? null,
        })),
        address: updatedDraft.delivery_address || '',
        phone: updatedDraft.confirmed_phone || session.caller_phone,
        total_amount: updatedDraft.medicines.reduce<number | null>((acc, curr) => {
          if (acc === null || curr.unit_price === null || curr.unit_price === undefined) return null;
          return acc + curr.unit_price * curr.quantity;
        }, 0),
      },
    };
  } catch (error: any) {
    console.error('Error in processVoiceTurn:', error);
    const errorReply =
      'Kechirasiz, tizimda qisqa uzilish yuz berdi. Dori buyurtmangiz xavfsiz saqlanmoqda, Olimboy tez orada siz bilan bog‘lanadi.';
    db.addTranscriptTurn(session.id, {
      speaker: 'vortex_ai',
      text: errorReply,
      intent: 'system_error_handled',
    });
    return {
      ai_reply_text: errorReply,
      next_step: session.current_step,
      is_call_ended: false,
    };
  }
}

/**
 * Robust fallback dialog rule engine in Uzbek if external AI is temporarily offline
 */
function fallbackRuleBasedDialog(
  session: CallSession,
  input: string,
  medicines: Medicine[]
): any {
  const text = input.toLowerCase();

  // Check for medical advice attempt
  if (
    text.includes('tashxis') ||
    text.includes('nima ichay') ||
    text.includes('qaysi dori yaxshi') ||
    text.includes('tavsiya')
  ) {
    return {
      reply_text:
        'VORTEX AI faqat dori buyurtmalarini qabul qiladi. Biz tibbiy tashxis qo‘ymaymiz va davolash tavsiyasini bermaymiz. Iltimos, shifokor bilan maslahatlashing. Agar aniq kerakli dori nomini bilsangiz, marhamat ayting.',
      next_step: 'collecting_medicines',
      detected_intent: 'medical_advice_blocked',
      is_call_finished: false,
    };
  }

  // Check medicines in catalog
  const matchedMeds: any[] = [];
  const unlistedMeds: string[] = [];

  for (const med of medicines) {
    if (text.includes(med.name.toLowerCase())) {
      matchedMeds.push({
        raw_name: med.name,
        matched_catalog_id: med.id,
        quantity: 1,
        in_catalog: true,
        is_in_stock: med.is_available && med.stock_quantity > 0,
      });
    }
  }

  if (session.current_step === 'greeting' || session.current_step === 'collecting_medicines') {
    if (matchedMeds.length > 0) {
      const med = matchedMeds[0];
      const catalogItem = medicines.find((m) => m.id === med.matched_catalog_id)!;
      if (!catalogItem.is_available || catalogItem.stock_quantity <= 0) {
        return {
          reply_text: `${catalogItem.name} dorisi hozirda omborimizda tugagan. Boshqa dori kerakmi?`,
          next_step: 'collecting_medicines',
          detected_intent: 'out_of_stock',
          extracted_items: [],
          is_call_finished: false,
        };
      }

      const priceText = catalogItem.price ? `${catalogItem.price.toLocaleString('uz-UZ')} so‘m` : 'narxi Olimboy tomonidan tasdiqlanadi';
      return {
        reply_text: `Tushundim, ${catalogItem.name} (${catalogItem.dosage_form}), tasdiqlangan narxi ${priceText}. Necha qadoq yoki dona kerak? Va yetkazib berish manzilini aytsangiz.`,
        next_step: 'collecting_address',
        detected_intent: 'order_medicine',
        extracted_items: matchedMeds,
        is_call_finished: false,
      };
    }

    // If medicine name not recognized
    if (text.length > 3 && !text.includes('ha') && !text.includes('yoq')) {
      unlistedMeds.push(input);
      return {
        reply_text: `Kechirasiz, siz aytgan dori hozircha katalogimizda topilmadi. Men buni Olimboy ko‘rib chiqishi uchun dori so‘rovi sifatida qayd qilib qo‘ydim. Katalogimizdagi boshqa dorilardan kerakmi?`,
        next_step: 'collecting_medicines',
        detected_intent: 'unlisted_medicine',
        unlisted_medicines: unlistedMeds,
        is_call_finished: false,
      };
    }
  }

  if (session.current_step === 'collecting_address') {
    return {
      reply_text: `Manzil qabul qilindi. Kuryer uchun qo‘shimcha izoh yoki mo‘ljal bormi? Masalan, dom raqami yoki eshik kodi?`,
      next_step: 'collecting_notes',
      delivery_address: input,
      detected_intent: 'provide_address',
      is_call_finished: false,
    };
  }

  if (session.current_step === 'collecting_notes') {
    const medNames = session.draft_data.medicines.map((m) => `${m.quantity} ta ${m.verified_name || m.raw_name}`).join(', ') || '1 ta Paratsetamol';
    const address = session.draft_data.delivery_address || 'Kiritilgan manzil';
    const phone = session.caller_phone;

    return {
      reply_text: `Buyurtmangizni tekshirib olamiz: Dorilar: ${medNames}. Yetkazib berish manzili: ${address}. Aloqa uchun raqamingiz: ${phone}. Buyurtmani tasdiqlaysizmi?`,
      next_step: 'verifying_order',
      additional_notes: input,
      detected_intent: 'verify_order_prompt',
      is_call_finished: false,
    };
  }

  if (session.current_step === 'verifying_order') {
    if (text.includes('ha') || text.includes('tasdiq') || text.includes('to‘g‘ri') || text.includes('togri')) {
      return {
        reply_text:
          'Katta rahmat! Buyurtmangiz qabul qilindi va "Tasdiqlash kutilmoqda" holatida saqlandi. Olimboy buyurtmani tasdiqlagach, yetkazib berish boshlanadi va sizga SMS yuboriladi. Salomat bo‘ling!',
        next_step: 'completed',
        detected_intent: 'confirm_order',
        is_customer_confirmed: true,
        is_call_finished: true,
      };
    } else {
      return {
        reply_text: 'Tushundim. Qaysi ma’lumotda xatolik bor? Dori nomi, miqdori yoki manzilni qaytadan aytsangiz, darhol to‘g‘rilayman.',
        next_step: 'collecting_medicines',
        detected_intent: 'reject_order',
        is_call_finished: false,
      };
    }
  }

  return {
    reply_text: 'Assalomu alaykum! VORTEX AI dorixona buyurtmalarini qabul qilish xizmatiga xush kelibsiz. Sizga qanday dorilar kerak?',
    next_step: 'collecting_medicines',
    detected_intent: 'greeting',
    is_call_finished: false,
  };
}

/**
 * Handles premature hangup (Aloqa uzilishi) according to Section 12:
 * "Agar mijoz telefonni buyurtma tugamasidan qo‘yib yuborsa:
 * - Yig‘ilgan ma’lumotlar saqlansin.
 * - Buyurtma “Tugallanmagan” deb belgilansin.
 * - Olimboyga xabar berilsin.
 * - Mijoz qayta qo‘ng‘iroq olishga rozilik bergan bo‘lsa, belgilangan qoidalar asosida qayta qo‘ng‘iroq qilinsin."
 */
export function handleAbruptHangup(sessionId: string): {
  draftSaved: boolean;
  orderId?: string;
  callbackJobId?: string;
} {
  const session = db.getCallSessionById(sessionId);
  if (!session) return { draftSaved: false };

  // Calculate duration
  const startTime = new Date(session.start_time).getTime();
  const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

  let orderId: string | undefined = undefined;

  // If customer had mentioned any medicines or details, save as incomplete order
  if (session.draft_data.medicines.length > 0 || session.draft_data.delivery_address) {
    const incompleteOrder = db.createOrder({
      customer_phone: session.draft_data.confirmed_phone || session.caller_phone,
      delivery_address: session.draft_data.delivery_address || 'To‘liq kiritilmagan (aloqa uzildi)',
      additional_notes: `Aloqa to‘satdan uzildi. Qoralama izoh: ${session.draft_data.additional_notes || 'yo‘q'}`,
      confirmed_by_customer: false,
      status: 'incomplete', // "Tugallanmagan"
      call_session_id: session.id,
      items: session.draft_data.medicines.map((m) => ({
        medicine_id: m.matched_id,
        medicine_name: m.verified_name || m.raw_name,
        dosage_form: m.dosage_form,
        quantity: m.quantity || 1,
        unit_price: m.unit_price ?? null,
      })),
    });
    orderId = incompleteOrder.id;
  }

  // Update session
  db.updateCallSession(sessionId, {
    status: 'dropped',
    termination_reason: 'hangup_abrupt',
    duration_seconds: durationSec,
    end_time: new Date().toISOString(),
    recognized_order_id: orderId,
  });

  // Schedule callback if customer has consented
  let callbackJobId: string | undefined = undefined;
  const customer = db.getCustomerByPhone(session.caller_phone);
  const hasConsent = customer ? customer.consent_to_call : session.draft_data.callback_consent ?? true;

  if (hasConsent) {
    const cb = db.createCallbackJob({
      order_id: orderId,
      customer_phone: session.caller_phone,
      reason: 'incomplete_call_followup',
      max_retries: db.getSettings().max_callback_retries,
      scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 mins later
      payload: {
        session_id: session.id,
        attempted_medicines: session.draft_data.medicines.map((m) => m.verified_name || m.raw_name),
      },
    });
    callbackJobId = cb.id;
  }

  // Log Olimboy notification
  db.createNotificationLog({
    order_id: orderId,
    recipient_type: 'olimboy',
    channel: 'sms',
    provider: db.getSettings().sms_provider_connected ? db.getSettings().sms_provider : 'disconnected_mock',
    status: db.getSettings().sms_provider_connected ? 'sent' : 'simulated_queued',
    recipient: db.getSettings().olimboy_phone,
    message: `[VORTEX AI OGOHLANTIRISH]: Qo‘ng‘iroq to‘satdan uzildi! Raqam: ${session.caller_phone}. Holati: Tugallanmagan (incomplete). Qayta qo‘ng‘iroq rejalashtirildi.`,
  });

  return { draftSaved: true, orderId, callbackJobId };
}
