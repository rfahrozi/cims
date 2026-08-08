import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Scale,
  CalendarDays,
  Lock,
  ArrowRight,
  PlayCircle,
  Fingerprint,
  Layers,
  MonitorPlay
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0b2a4a] text-white">
              <Scale className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0b2a4a]">CIMS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#fitur" className="hover:text-blue-600 transition-colors">
              Fitur
            </a>
            <a href="#panduan" className="hover:text-blue-600 transition-colors">
              Panduan
            </a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                Login Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden pt-24 pb-32 sm:pt-32 sm:pb-40 lg:pb-48 bg-[#0b2a4a]">
          {/* Latar grafis */}
          <div className="absolute inset-0 z-0">
            <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl mix-blend-multiply" />
            <div className="absolute top-48 right-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl mix-blend-multiply" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-blue-200 backdrop-blur-sm mb-8 ring-1 ring-white/20">
              <ShieldCheck className="h-4 w-4" />
              <span>Keamanan &amp; Kepatuhan Terjamin</span>
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              Orkestrasi Persidangan Elektronik{' '}
              <span className="text-blue-400">Lintas Instansi</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100 sm:text-xl">
              Court Intelligence Management System (CIMS) menghubungkan Pengadilan, Kejaksaan, dan
              Pemasyarakatan dalam satu alur kerja terpadu. Bukan register perkara, melainkan
              lapisan intelijen dan koordinasi operasi sidang virtual.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/login">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-white text-[#0b2a4a] hover:bg-blue-50 px-8 text-base font-semibold shadow-lg"
                >
                  Masuk ke Portal <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/public-schedule">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-blue-400 bg-transparent text-white hover:bg-white/10 px-8 text-base font-semibold"
                >
                  Jadwal Sidang Publik
                </Button>
              </Link>
              <a href="#panduan">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-blue-400/30 text-white hover:bg-white/10 px-8 text-base"
                >
                  <PlayCircle className="mr-2 h-5 w-5" /> Cara Kerja
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ── Features Section ── */}
        <section id="fitur" className="py-24 sm:py-32 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Platform Integritas Peradilan
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Didesain dengan pendekatan Compliance-First Architecture.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">Sistem Hard Gates</h3>
                <p className="text-slate-600">
                  Mencegah ruang virtual terbentuk jika penetapan belum sah, jadwal belum disetujui,
                  dan kesiapan lokasi belum diverifikasi.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Fingerprint className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">Immutable Audit Trail</h3>
                <p className="text-slate-600">
                  Jejak audit menggunakan kriptografi HMAC. Setiap langkah dari pra-sidang hingga
                  pasca-putusan terekam permanen secara sekuensial.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">Otomatisasi Outbox</h3>
                <p className="text-slate-600">
                  Mekanisme transactional outbox memastikan pengiriman notifikasi (Email/WA) dan
                  sinkronisasi eksternal aman meskipun terjadi gangguan jaringan.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">Smart Scheduling</h3>
                <p className="text-slate-600">
                  Mendeteksi potensi bentrok ruangan, saksi, dan hakim lintas-organisasi.
                  Menampilkan seluruh riwayat revisi jadwal.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                  <MonitorPlay className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">Provider-Agnostic</h3>
                <p className="text-slate-600">
                  Didesain dengan *Adapter Pattern* untuk fleksibilitas. Pengadilan dapat berganti
                  antara Zoom, WebEx, atau Vicon mandiri tanpa merombak CIMS.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">Hak Konsultasi Privat</h3>
                <p className="text-slate-600">
                  Mendukung ruang *breakout* aman bagi Advokat dan Terdakwa dengan aturan
                  No-Recording yang ketat dan otomatis.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it Works ── */}
        <section id="panduan" className="py-24 sm:py-32 bg-slate-900 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                7 Langkah Operasional CIMS
              </h2>
              <p className="mt-4 text-lg text-slate-400">Alur linear operasional CIMS</p>
            </div>

            <div className="relative mx-auto max-w-4xl">
              {/* Garis vertikal timeline */}
              <div className="absolute left-6 top-0 h-full w-0.5 bg-slate-700 md:left-1/2" />

              <div className="space-y-12">
                {[
                  {
                    num: 1,
                    title: 'Data Awal Persidangan',
                    desc: 'Pembuatan referensi awal secara manual atau ditarik dari SIPP.'
                  },
                  {
                    num: 2,
                    title: 'Penetapan Hakim',
                    desc: 'Hakim memberikan otorisasi persidangan elektronik secara resmi.'
                  },
                  {
                    num: 3,
                    title: 'Penjadwalan & Agenda',
                    desc: 'Sistem memastikan ketersediaan waktu dan menghindari konflik acara.'
                  },
                  {
                    num: 4,
                    title: 'Pemberitahuan Pihak',
                    desc: 'Notifikasi otomatis terkirim dan terpantau dengan standar Service Level Agreement (SLA).'
                  },
                  {
                    num: 5,
                    title: 'Kesiapan Lapangan',
                    desc: 'Petugas Rutan dan Kejaksaan melakukan inspeksi teknis dan verifikasi identitas (Checklist).'
                  },
                  {
                    num: 6,
                    title: 'Ruang Virtual',
                    desc: 'Sistem merakit link unik (_one-time token_) untuk setiap peserta yang dipanggil.'
                  },
                  {
                    num: 7,
                    title: 'Kontrol & Putusan',
                    desc: 'Hakim mengendalikan alur sidang (Start, Suspend, Resume, End), dilanjut dokumentasi akhir.'
                  }
                ].map((step, index) => (
                  <div
                    key={step.num}
                    className={`relative flex flex-col md:flex-row items-start ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                  >
                    {/* Lingkaran nomor */}
                    <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-900 bg-blue-600 text-xl font-bold md:left-1/2 md:-ml-6 z-10">
                      {step.num}
                    </div>
                    {/* Konten text */}
                    <div
                      className={`ml-16 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pl-12' : 'md:pr-12 md:text-right'}`}
                    >
                      <h4 className="text-xl font-bold text-blue-300">{step.title}</h4>
                      <p className="mt-2 text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-24 sm:py-32 bg-slate-50">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-12">
              Pertanyaan Umum
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: 'Apakah CIMS menggantikan SIPP atau e-Berpadu?',
                  a: 'Tidak. CIMS adalah sistem orkestrasi untuk pelaksanaan persidangan elektroniknya. Data induk perkara tetap berada di Sistem Informasi Penelusuran Perkara (SIPP).'
                },
                {
                  q: 'Mengapa saya tidak bisa membuka ruang virtual?',
                  a: 'CIMS mematuhi "Hard Gates". Ruang virtual hanya dapat diprovisikan setelah Hakim mengesahkan penetapan dan seluruh instansi (termasuk Rutan) telah menyelesaikan checklist kesiapan teknis dan memverifikasi identitas terdakwa.'
                },
                {
                  q: 'Bagaimana jika terdakwa dipindah ke rutan lain?',
                  a: 'Gunakan modul Mutasi Tahanan. Sistem akan secara otomatis memutus kesiapan yang sudah dicentang oleh Rutan awal, lalu mendelegasikan dan memaksa Rutan tujuan untuk mengisi checklist kembali.'
                },
                {
                  q: 'Bagaimana jika terjadi jaringan putus (Insiden Teknis)?',
                  a: 'Panitera dapat mengisi laporan Insiden Teknis. Jika keparahannya HIGH atau CRITICAL, CIMS akan secara paksa menghentikan sementara (SUSPEND) proses sidang.'
                }
              ].map((faq, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-slate-900">{faq.q}</h4>
                  <p className="mt-2 text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Scale className="h-6 w-6 text-[#0b2a4a]" />
            <span className="text-xl font-bold tracking-tight text-[#0b2a4a]">CIMS</span>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Court Intelligence Management System v1.0.0 (Preproduction)
            <br />
            Digunakan terbatas untuk simulasi Pilot Lintas Instansi.
          </p>
          <div className="flex justify-center gap-6 text-sm text-slate-400">
            <span>© 2026 Hak Cipta Dilindungi.</span>
            <a href="#" className="hover:text-slate-900 transition-colors">
              Kebijakan Privasi
            </a>
            <a href="#" className="hover:text-slate-900 transition-colors">
              Ketentuan Layanan
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
