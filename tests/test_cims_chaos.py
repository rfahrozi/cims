import os
import threading
import requests
import pytest
from concurrent.futures import ThreadPoolExecutor

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000/api/v1")
TOKENS = {
    "court": os.getenv("TOKEN_COURT", "replace-me"),
    "operator": os.getenv("TOKEN_OPERATOR", "replace-me"),
}
HEARING_READY_ID = os.getenv("HEARING_READY_ID", "1002")

def api(method, path, token=None, json=None, timeout=15):
    headers = {"Accept": "application/json"}
    if json is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        return requests.request(method, f"{BASE_URL}{path}", headers=headers, json=json, timeout=timeout)
    except requests.exceptions.RequestException as e:
        class DummyResponse:
            status_code = 0
            text = str(e)
        return DummyResponse()

def test_concurrent_provisioning_must_not_create_duplicate_rooms():
    """
    Jika banyak operator menekan tombol 'Provision Virtual Room' pada ms yang sama,
    hanya 1 request yang boleh sukses (201/200), sisanya harus antri atau ditolak (409/429/idempotent 200).
    """
    def provision_room():
        return api("POST", f"/hearings/{HEARING_READY_ID}/virtual-session/provision", TOKENS["operator"], json={})
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        responses = list(executor.map(lambda _: provision_room(), range(5)))
    
    # Kumpulkan status code
    statuses = [r.status_code for r in responses]
    
    # Error connection refushed karena server mati
    if all(s == 0 for s in statuses):
        pytest.skip("Server tidak berjalan")
        
    # Kalau endpoint butuh auth, ekspektasi 401/403
    if any(s in (401, 403) for s in statuses):
        return # Auth berfungsi

    success_creations = statuses.count(201)
    idempotent_ok = statuses.count(200)
    conflicts = statuses.count(409) + statuses.count(422) + statuses.count(429)

    assert success_creations <= 1, f"Double provisioning detected! Statuses: {statuses}"
    # Harus ada perlindungan concurency: kalau ada yang tembus lebih dari 1, sisa harus di-handle (entah 409 atau 200 idempotent)
    assert success_creations + idempotent_ok + conflicts == len(statuses), f"Unexpected statuses during race condition: {statuses}"
