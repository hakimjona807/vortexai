import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RotateCw,
  Clock,
  CheckCircle,
  XCircle,
  Tag,
} from 'lucide-react';
import { getStatusDescriptionUz } from '../types';

export const LiveCallEventStream: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'inquiries' | 'calls' | 'audit'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [callSessions, setCallSessions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, inqRes, callRes, auditRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/inquiries'),
        fetch('/api/call-sessions'),
        fetch('/api/audit-logs'),
      ]);
      const ordData = await ordRes.json();
      const inqData = await inqRes.json();
      const callData = await callRes.json();
      const auditData = await auditRes.json();

      setOrders(ordData.orders || []);
      setInquiries(inqData.inquiries || []);
      setCallSessions(callData.sessions || []);
      setAuditLogs(auditData.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    const text = getStatusDescriptionUz(status);
    if (status === 'pending_confirmation') {
      return (
        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-xs font-medium">
          {text}
        </span>
      );
    }
    if (status === 'incomplete') {
      return (
        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-xs font-medium">
          {text}
        </span>
      );
    }
    if (status === 'confirmed' || status === 'delivered') {
      return (
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-medium">
          {text}
        </span>
      );
    }
    return (
      <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">
        {text}
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Tabs & Refresh Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Yozilgan Buyurtmalar ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'inquiries'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Katalogda Yo‘q Dori So‘rovlari ({inquiries.length})
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'calls'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Qo‘ng‘iroqlar Jurnali ({callSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Jurnali ({auditLogs.length})
          </button>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 transition flex items-center gap-1.5 text-xs cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yangilash</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Hozircha buyurtmalar mavjud emas. VORTEX AI orqali qo‘ng‘iroq qilib ko‘ring!
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 font-bold text-sm">
                        #{ord.order_number}
                      </span>
                      {getStatusBadge(ord.status)}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(ord.created_at).toLocaleString('uz-UZ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Mijoz telefoni:</span>{' '}
                      <span className="text-slate-200 font-mono font-medium">{ord.customer_phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Yetkazib berish manzili:</span>{' '}
                      <span className="text-slate-200">{ord.delivery_address}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                    <div className="text-slate-400 mb-1 font-semibold">Buyurtma tarkibi:</div>
                    <div className="flex flex-wrap gap-2">
                      {ord.items.map((item: any) => (
                        <span
                          key={item.id}
                          className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700"
                        >
                          {item.quantity} dona {item.medicine_name}{' '}
                          {item.unit_price ? `(${item.unit_price.toLocaleString('uz-UZ')} so‘m)` : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 text-slate-400">
                    <div>
                      Jami summa:{' '}
                      <span className="font-semibold text-slate-200">
                        {ord.total_amount !== null
                          ? `${ord.total_amount.toLocaleString('uz-UZ')} so‘m`
                          : 'Narx kutilmoqda (Olimboy belgilaydi)'}
                      </span>
                    </div>
                    <div>
                      Olimboy tasdig‘i:{' '}
                      <span
                        className={
                          ord.olimboy_confirmed
                            ? 'text-emerald-400 font-semibold'
                            : 'text-amber-400 font-medium'
                        }
                      >
                        {ord.olimboy_confirmed ? 'Tasdiqlangan' : 'Kutilmoqda'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'inquiries' && (
          <div className="space-y-3">
            <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl text-xs text-purple-300">
              ℹ️ <b>Section 6 talabi:</b> Agar dori katalogda topilmasa, VORTEX AI uni tasdiqlangan
              buyurtmaga qo‘shmaydi. Olimboy ko‘rib chiqishi uchun ushbu jadvalga alohida dori so‘rovi
              sifatida saqlanadi.
            </div>

            {inquiries.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Katalogda yo‘q dori so‘rovlari hozircha yo‘q.
              </div>
            ) : (
              inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 text-sm">
                        {inq.requested_medicine_name}
                      </span>
                      <span className="bg-purple-950 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-full text-[11px]">
                        {inq.status}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      So‘ragan raqam: <span className="font-mono text-slate-300">{inq.customer_phone}</span> •{' '}
                      {new Date(inq.created_at).toLocaleString('uz-UZ')}
                    </div>
                    {inq.notes && <div className="text-slate-400 italic">{inq.notes}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'calls' && (
          <div className="space-y-3">
            {callSessions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Qo‘ng‘iroqlar sessiyasi mavjud emas.
              </div>
            ) : (
              callSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 font-semibold">{session.call_sid}</span>
                      <span className="text-slate-400">({session.caller_phone})</span>
                    </div>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">
                      Holati: {session.status} • {session.termination_reason || 'jarayonda'}
                    </span>
                  </div>

                  <div className="text-slate-400 text-[11px]">
                    Boshlanish vaqti: {new Date(session.start_time).toLocaleString('uz-UZ')} •{' '}
                    Transkript replikalari soni: {session.transcript.length}
                  </div>

                  {session.transcript.length > 0 && (
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
                      {session.transcript.slice(-4).map((t: any, i: number) => (
                        <div key={i} className="text-[11px]">
                          <span className={t.speaker === 'vortex_ai' ? 'text-cyan-400' : 'text-slate-300'}>
                            {t.speaker === 'vortex_ai' ? 'VORTEX AI' : 'Mijoz'}:
                          </span>{' '}
                          <span className="text-slate-400">{t.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
            {auditLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">Audit jurnali bo‘sh.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-semibold">{log.action}</span>
                    <span className="text-slate-400 text-[11px]">[{log.actor_type}]</span>
                    <span className="text-slate-400 text-[11px]">{log.resource}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString('uz-UZ')}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
