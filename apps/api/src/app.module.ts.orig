import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InfrastructureModule } from './infrastructure/infrastructure.module.js';
import { SecurityModule } from './infrastructure/security.module.js';
import { CimsAuthGuard } from './common/auth.guard.js';
import { PolicyGuard } from './common/policy.guard.js';
import { OidcTokenVerifierService } from './common/oidc-token-verifier.service.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HearingsModule } from './modules/hearings/hearings.module.js';
import { HearingIntakeModule } from './modules/hearing-intake/hearing-intake.module.js';
import { DeterminationsModule } from './modules/determinations/determinations.module.js';
import { SchedulingModule } from './modules/scheduling/scheduling.module.js';
import { NoticesModule } from './modules/notices/notices.module.js';
import { ReadinessModule } from './modules/readiness/readiness.module.js';
import { VirtualSessionsModule } from './modules/virtual-sessions/virtual-sessions.module.js';
import { HearingControlModule } from './modules/hearing-control/hearing-control.module.js';
import { ParticipantsModule } from './modules/participants/participants.module.js';
import { IncidentsModule } from './modules/incidents/incidents.module.js';
import { OperationsModule } from './modules/operations/operations.module.js';
import { ZoomModule } from './modules/zoom/zoom.module.js';
import { ComplianceModule } from './modules/compliance/compliance.module.js';
import { LegacyProxyModule } from './modules/legacy-proxy/legacy-proxy.module.js';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module.js';
import { ProviderWebhookModule } from './modules/provider-webhooks/provider-webhook.module.js';
import { GovernanceModule } from './modules/governance/governance.module.js';
import { AppealDecisionModule } from './modules/appeal-decision/appeal-decision.module.js';
import { LiaisonModule } from './modules/liaison/liaison.module.js';
import { CustodyModule } from './modules/custody/custody.module.js';
import { AdminConfigModule } from './modules/admin-config/admin-config.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    InfrastructureModule,
    SecurityModule, // explicitly imported for PolicyGuard
    HealthModule,
    AuthModule,
    HearingIntakeModule,
    HearingsModule,
    DeterminationsModule,
    SchedulingModule,
    NoticesModule,
    ReadinessModule,
    VirtualSessionsModule,
    HearingControlModule,
    ParticipantsModule,
    IncidentsModule,
    OperationsModule,
    ZoomModule,
    ComplianceModule,
    ReconciliationModule,
    ProviderWebhookModule,
    GovernanceModule,
    LegacyProxyModule,
    AppealDecisionModule, // SOP 10.15 — berlaku 1 Agustus 2026
    LiaisonModule, // SOP Bagian 7 & 8 — Pejabat Penghubung (C-05)
    CustodyModule, // SOP 10.14 — Mutasi/Perpindahan Tahanan (C-06)
    AdminConfigModule, // GAP-01/GAP-02/GAP-06 — Template notifikasi + SLA config
    RealtimeModule // M-08/CU-04 — Server-Sent Events (SSE)
  ],
  providers: [
    OidcTokenVerifierService,
    { provide: APP_GUARD, useClass: CimsAuthGuard },
    { provide: APP_GUARD, useClass: PolicyGuard }
  ]
})
export class AppModule {}
