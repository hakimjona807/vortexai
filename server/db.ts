import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Medicine,
  MedicineInquiry,
  Order,
  OrderItem,
  Customer,
  OrderStatusHistory,
  CallSession,
  TranscriptTurn,
  CallbackJob,
  NotificationLog,
  AppSettings,
  AuditLog,
  OrderStatus,
} from './types';

interface DatabaseSchema {
  medicines: Medicine[];
  inquiries: MedicineInquiry[];
  orders: Order[];
  customers: Customer[];
  status_history: OrderStatusHistory[];
  call_sessions: CallSession[];
  callback_jobs: CallbackJob[];
  notification_logs: NotificationLog[];
  settings: AppSettings;
  audit_logs: AuditLog[];
  idempotency_keys: Record<string, { order_id: string; created_at: string }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'vortex_db.json');

const INITIAL_MEDICINES: Medicine[] = [
  {
    id: 'med-001',
    name: 'Paratsetamol',
    dosage_form: '500 mg tabletka',
    package_type: '10 dona blister',
    stock_quantity: 120,
    is_available: true,
    price: 3500, // so'm
    category: 'Og‘riq qoldiruvchi va isitma tushiruvchi',
    manufacturer: 'Nobel Pharmsanoat',
    requires_prescription: false,
    description: 'Bosh va tish og‘rig‘i, shamollashdagi yuqori tana haroratida qo‘llaniladi.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'med-002',
    name: 'Tsitramon P',
    dosage_form: 'Tabletka',
    package_type: '10 dona qog‘oz qadoq',
    stock_quantity: 250,
    is_available: true,
    price: 2500,
    category: 'Og‘riq qoldiruvchi',
    manufacturer: 'Jurabek Laboratories',
    requires_prescription: false,
    description: 'Bosh og‘rig‘i va nevralgiyada yordam beradi.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'med-003',
    name: 'Spazmalgon',
    dosage_form: '500 mg tabletka',
    package_type: '20 dona qadoq',
    stock_quantity: 65,
    is_available: true,
    price: 28000,
    category: 'Spazmolitik va og‘riq qoldiruvchi',
    manufacturer: 'Sopharma',
    requires_prescription: false,
    description: 'Ichki a’zolar silliq mushaklari spazmida qo‘llaniladi.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'med-004',
    name: 'Nimesil',
    dosage_form: '100 mg granulalar / sashe',
    package_type: '30 dona paketcha',
    stock_quantity: 80,
    is_available: true,
    price: 135000,
    category: 'Yallig‘lanishga qarshi',
    manufacturer: 'Menarini Group',
    requires_prescription: true,
    description: 'O‘tkir og‘riqlar, bo‘g‘im yallig‘lanishida.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'med-005',
    name: 'Mezim Forte',
    dosage_form: '10 000 TB draje',
    package_type: '20 dona blister',
    stock_quantity: 45,
    is_available: true,
    price: 42000,
    category: 'Ovqat hazm qilish fermentlari',
    manufacturer: 'Berlin-Chemie',
    requires_prescription: false,
    description: 'Hazm qilish jarayonini yaxshilash uchun ferment vositasi.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'med-006',
    name: 'Aspirin Kardio',
    dosage_form: '100 mg tabletka',
    package_type: '28 dona qadoq',
    stock_quantity: 90,
    is_available: true,
    price: 36000,
    category: 'Yurak-qon tomir / Antitrombotsitar',
    manufacturer: 'Bayer',
    requires_prescription: false,
    description: 'Qon quyilishining oldini oluvchi vosita.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'med-007',
    name: 'Mukaltin',
    dosage_form: '50 mg tabletka',
    package_type: '10 dona blister',
    stock_quantity: 180,
    is_available: true,
    price: 3000,
    category: 'Balag‘am ko‘chiruvchi',
    manufacturer: 'Galenika',
    requires_prescription: false,
    description: 'Quruq va balag‘amli yo‘talda balag‘am ajralishini yengillashtiradi.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'med-008',
    name: 'Suprastin',
    dosage_form: '25 mg tabletka',
    package_type: '20 dona qadoq',
    stock_quantity: 40,
    is_available: true,
    price: 39000,
    category: 'Allergiyaga qarshi',
    manufacturer: 'Egis',
    requires_prescription: false,
    description: 'Allergik reaksiyalar, qichishish va toshmalarda qo‘llaniladi.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'med-009',
    name: 'Analgin',
    dosage_form: '500 mg tabletka',
    package_type: '10 dona blister',
    stock_quantity: 0, // Omborda tugagan (Out of stock testing)
    is_available: false,
    price: 3000,
    category: 'Og‘riq qoldiruvchi',
    manufacturer: 'Uzpharmsanoat',
    requires_prescription: false,
    description: 'Kuchli og‘riq va isitma holatlarida.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'med-010',
    name: 'Aflubin',
    dosage_form: '20 ml tomchi',
    package_type: 'Flakon',
    stock_quantity: 15,
    is_available: true,
    price: null, // Narx kutilmoqda (Price pending from Olimboy)
    category: 'Gomeopatik shamollashga qarshi',
    manufacturer: 'Richard Bittner',
    requires_prescription: false,
    description: 'Gripp va O‘RVI profilaktikasi hamda davolash.',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
];

const INITIAL_SETTINGS: AppSettings = {
  id: 'settings-default',
  pharmacy_name: 'VORTEX AI Dorixona Xizmati (Olimboy boshqaruvi)',
  dedicated_phone_number: '+998 71 200 11 22',
  business_start_time: '08:00',
  business_end_time: '22:00',
  is_24_7: false,
  active_telephony_provider: 'voximplant_uz',
  telephony_provider_connected: true,
  olimboy_phone: '+998 90 123 45 67',
  olimboy_sms_notifications_enabled: true,
  olimboy_push_notifications_enabled: true,
  sms_provider: 'playmobile_uz',
  sms_provider_connected: false, // Honesty: unconfigured by default
  push_provider_connected: false, // Honesty: unconfigured by default
  max_callback_retries: 3,
  emergency_mode: false,
  timezone: 'Asia/Tashkent',
  updated_at: new Date().toISOString(),
};

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          medicines: parsed.medicines || INITIAL_MEDICINES,
          inquiries: parsed.inquiries || [],
          orders: parsed.orders || [],
          customers: parsed.customers || [],
          status_history: parsed.status_history || [],
          call_sessions: parsed.call_sessions || [],
          callback_jobs: parsed.callback_jobs || [],
          notification_logs: parsed.notification_logs || [],
          settings: parsed.settings || INITIAL_SETTINGS,
          audit_logs: parsed.audit_logs || [],
          idempotency_keys: parsed.idempotency_keys || {},
        };
      }
    } catch (err) {
      console.error('Error loading db file, initializing fresh:', err);
    }

    const initial: DatabaseSchema = {
      medicines: INITIAL_MEDICINES,
      inquiries: [],
      orders: [],
      customers: [],
      status_history: [],
      call_sessions: [],
      callback_jobs: [],
      notification_logs: [],
      settings: INITIAL_SETTINGS,
      audit_logs: [],
      idempotency_keys: {},
    };
    this.save(initial);
    return initial;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save db file:', err);
    }
  }

  // --- Medicines ---
  getMedicines(): Medicine[] {
    return this.data.medicines;
  }

  getMedicineById(id: string): Medicine | undefined {
    return this.data.medicines.find((m) => m.id === id);
  }

  findMedicineByName(query: string): Medicine | undefined {
    const clean = query.trim().toLowerCase();
    return this.data.medicines.find((m) => {
      const mName = m.name.toLowerCase();
      return mName === clean || mName.includes(clean) || clean.includes(mName);
    });
  }

  searchMedicines(term: string): Medicine[] {
    const clean = term.trim().toLowerCase();
    if (!clean) return this.data.medicines;
    return this.data.medicines.filter((m) =>
      m.name.toLowerCase().includes(clean) ||
      m.category.toLowerCase().includes(clean) ||
      m.dosage_form.toLowerCase().includes(clean)
    );
  }

  addMedicine(med: Omit<Medicine, 'id' | 'created_at' | 'updated_at'>): Medicine {
    const now = new Date().toISOString();
    const newMed: Medicine = {
      ...med,
      id: `med-${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.medicines.push(newMed);
    this.save();
    return newMed;
  }

  updateMedicine(id: string, updates: Partial<Medicine>): Medicine | undefined {
    const index = this.data.medicines.findIndex((m) => m.id === id);
    if (index === -1) return undefined;
    const updated: Medicine = {
      ...this.data.medicines[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.data.medicines[index] = updated;
    this.save();
    return updated;
  }

  deleteMedicine(id: string): boolean {
    const initialLen = this.data.medicines.length;
    this.data.medicines = this.data.medicines.filter((m) => m.id !== id);
    if (this.data.medicines.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Medicine Inquiries (Katalogda yo'q dorilar Olimboy ko'rib chiqishi uchun) ---
  getInquiries(): MedicineInquiry[] {
    return this.data.inquiries;
  }

  createInquiry(inquiry: Omit<MedicineInquiry, 'id' | 'created_at' | 'updated_at'>): MedicineInquiry {
    const now = new Date().toISOString();
    const newInquiry: MedicineInquiry = {
      ...inquiry,
      id: `inq-${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.inquiries.unshift(newInquiry);
    this.save();

    this.createAuditLog({
      actor_type: 'voice_ai',
      actor_id: 'vortex_ai_assistant',
      action: 'MEDICINE_INQUIRY_RECORDED',
      resource: `inquiries/${newInquiry.id}`,
      details: {
        medicine_name: newInquiry.requested_medicine_name,
        phone: newInquiry.customer_phone,
      },
    });

    return newInquiry;
  }

  updateInquiryStatus(id: string, status: MedicineInquiry['status'], notes?: string): MedicineInquiry | undefined {
    const inq = this.data.inquiries.find((i) => i.id === id);
    if (!inq) return undefined;
    inq.status = status;
    if (notes) inq.notes = notes;
    inq.updated_at = new Date().toISOString();
    this.save();
    return inq;
  }

  // --- Orders ---
  getOrders(): Order[] {
    return this.data.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id);
  }

  createOrder(orderData: {
    customer_phone: string;
    alternative_phone?: string;
    delivery_address: string;
    additional_notes?: string;
    confirmed_by_customer: boolean;
    status: OrderStatus;
    items: Array<{
      medicine_id?: string;
      medicine_name: string;
      dosage_form?: string;
      quantity: number;
      unit_price: number | null;
    }>;
    order_number?: string;
    call_session_id?: string;
    idempotency_key?: string;
  }): Order {
    if (orderData.idempotency_key && this.data.idempotency_keys[orderData.idempotency_key]) {
      const existingOrderId = this.data.idempotency_keys[orderData.idempotency_key].order_id;
      const existing = this.getOrderById(existingOrderId);
      if (existing) return existing;
    }

    const now = new Date().toISOString();
    const orderId = `ord-${crypto.randomUUID().slice(0, 8)}`;
    const orderNumber =
      orderData.order_number || `VTX-${new Date().getFullYear()}-${1000 + this.data.orders.length + 1}`;

    let totalAmount: number | null = 0;
    const items: OrderItem[] = orderData.items.map((item, idx) => {
      const subtotal = item.unit_price !== null ? item.unit_price * item.quantity : null;
      if (subtotal === null) {
        totalAmount = null;
      } else if (totalAmount !== null) {
        totalAmount += subtotal;
      }
      return {
        id: `item-${orderId}-${idx + 1}`,
        order_id: orderId,
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        dosage_form: item.dosage_form,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal,
      };
    });

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      customer_phone: orderData.customer_phone,
      alternative_phone: orderData.alternative_phone,
      delivery_address: orderData.delivery_address,
      additional_notes: orderData.additional_notes,
      confirmed_by_customer: orderData.confirmed_by_customer,
      olimboy_confirmed: false, // Never auto-confirmed by Olimboy
      status: orderData.status,
      total_amount: totalAmount,
      call_session_id: orderData.call_session_id,
      items,
      created_at: now,
      updated_at: now,
    };

    this.data.orders.unshift(newOrder);

    if (orderData.idempotency_key) {
      this.data.idempotency_keys[orderData.idempotency_key] = {
        order_id: orderId,
        created_at: now,
      };
    }

    // Record status history
    this.recordStatusHistory({
      order_id: orderId,
      old_status: null,
      new_status: newOrder.status,
      changed_by: 'system_voice_ai',
      change_reason: orderData.confirmed_by_customer
        ? 'Mijoz ovoz orqali buyurtmani tasdiqladi (Olimboy tasdig‘i kutilmoqda)'
        : 'Tugallanmagan qo‘ng‘iroq yoki qoralama buyurtma',
    });

    // Update customer stats
    this.recordCustomerActivity(orderData.customer_phone, orderData.delivery_address, true);

    this.createAuditLog({
      actor_type: 'voice_ai',
      actor_id: 'vortex_voice_gateway',
      action: 'ORDER_CREATED',
      resource: `orders/${orderId}`,
      details: {
        order_number: orderNumber,
        status: newOrder.status,
        items_count: items.length,
        total_amount: totalAmount,
      },
    });

    this.save();
    return newOrder;
  }

  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: 'olimboy_admin' | 'system_voice_ai' | 'telephony_event',
    reason: string
  ): Order | undefined {
    const order = this.getOrderById(orderId);
    if (!order) return undefined;

    const oldStatus = order.status;

    // Strict Rule: Olimboy must confirm order before delivery/preparation can begin
    const deliveryStatuses: OrderStatus[] = ['preparing', 'ready_for_delivery', 'delivering', 'delivered'];
    if (deliveryStatuses.includes(newStatus) && !order.olimboy_confirmed && newStatus !== 'confirmed') {
      throw new Error("Olimboy buyurtmani tasdiqlamaguncha yetkazib berish jarayonini boshlash taqiqlanadi!");
    }

    order.status = newStatus;
    if (newStatus === 'confirmed' && changedBy === 'olimboy_admin') {
      order.olimboy_confirmed = true;
    }
    order.updated_at = new Date().toISOString();

    this.recordStatusHistory({
      order_id: orderId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      change_reason: reason,
    });

    const actorTypeMap: Record<string, 'voice_ai' | 'olimboy_admin' | 'telephony' | 'system'> = {
      olimboy_admin: 'olimboy_admin',
      system_voice_ai: 'voice_ai',
      telephony_event: 'telephony',
    };
    const actorType = actorTypeMap[changedBy] || 'system';

    this.createAuditLog({
      actor_type: actorType,
      actor_id: changedBy === 'olimboy_admin' ? 'olimboy' : 'system',
      action: 'ORDER_STATUS_CHANGED',
      resource: `orders/${orderId}`,
      details: { old_status: oldStatus, new_status: newStatus, reason },
    });

    this.save();
    return order;
  }

  setOrderPrice(orderId: string, totalAmount: number): Order | undefined {
    const order = this.getOrderById(orderId);
    if (!order) return undefined;
    order.total_amount = totalAmount;
    if (order.status === 'pending_price') {
      order.status = 'pending_confirmation';
    }
    order.updated_at = new Date().toISOString();

    this.createAuditLog({
      actor_type: 'olimboy_admin',
      actor_id: 'olimboy',
      action: 'ORDER_PRICE_UPDATED',
      resource: `orders/${orderId}`,
      details: { total_amount: totalAmount },
    });

    this.save();
    return order;
  }

  // --- Customers ---
  getCustomers(): Customer[] {
    return this.data.customers;
  }

  getCustomerByPhone(phone: string): Customer | undefined {
    return this.data.customers.find((c) => c.phone_number === phone);
  }

  recordCustomerActivity(phone: string, address?: string, consent?: boolean): Customer {
    let customer = this.getCustomerByPhone(phone);
    const now = new Date().toISOString();

    if (!customer) {
      customer = {
        id: `cust-${crypto.randomUUID().slice(0, 8)}`,
        phone_number: phone,
        default_address: address,
        consent_to_call: consent ?? true,
        consent_recorded_at: consent ? now : undefined,
        total_orders: 1,
        created_at: now,
        updated_at: now,
      };
      this.data.customers.push(customer);
    } else {
      customer.total_orders += 1;
      if (address) customer.default_address = address;
      if (consent !== undefined) {
        customer.consent_to_call = consent;
        if (consent) customer.consent_recorded_at = now;
      }
      customer.updated_at = now;
    }
    this.save();
    return customer;
  }

  // --- Status History ---
  getStatusHistory(orderId?: string): OrderStatusHistory[] {
    if (orderId) {
      return this.data.status_history.filter((h) => h.order_id === orderId);
    }
    return this.data.status_history;
  }

  recordStatusHistory(history: Omit<OrderStatusHistory, 'id' | 'timestamp'>): OrderStatusHistory {
    const entry: OrderStatusHistory = {
      ...history,
      id: `hist-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.status_history.unshift(entry);
    this.save();
    return entry;
  }

  // --- Call Sessions ---
  getCallSessions(): CallSession[] {
    return this.data.call_sessions;
  }

  getCallSessionById(id: string): CallSession | undefined {
    return this.data.call_sessions.find((s) => s.id === id);
  }

  createCallSession(sessionData: {
    call_sid: string;
    caller_phone: string;
    dialed_number: string;
    direction?: 'inbound' | 'outbound_callback';
  }): CallSession {
    const now = new Date().toISOString();
    const newSession: CallSession = {
      id: `call-${crypto.randomUUID().slice(0, 8)}`,
      call_sid: sessionData.call_sid,
      caller_phone: sessionData.caller_phone,
      dialed_number: sessionData.dialed_number,
      direction: sessionData.direction || 'inbound',
      start_time: now,
      duration_seconds: 0,
      status: 'active',
      transcript: [],
      inquiry_ids: [],
      current_step: 'greeting',
      draft_data: {
        medicines: [],
        callback_consent: true,
      },
    };

    this.data.call_sessions.unshift(newSession);

    this.createAuditLog({
      actor_type: 'telephony',
      actor_id: sessionData.call_sid,
      action: 'CALL_SESSION_STARTED',
      resource: `call_sessions/${newSession.id}`,
      details: {
        caller: sessionData.caller_phone,
        dialed: sessionData.dialed_number,
      },
    });

    this.save();
    return newSession;
  }

  updateCallSession(id: string, updates: Partial<CallSession>): CallSession | undefined {
    const session = this.getCallSessionById(id);
    if (!session) return undefined;
    Object.assign(session, updates);
    this.save();
    return session;
  }

  addTranscriptTurn(
    sessionId: string,
    turn: Omit<TranscriptTurn, 'id' | 'timestamp'>
  ): TranscriptTurn | undefined {
    const session = this.getCallSessionById(sessionId);
    if (!session) return undefined;

    const newTurn: TranscriptTurn = {
      ...turn,
      id: `turn-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    };
    session.transcript.push(newTurn);
    this.save();
    return newTurn;
  }

  // --- Callback Jobs ---
  getCallbackJobs(): CallbackJob[] {
    return this.data.callback_jobs;
  }

  createCallbackJob(jobData: Omit<CallbackJob, 'id' | 'retry_count' | 'status'>): CallbackJob {
    const newJob: CallbackJob = {
      ...jobData,
      id: `cb-${crypto.randomUUID().slice(0, 8)}`,
      retry_count: 0,
      status: 'scheduled',
    };
    this.data.callback_jobs.unshift(newJob);
    this.save();
    return newJob;
  }

  updateCallbackJob(id: string, updates: Partial<CallbackJob>): CallbackJob | undefined {
    const job = this.data.callback_jobs.find((j) => j.id === id);
    if (!job) return undefined;
    Object.assign(job, updates);
    this.save();
    return job;
  }

  // --- Notification Logs ---
  getNotificationLogs(): NotificationLog[] {
    return this.data.notification_logs;
  }

  createNotificationLog(log: Omit<NotificationLog, 'id' | 'sent_at'>): NotificationLog {
    const entry: NotificationLog = {
      ...log,
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      sent_at: new Date().toISOString(),
    };
    this.data.notification_logs.unshift(entry);
    this.save();
    return entry;
  }

  // --- Settings ---
  getSettings(): AppSettings {
    return this.data.settings;
  }

  updateSettings(updates: Partial<AppSettings>): AppSettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();

    this.createAuditLog({
      actor_type: 'olimboy_admin',
      actor_id: 'olimboy',
      action: 'APP_SETTINGS_UPDATED',
      resource: 'settings',
      details: updates,
    });

    return this.data.settings;
  }

  // --- Audit Logs ---
  getAuditLogs(limit = 100): AuditLog[] {
    return this.data.audit_logs.slice(0, limit);
  }

  createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const entry: AuditLog = {
      ...log,
      id: `audit-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.audit_logs.unshift(entry);
    // Keep max 1000 audit records
    if (this.data.audit_logs.length > 1000) {
      this.data.audit_logs.pop();
    }
    this.save();
    return entry;
  }

  // --- Persistence Diagnostics ---
  reloadFromDisk(): DatabaseSchema {
    this.data = this.load();
    return this.data;
  }

  getStorageInfo(): {
    filePath: string;
    existsOnDisk: boolean;
    sizeBytes: number;
    lastModified: string | null;
    totalOrders: number;
    totalMedicines: number;
  } {
    const exists = fs.existsSync(DB_FILE);
    let size = 0;
    let mtime: string | null = null;
    if (exists) {
      const stat = fs.statSync(DB_FILE);
      size = stat.size;
      mtime = stat.mtime.toISOString();
    }
    return {
      filePath: DB_FILE,
      existsOnDisk: exists,
      sizeBytes: size,
      lastModified: mtime,
      totalOrders: this.data.orders.length,
      totalMedicines: this.data.medicines.length,
    };
  }
}

export const db = new Database();
