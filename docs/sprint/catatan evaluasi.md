Berikut rencana perbaikan bertahap yang menurut saya paling tepat untuk mulai eksekusi sekarang, berdasarkan audit teknis yang sudah kita lakukan.

Inti masalahnya jelas: repo ini sudah punya fondasi yang baik, tetapi masih tertahan oleh blocker produksi resmi yang juga diakui oleh repositorinya sendiri, yaitu OIDC role mapping, KMS/HSM & key rotation, integrasi sandbox/HTTP resmi, uji non-fungsional lengkap, dan UAT/sign-off lintas instansi. Statusnya juga masih production_ready: false dan production_and_real_case_data: NO_GO.

Selain itu, dari sisi enforcement teknis, CimsAuthGuard saat ini masih mengizinkan semua request lolos ketika AUTH_MODE=DEV, karena canActivate() langsung return true. Ini aman untuk development, tetapi harus dianggap sebagai risk paling kritis bila environment salah konfigurasi. Sementara workflow CI yang terlihat baru menjalankan check:structure, typecheck, test, dan build; artinya quality gate produksi seperti security scan, integration test, migration verification, contract test, dan deploy gate belum terlihat di jalur CI utama.

Jadi, kalau kita akan mulai perbaikan bertahap, saya sarankan kita jangan mulai dari fitur baru. Kita mulai dari hardening path ke production.

Prioritas eksekusi: urutan yang paling masuk akal
Saya sarankan kita bagi menjadi 5 gelombang kerja.

Gelombang 1 — tutup risiko “salah deploy ke production”
Ini harus dikerjakan dulu dalam beberapa hari pertama.

Targetnya adalah memastikan sistem tidak mungkin jalan dalam kondisi semi-dev saat dipakai serius.

Yang perlu dipastikan:

Lockdown AUTH
AUTH_MODE=DEV hanya boleh hidup di local/dev profile.
Tambahkan guard startup yang lebih keras: bila NODE_ENV=production, maka aplikasi gagal start jika:
AUTH_MODE !== OIDC
OIDC_ISSUER kosong
OIDC_JWKS_URL kosong
OIDC_AUDIENCE kosong
Tambahkan assertion serupa di worker dan service integrasi, bukan hanya API.
Lockdown persistence & evidence mode
PERSISTENCE_MODE=MEMORY tidak boleh mungkin aktif di stage yang mendekati production.
EVIDENCE_STORAGE_MODE=LOCAL harus ditandai sebagai non-production only.
Tambahkan startup fail-fast untuk kombinasi mode yang dilarang.
Lockdown integration mode
NOTIFICATION_GATEWAY_MODE=MOCK
OFFICIAL_SYSTEM_GATEWAY_MODE=MOCK
provider sandbox/mock lain
semua itu harus memicu warning keras di non-prod dan startup failure di production.
Lockdown DB transport
Paksa DB_SSL=true untuk seluruh environment selain local.
Tambahkan verifikasi startup terhadap SSL dan cert mode.
Hilangkan kemungkinan bypass environment
Tambahkan satu service EnvironmentPolicyValidator atau ProductionReadinessBootstrapGuard yang membaca semua env kritis dan menghentikan boot jika kombinasi env tidak aman.
Output Gelombang 1

Tidak ada lagi kemungkinan “production pakai mode dev/mock/local”.
Risiko salah konfigurasi turun drastis.
Ini adalah PR pertama yang paling layak dibuat.
Gelombang 2 — hardening IAM dan otorisasi
Ini prioritas tertinggi setelah fail-fast config.

Karena blocker resmi repo yang pertama adalah validasi OIDC role mapping dengan external Identity Provider.

Yang perlu dikerjakan:

Audit penuh OidcTokenVerifierService
Validasi issuer
audience
expiry / not-before
jwks refresh
clock skew
kid rotation handling
failure mode saat IdP timeout/down
Audit role mapping
Definisikan mapping yang eksplisit:
Pengadilan
Kejaksaan
Pemasyarakatan
Admin governance
Auditor
Liaison officer
Operator terbatas
Pastikan role tidak hanya string-level, tetapi diproyeksikan ke permission set yang stabil.
Audit PolicyGuard dan decorator permission
Pastikan endpoint sensitif tidak hanya butuh login, tetapi juga butuh policy pass.
Khusus modul sensitif: appeal-decision, notices, participants, custody, governance, compliance, provider-webhooks, legacy-proxy.
Matikan dev identity path di stage
dev-identity.interceptor hanya boleh ada di profile dev/test.
Tambahkan test untuk memastikan ia tidak pernah aktif bila NODE_ENV !== development.
Tambah test matriks otorisasi
Minimal untuk semua role lintas instansi pada endpoint kritis.
Format test: role x endpoint x action x expected allow/deny.
Output Gelombang 2

Kita punya access-control matrix yang bisa diaudit.
Ini akan langsung membantu kepatuhan PKS terkait pembatasan akses data dan koordinasi lintas instansi.
Gelombang 3 — hardening integrasi dan data protection
Ini akan menutup blocker produksi nomor 2 dan 3.

A. Secrets & crypto
Yang perlu dilakukan:

Ganti secret file lokal menjadi integrasi KMS/HSM/Vault.
Tambahkan key versioning untuk field encryption.
Tambahkan key rotation mechanism yang aman:
decrypt dengan key lama
re-encrypt dengan key baru
audit rotasi
rollback strategy
Audit field-crypto.service.ts untuk:
algorithm choice
IV/nonce handling
authenticated encryption
metadata version
B. Official gateway & notifications
Yang perlu dilakukan:

Ubah gateway dari mode MOCK menjadi HTTP sandbox mode yang sesungguhnya.
Tambahkan:
signature verification
request idempotency
timeout policy
retry with backoff
dead-letter/failure queue
reconciliation job
Audit notification.gateway.ts dan official-system.gateway.ts terhadap:
delivery receipt
failure classification
replay protection
partial outage handling
C. Evidence storage
Karena repo masih menyebut blocker object storage evidence.

Yang perlu dilakukan:

Ganti mode LOCAL ke object storage yang mendukung:
encryption at rest
object immutability / retention compatibility
strong audit trail
checksum verification
Audit evidence-storage.gateway.ts
Tambahkan manifest verification end-to-end:
hash per objek
manifest hash
provenance metadata
legal hold compatibility
D. Zoom/provider hardening
Yang perlu dilakukan:

Audit zoom-provider.service.ts dan webhook path
Tambahkan:
webhook signature validation
anti-replay
meeting lifecycle reconciliation
participant validation hooks
timeout/cancellation policy
orphan room cleanup
Uji race condition:
meeting dibuat dua kali
webhook datang out-of-order
provider timeout tapi meeting sebenarnya tercipta
Output Gelombang 3

Integrasi eksternal tidak lagi “simulasi”.
Data sensitif dan dokumen perkara bergerak di jalur yang layak produksi.
Gelombang 4 — compliance runtime per modul bisnis
Ini tahap untuk memastikan fitur-fitur hukum yang sudah ada benar-benar enforce aturan, bukan sekadar tersedia di UI/module map.

Saya sarankan audit dan perbaikan dilakukan per modul berikut, urut dari yang paling sensitif.

1. appeal-decision
Fokus:

pembacaan putusan
same-day publication
transmission 7 hari
audit status
exception path
retry dan SLA breach alert
Ini modul paling dekat ke kewajiban SEMA, jadi harus jadi salah satu prioritas tertinggi.

2. notices
Fokus:

bukti pengiriman
bukti penerimaan
perubahan tanggal
notifikasi yang dapat diaudit
siapa yang diberitahu, kapan, melalui jalur apa
fallback saat gateway gagal
3. scheduling
Fokus:

state transition yang valid
reschedule governance
dependency ke readiness dan notices
larangan publish/launch tanpa syarat wajib
4. readiness
Fokus:

hard gate lintas instansi
syarat minimum ruang virtual
syarat kelengkapan perkara
checklist kesiapan yang immutable/auditable
5. participants
Fokus:

klasifikasi pihak
masking identitas rentan
hak akses tampilan data berbeda per role
enforcement lokasi advokat / pihak tertentu bila diwajibkan
6. custody
Fokus:

alur mutasi tahanan
re-checklist gate
chain of custody administratif
dependency ke jadwal dan kesiapan sidang
7. liaison
Fokus:

pejabat penghubung per instansi
delegasi yang valid
masa berlaku delegasi
jejak persetujuan/penugasan
8. governance dan compliance
Fokus:

legal hold
retention preview
access review campaign
self-approval prevention
maker-checker enforcement
9. legacy-proxy
Fokus:

jangan sampai jadi jalur bypass policy
semua request proxied harus tetap:
authenticated
authorized
audited
correlated
rate-limited
Output Gelombang 4

Kita punya matriks per modul: aturan → implementasi → test → bukti audit.
Di titik ini, aplikasi mulai mendekati compliance runtime yang nyata.
Gelombang 5 — assurance produksi
Ini untuk menutup blocker nomor 4 dan 5 pada repo.

Yang harus dilakukan:

CI/CD expansion Workflow CI saat ini masih cukup dasar.
Tambahkan:
lint
dependency vulnerability scan
secret scan
SAST
migration verify
integration test
API contract test
build artifact signing/checksum
container scan
SBOM generation
Test non-fungsional
load test
soak test
failover test
backup/restore test
disaster recovery rehearsal
penetration test
Observability
dashboard latency/error per modul
queue/outbox visibility
failed notification panel
SLA monitor untuk same-day / 7-day process
security events dashboard
correlation id tracing end-to-end
Runbook & operational governance
incident runbook
security incident 1x24 jam flow
key rotation runbook
object storage recovery runbook
provider outage playbook
manual fallback procedure
UAT & sign-off
Court
Prosecution
Corrections
Security
Privacy
Infrastructure
Authorized officials
Ini memang juga tertulis sebagai blocker resmi.
Urutan PR yang saya rekomendasikan
Kalau kita benar-benar mulai bertahap, saya sarankan urutan PR seperti ini:

PR-1: Production fail-fast config
Isi:

validator env
forbidden mode matrix
startup hard fail
logging yang jelas untuk misconfig
PR-2: IAM hardening
Isi:

audit dan perbaikan OIDC verifier
role mapping matrix
test authz lintas role
disable dev identity di non-dev
PR-3: CI hardening
Isi:

tambah security scan
integration test lane
migration verify
secret scan
container scan
PR-4: Integration hardening
Isi:

notification gateway HTTP sandbox
official-system gateway HTTP sandbox
retry/backoff/idempotency
delivery receipt & reconciliation
PR-5: Secrets & crypto hardening
Isi:

KMS/HSM/Vault integration
key versioning
key rotation workflow
audit rotasi
PR-6: Evidence storage hardening
Isi:

object storage adapter production
checksum/manifest verification
legal hold compatibility
retention compatibility
PR-7: Appeal-decision + notices compliance pack
Isi:

same-day publish SLA
7-day transmission enforcement
notice receipt audit
alerting & reconciliation
PR-8: Readiness + virtual session + custody pack
Isi:

hard gate lintas instansi
virtual session guard
custody transfer re-checklist
failure fallback
PR-9: Governance & compliance pack
Isi:

access review hardening
legal hold invariants
maker-checker enforcement
audit/report export
PR-10: Observability + DR/UAT pack
Isi:

dashboard
alerts
runbook
backup/restore evidence
DR rehearsal evidence
UAT checklist
Severity dan dampak bisnis/regulasi
Saya ringkas prioritasnya seperti ini:




Prioritas	Area	Severity	Alasan
P0	Auth mode / dev bypass / forbidden env	Kritis	Salah deploy bisa membuka akses tanpa auth penuh
P0	OIDC verifier & role mapping	Kritis	Fondasi identitas lintas instansi
P0	Mock/local modes di stage serius	Kritis	Tidak layak untuk data perkara riil
P1	Notification & official-system gateway	Tinggi	Menyangkut pemberitahuan, integrasi, dan bukti proses
P1	Secrets/KMS/HSM & key rotation	Tinggi	Perlindungan data sensitif
P1	Evidence object storage	Tinggi	Integritas dan governance dokumen
P1	Appeal decision & notices compliance	Tinggi	Langsung terkait SEMA
P2	CI/security scans/integration test	Tinggi	Assurance engineering
P2	Observability & reconciliation	Tinggi	Ketahanan operasional
P2	DR/load/soak/pentest/UAT	Tinggi	Syarat go-live nyata