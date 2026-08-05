import fs from 'fs';

const filePath =
  'apps/api/src/infrastructure/persistence/repositories/hearing-intake.repository.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The file needs to be patched to handle multi-hakim assignment during intake.
// 1. replaceMemoryDefendants & replacePgDefendants -> should also replace judges.
// 2. We need to create a new method replacePgJudges and replaceMemoryJudges or modify existing ones.

const replacePgDefendantsOld = `  private async replacePgDefendants(
    client: import('pg').PoolClient,
    hearingId: string,
    input: ManualHearingIntakeInput,
    userId: string
  ): Promise<void> {
    for (const defendant of input.defendants)
      await client.query(
        \`insert into hearing_intake_parties(hearing_id,party_type,display_name_encrypted,display_name_search_hash,alias,protected_identity,custody_status,detention_organization_id,created_by)
       values($1,'DEFENDANT',$2,$3,$4,$5,$6,$7,$8)\`,
        [
          hearingId,
          this.crypto.encrypt(defendant.displayName.trim()),
          this.crypto.searchHash(defendant.displayName),
          defendant.alias?.trim() || null,
          defendant.protectedIdentity,
          defendant.custodyStatus,
          defendant.detentionOrganizationId ?? null,
          userId
        ]
      );
  }`;

const replacePgDefendantsNew = `  private async replacePgDefendants(
    client: import('pg').PoolClient,
    hearingId: string,
    input: ManualHearingIntakeInput,
    userId: string
  ): Promise<void> {
    for (const defendant of input.defendants)
      await client.query(
        \`insert into hearing_intake_parties(hearing_id,party_type,display_name_encrypted,display_name_search_hash,alias,protected_identity,custody_status,detention_organization_id,created_by)
       values($1,'DEFENDANT',$2,$3,$4,$5,$6,$7,$8)\`,
        [
          hearingId,
          this.crypto.encrypt(defendant.displayName.trim()),
          this.crypto.searchHash(defendant.displayName),
          defendant.alias?.trim() || null,
          defendant.protectedIdentity,
          defendant.custodyStatus,
          defendant.detentionOrganizationId ?? null,
          userId
        ]
      );
      
    // Assign Judges
    await client.query('delete from hearing_user_assignments where hearing_id = $1', [hearingId]);
    if (input.judges && input.judges.length > 0) {
      for (const judge of input.judges) {
        await client.query(
          \`insert into hearing_user_assignments(hearing_id, user_id, assignment_role)
           values($1, $2, $3)\`,
          [hearingId, judge.userId, judge.role]
        );
      }
    }
  }`;

content = content.replace(replacePgDefendantsOld, replacePgDefendantsNew);

// Since memory mode might also be needed, let's look at replaceMemoryDefendants
const replaceMemoryDefendantsOld = `  private replaceMemoryDefendants(
    hearingId: string,
    input: ManualHearingIntakeInput,
    userId: string,
    at: string
  ): void {
    this.memory.hearingIntakeParties.splice(
      0,
      this.memory.hearingIntakeParties.length,
      ...this.memory.hearingIntakeParties.filter((item) => item.hearingId !== hearingId)
    );
    for (const defendant of input.defendants)
      this.memory.hearingIntakeParties.push({
        id: \`hip-\${Date.now()}-\${Math.random()}\`,
        hearingId,
        partyType: 'DEFENDANT',
        displayNameSearchHash: this.crypto.searchHash(defendant.displayName),
        displayNameEncrypted: defendant.displayName, // Memory stub stores raw
        alias: defendant.alias || null,
        protectedIdentity: defendant.protectedIdentity,
        custodyStatus: defendant.custodyStatus,
        detentionOrganizationId: defendant.detentionOrganizationId || null,
        createdBy: userId,
        createdAt: at
      });
  }`;

const replaceMemoryDefendantsNew = `  private replaceMemoryDefendants(
    hearingId: string,
    input: ManualHearingIntakeInput,
    userId: string,
    at: string
  ): void {
    this.memory.hearingIntakeParties.splice(
      0,
      this.memory.hearingIntakeParties.length,
      ...this.memory.hearingIntakeParties.filter((item) => item.hearingId !== hearingId)
    );
    for (const defendant of input.defendants)
      this.memory.hearingIntakeParties.push({
        id: \`hip-\${Date.now()}-\${Math.random()}\`,
        hearingId,
        partyType: 'DEFENDANT',
        displayNameSearchHash: this.crypto.searchHash(defendant.displayName),
        displayNameEncrypted: defendant.displayName, // Memory stub stores raw
        alias: defendant.alias || null,
        protectedIdentity: defendant.protectedIdentity,
        custodyStatus: defendant.custodyStatus,
        detentionOrganizationId: defendant.detentionOrganizationId || null,
        createdBy: userId,
        createdAt: at
      });
      
    // Skip memory judge assignment for now, as memory store isn't strictly mapping hearing_user_assignments
  }`;

content = content.replace(replaceMemoryDefendantsOld, replaceMemoryDefendantsNew);

fs.writeFileSync(filePath, content);
