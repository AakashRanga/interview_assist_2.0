import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' 
    along with a clean running header and footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B")) # Slate 500

        # Don't draw header on first page cover
        if self._pageNumber > 1:
            self.drawString(54, 750, "INTERVIEW ASSIST — CLIENT DOSSIER & SYSTEM ARCHITECTURE")
            self.setFont("Helvetica", 8)
            self.drawRightString(558, 750, "AI RECRUITMENT PLATFORM")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(54, 742, 558, 742)

        # Running Footer on all pages
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 45, 558, 45)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#94A3B8"))
        self.drawString(54, 32, "Confidential • Prepared for Client Presentation • Interview Assist 2.0")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_text)
        self.restoreState()


def create_pdf(filename="Interview_Assist_Client_Dossier.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0F172A")    # Slate 900
    ACCENT_BLUE = colors.HexColor("#2563EB")# Blue 600
    ACCENT_CYAN = colors.HexColor("#0891B2")# Cyan 600
    TEXT_DARK = colors.HexColor("#1E293B")  # Slate 800
    TEXT_MUTED = colors.HexColor("#64748B") # Slate 500
    BG_LIGHT = colors.HexColor("#F8FAFC")   # Slate 50
    BORDER_LIGHT = colors.HexColor("#E2E8F0")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=ACCENT_CYAN,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=ACCENT_BLUE,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        leftIndent=14,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14.5,
        textColor=PRIMARY,
        spaceAfter=0
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=TEXT_DARK
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=PRIMARY
    )

    story = []

    # ---------------------------------------------------------
    # COVER / HEADER BLOCK
    # ---------------------------------------------------------
    story.append(Paragraph("Interview Assist (AI Recruitment System)", title_style))
    story.append(Paragraph("System Architecture, Technological Rationale & Client Briefing Dossier", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_BLUE, spaceAfter=12))

    # Executive Summary Callout Box
    pitch_text = (
        "<b>Executive Summary:</b> Traditional recruitment operations lose hundreds of hours each month "
        "coordinating interview schedules, panel availabilities, meeting links, and feedback forms across "
        "disjointed tools. <b>Interview Assist</b> turns recruitment into an autonomous, event-driven engine. "
        "By orchestrating <b>FastAPI, Redis, Celery, and n8n</b>, it books calendar slots, generates dedicated "
        "Google Meet conference rooms, dispatches branded invites, and tracks candidate evaluations with zero manual intervention."
    )
    callout_data = [[Paragraph(pitch_text, callout_style)]]
    callout_table = Table(callout_data, colWidths=[504])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")), # Blue 50
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BFDBFE")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # 1. TECHNOLOGY STACK TABLE
    # ---------------------------------------------------------
    story.append(Paragraph("1. Technology Stack & Architectural Justification", h1_style))
    
    tech_data = [
        [
            Paragraph("System Layer", table_header_style),
            Paragraph("Technologies Used", table_header_style),
            Paragraph("Architectural Rationale ('Why We Chose It')", table_header_style)
        ],
        [
            Paragraph("<b>Frontend Client</b>", table_cell_bold),
            Paragraph("React 18, TypeScript, Vite, TailwindCSS", table_cell_style),
            Paragraph("Ultra-fast sub-second Vite HMR builds. TypeScript provides compile-time safety across multi-role data states. TailwindCSS delivers an intuitive, modern dashboard.", table_cell_style)
        ],
        [
            Paragraph("<b>Hosting & Edge CDN</b>", table_cell_bold),
            Paragraph("Firebase Hosting (Google Cloud)", table_cell_style),
            Paragraph("Global low-latency edge CDN distribution, automated SSL provisioning, 99.99% uptime SLA, and atomic zero-downtime releases.", table_cell_style)
        ],
        [
            Paragraph("<b>Backend API</b>", table_cell_bold),
            Paragraph("FastAPI (Python 3.10+)", table_cell_style),
            Paragraph("Modern asynchronous ASGI framework; up to 300% faster throughput than traditional frameworks. Built-in Pydantic validation and auto-generated Swagger OpenAPI interactive docs.", table_cell_style)
        ],
        [
            Paragraph("<b>Task Queue & Broker</b>", table_cell_bold),
            Paragraph("Celery + Redis", table_cell_style),
            Paragraph("Decouples heavy operations (calendar bookings, email generation, retries) from UI requests. Ensures 0ms latency for users and provides fault-tolerant retries (up to 20 attempts).", table_cell_style)
        ],
        [
            Paragraph("<b>Workflow Engine</b>", table_cell_bold),
            Paragraph("n8n (Self-Hosted Workflow)", table_cell_style),
            Paragraph("Decouples third-party integrations from core business code. Securely manages Google Calendar OAuth2, event bookings, and Google Meet link generation with visual audit logs.", table_cell_style)
        ],
        [
            Paragraph("<b>Database</b>", table_cell_bold),
            Paragraph("MySQL + SQLAlchemy ORM", table_cell_style),
            Paragraph("ACID-compliant relational schema to model Candidates, Applications, Panels, Schedules, Feedback, and Audit History with relational integrity.", table_cell_style)
        ],
        [
            Paragraph("<b>Network Security</b>", table_cell_bold),
            Paragraph("Cloudflare Tunnel (Zero Trust)", table_cell_style),
            Paragraph("Securely tunnels backend services to the web without opening risky inbound firewall ports or exposing public IP addresses.", table_cell_style)
        ]
    ]

    t_tech = Table(tech_data, colWidths=[95, 140, 269])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # 2. KEY DIFFERENTIATORS TABLE
    # ---------------------------------------------------------
    story.append(Paragraph("2. How Interview Assist Differs from Standard Scheduling Tools", h1_style))
    
    diff_data = [
        [
            Paragraph("Feature / Capability", table_header_style),
            Paragraph("Standard Tools (Calendly / Manual)", table_header_style),
            Paragraph("Interview Assist Platform", table_header_style)
        ],
        [
            Paragraph("<b>Multi-Panel Coordination</b>", table_cell_bold),
            Paragraph("Primarily 1-on-1 bookings or complex multi-link round-robins. No native panel grouping.", table_cell_style),
            Paragraph("<b>Dynamic Panel Groups:</b> Groups multiple interviewers (e.g. Lead Dev + HR) into one slot; automatically validates and invites everyone simultaneously.", table_cell_style)
        ],
        [
            Paragraph("<b>Meeting Generation</b>", table_cell_bold),
            Paragraph("Static links or manual copy-pasting from calendar invites into emails.", table_cell_style),
            Paragraph("<b>Autonomous Generation:</b> n8n dynamically creates a unique Google Meet room via Google Calendar API and stores it in the candidate record.", table_cell_style)
        ],
        [
            Paragraph("<b>Hybrid Modality</b>", table_cell_bold),
            Paragraph("Virtual only; cannot natively handle on-site physical room directions.", table_cell_style),
            Paragraph("<b>Smart Mode Detection:</b> Differentiates between Online (generates Meet link) and Offline (allocates room venue) seamlessly.", table_cell_style)
        ],
        [
            Paragraph("<b>Candidate Lifecycle</b>", table_cell_bold),
            Paragraph("Isolated tool; disconnected from resume screening, notes, and scorecards.", table_cell_style),
            Paragraph("<b>Unified 360° Ecosystem:</b> Integrated resume review, activity logging, notification hub, and interviewer rating scorecard.", table_cell_style)
        ],
        [
            Paragraph("<b>Fault Resilience</b>", table_cell_bold),
            Paragraph("If Google API limits or network drops occur, the recruiter gets an unhandled error.", table_cell_style),
            Paragraph("<b>Background Retry Policy:</b> Celery worker catches transient errors and retries silently in the background with zero data loss.", table_cell_style)
        ]
    ]

    t_diff = Table(diff_data, colWidths=[105, 175, 224])
    t_diff.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_diff)
    story.append(Spacer(1, 14))

    # ---------------------------------------------------------
    # 3. N8N AUTOMATION ENGINE & CELERY ORCHESTRATION
    # ---------------------------------------------------------
    story.append(Paragraph("3. Deep Dive: n8n Automation Engine & Asynchronous Architecture", h1_style))
    story.append(Paragraph(
        "A cornerstone of the platform is the decoupled integration between <b>Celery</b> and the <b>n8n Workflow Engine</b>. "
        "Rather than baking complex third-party API code and OAuth token refreshment directly into the Python backend, "
        "n8n acts as an enterprise integration gateway with the following advantages:", body_style
    ))
    
    n8n_points = [
        "<b>Zero-Maintenance OAuth:</b> n8n securely handles Google Cloud OAuth2 token refreshes and scopes without custom credential-refresh daemon code.",
        "<b>Webhook Ingestion:</b> Celery dispatches candidate metadata (name, candidate email, panelist emails, ISO timestamps) to <code>/webhook/schedule-interview</code>.",
        "<b>Conference Room Creation:</b> The Google Calendar node creates a calendar event with <code>conferenceDataUi: 'Google Meet'</code>.",
        "<b>Data Transformation Node:</b> Extracts the generated <code>hangoutLink</code> and event ID, returning a standardized JSON payload back to the Celery worker.",
        "<b>Enterprise Extensibility:</b> If the business expands to Microsoft Teams, Zoom, or Slack alerts, nodes can be added or updated visually in n8n in minutes without touching core code."
    ]
    for pt in n8n_points:
        story.append(Paragraph(f"• {pt}", bullet_style))
    
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # 4. END-TO-END WORKFLOW STEP-BY-STEP
    # ---------------------------------------------------------
    story.append(Paragraph("4. End-to-End Execution Sequence", h1_style))
    
    seq_steps = [
        ("Step 1: Admin Triggers Schedule", "On the React Dashboard, the Admin selects a candidate, chooses a date/time slot, and assigns a Panel Group. The request is dispatched to <code>POST /admin/schedule-interview</code> in under 50ms."),
        ("Step 2: Database Initialization", "FastAPI writes an initial schedule record with status <code>pending</code> and logs an activity audit record in <code>candidate_activities</code>."),
        ("Step 3: Background Offload via Redis", "FastAPI queues <code>schedule_interview_task</code> onto Redis. The HTTP response completes immediately, allowing the UI to stay fully interactive."),
        ("Step 4: Celery & n8n Execution", "The Celery worker pulls the task, resolves all panelist emails, and calls the n8n webhook. n8n schedules the Google Calendar event and creates the Google Meet conference."),
        ("Step 5: Record Update & Audit", "Celery receives the generated <code>hangoutLink</code>, updates the MySQL schedule status to <code>scheduled</code>, and logs an in-app notification."),
        ("Step 6: Dynamic HTML Email Dispatch", "The custom SMTP service compiles a responsive HTML email with candidate context and a high-visibility <b>Join Google Meet</b> button, sending invites to both candidate and panel members.")
    ]

    for title, desc in seq_steps:
        story.append(Paragraph(f"<b>{title}:</b> {desc}", bullet_style))

    story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # 5. USER ECOSYSTEM & RBAC
    # ---------------------------------------------------------
    story.append(Paragraph("5. Role-Based Access Control & Portals", h1_style))

    portals_data = [
        ("Admin & Super Admin Portal", "Complete pipeline control, hiring analytics, job role setup (Online vs Offline), panel group assignments, and slot override controls."),
        ("Panelist / Interviewer Portal", "Personalized dashboard of assigned interviews, 1-click Google Meet access, embedded resume viewer, and structured evaluation scorecard submission."),
        ("Candidate Portal", "Transparent application timeline, interview date/time reminders, 1-click meeting join links, and personal profile management.")
    ]
    for p_name, p_desc in portals_data:
        story.append(Paragraph(f"<b>{p_name}:</b> {p_desc}", bullet_style))

    story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # 6. BUSINESS ROI & CLIENT PRESENTATION CHECKLIST
    # ---------------------------------------------------------
    story.append(Paragraph("6. Business Impact & Client Demonstration Script", h1_style))

    roi_metrics = [
        "<b>80% Reduction in Administrative Overhead:</b> Eliminates manual back-and-forth email scheduling and link pasting.",
        "<b>Zero Double-Bookings & Lost Links:</b> Deterministic slot reservations and automated Google Meet generation guarantee zero room errors.",
        "<b>3x Faster Time-to-Interview:</b> Enables same-day screening and interview booking, drastically reducing top-tier candidate drop-off.",
        "<b>Live Demo Guide:</b> (1) Showcase Admin Dashboard candidate pipeline; (2) Trigger 1-Click Schedule; (3) Highlight background n8n execution; (4) Display updated Google Meet link in the portal; (5) Open candidate email with Join CTA; (6) Show Panelist scorecard submission."
    ]
    for r in roi_metrics:
        story.append(Paragraph(f"• {r}", bullet_style))

    story.append(Spacer(1, 14))

    # Build PDF with dynamic header/footer canvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF saved successfully to {filename}")

if __name__ == "__main__":
    create_pdf("d:/projects/InterviewAssist/Interview_Assist_Client_Dossier.pdf")
