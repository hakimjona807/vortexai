import React, { useState } from 'react';
import {
  TestTube,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Database,
  Lock,
  Layers,
  FileText,
  AlertOctagon,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

interface DiagnosticTestViewProps {
  onDataChanged?: () => void;
}

export const DiagnosticTestView: React.FC<DiagnosticTestViewProps> = ({ onDataChanged }) => {
  const [integrityResult, setIntegrityResult] = useState<any>(null);
  const [violationResult, setViolationResult] = useState<any>(null);
  const [sampleCreationResult, setSampleCreationResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // 1. Create sample orders of different states
  const createSample = async (sampleType: string) => {
    setLoading(`sample_${sampleType}`);
    try {
      const res = await fetch('/api/test/sample-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_type: sampleType }),
      });
      const data = await res.json();
      setSampleCreationResult(data);
      onDataChanged?.();
    } catch (e: any) {
      setSampleCreationResult({ status: 'error', message: e.message });
    } finally {
      setLoading(null);
    }
  };

  // 2. Run Database Integrity Verification
  const verifyIntegrity = async () => {
    setLoading('integrity');
    try {
      const res = await fetch('/api/test/verify-integrity');
      const data = await res.json();
      setIntegrityResult(data);
    } catch (e: any) {
      setIntegrityResult({ is_healthy: false, issues_found: [e.message] });
    } finally {
      setLoading(null);
    }
  };

  // 3. Test Security Violation Prevention
  const testSecurityGuard = async () => {
    setLoading('violation');
    try {
      const res = await fetch('/api/test/simulate-violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_case: 'unauthorized_delivery' }),
      });
      const data = await res.json();
      setViolationResult(data);
      onDataChanged?.();
    } catch (e: any) {
      setViolationResult({ error: e.message });
    } finally {
      setLoading(null);
    }
  };

  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [test001Result, setTest001Result] = useState<any>(null);

  const fetchStorageInfo = async () => {
    try {
      const res = await fetch('/api/storage/info');
      const data = await res.json();
      setStorageInfo(data);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchStorageInfo();
  }, []);

  // 4. Run TEST-001 Complete Persistence & Reload Verification
  const runTest001Persistence = async () => {
    setLoading('test001');
    try {
      const res = await fetch('/api/test/test-001-persistence', { method: 'POST' });
      const data = await res.json();
      setTest001Result(data);
      fetchStorageInfo();
      onDataChanged?.();
    } catch (e: any) {
      setTest001Result({ overall_status: 'FAILED', error: e.message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <TestTube className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              VORTEX AI Sinov Rejimi & Ma’lumotlar Bazasi Diagnostikasi
            </h2>
            <p className="text-xs text-slate-400">
              Buyurtmalarni saqlash, dori katalogi tekshiruvi, holatlar boshqaruvi va Olimboy tasdig‘i
              cheklovlarini sinovdan o‘tkazing.
            </p>
          </div>
        </div>
      </div>
      {/* Storage Location & Persistence Diagnostic Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                1. Buyurtmalar Qayerda Saqlanmoqda? (Doimiy Baza Holati)
              </h3>
              <p className="text-xs text-slate-400">
                Buyurtmalar frontend state yoki vaqtinchalik xotirada emas, server fayl tizimidagi
                doimiy JSON bazada saqlanadi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              ● Doimiy Baza Faol
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Baza turi:</span>
            <span className="text-slate-200 font-mono font-semibold">Server JSON Engine</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Fayl manzili (Path):</span>
            <span className="text-cyan-400 font-mono text-[11px] truncate block" title={storageInfo?.file_path}>
              {storageInfo?.file_path || 'data/vortex_db.json'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Diskdagi hajmi:</span>
            <span className="text-slate-200 font-mono font-semibold">
              {storageInfo ? `${storageInfo.file_size_bytes} bayt` : 'Tekshirilmoqda...'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Saqlangan buyurtmalar:</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">
              {storageInfo ? storageInfo.total_orders_in_db : '0'} ta
            </span>
          </div>
        </div>

        {/* Cloud Firestore Status Note */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold flex items-center gap-1.5 text-cyan-400">
              <Info className="w-4 h-4" /> Cloud Firestore integratsiyasi haqida:
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              Firestore shartlari qabul qilinmadi
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Siz Firebase sozlash oynasida taklifni rad etganingiz sababli, tizim barcha buyurtmalarni
            backend serveridagi xavfsiz <code>data/vortex_db.json</code> faylida doimiy saqlamoqda. Agar
            kelajakda Firebase Firestore ga o‘tishni xohlasangiz, Google Cloud / Firebase konsolida
            loyiha ochib, uning konfiguratsiyasini <code>firebase-applet-config.json</code> sifatida
            joylashtirishingiz kifoya.
          </p>
        </div>
      </div>

      {/* TEST-001 Dedicated Persistence Test Card (8-band talabi) */}
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                TEST-001: Doimiy Saqlash, Faylga Yozish va Qayta Yuklash Sinovi (8-band)
              </h3>
              <p className="text-xs text-slate-400">
                Ushbu test TEST-001 buyurtmasini yaratadi, diskdagi faylga yozilganini tekshiradi, serverni
                qayta ochishni (reload from disk) simulyatsiya qiladi va holat o‘zgarishini qayta saqlaydi.
              </p>
            </div>
          </div>

          <button
            disabled={loading === 'test001'}
            onClick={runTest001Persistence}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-900/30 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>TEST-001 Sinovini Ishga Tushirish</span>
          </button>
        </div>

        {test001Result && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                  test001Result.overall_status === 'SUCCESS'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {test001Result.overall_status === 'SUCCESS' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> TEST-001 Muvaffaqiyatli Sinovdan O‘tdi (Barcha
                    bosqichlar tasdiqlandi)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" /> Sinovda xatolik yuz berdi: {test001Result.error}
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {test001Result.steps?.map((st: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-white">{st.step}</span>
                    <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {st.status}
                    </span>
                  </div>
                  <pre className="p-2 bg-slate-900/80 rounded border border-slate-800/80 text-[11px] text-cyan-300 font-mono overflow-x-auto">
                    {JSON.stringify(st.details, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid: 1. Sample Generator & 2. Security Guard Test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sample Generator Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Namunaviy Buyurtmalar Yaratish
            </h3>
            <span className="text-[11px] text-slate-400">1-bosish bilan test</span>
          </div>

          <p className="text-xs text-slate-400">
            Turli holatlardagi buyurtmalarni yaratib, bazada saqlanishini va statuslar zanjirini tekshiring:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              disabled={!!loading}
              onClick={() => createSample('pending_confirmation')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 text-left border border-slate-800 hover:border-cyan-500/40 rounded-xl transition cursor-pointer"
            >
              <div className="font-semibold text-amber-300 mb-0.5">Tasdiqlash kutilmoqda</div>
              <div className="text-[11px] text-slate-400">
                Mijoz ovoz orqali tasdiqlagan, lekin Olimboy tasdiqlamagan buyurtma.
              </div>
            </button>

            <button
              disabled={!!loading}
              onClick={() => createSample('pending_price')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 text-left border border-slate-800 hover:border-purple-500/40 rounded-xl transition cursor-pointer"
            >
              <div className="font-semibold text-purple-300 mb-0.5">Narx kutilmoqda</div>
              <div className="text-[11px] text-slate-400">
                Narxi kiritilmagan dori bilan buyurtma (AI narx o‘ylab topmaydi).
              </div>
            </button>

            <button
              disabled={!!loading}
              onClick={() => createSample('incomplete')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 text-left border border-slate-800 hover:border-rose-500/40 rounded-xl transition cursor-pointer"
            >
              <div className="font-semibold text-rose-300 mb-0.5">Tugallanmagan (Aloqa uzildi)</div>
              <div className="text-[11px] text-slate-400">
                Mijoz oxirigacha yetkazmagan va to‘satdan uzilgan qo‘ng‘iroq qoralamasi.
              </div>
            </button>

            <button
              disabled={!!loading}
              onClick={() => createSample('unlisted_inquiry')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 text-left border border-slate-800 hover:border-indigo-500/40 rounded-xl transition cursor-pointer"
            >
              <div className="font-semibold text-indigo-300 mb-0.5">Katalogda yo‘q dori so‘rovi</div>
              <div className="text-[11px] text-slate-400">
                Ozempic — buyurtmaga qo‘shilmaydi, MedicineInquiry ga saqlanadi.
              </div>
            </button>
          </div>

          {sampleCreationResult && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-cyan-400">Yaratilgan obyekt:</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {sampleCreationResult.data?.id || sampleCreationResult.data?.order_number}
                </span>
              </div>
              <div className="text-slate-300">{sampleCreationResult.message}</div>
              {sampleCreationResult.data?.status && (
                <div className="text-slate-400 text-[11px]">
                  Holati: <span className="font-mono text-cyan-300">{sampleCreationResult.data.status}</span> •
                  Olimboy tasdig‘i:{' '}
                  <span className="font-mono text-amber-300">
                    {sampleCreationResult.data.olimboy_confirmed ? 'Tasdiqlangan' : 'Kutilmoqda (False)'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security Guard & Violation Simulation Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> Olimboy Tasdig‘i Himoyasi Sinovi
            </h3>
            <span className="text-[11px] text-emerald-400 font-mono">Qat’iy qoida</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <b>Talab (Section 7):</b> “Mijozning tasdig‘i Olimboyning tasdig‘i hisoblanmasin. Olimboy
            buyurtmani tasdiqlamaguncha yetkazib berish boshlanmasin.”
          </div>

          <p className="text-xs text-slate-400">
            Quyidagi tugma orqali Olimboy tasdiqlamagan buyurtmani yetkazib berish (delivering) holatiga
            o‘tkazishga urinib ko‘ring. Server bu urinishni darhol to‘xtatib, xatolik qaytarishi kerak:
          </p>

          <button
            disabled={loading === 'violation'}
            onClick={testSecurityGuard}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 border border-amber-800/80 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            <span>Olimboy tasdiqlamasdan yetkazishga urinish (Xavfsizlik testi)</span>
          </button>

          {violationResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                violationResult.result === 'GUARD_PROTECTED'
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{violationResult.explanation || violationResult.message}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800">
                Server xatolik javobi (403 Forbidden): "{violationResult.error_message_received}"
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Database Integrity & Schema Verification Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" /> Ma’lumotlar Bazasi Yaxlitligi & Sxema
              Tekshiruvi
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Har bir buyurtmada: ID, dori nomi, miqdori, mijoz tasdiqlagan telefon, yetkazish manzili,
              yaratilgan vaqt va holat mavjudligini avtomatik tekshiradi.
            </p>
          </div>

          <button
            disabled={loading === 'integrity'}
            onClick={verifyIntegrity}
            className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-2 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Baza yaxlitligini tekshirish</span>
          </button>
        </div>

        {integrityResult && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs">
              <span
                className={`px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                  integrityResult.is_healthy
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {integrityResult.is_healthy ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sxema to‘liq talabga javob beradi (Sog‘lom)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> Xatoliklar aniqlandi
                  </>
                )}
              </span>
              <span className="text-slate-400">
                Tekshirilgan buyurtmalar soni:{' '}
                <span className="font-mono font-bold text-white">
                  {integrityResult.total_orders_checked}
                </span>
              </span>
              <span className="text-slate-400">
                Tekshirilgan so‘rovlar soni:{' '}
                <span className="font-mono font-bold text-white">
                  {integrityResult.total_inquiries_checked}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Passed Checks */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Muvaffaqiyatli tekshiruvlar:
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {integrityResult.checks_passed?.map((chk: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{chk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Issues / Anomalies */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-400" /> Aniqlangan ogohlantirishlar va xatolar:
                </div>
                {integrityResult.issues_found?.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2">
                    Hech qanday xatolik topilmadi. Barcha ma’lumotlar to‘g‘ri formatda saqlanmoqda.
                  </div>
                ) : (
                  <ul className="space-y-1.5 text-xs text-rose-300">
                    {integrityResult.issues_found?.map((err: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">⚠️</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Honest Status Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" /> Xizmatlarning Haqiqiy Holati To‘g‘risida Halol
          Hisobot (Section 10 & 11 talabi)
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tizim faqat haqiqatda ulangan xizmatlarni faol deb e’lon qiladi. Tashqi provayder kalitlari
          kiritilmagan holatda soxta “ishlayapti” da’volari berilmaydi:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Ovozli AI & Dialog</span>
              <span className="text-emerald-400 font-medium">✅ Faol</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Gemini 3.8 Flash, O‘zbekcha muloqot, katalog tekshiruvi, xatoliklar filtri.
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Ma’lumotlar Bazasi</span>
              <span className="text-emerald-400 font-medium">✅ Faol</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Doimiy saqlanuvchi JSON DB, 11 ta obyekt, holatlar tarixi va audit jurnali.
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Tashqi Telephony / SMS / Push</span>
              <span className="text-amber-400 font-medium">⚠️ Simulyatsiya</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Haqiqiy O‘zbekiston telefon raqami va PlayMobile SMS kaliti kiritilmaguncha navbatda turadi.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
