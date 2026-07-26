/** Kontrak request yang dikirim oleh NotificationGateway (HTTP mode) dari CIMS API */
export interface DeliveryRequest {
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS' | 'IN_APP';
  destination: string;
  subject: string;
  message: string;
  official_reference: string;
  correlation_id?: string;
}

/** Kontrak response yang dikembalikan ke NotificationGateway */
export interface DeliveryResult {
  status: 'DELIVERED' | 'FAILED';
  provider_reference?: string;
  evidence: Record<string, unknown>;
  error_code?: string;
}

/** Response dari Brevo Transactional Email API */
export interface BrevoSendResponse {
  messageId?: string;
}
