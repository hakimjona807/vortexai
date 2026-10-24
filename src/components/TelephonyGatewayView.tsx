import React, { useState, useEffect } from 'react';
import {
  Server,
  PhoneCall,
  MessageSquare,
  Bell,
  Clock,
  ShieldCheck,
  AlertCircle,
  Play,
  RotateCw,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { SystemSummary } from '../types';

interface TelephonyGatewayViewProps {
  summary: SystemSummary | null;
  onRefresh: () => void;
}

export const TelephonyGatewayView: React.FC<TelephonyGatewayViewProps> = ({
  summary,
  onRefresh,
}) => {
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [notifLogs, setNotifLogs] = useState<any[]>([]);
  const [testSmsPhone, setTestSmsPhone] = useState('+998 90 123 45 67');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const [cbRes, notifRes] = await Promise.all([
        fetch('/api/callbacks'),
        fetch('/api/notifications'),
      ]);
      const cbData = await cbRes.json();
      const notifData = await notifRes.json();
      setCallbacks(cbData.callbacks || []);
      setNotifLogs(notifData.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerTestSms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'sms',
          recipient: testSmsPhone,
          message:
            '[VORTEX AI]: Olimboy dorixonasidan test xabari. Yangi buyurtma #VTX-2026-1001 qabul qilindi.',
        }),
      });
      const data = await res.json();
      setTestResult(data);
      loadData();
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const triggerTestPush = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'push',
          message: 'Olimboyning kelajakdagi Android ilovasi uchun yangi buyurtma push-bildirishnomasi',
        }),
      });
      const data = await res.json();
      setTestResult(data);
      loadData();
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const executeCallbackNow = async (id: string) => {
    try {
      const res = await fetch(`/api/callbacks/${id}/run`, { method: 'POST' });
      const data = await res.json();
      alert(`Qayta qo‘ng‘iroq natijasi: ${data.message || data.status}`);
      loadData();
    } catch (e: any) {
      alert(`Xatolik: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Telephony Provider Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Telephony Provayderi</h4>
                <p className="text-xs text-slate-400">O‘zbekiston SIP / WebRTC</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Faol
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Tanlangan provayder:</span>
              <span className="text-slate-200 font-mono">Voximplant UZ / Uztelecom</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">VORTEX AI Raqami:</span>
              <span className="text-cyan-400 font-mono font-medium">
                {summary?.integrations.telephony_provider.dedicated_phone || '+998 71 200 11 22'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Protokol:</span>
              <span className="text-slate-300">SIP Trunk & Webhook REST</span>
            </div>
          </div>
        </div>

        {/* SMS Gateway (PlayMobile / Eskiz) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">SMS Shlyuz (PlayMobile UZ)</h4>
                <p className="text-xs text-slate-400">Olimboyga SMS xabarnoma</p>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                summary?.integrations.sms_gateway.is_connected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {summary?.integrations.sms_gateway.is_connected ? 'Ulangan' : 'Mock / Kutilmoqda'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Olimboy telefoni:</span>
              <span className="text-slate-200 font-mono">+998 90 123 45 67</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Holat (Section 11 talabi):</span>
              <span className="text-amber-300">Kalit kiritilmagan (halol)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Navbat mexanizmi:</span>
              <span className="text-slate-300">Server xotirasida navbatga olinadi</span>
            </div>
          </div>
        </div>

        {/* Push Notifications (FCM for Android Admin) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Push Xizmati (FCM)</h4>
                <p className="text-xs text-slate-400">Kelajakdagi Android ilovasi</p>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                summary?.integrations.push_notifications.is_connected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}
            >
              {summary?.integrations.push_notifications.is_connected ? 'Ulangan' : 'API Tayyor'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Protokol:</span>
              <span className="text-slate-200 font-mono">Firebase Cloud Messaging</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Maqsad:</span>
              <span className="text-slate-300">Yangi buyurtmalarda tezkor bildirishnoma</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Android SDK ulanishi:</span>
              <span className="text-purple-300">Backend xizmati to‘liq tayyor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Business Hours & Settings Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Dorixona Ish Vaqti va Ish Jadvali Sozlamalari (Asia/Tashkent)
            </h3>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              summary?.business_hours.isOpen
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {summary?.business_hours.isOpen
              ? 'Hozir: Ish vaqti (Ochiq)'
              : 'Hozir: Ish vaqtidan tashqari (Yopiq)'}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          VORTEX AI ish vaqtini backend bazasidagi <code>AppSettings</code> jadvalidan oladi. Ish
          vaqtidan tashqarida qo‘ng‘iroq qilgan mijozga avtomatik tarzda: “Dorixonamiz ish vaqti{' '}
          {summary?.business_hours.start} dan {summary?.business_hours.end} gacha” deb tushuntirib,
          qo‘ng‘iroqni xushmuomala yakunlaydi.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div>
            <span className="text-slate-400">Ochilish vaqti:</span>{' '}
            <span className="font-mono text-cyan-300 font-semibold">
              {summary?.business_hours.start || '08:00'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Yopilish vaqti:</span>{' '}
            <span className="font-mono text-cyan-300 font-semibold">
              {summary?.business_hours.end || '22:00'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Vaqt mintaqasi:</span>{' '}
            <span className="text-slate-300 font-mono">Asia/Tashkent (UTC+5)</span>
          </div>
        </div>
      </div>

      {/* Manual Notification Tester & Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Trigger Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Olimboyga Bildirishnoma Sinovi
          </h3>
          <p className="text-xs text-slate-400">
            Backend xizmatining SMS va Push mexanizmlari qanday ishlashini tekshirish uchun test
            yuboring:
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">
                Qabul qiluvchi raqam:
              </label>
              <input
                type="text"
                value={testSmsPhone}
                onChange={(e) => setTestSmsPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                disabled={loading}
                onClick={triggerTestSms}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Test SMS yuborish</span>
              </button>
              <button
                disabled={loading}
                onClick={triggerTestPush}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5 text-purple-400" />
                <span>Test Push yuborish</span>
              </button>
            </div>

            {testResult && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold">Natija:</span>
                  <span className="font-mono text-cyan-400">{testResult.status}</span>
                </div>
                <div className="text-slate-400 text-[11px]">{testResult.notes || testResult.message}</div>
              </div>
            )}
          </div>
        </div>

        {/* Automated Outbound Callbacks Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-cyan-400" /> Avtomatik Qayta Qo‘ng‘iroqlar Navbati (Callbacks)
            </h3>
            <button
              onClick={loadData}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              Yangilash
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Buyurtma holati o‘zgarganda yoki qo‘ng‘iroq uzilib qolganda (rozilik bo‘lsa) VORTEX AI mijozga
            qayta qo‘ng‘iroq qiladi.
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {callbacks.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Hozirda rejalashtirilgan qayta qo‘ng‘iroqlar yo‘q
              </div>
            ) : (
              callbacks.map((cb) => (
                <div
                  key={cb.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-200 font-semibold">{cb.customer_phone}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        {cb.reason}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Urinishlar: {cb.retry_count}/{cb.max_retries} • Holati: {cb.status}
                    </div>
                  </div>
                  {cb.status === 'scheduled' && (
                    <button
                      onClick={() => executeCallbackNow(cb.id)}
                      className="px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[11px] flex items-center gap-1 transition"
                    >
                      <Play className="w-3 h-3" /> Qo‘ng‘iroq qilish
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
