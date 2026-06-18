# Baseline Load Testing with k6

This folder contains the baseline load testing configuration using **k6** to test the system under an expected volume of 100 concurrent users for 1 minute.

---

## 1. Install k6 on Windows

If you don't have `k6` installed, you can install it using one of these options:

### Option A: Using Windows Package Manager (winget) - Recommended
Open a PowerShell terminal as Administrator and run:
```powershell
winget install grafana.k6
```
*Note: Restart your terminal after installation so the `k6` command is available in your PATH.*

### Option B: Manual Download
Download the installer directly from the [k6 official documentation page](https://k6.io/docs/get-started/installation/#windows).

---

## 2. Start the Backend Server

Before running the load test, ensure your local backend server is running:

1. Open a new terminal and navigate to the project root `d:\projects\InterviewAssist`.
2. Activate your Python virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
3. Change directory to `backend/`:
   ```powershell
   cd backend
   ```
4. Run the FastAPI server:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   *Verify it's running by visiting `http://localhost:8000/health` in your browser.*

---

## 3. Run the Load Test

Navigate to the `load-tests/` folder in your terminal and run `k6`:

```powershell
cd d:\projects\InterviewAssist\load-tests\k6 run k6-script.js
```
=> k6 run k6-script.js
### Run against a custom URL or deployed instance
If your backend is running on a different port or hosted environment, pass the `BASE_URL` environment variable to k6:
```powershell
k6 run -e BASE_URL=http://localhost:8080 k6-script.js
```

---

## 4. Reading the Results

Once the test finishes, `k6` will print a summary table. Here is how to find the specific metrics requested:

### Requests per second (RPS)
Look for the **`http_reqs`** metric. It displays the total count of requests and the rate per second.
- **Example output line:**
  `http_reqs..................: 10425   173.235489/s`
  *This means the API handled about 173 requests every second (RPS).*

### Response Time (Min, Average, Max)
Look for the **`http_req_duration`** metric (measured in milliseconds). It displays the round-trip time for HTTP requests.
- **Example output line:**
  `http_req_duration..........: avg=24.58ms min=2.1ms med=18.4ms max=1200ms p(90)=45.2ms p(95)=78.4ms`
- **Meaning:**
  - **avg (Average):** `24.58ms`
  - **min (Fastest response):** `2.1ms`
  - **max (Slowest response):** `1200ms` (1.2 seconds)

### Success Rate
Look for the **`checks`** metric. It shows the percentage of requests that returned either `200` (Success) or `401` (Unauthorized for non-existent load test credentials).
- **Example output line:**
  `✓ status is 200 or 401......: 100.00% ✓ 10425      ✗ 0`
