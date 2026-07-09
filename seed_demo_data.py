"""
Seed demo data into the Visitor Management backend across every module.

Idempotency note: this is a one-shot demo seeder. Re-running will skip records
that violate unique constraints (e.g. duplicate staff emails) and keep going,
printing a per-record status so you can see exactly what was created.

Run while the backend is up on :8081 ->  python seed_demo_data.py
"""

import json
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

BASE = "http://localhost:8081"
ADMIN_USER = "admin"
ADMIN_PASS = "Admin@123"
STAFF_PASSWORD = "Password@123"

_token = None


def api(method, path, body=None, auth=True, quiet=False):
    """Call the API. Returns parsed JSON (or None). Never raises on HTTP errors —
    prints a short status line and returns None so seeding continues."""
    url = BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if auth and _token:
        req.add_header("Authorization", "Bearer " + _token)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode("utf-8")[:160]
        except Exception:
            pass
        if not quiet:
            print(f"   ! {method} {path} -> HTTP {e.code} {detail}")
        return None
    except Exception as e:
        if not quiet:
            print(f"   ! {method} {path} -> {e}")
        return None


def iso(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    global _token
    now = datetime.now(timezone.utc)

    # --- 0. ensure roles exist, then log in -------------------------------
    api("POST", "/api/auth/bootstrap-admin", {}, auth=False, quiet=True)
    login = api("POST", "/api/auth/login", {"username": ADMIN_USER, "password": ADMIN_PASS}, auth=False)
    if not login or not login.get("token"):
        print("FATAL: could not log in as admin. Is the backend running on :8081?")
        return
    _token = login["token"]
    print("Logged in as admin.")

    # --- 1. roles: map title -> id ----------------------------------------
    roles = api("GET", "/api/staff/roles") or []
    role_id = {str(r.get("title", "")).upper(): r.get("id") for r in roles}
    print(f"Roles available: {sorted(role_id)}")

    def rid(title):
        return role_id.get(title.upper())

    # --- 2. staff users (each also creates a login account) ---------------
    print("\n== Staff users ==")
    staff_defs = [
        ("Aarav Sharma",  "aarav.sharma@acme.com",  "EMPLOYEE",     "+91 9810000001"),
        ("Diya Patel",    "diya.patel@acme.com",    "EMPLOYEE",     "+91 9810000002"),
        ("Rohan Mehta",   "rohan.mehta@acme.com",   "EMPLOYEE",     "+91 9810000003"),
        ("Ananya Iyer",   "ananya.iyer@acme.com",   "EMPLOYEE",     "+91 9810000004"),
        ("Kabir Nair",    "kabir.nair@acme.com",    "EMPLOYEE",     "+91 9810000005"),
        ("Priya Desai",   "priya.desai@acme.com",   "MANAGER",      "+91 9810000006"),
        ("Sneha Reddy",   "sneha.reddy@acme.com",   "RECEPTIONIST", "+91 9810000007"),
        ("Arjun Singh",   "arjun.singh@acme.com",   "SECURITY",     "+91 9810000008"),
    ]
    host_ids = []   # staff ids usable as visit/booking hosts (employees + manager)
    for name, email, role, phone in staff_defs:
        r = rid(role)
        if not r:
            print(f"   - skip {email}: role {role} not found")
            continue
        res = api("POST", "/api/staff/users",
                  {"name": name, "email": email, "password": STAFF_PASSWORD, "phone": phone, "roleIds": [r]})
        if res and res.get("id"):
            print(f"   + {name} ({role}) id={res['id']}  login: {email} / {STAFF_PASSWORD}")
            if role in ("EMPLOYEE", "MANAGER"):
                host_ids.append(res["id"])
        else:
            print(f"   = {name} ({email}) not created (may already exist)")

    # fall back to any existing staff users as hosts if creations were skipped
    if not host_ids:
        existing = api("GET", "/api/staff/users") or []
        host_ids = [u["id"] for u in existing if u.get("id")][:5]
    if not host_ids:
        print("FATAL: no staff users available to act as hosts; aborting visit/booking seeding.")
    else:
        print(f"Host pool ids: {host_ids}")

    def host(i):
        return host_ids[i % len(host_ids)] if host_ids else None

    # --- 3. visitors ------------------------------------------------------
    print("\n== Visitors ==")
    visitor_defs = [
        ("Rakesh Kumar",    "rakesh.kumar@gmail.com",   "+91", "9000000001", "IT_COMPANY", "Infosys",      "AADHAAR",  "1234-5678-9012"),
        ("Meera Joshi",     "meera.joshi@gmail.com",    "+91", "9000000002", "FACTORY",    "Tata Steel",   "PAN",      "ABCDE1234F"),
        ("John Carter",     "john.carter@outlook.com",  "+1",  "2025550111", "IT_COMPANY", "Microsoft",    "PASSPORT", "X1234567"),
        ("Sara Williams",   "sara.w@outlook.com",       "+44", "7700900123", "HOSPITAL",   "NHS Trust",    "PASSPORT", "P9988776"),
        ("Imran Sheikh",    "imran.sheikh@gmail.com",   "+91", "9000000005", "SCHOOL",     "DPS School",   "AADHAAR",  "5678-1234-9012"),
        ("Lakshmi Menon",   "lakshmi.menon@gmail.com",  "+91", "9000000006", "IT_COMPANY", "Wipro",        "DL",       "KA0120190001"),
        ("David Brown",     "david.brown@yahoo.com",    "+1",  "2025550987", "FACTORY",    "Caterpillar",  "PASSPORT", "Z7654321"),
        ("Fatima Khan",     "fatima.khan@gmail.com",    "+91", "9000000008", "HOSPITAL",   "Apollo",       "AADHAAR",  "9012-3456-7890"),
    ]
    visitor_ids = []
    for name, email, dc, ph, org, comp, idt, idn in visitor_defs:
        res = api("POST", "/api/visitors", {
            "name": name, "email": email, "phoneDialCode": dc, "phoneNumber": ph,
            "organizationType": org, "companyName": comp, "idProofType": idt, "idProofNumber": idn,
        })
        if res and res.get("id"):
            visitor_ids.append(res["id"])
            print(f"   + {name} id={res['id']}")
        else:
            print(f"   = {name} not created")

    # --- 4. visits (mix of statuses) --------------------------------------
    # approve() takes PENDING -> CHECKED_IN ; checkOut() -> CHECKED_OUT ; reject() -> REJECTED
    print("\n== Visits ==")

    def create_visit(vidx, hidx, when, purpose):
        if not visitor_ids or not host_ids:
            return None
        res = api("POST", "/api/visits", {
            "visitorId": visitor_ids[vidx % len(visitor_ids)],
            "hostUserId": host(hidx),
            "visitAt": iso(when),
            "purpose": purpose,
        })
        return res.get("id") if res else None

    purposes = ["Job interview", "Client meeting", "Vendor demo", "Project discussion",
                "Maintenance work", "Campus tour", "Audit", "Delivery"]

    # PENDING (awaiting host approval / today)
    for i in range(2):
        vid = create_visit(i, i, now + timedelta(hours=2 + i), purposes[i])
        print(f"   + PENDING visit id={vid}")

    # CHECKED_IN (active visitors) -> create then approve
    for i in range(2, 5):
        vid = create_visit(i, i, now - timedelta(hours=1), purposes[i])
        if vid:
            api("POST", f"/api/visits/{vid}/approve", {})
            print(f"   + CHECKED_IN (active) visit id={vid}")

    # CHECKED_OUT (completed today) -> create, approve, checkout
    for i in range(5, 7):
        vid = create_visit(i, i, now - timedelta(hours=4), purposes[i])
        if vid:
            api("POST", f"/api/visits/{vid}/approve", {})
            api("POST", f"/api/visits/{vid}/checkout", {})
            print(f"   + CHECKED_OUT visit id={vid}")

    # REJECTED
    vid = create_visit(7, 7, now + timedelta(days=1), purposes[7])
    if vid:
        api("POST", f"/api/visits/{vid}/reject", {"reason": "Host unavailable on requested date"})
        print(f"   + REJECTED visit id={vid}")

    # --- 5. pre-register / appointment bookings ---------------------------
    print("\n== Pre-Register bookings ==")
    bookings = [
        {
            "visitorName": "Suresh Rao", "email": "suresh.rao@gmail.com", "phoneDialCode": "+91",
            "phoneNumber": "9111000001", "companyName": "L&T", "idProofType": "AADHAAR",
            "idProofNumber": "1111-2222-3333", "organizationType": "FACTORY",
            "details": {"purpose": "Equipment inspection", "safetyGearRequired": "true",
                         "areaVisiting": "Assembly line B", "supervisorName": "Mr. Gupta",
                         "materialCarrying": "false"},
        },
        {
            "visitorName": "Emily Davis", "email": "emily.davis@outlook.com", "phoneDialCode": "+1",
            "phoneNumber": "2025551212", "companyName": "Google", "idProofType": "PASSPORT",
            "idProofNumber": "G5566778", "organizationType": "IT_COMPANY",
            "details": {"purpose": "Partnership discussion", "employeeToMeet": "Priya Desai",
                         "meetingRoom": "Conference Room 3", "laptopCarrying": "true", "ndaSigned": "true"},
        },
        {
            "visitorName": "Anil Verma", "email": "anil.verma@gmail.com", "phoneDialCode": "+91",
            "phoneNumber": "9111000003", "companyName": "Self", "idProofType": "AADHAAR",
            "idProofNumber": "4444-5555-6666", "organizationType": "HOSPITAL",
            "details": {"patientName": "Sunita Verma", "wardRoom": "Ward 12 / Room 4",
                         "relation": "Spouse", "visitTimeSlot": "16:00-17:00"},
        },
        {
            "visitorName": "Grace Lee", "email": "grace.lee@gmail.com", "phoneDialCode": "+91",
            "phoneNumber": "9111000004", "companyName": "Parent", "idProofType": "DL",
            "idProofNumber": "KA0520200099", "organizationType": "SCHOOL",
            "details": {"studentName": "Daniel Lee", "studentClass": "8B",
                         "reason": "Parent-teacher meeting"},
        },
    ]
    booking_ids = []
    for i, b in enumerate(bookings):
        b = dict(b)
        b["hostUserId"] = host(i)
        res = api("POST", "/api/visitor/pre-register/send", b)
        if res and res.get("id"):
            booking_ids.append(res["id"])
            print(f"   + booking {b['visitorName']} ({b['organizationType']}) id={res['id']}")
        else:
            print(f"   = booking {b['visitorName']} not created")
    # approve the first two so they get a token + QR
    for bid in booking_ids[:2]:
        if api("POST", f"/api/visitor/pre-register/{bid}/approve", {}):
            print(f"   ~ approved booking id={bid} (token + QR generated)")
    # reject the last one
    if len(booking_ids) >= 4:
        api("POST", f"/api/visitor/pre-register/{booking_ids[3]}/reject",
            {"reason": "Please reschedule to another slot"})
        print(f"   ~ rejected booking id={booking_ids[3]}")

    # --- 6. contact diary -------------------------------------------------
    print("\n== Contact diary ==")
    contacts = [
        ("Ramesh Gupta",   "Priya Desai",  "+91 9222000001", "Bulk order enquiry",      "COMPLETED"),
        ("Nina Williams",  "Sneha Reddy",  "+91 9222000002", "Service complaint",       "PENDING"),
        ("Vikram Sethi",   "Aarav Sharma", "+91 9222000003", "Partnership proposal",    "COMPLETED"),
        ("Olivia Martin",  "Rohan Mehta",  "+91 9222000004", "Product demo request",    "PENDING"),
        ("Sanjay Bhatia",  "Priya Desai",  "+91 9222000005", "Payment follow-up",       "COMPLETED"),
        ("Aisha Rahman",   "Diya Patel",   "+91 9222000006", "Job application enquiry",  "PENDING"),
    ]
    for visitor, person, phone, purpose, status in contacts:
        res = api("POST", "/api/contact-diary",
                  {"visitor": visitor, "contactPerson": person, "phone": phone,
                   "purpose": purpose, "status": status})
        print(f"   {'+' if res else '='} {visitor} -> {person} ({status})")

    # --- 7. notices -------------------------------------------------------
    print("\n== Notices ==")
    notices = [
        ("Office closed on Republic Day", "HOLIDAY", "ACTIVE",
         "The office will remain closed on 26th January. Security desk operates as usual."),
        ("Fire drill scheduled", "SAFETY", "ACTIVE",
         "A mandatory fire drill will be conducted this Friday at 11:00 AM. Please assemble at the parking lot."),
        ("New visitor parking policy", "UPDATE", "ACTIVE",
         "Visitors must register their vehicle number at the front desk to use the parking facility."),
        ("Cafeteria menu revised", "GENERAL", "INACTIVE",
         "The cafeteria has introduced new healthy meal options effective next month."),
        ("ID badge mandatory", "SECURITY", "ACTIVE",
         "All visitors must wear their printed ID badge visibly at all times inside the premises."),
    ]
    for title, category, status, desc in notices:
        res = api("POST", "/api/notices",
                  {"title": title, "category": category, "status": status, "description": desc})
        print(f"   {'+' if res else '='} {title} ({category}/{status})")

    # --- 8. visit categories ---------------------------------------------
    print("\n== Visit categories ==")
    categories = [
        ("Client Visit",      "CLIENT",      0),
        ("Vendor / Supplier", "SUPPLIER",    0),
        ("Contractor",        "CONTRACTOR",  200),
        ("Interview",         "CANDIDATE",   0),
        ("Guided Tour",       "GUEST",       500),
    ]
    for title, vtype, fees in categories:
        res = api("POST", "/api/visit-categories",
                  {"title": title, "visitType": vtype, "fees": fees})
        print(f"   {'+' if res else '='} {title} ({vtype}, fees={fees})")

    # --- 9. email templates ----------------------------------------------
    print("\n== Email templates ==")
    templates = [
        ("VISIT_APPROVED", "Your visit has been approved",
         "Hello {{visitorName}}, your visit on {{visitAt}} with {{hostName}} has been approved.", True),
        ("VISIT_REJECTED", "Update on your visit request",
         "Hello {{visitorName}}, unfortunately your visit request could not be approved. Reason: {{reason}}.", True),
        ("PRE_REGISTER", "Pre-registration approval request",
         "A pre-registration for {{visitorName}} is awaiting your approval.", True),
        ("CHECK_IN", "Visitor checked in",
         "{{visitorName}} has checked in to meet {{hostName}} at {{time}}.", True),
        ("CHECK_OUT", "Visitor checked out",
         "{{visitorName}} has checked out at {{time}}. Thank you for visiting.", False),
    ]
    for module, subject, message, enabled in templates:
        res = api("POST", "/api/email-templates",
                  {"module": module, "subject": subject, "message": message, "enabled": enabled})
        print(f"   {'+' if res else '='} {module} (enabled={enabled})")

    # --- 10. settings sections -------------------------------------------
    print("\n== Settings ==")
    api("PUT", "/api/settings/general", {
        "company_name": "Acme Corporation", "contact_number": "+91 80 4000 0000",
        "address": "12 MG Road, Bengaluru, Karnataka 560001",
        "timezone": "Asia/Kolkata", "date_format": "DD/MM/YYYY", "language": "English",
    })
    api("PUT", "/api/settings/email", {
        "smtpHost": "smtp.gmail.com", "smtpPort": 587, "smtpUser": "no-reply@acme.com",
        "smtpPassword": "", "encryption": "TLS", "fromName": "Acme Visitor Management",
        "fromEmail": "no-reply@acme.com",
    })
    api("PUT", "/api/settings/payment", {
        "gateway": "Razorpay", "keyId": "rzp_test_DEMO123", "keySecret": "",
        "currency": "INR", "enabled": True,
    })
    api("PUT", "/api/settings/seo", {
        "metaTitle": "Acme Visitor Management System",
        "metaDescription": "Secure, modern visitor management for Acme Corporation.",
        "metaKeywords": "visitor, management, vms, acme", "canonicalUrl": "https://vms.acme.com",
    })
    print("   + general, email, payment, seo sections saved")

    print("\nDone. Demo data seeded across all modules.")
    print(f"New staff logins use password: {STAFF_PASSWORD}  (e.g. aarav.sharma@acme.com)")


if __name__ == "__main__":
    main()
