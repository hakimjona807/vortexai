import React, { useState } from 'react';
import {
  Code,
  Layers,
  Database,
  Lock,
  Smartphone,
  ChevronRight,
  Copy,
  Check,
  FileText,
  Workflow,
} from 'lucide-react';

export const ApiDocumentationView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/api/auth/login',
      category: 'Autentifikatsiya',
      description: 'Olimboyning kelajakdagi Android ilovasi uchun kirish va JWT token olish.',
      sampleRequest: JSON.stringify(
        {
          phone_number: '+998901234567',
          password: 'olimboy_secure_pass',
        },
        null,
        2
      ),
      sampleResponse: JSON.stringify(
        {
          status: 'authenticated',
          token: 'vortex_jwt_Kzk5ODkwMTIzNDU2Nw==_1774340000000',
          user: {
            role: 'olimboy_admin',
            name: 'Olimboy (Dorixona Boshqaruvchisi)',
            phone: '+998901234567',
            permissions: ['medicines_crud', 'orders_approve', 'set_prices', 'view_calls'],
          },
        },
        null,
        2
      ),
    },
    {
      method: 'GET',
      path: '/api/orders?status=pending_confirmation',
      category: 'Buyurtmalar',
      description: 'Mijoz ovoz orqali tasdiqlagan, lekin Olimboy tasdig‘ini kutayotgan barcha buyurtmalar ro‘yxati.',
      sampleResponse: JSON.stringify(
        {
          total: 1,
          orders: [
            {
              id: 'ord-a1b2c3d4',
              order_number: 'VTX-2026-1001',
              customer_phone: '+998908765432',
              delivery_address: 'Toshkent sh., Yunusobod 14, 25-uy',
              status: 'pending_confirmation',
              confirmed_by_customer: true,
              olimboy_confirmed: false,
              total_amount: 9500,
              items: [
                { medicine_name: 'Paratsetamol', quantity: 2, unit_price: 3500, subtotal: 7000 },
                { medicine_name: 'Tsitramon P', quantity: 1, unit_price: 2500, subtotal: 2500 },
              ],
            },
          ],
        },
        null,
        2
      ),
    },
    {
      method: 'PATCH',
      path: '/api/orders/:id/status',
      category: 'Buyurtmalar',
      description: 'Olimboy buyurtmani tasdiqlashi yoki statusini o‘zgartirishi (Mijozga avtomatik qo‘ng‘iroq rejalashtiriladi).',
      sampleRequest: JSON.stringify(
        {
          status: 'confirmed',
          reason: 'Olimboy dorilarni qadoqlashga ruxsat berdi',
          trigger_callback: true,
        },
        null,
        2
      ),
      sampleResponse: JSON.stringify(
        {
          order: {
            id: 'ord-a1b2c3d4',
            status: 'confirmed',
            olimboy_confirmed: true,
            updated_at: '2026-10-23T16:15:00.000Z',
          },
          scheduled_callback_id: 'cb-99887766',
        },
        null,
        2
      ),
    },
    {
      method: 'PATCH',
      path: '/api/orders/:id/price',
      category: 'Narx belgilash',
      description: 'Olimboy tomonidan buyurtmaning yakuniy summasini belgilash (AI narx o‘ylab topmaydi).',
      sampleRequest: JSON.stringify(
        {
          total_amount: 150000,
        },
        null,
        2
      ),
      sampleResponse: JSON.stringify(
        {
          id: 'ord-a1b2c3d4',
          total_amount: 150000,
          status: 'pending_confirmation',
        },
        null,
        2
      ),
    },
    {
      method: 'GET',
      path: '/api/inquiries',
      category: 'Katalogda yo‘q dorilar',
      description: 'Mijozlar qo‘ng‘iroqda so‘ragan, ammo katalogda topilmagan dorilar (Olimboy ko‘rib chiqishi uchun).',
      sampleResponse: JSON.stringify(
        {
          total: 2,
          inquiries: [
            {
              id: 'inq-98f7e6',
              requested_medicine_name: 'Ozempic 1 mg',
              customer_phone: '+998908765432',
              status: 'pending_review',
              notes: 'Qo‘ng‘iroq paytida VORTEX AI tomonidan katalogda topilmagani sababli qayd etildi',
            },
          ],
        },
        null,
        2
      ),
    },
    {
      method: 'GET',
      path: '/api/medicines',
      category: 'Dori katalogi',
      description: 'Dorilar ro‘yxati, ombordagi qoldiq va Olimboy kiritgan rasmiy narxlar.',
      sampleResponse: JSON.stringify(
        {
          total: 10,
          medicines: [
            {
              id: 'med-001',
              name: 'Paratsetamol',
              dosage_form: '500 mg tabletka',
              stock_quantity: 120,
              is_available: true,
              price: 3500,
            },
          ],
        },
        null,
        2
      ),
    },
    {
      method: 'POST',
      path: '/api/telephony/incoming-call',
      category: 'Telephony Webhook',
      description: 'O‘zbekiston telefon shlyuzidan (Voximplant UZ / Uztelecom SIP) keladigan yangi qo‘ng‘iroq vebhuki.',
      sampleRequest: JSON.stringify(
        {
          call_sid: 'call_uz_998712001122_001',
          caller_phone: '+998908765432',
          dialed_number: '+998712001122',
          provider: 'voximplant_uz',
        },
        null,
        2
      ),
      sampleResponse: JSON.stringify(
        {
          status: 'success',
          session_id: 'call-1a2b3c',
          greeting_text: 'Assalomu alaykum! VORTEX AI dorixona buyurtmalarini qabul qilish xizmatiga xush kelibsiz. Sizga qanday dorilar kerak?',
          telephony_action: 'gather_speech',
        },
        null,
        2
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Kelajakdagi Android Admin Ilovasi uchun REST API Hujjatlari
            </h2>
            <p className="text-xs text-slate-400">
              Ushbu backend Olimboyning Android ilovasi bevosita ulanishi uchun tayyorlangan to‘liq
              REST va Webhook interfeysiga ega.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Base URL:</span>
            <code className="text-cyan-400 font-mono font-medium">https://api.vortex-pharmacy.uz/api</code>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Autentifikatsiya:</span>
            <code className="text-emerald-400 font-mono font-medium">Bearer {'<JWT_TOKEN>'}</code>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Takrorlanishdan himoya:</span>
            <code className="text-purple-400 font-mono font-medium">Idempotency-Key: {'<UUID>'}</code>
          </div>
        </div>
      </div>

      {/* Architecture & Order Flow Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Workflow className="w-4 h-4 text-cyan-400" /> VORTEX AI Buyurtmalar Holati Bosqichlari (State Machine)
        </h3>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            Yangi buyurtma (new)
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <span className="px-3 py-1.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/80 font-medium">
            Tasdiqlash kutilmoqda (pending_confirmation)
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <span className="px-3 py-1.5 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-800/80">
            Olimboy tasdiqladi (confirmed)
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <span className="px-3 py-1.5 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/80">
            Tayyorlanmoqda (preparing)
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 font-medium">
            Yetkazib berildi (delivered)
          </span>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="text-amber-400 font-semibold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Qat’iy xavfsizlik qoidasi:
          </div>
          <div>
            Mijoz ovoz orqali buyurtmani tasdiqlaganda, u faqat <b>“Tasdiqlash kutilmoqda”</b> holatida
            saqlanadi. <b>Olimboy admin ilovasida tasdiqlamaguncha yetkazib berish boshlanmaydi!</b>
          </div>
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Code className="w-4 h-4 text-cyan-400" /> API Endpointlar Ro‘yxati
        </h3>

        <div className="space-y-3">
          {endpoints.map((ep, idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold ${
                      ep.method === 'GET'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : ep.method === 'POST'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <code className="text-sm text-white font-mono font-semibold">{ep.path}</code>
                </div>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                  {ep.category}
                </span>
              </div>

              <p className="text-xs text-slate-400">{ep.description}</p>

              {ep.sampleRequest && (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase font-semibold mb-1">
                    <span>So‘rov tanasi (Request Body):</span>
                    <button
                      onClick={() => copyToClipboard(ep.sampleRequest!, idx * 10)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedIndex === idx * 10 ? (
                        <>
                          <Check className="w-3 h-3" /> Nusxa olindi
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Nusxa olish
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                    {ep.sampleRequest}
                  </pre>
                </div>
              )}

              {ep.sampleResponse && (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase font-semibold mb-1">
                    <span>Server javobi (Response 200 OK):</span>
                    <button
                      onClick={() => copyToClipboard(ep.sampleResponse!, idx * 10 + 1)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedIndex === idx * 10 + 1 ? (
                        <>
                          <Check className="w-3 h-3" /> Nusxa olindi
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Nusxa olish
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300/90 overflow-x-auto">
                    {ep.sampleResponse}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
