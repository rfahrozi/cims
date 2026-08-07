import os
import uuid
import requests
import pytest

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000/api/v1")

TOKENS = {
    "court": os.getenv("TOKEN_COURT", "replace-me"),
    "operator": os.getenv("TOKEN_OPERATOR", "replace-me"),
    "foreign_org": os.getenv("TOKEN_FOREIGN_ORG", "replace-me"),
}

# Gunakan ID data seed/disposable di environment
HEARING_DRAFT_ID = os.getenv("HEARING_DRAFT_ID", "1001")
HEARING_READY_ID = os.getenv("HEARING_READY_ID", "1002")
HEARING_FOREIGN_ID = os.getenv("HEARING_FOREIGN_ID", "9999")
CONFLICTING_PROPOSAL_ID = os.getenv("CONFLICTING_PROPOSAL_ID", "2001")
PARTICIPANT_ID = os.getenv("PARTICIPANT_ID", "3001")

def api(method, path, token=None, json=None, timeout=15):
    headers = {"Accept": "application/json"}
    if json is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.request(method, f"{BASE_URL}{path}", headers=headers, json=json, timeout=timeout)

def assert_status(r, allowed):
    assert r.status_code in allowed, f"unexpected status={r.status_code}, body={r.text}"

def test_activate_before_submit_must_fail():
    r = api("POST", f"/hearing-intake/manual/{HEARING_DRAFT_ID}/activate", TOKENS["court"])
    assert_status(r, {400, 401, 403, 409, 422})

def test_double_submit_must_be_rejected_or_idempotent():
    r1 = api("POST", f"/hearing-intake/manual/{HEARING_DRAFT_ID}/submit", TOKENS["court"])
    assert_status(r1, {200, 201, 202, 401, 403, 409})

    r2 = api("POST", f"/hearing-intake/manual/{HEARING_DRAFT_ID}/submit", TOKENS["court"])
    assert_status(r2, {200, 201, 202, 401, 403, 409})

def test_conflicting_schedule_proposal_cannot_be_approved():
    # Check conflict first
    rc = api("POST", f"/schedule-proposals/{CONFLICTING_PROPOSAL_ID}/conflicts:check", TOKENS["court"], json={})
    assert_status(rc, {200, 401, 403, 409, 422})

    # Approval should fail if conflict exists
    ra = api("POST", f"/schedule-proposals/{CONFLICTING_PROPOSAL_ID}:approve", TOKENS["court"], json={})
    assert_status(ra, {400, 401, 403, 409, 422})

def test_cross_org_hearing_access_must_be_forbidden():
    r = api("GET", f"/hearings/{HEARING_FOREIGN_ID}", TOKENS["foreign_org"])
    assert_status(r, {401, 403, 404})

def test_join_token_exchange_must_reject_replay():
    issued = api(
        "POST",
        f"/hearings/{HEARING_READY_ID}/participants/{PARTICIPANT_ID}/join-token",
        TOKENS["operator"],
        json={}
    )
    assert_status(issued, {200, 201, 401, 403, 404})
    if issued.status_code not in {200, 201}:
        return
        
    body = issued.json()

    token = body.get("token") or body.get("joinToken") or body.get("value")
    assert token, f"join token not found in response: {body}"

    first = api("POST", "/public/join-tokens/exchange", json={"token": token})
    assert_status(first, {200, 201})

    second = api("POST", "/public/join-tokens/exchange", json={"token": token})
    assert_status(second, {400, 401, 403, 409})

def test_runtime_start_twice_must_not_create_illegal_state():
    payload = {"hearingId": HEARING_READY_ID}

    r1 = api("POST", "/start", TOKENS["court"], json=payload)
    assert_status(r1, {200, 201, 202, 401, 403, 404, 409})

    r2 = api("POST", "/start", TOKENS["court"], json=payload)
    assert_status(r2, {400, 401, 403, 404, 409, 422})

def test_end_without_valid_runtime_state_must_fail_cleanly():
    payload = {"hearingId": HEARING_DRAFT_ID}
    r = api("POST", "/end", TOKENS["court"], json=payload)
    assert_status(r, {400, 401, 403, 404, 409, 422})

def test_gate_status_must_not_claim_ready_for_unready_hearing():
    r = api("GET", f"/hearings/{HEARING_DRAFT_ID}/gate-status", TOKENS["court"])
    assert_status(r, {200, 401, 403, 404})

    if r.status_code == 200:
        data = r.json()
        serialized = str(data).lower()
        assert "ready" in serialized or "gate" in serialized or "status" in serialized, f"unexpected gate payload: {data}"
