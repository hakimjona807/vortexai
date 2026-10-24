export interface TranscriptItem {
  id: string;
  speaker: 'vortex_ai' | 'customer' | 'system';
  text: string;
  audio_url?: string;
  timestamp: string;
  intent?: string;
}

export interface CallState {
  isActive: boolean;
  sessionId: string | null;
  callSid: string | null;
  currentStep: 'greeting' | 'collecting_medicines' | 'collecting_address' | 'collecting_notes' | 'verifying_order' | 'completed';
  transcript: TranscriptItem[];
  durationSeconds: number;
  isAiSpeaking: boolean;
  isCustomerSpeaking: boolean;
  lastOrderId?: string;
  inquiryIds?: string[];
  verificationSummary?: {
    medicines: Array<{ name: string; quantity: number; unit_price: number | null }>;
    address: string;
    phone: string;
    total_amount: number | null;
  };
}

export interface SystemSummary {
  status: string;
  service: string;
  version: string;
  business_hours: {
    isOpen: boolean;
    start: string;
    end: string;
  };
  stats: {
    total_medicines: number;
    available_medicines: number;
    total_orders: number;
    pending_confirmation_orders: number;
    incomplete_orders: number;
    unlisted_inquiries: number;
    total_call_sessions: number;
  };
  integrations: {
    telephony_provider: {
      name: string;
      dedicated_phone: string;
      is_connected: boolean;
    };
    sms_gateway: {
      provider: string;
      is_connected: boolean;
      status: string;
    };
    push_notifications: {
      provider: string;
      is_connected: boolean;
      status: string;
    };
    gemini_voice_ai: {
      model: string;
      is_active: boolean;
    };
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
