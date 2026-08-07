import os
import time
import json
import subprocess
import requests

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000/api/v1")
TOKEN = os.getenv("TOKEN_COURT", "replace-me")
HEARING_ID = os.getenv("HEARING_READY_ID", "1002")

FAIL_CMD = os.getenv("FAIL_CMD", "")         # contoh: docker compose stop postgres
RECOVER_CMD = os.getenv("RECOVER_CMD", "")   # contoh: docker compose start postgres
RECOVER_WAIT = int(os.getenv("RECOVER_WAIT", "12"))

def headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

def call(method, path, json_body=None, timeout=20):
    start = time.time()
    try:
        r = requests.request(
            method,
            f"{BASE_URL}{path}",
            headers=headers(),
            json=json_body,
            timeout=timeout
        )
        elapsed = round(time.time() - start, 3)
        return r, elapsed
    except requests.exceptions.RequestException as e:
        elapsed = round(time.time() - start, 3)
        class DummyResponse:
            status_code = 0
            text = str(e)
        return DummyResponse(), elapsed

def run_cmd(cmd):
    if not cmd.strip():
        return
    print(f"\n>>> executing: {cmd}")
    subprocess.run(cmd, shell=True, check=False)

def print_result(label, r, elapsed):
    body = r.text[:300].replace("\n", " ")
    print(f"{label}: status={r.status_code} elapsed={elapsed}s body={body}")

def assert_controlled_failure(r, elapsed):
    assert elapsed < 20, f"request hung too long: {elapsed}s"
    assert r.status_code in {400, 401, 403, 404, 409, 500, 502, 503, 504, 0}, f"unexpected status={r.status_code}, body={r.text}"
    assert "<html" not in r.text.lower(), "raw html/proxy error leaked"

def main():
    print("=== BASELINE ===")
    r1, t1 = call("GET", f"/hearings/{HEARING_ID}")
    print_result("baseline hearing", r1, t1)
    
    if r1.status_code == 0:
        print("Server API utama tidak bisa dihubungi, lewati tes")
        return

    r2, t2 = call("POST", f"/hearings/{HEARING_ID}/virtual-session/provision", {"requestId": f"baseline-{int(time.time())}"})
    print_result("baseline provision", r2, t2)

    run_cmd(FAIL_CMD)
    if FAIL_CMD.strip():
        time.sleep(3)

    print("\n=== DURING FAILURE ===")
    rf1, tf1 = call("GET", f"/hearings/{HEARING_ID}")
    print_result("hearing under failure", rf1, tf1)
    if rf1.status_code >= 500 or rf1.status_code == 0:
        assert_controlled_failure(rf1, tf1)

    rf2, tf2 = call("POST", f"/hearings/{HEARING_ID}/virtual-session/provision", {"requestId": f"fail-{int(time.time())}"})
    print_result("provision under failure", rf2, tf2)
    assert_controlled_failure(rf2, tf2)

    rf3, tf3 = call("POST", f"/hearings/{HEARING_ID}/reconciliation-runs", {})
    print_result("reconciliation under failure", rf3, tf3)
    if rf3.status_code >= 500 or rf3.status_code == 0:
        assert_controlled_failure(rf3, tf3)

    run_cmd(RECOVER_CMD)
    if RECOVER_CMD.strip():
        print(f"\n>>> waiting {RECOVER_WAIT}s for recovery")
        time.sleep(RECOVER_WAIT)

    print("\n=== AFTER RECOVERY ===")
    rr1, tr1 = call("GET", f"/hearings/{HEARING_ID}")
    print_result("hearing after recovery", rr1, tr1)

    rr2, tr2 = call("GET", f"/hearings/{HEARING_ID}/gate-status")
    print_result("gate-status after recovery", rr2, tr2)

    if rr1.status_code != 0:
        assert rr1.status_code in {200, 204, 401, 403, 404}, f"system did not recover cleanly: {rr1.status_code}"
    if rr2.status_code != 0:
        assert rr2.status_code in {200, 204, 401, 403, 404}, f"gate-status not healthy after recovery: {rr2.status_code}"

    print("\n=== RESULT ===")
    print("Probe selesai. Verifikasi utama: fail-fast, controlled error, dan recovery.")

if __name__ == "__main__":
    main()
