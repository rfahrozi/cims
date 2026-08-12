import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CimsRole } from '@cims/domain';

// Simulasi user lokal untuk OIDC bypass di lingkungan DEV/SIT
const users = new Map<string, { password: string; name: string; role: CimsRole; organizationId: string }>([
  // Panitera Pengganti (Password default: Cims123!)
  ['agusman@pn-kepri.go.id', { password: 'Cims123!', name: 'AGUSMAN, S.H., M.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pn-tanjungpinang' }],
  ['nurlaili@pn-kepri.go.id', { password: 'Cims123!', name: 'NURLAILI, S.H., M.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pn-batam' }],
  ['syaiful@pn-kepri.go.id', { password: 'Cims123!', name: 'SYAIFUL ISLAMI, S.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pn-karimun' }],
  ['supriadi@pn-kepri.go.id', { password: 'Cims123!', name: 'SUPRIADI, S.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pn-natuna' }],
  ['sapta@pn-kepri.go.id', { password: 'Cims123!', name: 'SAPTA PUTRA, S.H.', role: 'SUBSTITUTE_CLERK', organizationId: 'pn-tanjungpinang' }],
  
  // Hakim / Majelis (Password default: Cims123!)
  ['arifin@pn-kepri.go.id', { password: 'Cims123!', name: 'Drs. ARIFIN, S.H., M.Hum.', role: 'JUDGE', organizationId: 'pn-tanjungpinang' }],
  ['zulfahmi@pn-kepri.go.id', { password: 'Cims123!', name: 'Dr ZULFAHMI, S.H., M.Hum.', role: 'JUDGE', organizationId: 'pn-tanjungpinang' }],
  ['eliwarti@pn-kepri.go.id', { password: 'Cims123!', name: 'ELIWARTI, S.H., M.H.', role: 'JUDGE', organizationId: 'pn-tanjungpinang' }],
  ['wendra@pn-kepri.go.id', { password: 'Cims123!', name: 'WENDRA RAIS, S.H., M.H.', role: 'JUDGE', organizationId: 'pn-batam' }],
  ['estiono@pn-kepri.go.id', { password: 'Cims123!', name: 'ESTIONO, S.H., M.H.', role: 'JUDGE', organizationId: 'pn-batam' }],
  ['bagus@pn-kepri.go.id', { password: 'Cims123!', name: 'BAGUS IRAWAN, S.H., M.H.', role: 'JUDGE', organizationId: 'pn-batam' }],
  ['elfian@pn-kepri.go.id', { password: 'Cims123!', name: 'ELFIAN, S.H., M.H.', role: 'JUDGE', organizationId: 'pn-karimun' }],
  ['morgan@pn-kepri.go.id', { password: 'Cims123!', name: 'MORGAN SIMANJUNTAK, S.H., M.Hum.', role: 'JUDGE', organizationId: 'pn-karimun' }],
  ['dahlia@pn-kepri.go.id', { password: 'Cims123!', name: 'DAHLIA PANJAITAN, S.H.', role: 'JUDGE', organizationId: 'pn-natuna' }],
  ['suryadi@pn-kepri.go.id', { password: 'Cims123!', name: 'Dr. M. SURYADI, S.H., M.H.', role: 'JUDGE', organizationId: 'pn-natuna' }],

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
