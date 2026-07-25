import { DomainError } from '../../common/domain-error.mjs';
export class ProviderClient {
  constructor(config) { this.baseUrl=config.providerBaseUrl.replace(/\/$/,''); this.providerCode=config.providerCode; }
  async #request(path, options={}) {
    let response;
    try { response=await fetch(this.baseUrl+path,{...options,headers:{'content-type':'application/json','x-correlation-id':options.correlationId??'',...(options.headers??{})}}); }
    catch(error){ throw new DomainError('PROVIDER_UNREACHABLE','Video provider could not be reached.',503,{cause:error.message}); }
    let body={}; try{ body=await response.json(); }catch{}
    if(!response.ok) throw new DomainError(body.code??'PROVIDER_ERROR',body.message??`Provider returned HTTP ${response.status}.`,response.status>=500?503:response.status,{provider_status:response.status,retryable:body.retryable??false,provider_details:body.details??{},provider_reference:body.provider_reference??null});
    return body;
  }
  health(correlationId){ return this.#request('/health',{correlationId}); }
  createSession(payload,idempotencyKey,correlationId){ return this.#request('/sessions',{method:'POST',headers:{'idempotency-key':idempotencyKey},body:JSON.stringify(payload),correlationId}); }
  createRoom(sessionRef,payload,correlationId){ return this.#request(`/sessions/${encodeURIComponent(sessionRef)}/rooms`,{method:'POST',body:JSON.stringify(payload),correlationId}); }
  issueAccess(sessionRef,payload,correlationId){ return this.#request(`/sessions/${encodeURIComponent(sessionRef)}/access`,{method:'POST',body:JSON.stringify(payload),correlationId}); }
  getAccess(accessRef,correlationId){ return this.#request(`/access/${encodeURIComponent(accessRef)}`,{correlationId}); }
  moveAccess(accessRef,roomRef,correlationId){ return this.#request(`/access/${encodeURIComponent(accessRef)}/move`,{method:'POST',body:JSON.stringify({room_reference:roomRef}),correlationId}); }
  revokeAccess(accessRef,correlationId){ return this.#request(`/access/${encodeURIComponent(accessRef)}/revoke`,{method:'POST',body:'{}',correlationId}); }
  recording(sessionRef,action,correlationId){ return this.#request(`/sessions/${encodeURIComponent(sessionRef)}/recording`,{method:'POST',body:JSON.stringify({action}),correlationId}); }
}
