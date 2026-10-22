import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck(filename="Interview_Assist_Presentation.pptx"):
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6] # blank layout

    # Color Palette Definitions
    C_BG_DARK = RGBColor(15, 23, 42)      # Slate 900
    C_CARD_DARK = RGBColor(30, 41, 59)    # Slate 800
    C_CARD_LIGHT = RGBColor(248, 250, 252)# Slate 50
    C_BORDER_LIGHT = RGBColor(226, 232, 240)
    C_WHITE = RGBColor(255, 255, 255)
    C_CYAN = RGBColor(6, 182, 212)        # Cyan 500
    C_BLUE = RGBColor(59, 130, 246)       # Blue 500
    C_EMERALD = RGBColor(16, 185, 129)    # Emerald 500
    C_PURPLE = RGBColor(139, 92, 246)     # Violet 500
    C_TEXT_MAIN = RGBColor(15, 23, 42)    # Dark text
    C_TEXT_MUTED = RGBColor(100, 116, 139)# Slate 500
    C_TEXT_LIGHT = RGBColor(241, 245, 249)# Slate 100

    def add_bg(slide, dark=False):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_BG_DARK if dark else RGBColor(248, 250, 252)
        bg.line.fill.background()
        return bg

    def add_header(slide, title, category="INTERVIEW ASSIST PLATFORM", dark=False):
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.733), Inches(1.1))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        p0 = tf.paragraphs[0]
        p0.text = category.upper()
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = C_CYAN if dark else C_BLUE
        
        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.size = Pt(24)
        p1.font.bold = True
        p1.font.color.rgb = C_WHITE if dark else C_TEXT_MAIN
        p1.space_before = Pt(4)

    # -------------------------------------------------------------------------
    # SLIDE 1: Title Slide (Dark Theme)
    # -------------------------------------------------------------------------
    slide1 = prs.slides.add_slide(blank_layout)
    add_bg(slide1, dark=True)

    # Decorative accent gradient-like shape
    accent = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(2.2), Inches(0.4))
    accent.fill.solid()
    accent.fill.fore_color.rgb = C_CYAN
    accent.line.fill.background()
    p_acc = accent.text_frame.paragraphs[0]
    p_acc.text = "ENTERPRISE SOLUTION"
    p_acc.font.size = Pt(11)
    p_acc.font.bold = True
    p_acc.font.color.rgb = C_BG_DARK
    p_acc.alignment = PP_ALIGN.CENTER

    tb1 = slide1.shapes.add_textbox(Inches(0.8), Inches(2.4), Inches(11.5), Inches(2.8))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    
    p = tf1.paragraphs[0]
    p.text = "Interview Assist"
    p.font.size = Pt(46)
    p.font.bold = True
    p.font.color.rgb = C_WHITE

    p2 = tf1.add_paragraph()
    p2.text = "Autonomous AI Recruitment & Event-Driven Scheduling Platform"
    p2.font.size = Pt(22)
    p2.font.color.rgb = C_CYAN
    p2.space_before = Pt(8)

    p3 = tf1.add_paragraph()
    p3.text = "An end-to-end recruitment engine orchestrating FastAPI, Redis, Celery & n8n for autonomous calendar bookings, Google Meet generation, and dynamic feedback loops."
    p3.font.size = Pt(14)
    p3.font.color.rgb = RGBColor(148, 163, 184)
    p3.space_before = Pt(18)

    # Info card bar at bottom
    specs = [
        ("Architecture", "FastAPI + Celery + n8n"),
        ("Live Deployment", "Firebase + Cloudflare"),
        ("Workflow Engine", "Google OAuth2 + Meet"),
        ("Ecosystem", "Candidate / Panel / Admin")
    ]
    for i, (k, v) in enumerate(specs):
        left = Inches(0.8 + i * 2.95)
        card = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(5.6), Inches(2.8), Inches(1.1))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_DARK
        card.line.color.rgb = RGBColor(51, 65, 85)
        ctf = card.text_frame
        ctf.word_wrap = True
        ctf.margin_top = Inches(0.18)
        cp1 = ctf.paragraphs[0]
        cp1.text = k.upper()
        cp1.font.size = Pt(10)
        cp1.font.bold = True
        cp1.font.color.rgb = C_CYAN
        cp2 = ctf.add_paragraph()
        cp2.text = v
        cp2.font.size = Pt(12)
        cp2.font.bold = True
        cp2.font.color.rgb = C_WHITE

    # -------------------------------------------------------------------------
    # SLIDE 2: The Problem vs The Solution
    # -------------------------------------------------------------------------
    slide2 = prs.slides.add_slide(blank_layout)
    add_bg(slide2)
    add_header(slide2, "The Recruitment Bottleneck & The Solution", "INDUSTRY CHALLENGE & VISION")

    # Left: The Traditional Chaos
    left_card = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0))
    left_card.fill.solid()
    left_card.fill.fore_color.rgb = RGBColor(254, 242, 242) # Red 50
    left_card.line.color.rgb = RGBColor(254, 202, 202)
    ltf = left_card.text_frame
    ltf.margin_left = ltf.margin_right = Inches(0.35)
    ltf.margin_top = Inches(0.3)
    ltf.word_wrap = True

    lp1 = ltf.paragraphs[0]
    lp1.text = "⚠️ The Traditional Recruitment Chaos"
    lp1.font.size = Pt(18)
    lp1.font.bold = True
    lp1.font.color.rgb = RGBColor(185, 28, 28)

    pain_points = [
        "Endless Back-and-Forth: Recruiters spend 60% of their day manually emailing candidates and panel members to find mutual availability.",
        "Manual Link Creation: Copying Google Meet or Teams links manually into calendar invites leads to human errors and missed calls.",
        "Fragmented Silos: Resumes in emails, schedules in Google Calendar, candidate notes in spreadsheets, and panel feedback lost in Slack.",
        "Slow Candidate Drop-off: Multi-day delays in scheduling lead top-tier candidates to accept rival offers.",
        "Zero Real-Time Auditing: Lack of central status tracking across panelists and candidates."
    ]
    for pt in pain_points:
        p = ltf.add_paragraph()
        p.text = "• " + pt
        p.font.size = Pt(12)
        p.font.color.rgb = RGBColor(79, 70, 79)
        p.space_before = Pt(12)

    # Right: The Interview Assist Solution
    right_card = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0))
    right_card.fill.solid()
    right_card.fill.fore_color.rgb = RGBColor(240, 253, 244) # Green 50
    right_card.line.color.rgb = RGBColor(187, 247, 208)
    rtf = right_card.text_frame
    rtf.margin_left = rtf.margin_right = Inches(0.35)
    rtf.margin_top = Inches(0.3)
    rtf.word_wrap = True

    rp1 = rtf.paragraphs[0]
    rp1.text = "🚀 The Interview Assist Advantage"
    rp1.font.size = Pt(18)
    rp1.font.bold = True
    rp1.font.color.rgb = RGBColor(21, 128, 61)

    solutions = [
        "Autonomous 1-Click Scheduling: Recruiter picks a candidate & slot; the system handles the entire calendar booking and invites automatically.",
        "Automated Google Meet Rooms: n8n workflow engine creates dedicated meeting rooms via OAuth2 and binds links directly to the candidate record.",
        "Unified Multi-Role Hub: Dedicated portals for Admin, Interview Panelists, and Candidates with tailored dashboards.",
        "Asynchronous Resilience: Redis & Celery background workers ensure non-blocking UI and automatic retries in case of network drops.",
        "Built-in Scorecards: Panelists evaluate candidates directly in their dashboard; statuses update in real time."
    ]
    for st in solutions:
        p = rtf.add_paragraph()
        p.text = "✓ " + st
        p.font.size = Pt(12)
        p.font.color.rgb = RGBColor(30, 41, 59)
        p.space_before = Pt(12)

    # -------------------------------------------------------------------------
    # SLIDE 3: System Technology Stack
    # -------------------------------------------------------------------------
    slide3 = prs.slides.add_slide(blank_layout)
    add_bg(slide3)
    add_header(slide3, "Enterprise Technology Stack Architecture", "TECHNICAL SPECIFICATIONS")

    tech_cards = [
        ("Frontend Application", "React (TypeScript) + Vite", "TailwindCSS UI, responsive role-based dashboards, sub-second Vite HMR builds, type-safe client state management.", C_BLUE),
        ("Cloud Deployment", "Firebase Hosting", "Global Google CDN edge hosting, automatic SSL encryption, 99.99% uptime SLA, production URL distribution.", C_CYAN),
        ("Core Backend API", "FastAPI (Python 3.10+)", "Asynchronous ASGI framework, automatic Pydantic schema validation, auto-generated Swagger OpenAPI interactive docs.", C_EMERALD),
        ("Task Queue & Broker", "Celery + Redis", "Distributed background processing for heavy operations (calendar generation, emails, retries) ensuring 0ms UI lag.", C_PURPLE),
        ("Automation Engine", "n8n Workflow Engine", "Decoupled visual orchestrator calling Google Calendar OAuth2 API, conference room allocation, and data transformation.", C_CYAN),
        ("Database & Security", "MySQL + Cloudflare", "ACID relational schema via SQLAlchemy ORM; secured over Cloudflare Tunnel Zero-Trust for safe remote access.", C_BLUE),
    ]

    for i, (title, tech, desc, accent_color) in enumerate(tech_cards):
        row = i // 3
        col = i % 3
        left = Inches(0.8 + col * 3.95)
        top = Inches(1.8 + row * 2.6)
        
        c = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(3.8), Inches(2.35))
        c.fill.solid()
        c.fill.fore_color.rgb = C_WHITE
        c.line.color.rgb = C_BORDER_LIGHT
        
        # Small accent bar on top
        bar = slide3.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(3.8), Inches(0.08))
        bar.fill.solid()
        bar.fill.fore_color.rgb = accent_color
        bar.line.fill.background()

        ctf = c.text_frame
        ctf.margin_left = ctf.margin_right = Inches(0.25)
        ctf.margin_top = Inches(0.2)
        ctf.word_wrap = True
        
        p1 = ctf.paragraphs[0]
        p1.text = title.upper()
        p1.font.size = Pt(9)
        p1.font.bold = True
        p1.font.color.rgb = C_TEXT_MUTED

        p2 = ctf.add_paragraph()
        p2.text = tech
        p2.font.size = Pt(14)
        p2.font.bold = True
        p2.font.color.rgb = C_TEXT_MAIN
        p2.space_before = Pt(2)

        p3 = ctf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(10.5)
        p3.font.color.rgb = RGBColor(71, 85, 105)
        p3.space_before = Pt(6)

    # -------------------------------------------------------------------------
    # SLIDE 4: Why Each Technology Was Chosen (The "Why")
    # -------------------------------------------------------------------------
    slide4 = prs.slides.add_slide(blank_layout)
    add_bg(slide4)
    add_header(slide4, "Architectural Rationale: Why We Chose These Tools", "DECISION ENGINEERING")

    whys = [
        ("FastAPI vs. Django / Flask", 
         "Why it matters to the business:",
         "FastAPI delivers up to 300% faster throughput than traditional frameworks using native Python async/await. It automatically generates interactive API documentation, minimizing client integration lead times and engineering debt."),
        
        ("Celery + Redis vs. Synchronous APIs", 
         "Why it matters to the user experience:",
         "Calendar API calls and email dispatches can take 3 to 10 seconds. Celery transfers these tasks into an asynchronous queue immediately, returning an instant response to the user and handling network failures via automatic retries."),
        
        ("n8n vs. Hardcoded Integration Scripts", 
         "Why it matters to scalability:",
         "Hardcoded Google Calendar API code is brittle, hard to update, and tightly couples external OAuth logic to the core app. n8n decouples the workflow; if the client wants Zoom, Teams, or Slack tomorrow, it takes zero backend code changes."),
        
        ("Firebase Hosting + Cloudflare Tunnel", 
         "Why it matters to security & deployment:",
         "Firebase provides global enterprise CDN delivery with sub-second page loads. Cloudflare Tunnel exposes the local backend to the cloud securely without exposing open ports or static public IPs to cyber vulnerabilities.")
    ]

    for i, (title, sub, body) in enumerate(whys):
        row = i // 2
        col = i % 2
        left = Inches(0.8 + col * 5.95)
        top = Inches(1.8 + row * 2.6)

        c = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(5.8), Inches(2.35))
        c.fill.solid()
        c.fill.fore_color.rgb = C_WHITE
        c.line.color.rgb = C_BORDER_LIGHT

        ctf = c.text_frame
        ctf.margin_left = ctf.margin_right = Inches(0.3)
        ctf.margin_top = Inches(0.2)
        ctf.word_wrap = True

        p1 = ctf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = C_BLUE

        p2 = ctf.add_paragraph()
        p2.text = sub
        p2.font.size = Pt(10)
        p2.font.bold = True
        p2.font.color.rgb = C_TEXT_MUTED
        p2.space_before = Pt(2)

        p3 = ctf.add_paragraph()
        p3.text = body
        p3.font.size = Pt(10.5)
        p3.font.color.rgb = RGBColor(51, 65, 85)
        p3.space_before = Pt(6)

    # -------------------------------------------------------------------------
    # SLIDE 5: How It Differs from Normal Interview Assistants
    # -------------------------------------------------------------------------
    slide5 = prs.slides.add_slide(blank_layout)
    add_bg(slide5)
    add_header(slide5, "Competitive Edge: How Interview Assist Differs", "VALUE PROPOSITION")

    # Table layout for differentiation
    table_shape = slide5.shapes.add_table(6, 3, Inches(0.8), Inches(1.8), Inches(11.733), Inches(5.0))
    table = table_shape.table
    table.columns[0].width = Inches(2.6)
    table.columns[1].width = Inches(4.5)
    table.columns[2].width = Inches(4.633)

    headers = ["Capability", "Standard Tools (Calendly / Spreadsheets)", "Interview Assist Autonomous Platform"]
    for j, h in enumerate(headers):
        cell = table.cell(0, j)
        cell.fill.solid()
        cell.fill.fore_color.rgb = C_CARD_DARK if j == 2 else C_TEXT_MAIN
        p = cell.text_frame.paragraphs[0]
        p.text = h
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = C_CYAN if j == 2 else C_WHITE

    rows_data = [
        ("Panel Coordination", "Usually 1-on-1 links; cannot easily coordinate a 3-person technical panel with shared calendars.", "Dynamic Panel Groups: Pairs multi-disciplinary panelists (Tech Lead + HR) into a unified synchronized slot."),
        ("Meeting Link Creation", "Static room links or manual copy-pasting from personal calendar accounts.", "Autonomous Event Generation: n8n requests a unique Google Meet room and binds it to candidate DB records."),
        ("Hybrid Modality", "Virtual only; no context for offline physical room reservations or directions.", "Smart Mode Detection: Differentiates Online (Google Meet) vs. Offline (office venue directions) seamlessly."),
        ("Lifecycle Feedback", "Requires separate Google Sheets or third-party survey tools to log interviewer ratings.", "Built-in Evaluation Scorecards: Panelists grade candidates directly within the candidate's active profile."),
        ("Fault Tolerance", "If calendar API limits or network drops hit, recruiter gets a fatal error.", "Event-Driven Celery Worker: Retries failed tasks up to 20 times in the background with zero data loss.")
    ]

    for i, row in enumerate(rows_data):
        for j, val in enumerate(row):
            cell = table.cell(i+1, j)
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(241, 245, 249) if i % 2 == 0 else C_WHITE
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.size = Pt(10)
            if j == 0:
                p.font.bold = True
                p.font.color.rgb = C_TEXT_MAIN
            elif j == 2:
                p.font.bold = True
                p.font.color.rgb = RGBColor(14, 116, 144) # Teal/Cyan bold
            else:
                p.font.color.rgb = RGBColor(71, 85, 105)

    # -------------------------------------------------------------------------
    # SLIDE 6: The Secret Weapon: n8n Automation Engine
    # -------------------------------------------------------------------------
    slide6 = prs.slides.add_slide(blank_layout)
    add_bg(slide6, dark=True)
    add_header(slide6, "The Automation Secret Weapon: n8n Integration", "ORCHESTRATION ENGINE", dark=True)

    n8n_steps = [
        ("Step 1: Webhook Ingestion", "n8n Webhook Node", "Receives JSON payload from Celery worker with candidate name, email, panel emails, job title, and ISO date/time slots."),
        ("Step 2: Google Calendar OAuth2", "Google Calendar Node", "Authenticated with Google Cloud Project via OAuth 2.0; books calendar event and automatically requests conferenceData (Google Meet)."),
        ("Step 3: Data Transformation", "Set / Edit Fields Node", "Extracts the dynamic conference URI ('hangoutLink'), Google eventId, and HTML calendar link for attendees."),
        ("Step 4: Synchronous Handshake", "Respond to Webhook", "Returns verified JSON response payload back to the Celery worker for instant database persistence.")
    ]

    for i, (title, node_name, desc) in enumerate(n8n_steps):
        left = Inches(0.8 + i * 2.95)
        top = Inches(2.0)
        c = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(2.8), Inches(4.6))
        c.fill.solid()
        c.fill.fore_color.rgb = C_CARD_DARK
        c.line.color.rgb = RGBColor(51, 65, 85)

        ctf = c.text_frame
        ctf.margin_left = ctf.margin_right = Inches(0.2)
        ctf.margin_top = Inches(0.25)
        ctf.word_wrap = True

        p1 = ctf.paragraphs[0]
        p1.text = f"0{i+1}"
        p1.font.size = Pt(28)
        p1.font.bold = True
        p1.font.color.rgb = C_CYAN

        p2 = ctf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(13)
        p2.font.bold = True
        p2.font.color.rgb = C_WHITE
        p2.space_before = Pt(8)

        p3 = ctf.add_paragraph()
        p3.text = f"[{node_name}]"
        p3.font.size = Pt(10.5)
        p3.font.bold = True
        p3.font.color.rgb = C_BLUE
        p3.space_before = Pt(4)

        p4 = ctf.add_paragraph()
        p4.text = desc
        p4.font.size = Pt(10)
        p4.font.color.rgb = RGBColor(203, 213, 225)
        p4.space_before = Pt(12)

    # -------------------------------------------------------------------------
    # SLIDE 7: End-to-End Workflow Architecture
    # -------------------------------------------------------------------------
    slide7 = prs.slides.add_slide(blank_layout)
    add_bg(slide7)
    add_header(slide7, "End-to-End Workflow & Event Architecture", "SYSTEM WORKFLOW")

    steps = [
        ("1. Action Trigger", "Admin selects Candidate & clicks 'Schedule Interview' on React Dashboard. Endpoint triggers in milliseconds."),
        ("2. DB Record", "FastAPI writes an initial 'pending' record to MySQL and logs an activity audit timestamp."),
        ("3. Redis Queue", "FastAPI pushes schedule_interview_task to Redis queue; UI immediately acknowledges success to user."),
        ("4. Celery Worker", "Celery picks up the job, resolves panel group emails, and dispatches HTTP POST payload to n8n webhook."),
        ("5. Google Meet Created", "n8n executes Google Calendar API call, attaches Google Meet room, and returns the unique meeting URL."),
        ("6. DB & Email Notification", "Celery updates schedule to 'scheduled', sets Meet link, and triggers rich SMTP HTML emails with direct CTA.")
    ]

    for i, (title, desc) in enumerate(steps):
        row = i // 3
        col = i % 3
        left = Inches(0.8 + col * 3.95)
        top = Inches(1.8 + row * 2.6)

        c = slide7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(3.8), Inches(2.35))
        c.fill.solid()
        c.fill.fore_color.rgb = C_WHITE
        c.line.color.rgb = C_BORDER_LIGHT

        ctf = c.text_frame
        ctf.margin_left = ctf.margin_right = Inches(0.25)
        ctf.margin_top = Inches(0.2)
        ctf.word_wrap = True

        p1 = ctf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = C_BLUE

        p2 = ctf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = RGBColor(71, 85, 105)
        p2.space_before = Pt(6)

    # -------------------------------------------------------------------------
    # SLIDE 8: Dynamic Email Notification Engine
    # -------------------------------------------------------------------------
    slide8 = prs.slides.add_slide(blank_layout)
    add_bg(slide8)
    add_header(slide8, "Candidate & Panel Email Experience", "COMMUNICATIONS ENGINE")

    # Left box: Email Design Specs
    box_l = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0))
    box_l.fill.solid()
    box_l.fill.fore_color.rgb = C_WHITE
    box_l.line.color.rgb = C_BORDER_LIGHT
    btf = box_l.text_frame
    btf.margin_left = btf.margin_right = Inches(0.3)
    btf.margin_top = Inches(0.3)
    btf.word_wrap = True

    bp1 = btf.paragraphs[0]
    bp1.text = "✉️ Enterprise HTML Email Features"
    bp1.font.size = Pt(16)
    bp1.font.bold = True
    bp1.font.color.rgb = C_TEXT_MAIN

    email_features = [
        "Dynamic Link Detection: Regex parser detects generated Google Meet links and transforms them into prominent 1-click CTA buttons.",
        "Role-Specific Dispatch: Separate, contextual notification emails sent to both the Candidate and all Panel Members.",
        "Comprehensive Meeting Context: Displays candidate name, applied job role, interview date, start time, end time, and instructions.",
        "High Delivery Rate: Configured with standard SMTP TLS encryption, compliant with enterprise spam filters.",
        "Resilient Audit Logging: All outbound email dispatches and delivery statuses are logged in MySQL for complete compliance."
    ]
    for feat in email_features:
        p = btf.add_paragraph()
        p.text = "• " + feat
        p.font.size = Pt(11)
        p.font.color.rgb = RGBColor(71, 85, 105)
        p.space_before = Pt(12)

    # Right box: Visual Mock of the Email Card
    box_r = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0))
    box_r.fill.solid()
    box_r.fill.fore_color.rgb = RGBColor(241, 245, 249)
    box_r.line.color.rgb = RGBColor(203, 213, 225)
    rtf2 = box_r.text_frame
    rtf2.margin_left = rtf2.margin_right = Inches(0.4)
    rtf2.margin_top = Inches(0.35)
    rtf2.word_wrap = True

    rp1 = rtf2.paragraphs[0]
    rp1.text = "EMAIL PREVIEW: INVITATION CARD"
    rp1.font.size = Pt(11)
    rp1.font.bold = True
    rp1.font.color.rgb = C_BLUE

    rp2 = rtf2.add_paragraph()
    rp2.text = "Interview Scheduled: Senior Software Engineer"
    rp2.font.size = Pt(15)
    rp2.font.bold = True
    rp2.font.color.rgb = C_TEXT_MAIN
    rp2.space_before = Pt(6)

    rp3 = rtf2.add_paragraph()
    rp3.text = "Dear Candidate,\nYour interview has been scheduled with the Engineering Panel on Oct 20 at 10:00 AM IST.\n\nPlease find your dedicated Google Meet interview room below:"
    rp3.font.size = Pt(11)
    rp3.font.color.rgb = RGBColor(51, 65, 85)
    rp3.space_before = Pt(8)

    # CTA Button graphic in mock
    cta_btn = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.5), Inches(4.5), Inches(4.3), Inches(0.7))
    cta_btn.fill.solid()
    cta_btn.fill.fore_color.rgb = C_EMERALD
    cta_btn.line.fill.background()
    cp = cta_btn.text_frame.paragraphs[0]
    cp.text = "🎥 Join Google Meet Interview"
    cp.font.size = Pt(13)
    cp.font.bold = True
    cp.font.color.rgb = C_WHITE
    cp.alignment = PP_ALIGN.CENTER

    # -------------------------------------------------------------------------
    # SLIDE 9: Multi-Role Portals & RBAC
    # -------------------------------------------------------------------------
    slide9 = prs.slides.add_slide(blank_layout)
    add_bg(slide9)
    add_header(slide9, "Role-Based Access Control & Tailored Portals", "USER ECOSYSTEM")

    portals = [
        ("Admin & Super Admin Portal", "Complete Recruitment Command", [
            "Candidate Pipeline & Status Filtering",
            "Job Role creation (Online vs. Offline)",
            "Panel allocation & Panel Group creation",
            "Recruitment analytics & conversion metrics",
            "Master calendar & interview slot override"
        ], C_BLUE),
        ("Panelist / Interviewer Portal", "Focused Evaluation Workspace", [
            "Assigned candidate schedule view",
            "Instant resume & portfolio preview",
            "Direct Google Meet access link",
            "Real-time evaluation scorecard submission",
            "Recommendation logging (Hire / Hold / Reject)"
        ], C_CYAN),
        ("Candidate Portal", "Transparent Candidate Journey", [
            "Application status timeline",
            "Interview confirmation & calendar details",
            "Direct 1-click meeting join access",
            "Profile & resume management",
            "Real-time in-app notification alerts"
        ], C_EMERALD)
    ]

    for i, (title, sub, items, colr) in enumerate(portals):
        left = Inches(0.8 + i * 3.95)
        top = Inches(1.8)
        c = slide9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(3.8), Inches(5.0))
        c.fill.solid()
        c.fill.fore_color.rgb = C_WHITE
        c.line.color.rgb = C_BORDER_LIGHT

        bar = slide9.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(3.8), Inches(0.08))
        bar.fill.solid()
        bar.fill.fore_color.rgb = colr
        bar.line.fill.background()

        ctf = c.text_frame
        ctf.margin_left = ctf.margin_right = Inches(0.25)
        ctf.margin_top = Inches(0.25)
        ctf.word_wrap = True

        p1 = ctf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = C_TEXT_MAIN

        p2 = ctf.add_paragraph()
        p2.text = sub
        p2.font.size = Pt(10)
        p2.font.bold = True
        p2.font.color.rgb = C_TEXT_MUTED
        p2.space_before = Pt(2)

        for item in items:
            p = ctf.add_paragraph()
            p.text = "✓ " + item
            p.font.size = Pt(10.5)
            p.font.color.rgb = RGBColor(51, 65, 85)
            p.space_before = Pt(10)

    # -------------------------------------------------------------------------
    # SLIDE 10: Business ROI & Client Impact
    # -------------------------------------------------------------------------
    slide10 = prs.slides.add_slide(blank_layout)
    add_bg(slide10, dark=True)
    add_header(slide10, "Tangible Business Impact & Return on Investment", "BUSINESS VALUE", dark=True)

    metrics = [
        ("80%", "Reduction in Scheduling Overhead", "Eliminates hundreds of manual email threads and calendar coordination hours per recruiter monthly."),
        ("100%", "Automated Meeting Generation", "Zero human errors in link generation, zero double bookings, and zero missing Google Meet rooms."),
        ("3x Faster", "Time-to-Interview Velocity", "Candidates are screened and scheduled within hours instead of days, drastically reducing drop-offs."),
        ("360°", "Audit & Candidate Accountability", "Complete transparency from resume upload to final hire recommendation across all stakeholders.")
    ]

    for i, (metric, label, desc) in enumerate(metrics):
        left = Inches(0.8 + i * 2.95)
        top = Inches(2.0)
        c = slide10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(2.8), Inches(4.5))
        c.fill.solid()
        c.fill.fore_color.rgb = C_CARD_DARK
        c.line.color.rgb = RGBColor(51, 65, 85)

        ctf = c.text_frame
        ctf.margin_left = ctf.margin_right = Inches(0.2)
        ctf.margin_top = Inches(0.3)
        ctf.word_wrap = True

        p1 = ctf.paragraphs[0]
        p1.text = metric
        p1.font.size = Pt(36)
        p1.font.bold = True
        p1.font.color.rgb = C_CYAN

        p2 = ctf.add_paragraph()
        p2.text = label
        p2.font.size = Pt(13)
        p2.font.bold = True
        p2.font.color.rgb = C_WHITE
        p2.space_before = Pt(8)

        p3 = ctf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(10.5)
        p3.font.color.rgb = RGBColor(203, 213, 225)
        p3.space_before = Pt(12)

    # -------------------------------------------------------------------------
    # SLIDE 11: Live Demo Walkthrough Roadmap
    # -------------------------------------------------------------------------
    slide11 = prs.slides.add_slide(blank_layout)
    add_bg(slide11)
    add_header(slide11, "Live Client Demonstration Roadmap", "DEMO PLAN")

    demo_steps = [
        ("Step 1: The Pipeline", "Admin Dashboard", "Show candidate list with statuses (Applied, Shortlisted, Scheduled). Highlight clean UI and instant filtering."),
        ("Step 2: 1-Click Scheduling", "Candidate Action Modal", "Pick a candidate, select interview date/time, and choose an assigned Panel Group. Click 'Schedule'."),
        ("Step 3: Background Magic", "Celery & n8n Execution", "Point out that the UI stays responsive immediately. n8n executes the Google Calendar call in the background."),
        ("Step 4: Real-Time Update", "Generated Google Meet", "Show the updated candidate row: status turns green to 'Scheduled' with the live Google Meet link attached."),
        ("Step 5: The Email Delivery", "Candidate & Panel Inboxes", "Display the branded invitation email featuring the bold 'Join Google Meet Interview' button."),
        ("Step 6: Evaluation & Feedback", "Panelist Workspace", "Switch to the Panelist view: open the candidate card, review resume notes, and submit a scorecard.")
    ]

    for i, (title, sub, desc) in enumerate(demo_steps):
        row = i // 3
        col = i % 3
        left = Inches(0.8 + col * 3.95)
        top = Inches(1.8 + row * 2.6)

        c = slide11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(3.8), Inches(2.35))
        c.fill.solid()
        c.fill.fore_color.rgb = C_WHITE
        c.line.color.rgb = C_BORDER_LIGHT

        ctf = c.text_frame
        ctf.margin_left = ctf.margin_right = Inches(0.25)
        ctf.margin_top = Inches(0.2)
        ctf.word_wrap = True

        p1 = ctf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = C_BLUE

        p2 = ctf.add_paragraph()
        p2.text = sub
        p2.font.size = Pt(10)
        p2.font.bold = True
        p2.font.color.rgb = C_TEXT_MUTED
        p2.space_before = Pt(2)

        p3 = ctf.add_paragraph()
        p3.text = desc
        p3.font.size = Pt(10.5)
        p3.font.color.rgb = RGBColor(71, 85, 105)
        p3.space_before = Pt(6)

    # -------------------------------------------------------------------------
    # SLIDE 12: Conclusion & Q&A
    # -------------------------------------------------------------------------
    slide12 = prs.slides.add_slide(blank_layout)
    add_bg(slide12, dark=True)

    tb12 = slide12.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(11.733), Inches(3.5))
    tf12 = tb12.text_frame
    tf12.word_wrap = True
    
    p = tf12.paragraphs[0]
    p.text = "Empower Your Hiring Operations with Interview Assist"
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = C_WHITE

    p2 = tf12.add_paragraph()
    p2.text = "Scalable. Autonomous. Built for modern recruitment velocity."
    p2.font.size = Pt(18)
    p2.font.color.rgb = C_CYAN
    p2.space_before = Pt(10)

    p3 = tf12.add_paragraph()
    p3.text = "Thank you! We invite your questions and would love to walk through the live demo."
    p3.font.size = Pt(14)
    p3.font.color.rgb = RGBColor(148, 163, 184)
    p3.space_before = Pt(24)

    prs.save(filename)
    print(f"Presentation saved successfully to {filename}")

if __name__ == "__main__":
    create_deck("d:/projects/InterviewAssist/Interview_Assist_Presentation.pptx")
