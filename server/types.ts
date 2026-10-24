export type OrderStatus =
  | 'new'
  | 'pending_confirmation'
  | 'pending_price'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_delivery'
  | 'delivering'
  | 'delivered'
  | 'rejected'
  | 'cancelled'
  | 'incomplete';

export interface Medicine {
  id: string;
  name: string;
  dosage_form: string;
  package_type: string;
  stock_quantity: number;
  is_available: boolean;
  price: number | null; // Olimboy kiritgan narx (so'mda)
  category: string;
  manufacturer?: string;
  requires_prescription: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicineInquiry {
  id: string;
  call_session_id?: string;
  customer_phone: string;
  requested_medicine_name: string;
  requested_dosage?: string;
  quantity?: number | string;
  status: 'pending_review' | 'reviewed' | 'stocked' | 'rejected';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  medicine_id?: string;
  medicine_name: string;
  dosage_form?: string;
  quantity: number;
  unit_price: number | null;
  subtotal: number | null;
}

export interface Order {
  id: string;
  order_number: string; // e.g. VTX-2026-1001
  customer_id?: string;
  customer_phone: string;
  alternative_phone?: string;
  delivery_address: string;
  additional_notes?: string;
  confirmed_by_customer: boolean;
  olimboy_confirmed: boolean;
  status: OrderStatus;
  total_amount: number | null; // null if pending Olimboy's price
  call_session_id?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  phone_number: string;
  full_name?: string;
  default_address?: string;
  consent_to_call: boolean;
  consent_recorded_at?: string;
  total_orders: number;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: 'system_voice_ai' | 'olimboy_admin' | 'telephony_event';
  change_reason: string;
  timestamp: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: 'vortex_ai' | 'customer' | 'system';
  text: string;
  audio_url?: string;
  timestamp: string;
  intent?: string;
  extracted_data?: Record<string, unknown>;
}

export interface CallSession {
  id: string;
  call_sid: string;
  caller_phone: string;
  dialed_number: string;
  direction: 'inbound' | 'outbound_callback';
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  status: 'ringing' | 'active' | 'completed' | 'dropped' | 'failed';
  termination_reason?: 'completed' | 'hangup_abrupt' | 'unintelligible' | 'out_of_hours' | 'error' | 'user_declined';
  transcript: TranscriptTurn[];
  recognized_order_id?: string;
  inquiry_ids: string[];
  current_step: 'greeting' | 'collecting_medicines' | 'collecting_address' | 'collecting_notes' | 'verifying_order' | 'completed';
  draft_data: {
    medicines: Array<{
      raw_name: string;
      matched_id?: string;
      verified_name?: string;
      quantity: number;
      dosage_form?: string;
      unit_price?: number | null;
      in_catalog: boolean;
    }>;
    delivery_address?: string;
    additional_notes?: string;
    confirmed_phone?: string;
    callback_consent?: boolean;
    is_customer_verified?: boolean;
  };
}

export interface CallbackJob {
  id: string;
  order_id?: string;
  customer_phone: string;
  reason: 'order_status_update' | 'incomplete_call_followup' | 'medicine_inquiry_update';
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  retry_count: number;
  max_retries: number;
  scheduled_at: string;
  completed_at?: string;
  call_result?: string;
  payload?: Record<string, unknown>;
}

export interface NotificationLog {
  id: string;
  order_id?: string;
  recipient_type: 'olimboy' | 'customer';
  channel: 'sms' | 'push';
  provider: 'playmobile_uz' | 'eskiz_uz' | 'fcm' | 'disconnected_mock';
  status: 'sent' | 'delivered' | 'failed' | 'simulated_queued';
  recipient: string;
  message: string;
  sent_at: string;
  error_message?: string;
}

export interface AppSettings {
  id: string;
  pharmacy_name: string;
  dedicated_phone_number: string;
  business_start_time: string; // "08:00"
  business_end_time: string;   // "22:00"
  is_24_7: boolean;
  active_telephony_provider: 'voximplant_uz' | 'uztelecom_sip' | 'beeline_sip';
  telephony_provider_connected: boolean;
  olimboy_phone: string;
  olimboy_sms_notifications_enabled: boolean;
  olimboy_push_notifications_enabled: boolean;
  sms_provider: 'playmobile_uz' | 'eskiz_uz';
  sms_provider_connected: boolean;
  push_provider_connected: boolean;
  max_callback_retries: number;
  emergency_mode: boolean;
  timezone: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_type: 'system' | 'voice_ai' | 'olimboy_admin' | 'telephony';
  actor_id: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  ip_address?: string;
}
