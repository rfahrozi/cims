import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CimsRole } from '@cims/domain';

// Simulasi user lokal untuk OIDC bypass di lingkungan DEV/SIT
const users = new Map<string, { password: string; name: string; role: CimsRole; organizationId: string }>([
  // Panitera Pengganti (Password default: Cims123!)
  ['agusman@pt-kepri.go.id', { password: 'Cims123!', name: 'AGUSMAN, S.H., M.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pt-kepri' }],
  ['nurlaili@pt-kepri.go.id', { password: 'Cims123!', name: 'NURLAILI, S.H., M.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pt-kepri' }],
  ['syaiful@pt-kepri.go.id', { password: 'Cims123!', name: 'SYAIFUL ISLAMI, S.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pt-kepri' }],
  ['supriadi@pt-kepri.go.id', { password: 'Cims123!', name: 'SUPRIADI, S.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pt-kepri' }],
  ['sapta@pt-kepri.go.id', { password: 'Cims123!', name: 'SAPTA PUTRA, S.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pt-kepri' }],
  
  // Hakim / Majelis (Password default: Cims123!)
  ['arifin@pt-kepri.go.id', { password: 'Cims123!', name: 'Drs. ARIFIN, S.H., M.Hum.', role: 'JUDGE', organizationId: 'pt-kepri' }],
  ['zulfahmi@pt-kepri.go.id', { password: 'Cims123!', name: 'Dr ZULFAHMI, S.H., M.Hum.', role: 'JUDGE', organizationId: 'pt-kepri' }],
  ['eliwarti@pt-kepri.go.id', { password: 'Cims123!', name: 'ELIWARTI, S.H., M.H.', role: 'JUDGE', organizationId: 'pt-kepri' }],
  ['wendra@pt-kepri.go.id', { password: 'Cims123!', name: 'WENDRA RAIS, S.H., M.H.', role: 'JUDGE', organizationId: 'pt-kepri' }],
  ['estiono@pt-kepri.go.id', { password: 'Cims123!', name: 'ESTIONO, S.H., M.H.', role: 'JUDGE', organizationId: 'pt-kepri' }],
  ['bagus@pt-kepri.go.id', { password: 'Cims123!', name: 'BAGUS IRAWAN, S.H., M.H.', role: 'JUDGE', organizationId: 'pt-kepri' }],
  ['elfian@pt-kepri.go.id', { password: 'Cims123!', name: 'ELFIAN, S.H., M.H.', role: 'JUDGE', organizationId: 'pt-kepri' }],
  ['morgan@pt-kepri.go.id', { password: 'Cims123!', name: 'MORGAN SIMANJUNTAK, S.H., M.Hum.', role: 'JUDGE', organizationId: 'pt-kepri' }],
  ['dahlia@pt-kepri.go.id', { password: 'Cims123!', name: 'DAHLIA PANJAITAN, S.H.', role: 'JUDGE', organizationId: 'pt-kepri' }],
  ['suryadi@pt-kepri.go.id', { password: 'Cims123!', name: 'Dr. M. SURYADI, S.H., M.H.', role: 'JUDGE', organizationId: 'pt-kepri' }],


  // ── Kejaksaan (Penuntut Umum) (Password default: Cims123!) ──────────────
  ['admin@kejati-kepri.go.id', { password: 'Cims123!', name: 'Jaksa Kejati Kepri', role: 'PROSECUTOR', organizationId: 'kejati-kepri' }],
  ['admin@kejari-tanjungpinang.go.id', { password: 'Cims123!', name: 'Jaksa Kejari Tanjungpinang', role: 'PROSECUTOR', organizationId: 'kejari-tanjungpinang' }],
  ['admin@kejari-batam.go.id', { password: 'Cims123!', name: 'Jaksa Kejari Batam', role: 'PROSECUTOR', organizationId: 'kejari-batam' }],
  ['admin@kejari-bintan.go.id', { password: 'Cims123!', name: 'Jaksa Kejari Bintan', role: 'PROSECUTOR', organizationId: 'kejari-bintan' }],
  ['admin@kejari-lingga.go.id', { password: 'Cims123!', name: 'Jaksa Kejari Lingga', role: 'PROSECUTOR', organizationId: 'kejari-lingga' }],
  ['admin@kejari-karimun.go.id', { password: 'Cims123!', name: 'Jaksa Kejari Karimun', role: 'PROSECUTOR', organizationId: 'kejari-karimun' }],
  ['admin@kejari-natuna.go.id', { password: 'Cims123!', name: 'Jaksa Kejari Natuna', role: 'PROSECUTOR', organizationId: 'kejari-natuna' }],
  ['admin@kejari-anambas.go.id', { password: 'Cims123!', name: 'Jaksa Kejari Anambas', role: 'PROSECUTOR', organizationId: 'kejari-anambas' }],
  ['admin@cabjari-moro.go.id', { password: 'Cims123!', name: 'Jaksa Cabjari Moro', role: 'PROSECUTOR', organizationId: 'cabjari-moro' }],
  ['admin@cabjari-tanjungbatu.go.id', { password: 'Cims123!', name: 'Jaksa Cabjari Tanjungbatu', role: 'PROSECUTOR', organizationId: 'cabjari-tanjungbatu' }],

  // ── Pemasyarakatan (Lapas/Rutan) (Password default: Cims123!) ───────────
  ['admin@lapas-batam.go.id', { password: 'Cims123!', name: 'Petugas Lapas Batam', role: 'CORRECTIONS', organizationId: 'lapas-batam' }],
  ['admin@lapas-tanjungpinang.go.id', { password: 'Cims123!', name: 'Petugas Lapas Tanjungpinang', role: 'CORRECTIONS', organizationId: 'lapas-tanjungpinang' }],
  ['admin@lapas-perempuan-batam.go.id', { password: 'Cims123!', name: 'Petugas Lapas Perempuan Batam', role: 'CORRECTIONS', organizationId: 'lapas-perempuan-batam' }],
  ['admin@lapas-narkotika-tanjungpinang.go.id', { password: 'Cims123!', name: 'Petugas Lapas Narkotika TPI', role: 'CORRECTIONS', organizationId: 'lapas-narkotika-tanjungpinang' }],
  ['admin@lapas-dabo-singkep.go.id', { password: 'Cims123!', name: 'Petugas Lapas Dabo Singkep', role: 'CORRECTIONS', organizationId: 'lapas-dabo-singkep' }],
  ['admin@lpka-batam.go.id', { password: 'Cims123!', name: 'Petugas LPKA Batam', role: 'CORRECTIONS', organizationId: 'lpka-batam' }],
  ['admin@rutan-tanjungpinang.go.id', { password: 'Cims123!', name: 'Petugas Rutan Tanjungpinang', role: 'CORRECTIONS', organizationId: 'rutan-tanjungpinang' }],
  ['admin@rutan-batam.go.id', { password: 'Cims123!', name: 'Petugas Rutan Batam', role: 'CORRECTIONS', organizationId: 'rutan-batam' }],
  ['admin@rutan-karimun.go.id', { password: 'Cims123!', name: 'Petugas Rutan Karimun', role: 'CORRECTIONS', organizationId: 'rutan-karimun' }],

  // User Default / Fallback
  ['clerk@cims.local', { password: 'Clerk123!', name: 'Panitera Demo', role: 'COURT_CLERK', organizationId: 'court-demo' }],
  ['judge@cims.local', { password: 'Judge123!', name: 'Hakim Demo', role: 'JUDGE', organizationId: 'court-demo' }],
  ['prosecutor@cims.local', { password: 'Jaksa123!', name: 'Penuntut Umum Demo', role: 'PROSECUTOR', organizationId: 'prosecution-demo' }],
  ['corrections@cims.local', { password: 'Rutan123!', name: 'Petugas Rutan Demo', role: 'CORRECTIONS', organizationId: 'corrections-demo' }],
  ['admin@cims.local', { password: 'Admin123!', name: 'Admin Demo', role: 'SYSTEM_ADMIN', organizationId: 'court-demo' }]
]);

@Injectable()
export class AuthService {
  private challenges = new Map<string, string>();
  
  login(email: string, password: string) {
    const user = users.get(email);
    if (!user || user.password !== password) throw new UnauthorizedException('Invalid credentials');
    const id = randomUUID();
    this.challenges.set(id, email);
    return { challenge_id: id, expires_in_seconds: 300, development_otp: '123456' };
  }
  
  verify(challengeId: string, otp: string) {
    const email = this.challenges.get(challengeId);
    if (!email || otp !== '123456') throw new UnauthorizedException('Invalid OTP');
    const user = users.get(email)!;
    return {
      access_token: Buffer.from(JSON.stringify({ email, role: user.role })).toString('base64url'),
      token_type: 'Bearer',
      user: { id: email, name: user.name, role: user.role, organization_id: user.organizationId }
    };
  }
}
