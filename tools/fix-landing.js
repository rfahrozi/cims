const fs = require('fs');

let landing = fs.readFileSync('apps/web/src/pages/landing.tsx', 'utf8');

const oldSteps = `[
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
                ]`;

const newSteps = `[
                  {
                    num: 1,
                    title: 'Data Awal Persidangan',
                    desc: 'Pembuatan referensi awal secara manual atau ditarik dari SIPP.'
                  },
                  {
                    num: 2,
                    title: 'Penjadwalan & Agenda',
                    desc: 'Sistem memastikan ketersediaan waktu dan menghindari konflik acara.'
                  },
                  {
                    num: 3,
                    title: 'Ruang Virtual',
                    desc: 'Sistem memprovisikan ruang virtual dan merakit link unik otomatis.'
                  },
                  {
                    num: 4,
                    title: 'Penetapan Hakim',
                    desc: 'Hakim memberikan otorisasi persidangan elektronik beserta tautan virtual.'
                  },
                  {
                    num: 5,
                    title: 'Pemberitahuan Pihak',
                    desc: 'Notifikasi otomatis terkirim dan terpantau dengan standar Service Level Agreement (SLA).'
                  },
                  {
                    num: 6,
                    title: 'Kesiapan Lapangan',
                    desc: 'Petugas Rutan dan Kejaksaan melakukan inspeksi teknis dan verifikasi identitas.'
                  },
                  {
                    num: 7,
                    title: 'Kontrol & Putusan',
                    desc: 'Hakim mengendalikan alur sidang (Start, Suspend, Resume, End), dilanjut dokumentasi akhir.'
                  }
                ]`;

landing = landing.replace(oldSteps, newSteps);

fs.writeFileSync('apps/web/src/pages/landing.tsx', landing);
