# Interview Assistant (AI Recruitment System) — Local Setup Guide

This guide details how to set up the entire recruitment and interview scheduling system on your local machine.

---

## System Architecture Overview

The system consists of the following components:
1. **Frontend**: React (TypeScript), Vite, TailwindCSS (runs on port `8189`).
2. **Backend**: FastAPI, SQLAlchemy, MySQL (runs on port `8000`).
3. **Task Queue**: Celery worker running on Windows (concurrency managed through Redis).
4. **Message Broker**: Redis server (installed and run inside WSL Ubuntu on port `6379`).
5. **Workflow Orchestration**: n8n (handles Google Calendar and Google Meet link generation, runs on port `5678`).

---

## Prerequisites

Ensure you have the following installed locally:
* **Node.js** (v18 or higher)
* **Python** (v3.9 or higher)
* **MySQL Server** (e.g. standalone MySQL, XAMPP, or Laragon)
* **WSL (Windows Subsystem for Linux)** with an Ubuntu distribution installed.

---

## Step 1: MySQL Database Setup

1. Open your MySQL client (e.g. Command Line Client, phpMyAdmin, or DBeaver).
2. Connect to your MySQL server (configured on port `3308` in the backend environment, or adjust if you run it on the default `3306`).
3. Run the following command to create the database:
   ```sql
   CREATE DATABASE interview_assist;
   ```
   *Note: You do not need to import any tables manually. FastAPI uses SQLAlchemy to automatically generate the required database tables (`candidates`, `job_roles`, `interview_schedule`, etc.) on first startup.*

---

## Step 2: Backend (FastAPI) Setup

1. Open a new terminal and navigate to the project root:
   ```powershell
   cd d:\projects\InterviewAssist
   ```
2. Activate your virtual environment:
   * **PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **Command Prompt (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
3. Change directory to `backend/`:
   ```powershell
   cd backend
   ```
4. Install all Python dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
5. Configure environment variables. Verify that the [backend/.env](file:///d:/projects/InterviewAssist/backend/.env) file matches your local MySQL config:
   * `DB_HOST=localhost`
   * `DB_PORT=3308` (change to `3306` if your MySQL is on the standard port)
   * `DB_USER=root`
   * `DB_PASSWORD=12345`
   * `DB_NAME=interview_assist`
6. Start the FastAPI backend server:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   *Verify it's running by visiting `http://localhost:8000/health` in your browser.*

---

## Step 3: Redis & Celery Worker Setup (WSL / Ubuntu)

Celery requires a message broker. We will install and run Redis inside WSL (Ubuntu) and execute the Celery worker in Windows.

### A. Set Up Redis inside WSL Ubuntu
1. Open PowerShell and verify WSL is installed:
   ```powershell
   wsl --status
   ```
   *(If not installed, run `wsl --install` and restart your PC).*
2. Start your WSL Ubuntu shell by typing:
   ```powershell
   wsl
   ```
3. Inside the Ubuntu terminal, update packages and install Redis Server:
   ```bash
   sudo apt update
   sudo apt install redis-server -y
   ```
4. Start the Redis server:
   ```bash
   sudo service redis-server start
   ```
5. Test that Redis is running:
   ```bash
   redis-cli ping
   ```
   *This should return `PONG`. Keep this WSL terminal window open to keep Redis running.*

### B. Run the Celery Worker inside Windows
1. Open a **new** terminal in Windows and navigate to the root directory `d:\projects\InterviewAssist`.
2. Activate the virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
3. Change directory to `backend/`:
   ```powershell
   cd backend
   ```
4. Start the Celery worker using the `solo` execution pool (required on Windows platforms to avoid multiprocessing issues):
   ```powershell
   celery -A celery_worker.celery worker --loglevel=info -P solo
   ```
   *Keep this terminal open. The worker will listen to Redis for incoming tasks.*

---

## Step 4: Frontend (React / Vite) Setup

1. Open a new terminal in Windows and navigate to the `frontend/` directory:
   ```powershell
   cd d:\projects\InterviewAssist\frontend
   ```
2. Install npm packages:
   ```powershell
   npm install
   ```
3. Verify the environment configurations:
   * Open the local environment file [frontend/.env](file:///d:/projects/InterviewAssist/frontend/.env) and ensure it points to the local backend port:
     ```env
     VITE_API_BASE_URL=http://localhost:8000
     ```
4. Start the frontend development server:
   ```powershell
   npm run dev
   ```
   *By default, the server runs on `http://localhost:8189`.*

---

## Step 5: n8n Integration & Google Meet Setup

n8n acts as the workflow orchestrator. It receives requests from the Celery task runner, interacts with the Google Calendar API to schedule the meeting, requests a Google Meet link, and returns it.

### A. Install and Start n8n
1. In a new Windows command prompt, install n8n globally:
   ```powershell
   npm install -g n8n
   ```
2. Start n8n:
   ```powershell
   n8n
   ```
3. Open your browser and navigate to `http://localhost:5678`.
4. Create an owner account if prompted for the first setup.

### B. Import the Workflow
1. In the n8n dashboard, click **Workflows** > **Add Workflow** (or "Create a workflow").
2. Click the top-right menu (three dots) and select **Import from File**.
3. Choose the [n8n.json](file:///d:/projects/InterviewAssist/n8n.json) file located in the root of your project.
4. Alternatively, you can use the backend script to auto-upload and activate it:
   ```powershell
   # Run from the backend directory
   python setup_n8n_workflow.py
   ```

---

## Step 6: Get Google Calendar & Google Meet Credentials

To allow n8n to communicate with Google Calendar and generate Google Meet rooms, create an OAuth 2.0 application inside Google Cloud Console:

### 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your Google account.
3. Click the Project dropdown menu at the top left, and click **New Project**.
4. Name the project `Interview Assist Scheduler` and click **Create**.

### 2. Enable the Google Calendar API
1. In the search bar at the top, type `Google Calendar API`.
2. Select **Google Calendar API** from the results and click **Enable**.

### 3. Configure the OAuth Consent Screen
1. In the left sidebar, navigate to **APIs & Services** > **OAuth Consent Screen**.
2. Select **External** (this allows you to test with personal Gmail accounts) and click **Create**.
3. Fill in the required fields:
   * **App name**: `Interview Assist Scheduler`
   * **User support email**: Choose your email.
   * **Developer contact information**: Input your email.
4. Click **Save and Continue**.
5. On the **Scopes** page, click **Add or Remove Scopes**.
   * Search for `Google Calendar API` and check:
     `.../auth/calendar` (See, edit, share, and permanently delete all the calendars you can access using Google Calendar).
   * Click **Update** at the bottom, then **Save and Continue**.
6. On the **Test Users** page, click **Add Users**.
   * Enter your Gmail address (and any other email you plan to use for testing).
   * **Important**: Because your app is in "Testing" status, only users listed here can authenticate.
7. Click **Save and Continue** and finish the configuration.

### 4. Create OAuth 2.0 Credentials
1. In the left sidebar, click **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Under **Application type**, choose **Web application**.
4. **Name**: `n8n Local Client`.
5. Scroll down to **Authorized redirect URIs** and click **+ Add URI**.
6. Enter the exact callback URL used by n8n:
   ```txt
   http://localhost:5678/rest/oauth2-credential/callback
   ```
7. Click **Create**.
8. Copy the **Client ID** and **Client Secret** displayed on screen.

### 5. Add Credentials to the Google Calendar Node in n8n
1. Open the n8n UI (`http://localhost:5678`).
2. Open the imported **Interview Scheduler** workflow.
3. Double-click the **Technical Interview (Google Calendar)** node.
4. In the node settings, look at **Credential for Google Calendar** and click the dropdown to select **Create New Credential**.
5. Ensure the Authentication type is set to **OAuth2**.
6. Paste the **Client ID** and **Client Secret** you copied from the Google Cloud Console.
7. Click **Sign in with Google**.
8. A popup will open:
   * Select the Gmail account you added as a test user.
   * If Google displays a "Google hasn't verified this app" warning, click **Advanced** at the bottom, then click **Go to Interview Assist Scheduler (unsafe)**.
   * Click **Continue** to grant the requested permissions.
9. Upon success, you will see a checkmark next to the credential status. Save the credential.
10. Click **Active** (toggle in top right) to turn on the workflow.

---

## Step 7: Verifying the Whole Flow Local Execution

To verify everything is working:

1. Access the frontend in your browser: `http://localhost:8189`.
2. Log in or Sign up as an administrator.
3. Schedule an interview for a candidate.
4. **FastAPI Backend Console**: You will see a `POST` request sent to `/admin/schedule-interview`.
5. **Celery Worker Console**: You will see that the task `app.workers.tasks.schedule_interview_task` is received and starts executing.
6. **WSL Redis Console**: Handles message distribution between FastAPI and the worker.
7. **n8n Console**: You will see a workflow execution triggered by a webhook. It runs the Google Calendar API call, requests a Google Meet conference room, extracts the meeting URL (`hangoutLink`), and returns it as a JSON response to the Celery worker.
8. **Celery Worker Console**: Receives the meet link and updates the MySQL database status to `scheduled`.
9. The frontend will now display the generated Google Meet link next to the candidate's name.
