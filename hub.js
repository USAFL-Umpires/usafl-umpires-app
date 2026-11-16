/* USAFL Umpires hub — dashboard shell + home for each role.
   DESIGN PREVIEW: everything in SAMPLE below is made up. Each block is shaped like the
   Supabase table it will come from (see supabase/migrations/0001_hub_core.sql), so wiring
   live data later means replacing SAMPLE, not the views. */
(function () {
  "use strict";

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DAY = 864e5;
  const today = new Date();
  const inDays = (n, h = 0, m = 0) => { const d = new Date(today.getTime() + n * DAY); d.setHours(h, m, 0, 0); return d; };
  const fmt = (d, o) => new Intl.DateTimeFormat("en-US", o).format(d);
  const dayMonth = (d) => fmt(d, { day: "numeric", month: "short" });
  const monthYear = (d) => fmt(d, { month: "short", year: "numeric" });
  const time = (d) => fmt(d, { hour: "numeric", minute: "2-digit" }).toLowerCase();
  const ago = (n) => (n === 0 ? "Today" : n === 1 ? "Yesterday" : n + " days ago");
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  const ICONS = {
    home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    award: '<circle cx="12" cy="9.5" r="5.5"/><path d="m8.8 14.2-1.3 6.3L12 18l4.5 2.5-1.3-6.3"/>',
    shield: '<path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.4 7 9 4.1-1.6 7-4.800 7-9V6z"/><path d="m9 12 2.2 2.2L15.2 10"/>',
    book: '<path d="M12 6.5C10.300 5.200 8 4.800 4.500 5v13c3.500-.2 5.800.2 7.500 1.500 1.700-1.300 4-1.700 7.500-1.500V5C16 4.800 13.700 5.200 12 6.500zM12 6.500v13"/>',
    flag: '<path d="M6 21V4M6 5h11l-2 3.500 2 3.500H6"/>',
    megaphone: '<path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1zM18.500 9.500a4 4 0 0 1 0 5M8 15.500l1 4.500"/>',
    user: '<circle cx="12" cy="8.500" r="4"/><path d="M4.500 20c1.200-3.500 4-5 7.500-5s6.300 1.500 7.500 5"/>',
    users: '<circle cx="9" cy="9" r="3.500"/><path d="M2.500 19.500c.9-3 3.300-4.500 6.500-4.500s5.600 1.500 6.500 4.500M15.500 5.800a3.500 3.500 0 0 1 0 6.400M18 15.300c1.800.6 3 2 3.500 4.200"/>',
    file: '<path d="M7 3.500h7l4 4V19.500a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M13.500 3.500V8H18M9 13h6M9 16.500h4"/>',
    list: '<path d="m4 6.500 1.500 1.500L8 5.500M4 12.500 5.500 14 8 11.500M4 18.500 5.500 20 8 17.500M11.500 7H20M11.500 13H20M11.500 19H20"/>',
    inbox: '<path d="M4 13.500 6.500 5h11l2.500 8.500V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 13.500h4.500l1 2.500h5l1-2.500H20"/>',
    out: '<path d="M8 16 16 8M9.500 8H16v6.500"/>',
    next: '<path d="m9.500 6 6 6-6 6"/>',
    check: '<path d="m5.500 12.500 4.200 4.200L18.500 8"/>',
    pin: '<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600 7 7M17 17l1.400 1.400M18.400 5.600 17 7M7 17l-1.400 1.400"/>',
    x: '<path d="m6.500 6.500 11 11M17.500 6.500l-11 11"/>',
    dots: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m15.5 15.5 4 4"/>',
    up: '<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 19.5h14"/>',
    moon: '<path d="M19.500 14.500A8 8 0 0 1 9.500 4.500a8 8 0 1 0 10 10z"/>',
  };
  const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

  // ---------- sample data (stand-in for Supabase) ----------
  const SAMPLE = {
    profile: { preferred_name: "Sam", full_name: "Sam Carter", email: "sam.carter@example.com", phone: "", home_club: "Austin Crows", city: "Austin", state: "TX", disciplines: ["field", "boundary"], bio: "" },
    // accreditations
    accreditations: [
      { discipline: "field", level: 2, of: 3, awarded_on: inDays(-250), expires_on: inDays(480), games: 14 },
      { discipline: "boundary", level: 1, of: 3, awarded_on: inDays(-520), expires_on: inDays(210), games: 9 },
    ],
    accHistory: [
      { discipline: "field", level: 2, awarded_on: inDays(-250), by: "Jo Mercer", notes: "Assessed over two games at the spring metro carnival." },
      { discipline: "boundary", level: 1, awarded_on: inDays(-520), by: "Ravi Patel", notes: "" },
      { discipline: "field", level: 1, awarded_on: inDays(-610), by: "Ravi Patel", notes: "First accreditation." },
    ],
    // compliance_requirements + member_compliance
    compliance: [
      { id: "rules", name: "Rules test", description: "The online Laws of the Game test.", status: "approved", completed: inDays(-200), renew_months: 12 },
      { id: "background", name: "Background check", description: "A cleared background screening, uploaded as a PDF or photo.", status: "approved", completed: inDays(-310), renew_months: 24, requires_upload: true, file: "background-carter.pdf" },
      { id: "concussion", name: "Concussion course", description: "The concussion awareness course certificate.", status: "approved", completed: inDays(-150), renew_months: 12, requires_upload: true, file: "concussion-2026.pdf" },
      { id: "safesport", name: "SafeSport renewal", description: "This year's SafeSport refresher certificate.", status: "missing", due: inDays(27), renew_months: 12, requires_upload: true },
    ],
    gamesByMonth: [["Apr", 1], ["May", 3], ["Jun", 4], ["Jul", 3], ["Aug", 5], ["Sep", 2], ["Oct", 5]],
    // learning_assignments + learning_modules
    learning: [
      { title: "Advantage and play on", summary: "When to hold the whistle, and how to signal it so players keep going.", discipline: "field", minutes: 25, due_on: inDays(5), done: 0.4 },
      { title: "Holding the ball", summary: "Prior opportunity, genuine attempts and the calls that follow.", discipline: "field", minutes: 30, due_on: inDays(19), done: 0 },
    ],
    library: [
      { title: "Boundary throw-ins", summary: "Technique, distance and where to stand.", discipline: "boundary", minutes: 15, done: true },
      { title: "Positioning at stoppages", summary: "Where to set up for bounces, throw-ins and ball-ups.", discipline: "field", minutes: 20, done: true },
      { title: "Goal umpire signals", summary: "Goals, behinds, touched and out on the full.", discipline: "goal", minutes: 15, done: false },
      { title: "Working as a team of three", summary: "Who watches what when the ball is in dispute.", discipline: null, minutes: 20, done: false },
    ],
    // learning_modules + learning_assignments, rolled up for staff
    modules: [
      { title: "Advantage and play on", discipline: "field", minutes: 25, assigned: 24, completed: 18, overdue: 3, published: true },
      { title: "Holding the ball", discipline: "field", minutes: 30, assigned: 20, completed: 14, overdue: 3, published: true },
      { title: "Boundary throw-ins", discipline: "boundary", minutes: 15, assigned: 12, completed: 9, overdue: 2, published: true },
      { title: "Goal umpire signals", discipline: "goal", minutes: 15, assigned: 6, completed: 3, overdue: 0, published: true },
      { title: "Reading the play", discipline: "field", minutes: 35, assigned: 0, completed: 0, overdue: 0, published: false },
    ],
    // appointments + events
    appointments: [
      { starts_at: inDays(6, 10, 30), match: "Austin Crows v Denver Bulldogs", position: "field", venue: "Field 2", event: "Fall metro round 3", with: ["Jo Mercer", "Leo Brandt"] },
      { starts_at: inDays(6, 13, 0), match: "Houston Lonestars v Dallas Dingoes", position: "boundary", venue: "Field 1", event: "Fall metro round 3", with: ["Ravi Patel", "Grace Liu"] },
      { starts_at: inDays(13, 11, 0), match: "Austin Crows v Houston Lonestars", position: "field", venue: "Field 1", event: "Fall metro round 4", with: ["Hannah Ruiz", "Tyler Brooks"] },
      { starts_at: inDays(27, 9, 0), match: "Preseason skills day", position: "coach", venue: "Zilker Park", event: "Umpire development" },
    ],
    pastGames: [
      { starts_at: inDays(-29, 13, 30), match: "Division 2 grand final", position: "boundary", venue: "Field 3", event: "Nationals 2026" },
      { starts_at: inDays(-29, 9, 0), match: "Division 3 semi final", position: "field", venue: "Field 5", event: "Nationals 2026" },
      { starts_at: inDays(-30, 14, 0), match: "Division 2 pool game", position: "field", venue: "Field 2", event: "Nationals 2026" },
      { starts_at: inDays(-30, 10, 0), match: "Women's Division 1 pool game", position: "boundary", venue: "Field 6", event: "Nationals 2026" },
      { starts_at: inDays(-31, 11, 0), match: "Division 4 pool game", position: "field", venue: "Field 1", event: "Nationals 2026" },
      { starts_at: inDays(-57, 12, 0), match: "Austin Crows v Dallas Dingoes", position: "field", venue: "Field 1", event: "Fall metro round 1" },
    ],
    // events
    events: [
      { name: "Fall metro round 3", starts_on: inDays(6), location: "Austin, TX", description: "Four games across two fields.", appointed: 9, published: true },
      { name: "Fall metro round 4", starts_on: inDays(13), location: "Austin, TX", description: "Last round before the break.", appointed: 8, published: true },
      { name: "Umpire development", starts_on: inDays(27), location: "Zilker Park, Austin, TX", description: "Preseason skills day for new and returning umpires.", appointed: 4, published: true },
      { name: "2027 season launch", starts_on: inDays(75), location: "Online", description: "Rule changes, the season calendar and questions for the committee.", appointed: 0, published: true },
      { name: "Western regionals", starts_on: inDays(160), ends_on: inDays(161), location: "Sacramento, CA", description: "Two days, twelve teams.", appointed: 0, published: true },
      { name: "Nationals 2027", starts_on: inDays(330), ends_on: inDays(332), location: "Venue to be confirmed", description: "", appointed: 0, published: false },
    ],
    // announcements (audience null = everyone; draft = published_at is null)
    announcements: [
      { title: "Preseason fitness testing dates", body: "Testing runs across three weekends in February. Pick the session closest to you.", days: 0, audience: "umpire", draft: true },
      { title: "2027 season registrations open 1 December", body: "Renew before the new year to keep your accreditation active for preseason appointments.", days: 1, pinned: true },
      { title: "New interpretation: stand rule", body: "The committee has published guidance on the stand rule, with video examples from Nationals.", days: 3 },
      { title: "Nationals 2026 wrap-up", body: "Thanks to the 60 umpires who covered 124 games in Sarasota. Coach feedback goes out this week.", days: 9 },
      { title: "Boundary clinic recordings are up", body: "Both sessions from October are now in Learning.", days: 16 },
    ],
    // applications (own) + onboarding_steps / onboarding_progress
    application: { status: "under_review", submitted_days: 4, wants: "field",
      answers: [["Have you umpired before?", "A season of junior soccer refereeing, a long time ago."], ["What's your footy background?", "Three seasons playing for the Austin Crows."], ["Which disciplines interest you?", "Field, and boundary while I learn."], ["Where can you travel?", "Texas, and one tournament a year further away."], ["Anything else we should know?", "I'm free most Saturdays."]] },
    onboarding: [
      { title: "Read the Laws of the Game summary", body: "About 20 minutes", done: true },
      { title: "Watch “Your first game”", body: "A 12 minute walkthrough from a senior umpire", done: true },
      { title: "Complete SafeSport training", body: "Required before you can be appointed", done: false },
      { title: "Order your uniform", body: "Shirt, shorts, socks and whistle", done: false },
      { title: "Meet your regional coach", body: "A short video call to plan your first games", done: false },
    ],
    // staff views
    roster: { field: 34, boundary: 17, goal: 12 },
    // profiles + accreditations + member_compliance, one line per member
    members: [
      ["Jo Mercer", "Austin Crows", "Austin, TX", "admin", { field: 3 }, "aaaa", 9, 21],
      ["Ravi Patel", "Denver Bulldogs", "Denver, CO", "coach", { field: 3, boundary: 2 }, "aaaa", 9, 18],
      ["Dana Okafor", "Houston Lonestars", "Houston, TX", "umpire", { boundary: 1 }, "aaap", 30, 4],
      ["Leo Brandt", "Austin Crows", "Austin, TX", "umpire", { field: 2, goal: 1 }, "apaa", 9, 15],
      ["Hannah Ruiz", "Dallas Dingoes", "Dallas, TX", "umpire", { field: 1 }, "aaap", 30, 7],
      ["Chris Vale", "Minnesota Freeze", "Minneapolis, MN", "umpire", { boundary: 2 }, "apaa", 44, 10],
      ["Mei Tanaka", "Seattle Grizzlies", "Seattle, WA", "umpire", { field: 2 }, "aaap", 30, 12],
      ["Owen Hartley", "Nashville Kangaroos", "Nashville, TN", "umpire", { goal: 2 }, "aaap", 58, 8],
      ["Ben Calloway", "Sacramento Suns", "Sacramento, CA", "umpire", { field: 1, boundary: 1 }, "amaa", 72, 5],
      ["Grace Liu", "Austin Crows", "Austin, TX", "umpire", { goal: 2 }, "aaaa", 9, 16],
      ["Tyler Brooks", "Houston Lonestars", "Houston, TX", "umpire", { goal: 1, field: 1 }, "aaaa", 30, 9],
      ["Nadia Haddad", "Portland Steelheads", "Portland, OR", "umpire", { boundary: 2 }, "aaaa", 30, 13, 17],
    ].map((m) => ({ id: m[0].toLowerCase().replace(" ", "-"), name: m[0], club: m[1], where: m[2], role: m[3], acc: m[4], comp: m[5], last: m[6], games: m[7], expiring: m[8] || 0, email: m[0].toLowerCase().replace(" ", ".") + "@example.com", assigned: [] })),
    // applications + profiles + staff_notes. The questions are placeholders until the real form is in.
    applications: [
      { id: "priya-nair", name: "Priya Nair", where: "Denver, CO", wants: "field", days: 9, status: "under_review", club: "Denver Bulldogs",
        answers: [["Have you umpired before?", "Two seasons of metro footy in Denver, mostly field, plus a handful of boundary games."], ["What's your footy background?", "Played four seasons for the Lady Bulldogs before a knee injury. I'd like to stay in the game."], ["Which disciplines interest you?", "Field first, boundary if you're short."], ["Where can you travel?", "Anywhere in the Mountain West, and Nationals."], ["Anything else we should know?", "I already hold a current SafeSport certificate through my day job as a PE teacher."]],
        notes: [{ author: "Jo Mercer", days: 3, body: "Spoke to the Denver coach. Reliable, good game sense. Keen to see her at the preseason skills day." }] },
      { id: "tom-whitlock", name: "Tom Whitlock", where: "Melbourne, VIC, moving to Seattle", wants: "field", days: 5, status: "under_review", club: "None yet",
        answers: [["Have you umpired before?", "Eight years in the Northern Football Netball League in Melbourne, senior field panel for the last three."], ["What's your footy background?", "Junior footy to under 18s, then straight into umpiring."], ["Which disciplines interest you?", "Field. Happy to coach newer umpires too."], ["Where can you travel?", "Moving to Seattle in January. West coast is easy, east coast with notice."], ["Anything else we should know?", "I can send my AFL Victoria accreditation record and a reference from my umpiring coach."]],
        notes: [] },
      { id: "marcus-bell", name: "Marcus Bell", where: "Nashville, TN", wants: "goal", days: 2, status: "submitted", club: "Nashville Kangaroos",
        answers: [["Have you umpired before?", "No. I've run the scoreboard and timekeeping for Nashville for two years."], ["What's your footy background?", "Found the sport through a friend in 2023. Never played, love watching."], ["Which disciplines interest you?", "Goal umpiring."], ["Where can you travel?", "Home games and anything within a day's drive."], ["Anything else we should know?", "Nothing to add."]],
        notes: [] },
      { id: "erin-kowalski", name: "Erin Kowalski", where: "Minneapolis, MN", wants: "boundary", days: 1, status: "submitted", club: "Minnesota Freeze",
        answers: [["Have you umpired before?", "I referee high school soccer, eleven years."], ["What's your footy background?", "My partner plays for the Freeze, so I've watched a lot of it."], ["Which disciplines interest you?", "Boundary to start. I'd like to work towards field."], ["Where can you travel?", "Midwest tournaments and Nationals."], ["Anything else we should know?", "I run about 40 km a week, so fitness won't be the problem."]],
        notes: [] },
      { id: "dana-okafor", name: "Dana Okafor", where: "Houston, TX", wants: "boundary", days: 24, status: "approved", club: "Houston Lonestars", decided_days: 16, decided_by: "Jo Mercer", decision_message: "Welcome aboard, Dana. Your regional coach will be in touch this week.",
        answers: [["Have you umpired before?", "One season of boundary at local level."], ["Which disciplines interest you?", "Boundary."]], notes: [] },
      { id: "alex-pruitt", name: "Alex Pruitt", where: "Portland, OR", wants: "field", days: 31, status: "declined", club: "None", decided_days: 20, decided_by: "Jo Mercer", decision_message: "Thanks for applying. We need umpires who can commit to at least four game days a season. Please apply again when your schedule opens up.",
        answers: [["Have you umpired before?", "No."], ["Where can you travel?", "I can only do one weekend this year."]], notes: [] },
    ],
    get queue() { return this.applications.filter(isWaiting); },
    // member_compliance + compliance_requirements + profiles (files live in the compliance-evidence bucket)
    evidence: [
      { id: "d1", name: "Dana Okafor", item: "SafeSport certificate", file: "safesport-okafor.pdf", days: 6, completed: inDays(-8), renew_months: 12, status: "pending_review" },
      { id: "d2", name: "Leo Brandt", item: "Background check", file: "ncsi-clearance.pdf", days: 4, completed: inDays(-11), renew_months: 24, status: "pending_review" },
      { id: "d3", name: "Hannah Ruiz", item: "SafeSport certificate", file: "IMG_2291.jpg", days: 2, completed: inDays(-3), renew_months: 12, status: "pending_review" },
      { id: "d4", name: "Chris Vale", item: "Background check", file: "background-vale.pdf", days: 1, completed: inDays(-20), renew_months: 24, status: "pending_review" },
      { id: "d5", name: "Mei Tanaka", item: "SafeSport certificate", file: "SafeSport_Refresher.pdf", days: 1, completed: inDays(-1), renew_months: 12, status: "pending_review" },
      { id: "d6", name: "Owen Hartley", item: "SafeSport certificate", file: "certificate.png", days: 0, completed: inDays(-400), renew_months: 12, status: "pending_review" },
      { id: "d7", name: "Priya Nair", item: "SafeSport certificate", file: "safesport-2026.pdf", days: 12, completed: inDays(-30), renew_months: 12, status: "approved", reviewed_days: 10 },
      { id: "d8", name: "Ben Calloway", item: "Background check", file: "scan0003.jpg", days: 15, completed: inDays(-16), renew_months: 24, status: "rejected", reviewed_days: 13 },
    ],
    get docsWaiting() { return this.evidence.filter((e) => e.status === "pending_review"); },
    signupsByMonth: [["Jun", 2], ["Jul", 1], ["Aug", 4], ["Sep", 3], ["Oct", 6], ["Nov", 5]],
  };

  function isWaiting(a) { return a.status === "submitted" || a.status === "under_review"; }
  const STATUS = { submitted: "New", under_review: "In review", approved: "Approved", declined: "Declined" };
  const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  const ROLES = {
    applicant: { label: "Prospective", title: "Prospective umpire" },
    umpire: { label: "Umpire", title: "Field and boundary umpire" },
    staff: { label: "Committee", title: "Committee admin" },
  };
  const NAV = {
    applicant: [["home", "Home", "home"], ["application", "Application", "file"], ["getting-started", "Getting started", "list"], ["announcements", "Announcements", "megaphone"], null, ["profile", "Profile", "user"]],
    umpire: [["home", "Home", "home"], ["appointments", "Appointments", "calendar"], ["accreditation", "Accreditation", "award"], ["compliance", "Compliance", "shield", 1], ["learning", "Learning", "book", 2], ["events", "Events", "flag"], ["announcements", "Announcements", "megaphone"], null, ["profile", "Profile", "user"]],
    staff: [["home", "Home", "home"], ["applications", "Applications", "inbox", 4], ["members", "Members", "users"], ["compliance", "Documents", "shield", 6], ["learning", "Learning", "book"], ["events", "Events", "flag"], ["announcements", "Announcements", "megaphone"], null, ["profile", "Profile", "user"]],
  };
  const STUBS = {
    application: "Your answers, where the application is up to, and the committee's decision when it lands.",
    "getting-started": "The full getting-started guide, one step at a time, with links to each course and form.",
    appointments: "Every game you're appointed to, by event, with field, time and who you're umpiring with.",
    accreditation: "Your level in each discipline, when it was awarded and when it needs renewing.",
    compliance: "Each requirement, its due date, and where to upload the certificate.",
    learning: "Modules your coach has assigned, plus the library to work through at your own pace.",
    events: "The season calendar: metro rounds, regionals, clinics and Nationals.",
    announcements: "Everything the committee has sent, newest first.",
    applications: "The review queue: read an application, add notes, approve or decline.",
    members: "The full roster with role, disciplines, accreditation and compliance at a glance.",
    profile: "Your contact details, home club and disciplines.",
  };

  let role = ROLES[store.get("usafl.hub.previewRole")] ? store.get("usafl.hub.previewRole") : "umpire";
  // "gate" = sign-in screen, "loading" = fetching the profile, "live" = signed in, "preview" = sample data only.
  let mode = "gate", me = null;
  const gate = { sent: "", error: "", notice: "", busy: false };
  const LIVE_ROLE = { applicant: "applicant", umpire: "umpire", coach: "staff", admin: "staff" };
  function roleTitle() {
    if (mode !== "live" || role !== LIVE_ROLE[me.role]) return ROLES[role].title;
    if (me.role === "admin") return "Committee admin";
    if (me.role === "coach") return "Umpire coach";
    if (me.role === "applicant") return "Prospective umpire";
    const d = SAMPLE.profile.disciplines.filter((x) => x !== "coach");
    return d.length ? cap(d.join(" and ")) + " umpire" : "Umpire";
  }
  // The signed-in person's own row replaces the sample profile; nothing else is live yet.
  function useProfile(row) {
    me = row;
    const name = row.full_name || row.email.split("@")[0];
    SAMPLE.profile = { full_name: name, preferred_name: row.preferred_name || name.split(" ")[0], email: row.email, phone: row.phone || "", city: row.city || "", state: row.state || "", home_club: row.home_club || "", disciplines: row.disciplines || [], bio: row.bio || "" };
  }
  let firstPaint = true;
  const parts = () => location.hash.replace(/^#\/?/, "").split("/");
  const route = () => parts()[0] || "home";
  let appFilter = "waiting", deciding = null, decideError = "";

  // ---------- small view parts ----------
  const pips = (states) => `<div class="pips">${states.map((s) => `<i class="${s}"></i>`).join("")}</div>`;
  const bars = (pairs) => {
    const max = Math.max(...pairs.map((p) => p[1]));
    return `<div class="bars" role="img" aria-label="${esc(pairs.map((p) => p[0] + " " + p[1]).join(", "))}">${pairs.map((p, i) => `<i class="${i === pairs.length - 1 ? "now" : ""}" style="height:${Math.round((p[1] / max) * 100)}%"></i>`).join("")}</div>`;
  };
  const meter = (f) => `<div class="meter"><i style="width:${Math.round(f * 100)}%"></i></div>`;
  const stat = (s) => `
    <a class="stat ${s.tone || ""}" href="#/${s.to}">
      <div class="stat-top"><span>${esc(s.name)}</span>${icon("out", "sm")}</div>
      <div class="stat-val">${esc(s.val)}</div>
      <div class="stat-unit">${esc(s.unit)}</div>
      <div class="stat-viz">${s.viz || ""}</div>
      <div class="stat-foot">${s.foot}</div>
    </a>`;
  const panel = (title, to, body, cls = "") => `
    <section class="panel ${cls}">
      <div class="panel-top"><h2>${esc(title)}</h2>${to ? `<a href="#/${to}">See all ${icon("next", "sm")}</a>` : ""}</div>
      ${body}
    </section>`;
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // The ground. Three umpires work a game: field (centre), boundary (the line), goal (between the posts).
  function ground(c) {
    const call = (k, side, x, y, n) => {
      const d = c[k];
      const pos = side === "r" ? `left:${(x / 560) * 100}%` : `right:${((560 - x) / 560) * 100}%`;
      return `<div class="callout ${side}" style="${pos};top:${((y - 9) / 520) * 100}%;--n:${n}">
        <b>${esc(d.name)}</b>${d.num ? `<span class="num">${esc(d.num)}${d.unit ? `<small>${esc(d.unit)}</small>` : ""}</span>` : ""}<span>${esc(d.note)}</span></div>`;
    };
    const spot = (x, y, n, off) => `<circle class="spot" cx="${x}" cy="${y}" r="9" style="--n:${n}"/><circle class="spot-core ${off ? "off" : ""}" cx="${x}" cy="${y}" r="3.500" style="--n:${n}"/>`;
    return `
    <div class="ground ${firstPaint ? "animate" : ""}">
      <svg viewBox="0 0 560 520" role="img" aria-label="An Australian football ground showing where the field, boundary and goal umpires work">
        <defs>
          <linearGradient id="turf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--turf-a)"/><stop offset="1" stop-color="var(--turf-b)"/></linearGradient>
          <clipPath id="oval"><ellipse cx="280" cy="262" rx="128" ry="196"/></clipPath>
        </defs>
        <ellipse class="turf" pathLength="1" cx="280" cy="262" rx="128" ry="196"/>
        <g clip-path="url(#oval)">
          <circle class="mark" pathLength="1" cx="280" cy="66" r="119"/>
          <circle class="mark" pathLength="1" cx="280" cy="458" r="119"/>
        </g>
        <rect class="mark" pathLength="1" x="220.500" y="202.500" width="119" height="119"/>
        <circle class="mark" pathLength="1" cx="280" cy="262" r="13"/>
        <circle class="mark" pathLength="1" cx="280" cy="262" r="4.500"/>
        <rect class="mark" pathLength="1" x="272.500" y="66" width="15" height="21"/>
        <rect class="mark" pathLength="1" x="272.500" y="437" width="15" height="21"/>
        <path class="post" d="M272.500 66V48M287.500 66V48M272.500 458v18M287.500 458v18"/>
        <path class="post behind" d="M257.500 67.500V56M302.500 67.500V56M257.500 456.500V468M302.500 456.500V468"/>
        <path class="lead" style="--n:0" d="M280 80 330 52h86"/>
        <path class="lead" style="--n:1" d="M280 262 196 222h-56"/>
        <path class="lead" style="--n:2" d="M397 340 418 352h6"/>
        ${spot(280, 80, 0, c.goal.off)}${spot(280, 262, 1, c.field.off)}${spot(397, 340, 2, c.boundary.off)}
      </svg>
      ${call("goal", "r", 424, 52, 0)}${call("field", "l", 134, 222, 1)}${call("boundary", "r", 430, 352, 2)}
    </div>`;
  }

  const visibleNews = () => SAMPLE.announcements.filter((a) => role === "staff" || (!a.draft && (!a.audience || a.audience === role)));
  const announcements = () => panel("Announcements", "announcements", visibleNews().filter((a) => !a.draft).slice(0, 4).map((a) => `
    <div class="row">
      <div class="row-main"><b>${a.pinned ? `<span class="pin" title="Pinned">${icon("pin", "sm")}</span> ` : ""}${esc(a.title)}</b><span class="wrap2">${esc(a.body)}</span></div>
      <div class="row-aside">${ago(a.days)}</div>
    </div>`).join(""));

  // ---------- home, per role ----------
  function homeUmpire() {
    const S = SAMPLE, next = S.appointments[0], daysToNext = Math.round((next.starts_at - today) / DAY);
    const due = S.compliance.filter((c) => c.status === "missing");
    const done = S.compliance.filter((c) => c.status === "approved").length;
    const gaps = profileGaps();
    const field = S.accreditations[0], bnd = S.accreditations[1];
    const games = S.gamesByMonth.reduce((n, p) => n + p[1], 0);
    const mod = S.learning[0];
    return {
      sub: `You're on the field ${fmt(next.starts_at, { weekday: "long" })} at ${time(next.starts_at)}. ${due.length ? `${due[0].name} needs you before ${dayMonth(due[0].due)}.` : "Everything's up to date."}`,
      callouts: {
        goal: { name: "Goal", note: "Not accredited yet", off: true },
        field: { name: "Field", num: "Level " + field.level, note: `${field.games} games this year` },
        boundary: { name: "Boundary", num: "Level " + bnd.level, note: `${bnd.games} games this year` },
      },
      note: "Where you're accredited to umpire.",
      cards: [
        { to: "accreditation", name: "Accreditation", tone: "good", val: "Level " + field.level, unit: "Field umpire", viz: pips(Array.from({ length: field.of }, (_, i) => (i < field.level ? "on" : ""))), foot: `<span>Valid to ${monthYear(field.expires_on)}</span>` },
        { to: "compliance", name: "Compliance", tone: due.length ? "due" : "good", val: `${done} of ${S.compliance.length}`, unit: "requirements complete", viz: pips(S.compliance.map((c) => (c.status === "approved" ? "on" : c.status === "missing" ? "wait" : ""))), foot: due.length ? `<span class="flag">${esc(due[0].name)} due ${dayMonth(due[0].due)}</span>` : done === S.compliance.length ? `<span class="ok">All current</span>` : `<span>With the committee</span>` },
        { to: "appointments", name: "Games", val: games, unit: "umpired this year", viz: bars(S.gamesByMonth), foot: `<span>${S.gamesByMonth[0][0]}</span><span>${S.gamesByMonth[S.gamesByMonth.length - 1][0]}</span>` },
        { to: "learning", name: "Learning", val: S.learning.length, unit: "modules to finish", viz: meter(mod.done), foot: `<span>${esc(mod.title)}</span><span>${fmt(mod.due_on, { weekday: "short" })}</span>` },
        { to: "appointments", name: "Next game", val: daysToNext + " days", unit: `${fmt(next.starts_at, { weekday: "short" })} ${dayMonth(next.starts_at)}, ${time(next.starts_at)}`, foot: `<span class="chip ${next.position}">${cap(next.position)}</span><span>${esc(next.venue)}</span>` },
        { to: "profile", name: "Profile", tone: gaps.length ? "" : "good", val: profilePct() + "%", unit: "complete", viz: meter(profilePct() / 100), foot: gaps.length ? `<span>Add your ${esc(gaps[0])}</span>` : `<span class="ok">All filled in</span>` },
      ].map(stat).join(""),
      panels: panel("Coming up", "appointments", S.appointments.map((a, i) => `
        <div class="row">
          <div class="day ${i === 0 ? "next" : ""}"><small>${fmt(a.starts_at, { month: "short" })}</small><span class="num">${a.starts_at.getDate()}</span></div>
          <div class="row-main"><b>${esc(a.match)}</b><span>${fmt(a.starts_at, { weekday: "short" })} ${time(a.starts_at)}, ${esc(a.venue)}, ${esc(a.event)}</span></div>
          <span class="chip ${a.position}">${cap(a.position)}</span>
        </div>`).join("")) + announcements(),
    };
  }

  function homeApplicant() {
    const S = SAMPLE, order = ["draft", "submitted", "under_review", "approved"], names = ["Started", "Submitted", "With the committee", "Decision"];
    const at = order.indexOf(S.application.status), gone = S.application.status === "withdrawn";
    const left = S.onboarding.filter((o) => !o.done).length;
    return {
      sub: gone ? "You withdrew your application. You can send it again from the Application page." : `Your application is with the committee. While you wait, there ${left === 1 ? "is 1 step" : `are ${left} steps`} you can get done now.`,
      callouts: {
        goal: { name: "Goal umpire", note: "Judges every score and signals it with the flags." },
        field: { name: "Field umpire", note: "Runs the game: bounces, marks, free kicks." },
        boundary: { name: "Boundary umpire", note: "Calls the ball out and throws it back in." },
      },
      note: "Three kinds of umpire work every game. You can train for any of them.",
      cards: panel("Your application", "application", `
        <ol class="steps">${names.map((n, i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}"${i === at ? ' aria-current="step"' : ""}>${n}</li>`).join("")}</ol>
        <p class="lede">Submitted ${ago(S.application.submitted_days).toLowerCase()}. The committee reviews applications every fortnight, and you'll get an email as soon as there's a decision.</p>`, "wide"),
      panels: panel("Getting started", "getting-started", S.onboarding.map((o, i) => `
        <button class="check" role="checkbox" aria-checked="${o.done}" data-step="${i}">
          <span class="tick">${icon("check", "sm")}</span>
          <span class="row-main"><b>${esc(o.title)}</b><span>${esc(o.body)}</span></span>
        </button>`).join("")) + announcements(),
    };
  }

  function homeStaff() {
    const S = SAMPLE, total = S.roster.field + S.roster.boundary + S.roster.goal;
    return {
      sub: `${S.queue.length} applications and ${S.docsWaiting.length} documents are waiting on the committee.`,
      callouts: {
        goal: { name: "Goal", num: S.roster.goal, unit: "umpires", note: "3 more in training" },
        field: { name: "Field", num: S.roster.field, unit: "umpires", note: "9 at Level 3" },
        boundary: { name: "Boundary", num: S.roster.boundary, unit: "umpires", note: "Shortest in the West" },
      },
      note: "Accredited umpires by discipline.",
      cards: [
        { to: "applications", name: "Applications", tone: S.queue.length ? "due" : "good", val: S.queue.length, unit: "waiting for review", foot: S.queue.length ? `<span class="flag">Oldest is ${S.queue[0].days} days old</span>` : `<span class="ok">All reviewed</span>` },
        { to: "compliance", name: "Documents", tone: S.docsWaiting.length ? "due" : "good", val: S.docsWaiting.length, unit: "to check", foot: S.docsWaiting.length ? `<span>SafeSport ${S.docsWaiting.filter((e) => /SafeSport/.test(e.item)).length}</span><span>Background ${S.docsWaiting.filter((e) => /Background/.test(e.item)).length}</span>` : `<span class="ok">All checked</span>` },
        { to: "members", name: "Members", tone: "good", val: total, unit: "active umpires", viz: bars(S.signupsByMonth), foot: `<span>New members, ${S.signupsByMonth[0][0]} to ${S.signupsByMonth[S.signupsByMonth.length - 1][0]}</span>` },
        { to: "members", name: "Expiring", val: 5, unit: "accreditations in 60 days", foot: `<span>First on ${dayMonth(inDays(17))}</span>` },
        { to: "learning", name: "Learning", val: "71%", unit: "of assigned modules done", viz: meter(0.71), foot: `<span>8 overdue</span>` },
        { to: "announcements", name: "Announcements", val: S.announcements.filter((a) => a.draft).length, unit: "drafts not sent", foot: `<span>Last sent ${ago(Math.min(...S.announcements.filter((a) => !a.draft).map((a) => a.days))).toLowerCase()}</span>` },
      ].map(stat).join(""),
      panels: panel("Applications to review", "applications", S.queue.map((q) => `
        <div class="row">
          <div class="avatar">${esc(initials(q.name))}</div>
          <div class="row-main"><b>${esc(q.name)}</b><span>${esc(q.where)}</span></div>
          <span class="chip ${q.wants}">${cap(q.wants)}</span>
          <a class="btn quiet" href="#/applications/${q.id}">Review</a>
        </div>`).join("") || '<p class="empty">No applications are waiting.</p>') + panel("Documents to check", "compliance", S.docsWaiting.slice(0, 4).map((e) => `
        <div class="row">
          <div class="row-main"><b>${esc(e.item)}</b><span>${esc(e.name)}</span></div>
          <div class="row-aside">${ago(e.days)}</div>
        </div>`).join("") || '<p class="empty">No documents are waiting.</p>'),
    };
  }


  // ---------- committee: applications review ----------
  function viewApplications(id) {
    const S = SAMPLE, all = S.applications;
    const sets = { waiting: all.filter(isWaiting), decided: all.filter((a) => !isWaiting(a)), all };
    const list = sets[appFilter];
    const picked = all.find((a) => a.id === id);
    const cur = picked || list[0];
    const first = (a) => a.name.split(" ")[0];
    const oldest = sets.waiting[0];
    const rows = list.map((a) => `
      <a class="row pick" href="#/applications/${a.id}" ${cur && a.id === cur.id ? 'aria-current="true"' : ""}>
        <div class="avatar">${esc(initials(a.name))}</div>
        <div class="row-main"><b>${esc(a.name)}</b><span>${esc(a.where)}</span></div>
        <div class="row-aside">${isWaiting(a) ? ago(a.days) : `<span class="chip ${a.status}">${STATUS[a.status]}</span>`}</div>
      </a>`).join("") || `<p class="empty">${appFilter === "waiting" ? "No applications are waiting. New ones show up here as soon as they're submitted." : "No decisions yet."}</p>`;

    let decision = "";
    if (cur && isWaiting(cur) && deciding && deciding.id === cur.id) {
      const ok = deciding.kind === "approve";
      decision = `<div class="decide">
        <label for="msg"><b>Message to ${esc(first(cur))}</b><span>${ok ? `Optional. ${esc(first(cur))} sees this when they next sign in, and moves to the umpire hub.` : `${esc(first(cur))} sees this, so say why and whether they can apply again.`}</span></label>
        <textarea id="msg" rows="3" ${decideError ? 'aria-invalid="true" aria-describedby="msg-err"' : ""}></textarea>
        ${decideError ? `<p class="err" id="msg-err">${esc(decideError)}</p>` : ""}
        <div class="acts"><button class="btn ${ok ? "go" : "stop"}" data-confirm>${ok ? "Approve application" : "Decline application"}</button><button class="btn quiet" data-cancel>Cancel</button></div>
      </div>`;
    } else if (cur && isWaiting(cur)) {
      decision = `<div class="acts"><button class="btn go" data-decide="approve">${icon("check", "sm")} Approve</button><button class="btn quiet" data-decide="decline">Decline</button></div>`;
    } else if (cur) {
      decision = `<div class="decided ${cur.status}"><b>${STATUS[cur.status]} ${ago(cur.decided_days).toLowerCase()} by ${esc(cur.decided_by)}</b>${cur.decision_message ? `<p>${esc(cur.decision_message)}</p>` : "<p>No message was sent.</p>"}</div>`;
    }

    const detail = cur ? `
      <article class="panel detail">
        <a class="back" href="#/applications">${icon("next", "sm")} All applications</a>
        <header class="who">
          <div class="avatar lg">${esc(initials(cur.name))}</div>
          <div class="who-main"><h2>${esc(cur.name)}</h2><p>${esc(cur.where)}</p></div>
          <span class="chip ${cur.status}">${STATUS[cur.status]}</span>
        </header>
        <dl class="facts">
          <div><dt>Applied</dt><dd>${ago(cur.days)}</dd></div>
          <div><dt>Wants to umpire</dt><dd>${cap(cur.wants)}</dd></div>
          <div><dt>Home club</dt><dd>${esc(cur.club)}</dd></div>
        </dl>
        ${decision}
        <h3>Application</h3>
        <dl class="answers">${cur.answers.map((qa) => `<div><dt>${esc(qa[0])}</dt><dd>${esc(qa[1])}</dd></div>`).join("")}</dl>
        <h3>Committee notes</h3>
        <p class="hint">Only coaches and the committee see these.</p>
        ${cur.notes.map((n) => `<div class="note"><b>${esc(n.author)}</b><span>${ago(n.days)}</span><p>${esc(n.body)}</p></div>`).join("")}
        <div class="add-note"><label class="sr" for="note">Add a note about ${esc(cur.name)}</label><textarea id="note" rows="2" placeholder="Add a note"></textarea><button class="btn quiet" data-add-note>Save note</button></div>
      </article>` : "";

    return `
      <header class="page-head"><h1>Applications</h1>
        <p class="sub">${sets.waiting.length ? `${sets.waiting.length} waiting. The oldest came in ${ago(oldest.days).toLowerCase()}.` : "Nothing is waiting on you."}</p></header>
      <div class="review ${picked ? "picked" : ""}">
        <section class="panel list" aria-label="Applications">
          <div class="seg" role="group" aria-label="Show">${[["waiting", `Waiting ${sets.waiting.length}`], ["decided", "Decided"], ["all", "All"]].map((f) => `<button data-filter="${f[0]}" aria-pressed="${f[0] === appFilter}">${f[1]}</button>`).join("")}</div>
          ${rows}
        </section>
        ${detail}
      </div>`;
  }


  // ---------- committee: documents to check ----------
  let docFilter = "waiting", docOpen = null;
  const docSel = new Set();
  const expires = (e) => { const d = new Date(e.completed); d.setMonth(d.getMonth() + e.renew_months); return d; };
  const DOC_STATUS = { pending_review: "Waiting", approved: "Approved", rejected: "Sent back" };
  function viewDocuments() {
    const S = SAMPLE, waiting = S.docsWaiting, list = docFilter === "waiting" ? waiting : S.evidence.filter((e) => e.status !== "pending_review");
    const rows = list.map((e) => {
      const exp = expires(e), lapsed = exp < today, open = docOpen === e.id, pending = e.status === "pending_review";
      return `
      <div class="doc ${docSel.has(e.id) ? "sel" : ""}" data-doc="${e.id}">
        ${pending ? `<input type="checkbox" data-doc-check="${e.id}" ${docSel.has(e.id) ? "checked" : ""} aria-label="Select ${esc(e.item)} from ${esc(e.name)}" />` : "<span></span>"}
        <div class="doc-who"><div class="avatar">${esc(initials(e.name))}</div><div class="row-main"><b>${esc(e.name)}</b><span>${esc(e.item)}</span></div></div>
        <button class="doc-file" data-doc-view="${e.id}" aria-expanded="${open}">${icon("file", "sm")}<span>${esc(e.file)}</span></button>
        <div class="doc-col">${dayMonth(e.completed)}</div>
        <div class="doc-col ${lapsed ? "lapsed" : ""}">${lapsed ? "Expired " : ""}${fmt(exp, { day: "numeric", month: "short", year: "numeric" })}</div>
        <div class="doc-acts">${pending
          ? `<button class="btn go" data-doc-act="approved" data-id="${e.id}">Approve</button><button class="btn quiet" data-doc-act="rejected" data-id="${e.id}">Send back</button>`
          : `<span class="chip ${e.status}">${DOC_STATUS[e.status]}</span><span class="row-aside">${ago(e.reviewed_days)}</span>`}</div>
        ${open ? `<div class="doc-open">
          <div class="doc-preview">${icon("file")}<p>${esc(e.file)}</p><span>The uploaded file shows here once storage is connected.</span></div>
          <dl class="facts"><div><dt>Uploaded</dt><dd>${ago(e.days)}</dd></div><div><dt>Completed</dt><dd>${fmt(e.completed, { day: "numeric", month: "short", year: "numeric" })}</dd></div><div><dt>Renews every</dt><dd>${e.renew_months} months</dd></div><div><dt>Expires</dt><dd class="${lapsed ? "lapsed" : ""}">${fmt(exp, { day: "numeric", month: "short", year: "numeric" })}</dd></div></dl>
          ${lapsed && pending ? `<p class="err">This certificate has already expired. Send it back and ask for a current one.</p>` : ""}
        </div>` : ""}
      </div>`;
    }).join("");
    return `
      <header class="page-head"><h1>Documents</h1>
        <p class="sub">${waiting.length ? `${waiting.length} waiting to be checked. Open a file to see it, or tick several and approve them together.` : "Every document has been checked."}</p></header>
      <section class="panel docs">
        <div class="docs-top">
          <div class="seg" role="group" aria-label="Show">${[["waiting", `Waiting ${waiting.length}`], ["checked", "Checked"]].map((f) => `<button data-doc-filter="${f[0]}" aria-pressed="${f[0] === docFilter}">${f[1]}</button>`).join("")}</div>
        </div>
        ${list.length ? `<div class="doc doc-head">
          ${docFilter === "waiting" ? `<input type="checkbox" data-doc-all aria-label="Select all waiting documents" />` : "<span></span>"}
          <div>Member</div><div>File</div><div class="doc-col">Completed</div><div class="doc-col">Expires</div><div></div>
        </div>${rows}` : `<p class="empty">${docFilter === "waiting" ? "Nothing to check. New uploads land here as members add them." : "Nothing has been checked yet."}</p>`}
      </section>
      <div id="bulk" role="region" aria-label="Selected documents"></div>`;
  }
  function syncBulk() {
    const bar = $("#bulk"); if (!bar) return;
    const n = docSel.size, total = SAMPLE.docsWaiting.length, all = $("[data-doc-all]");
    document.querySelectorAll("[data-doc]").forEach((r) => r.classList.toggle("sel", docSel.has(r.dataset.doc)));
    if (all) { all.checked = n > 0 && n === total; all.indeterminate = n > 0 && n < total; }
    bar.classList.toggle("on", n > 0);
    bar.innerHTML = n ? `<span>${n} selected</span><button class="solid" data-bulk="approved">Approve</button><button data-bulk="rejected">Send back</button><button data-bulk-clear aria-label="Clear selection">${icon("x", "sm")}</button>` : "";
  }
  function decideDocs(ids, status) {
    const docs = SAMPLE.evidence.filter((e) => ids.includes(e.id));
    if (!docs.length) return;
    docs.forEach((e) => { e.status = status; e.reviewed_days = 0; });
    docSel.clear(); docOpen = null;
    const verb = status === "approved" ? "Approved" : "Sent back";
    render();
    showToast(docs.length === 1 ? `${verb} ${docs[0].name}'s ${docs[0].item.toLowerCase().replace("safesport", "SafeSport")}` : `${verb} ${docs.length} documents`,
      () => { docs.forEach((e) => { e.status = "pending_review"; delete e.reviewed_days; }); docFilter = "waiting"; go("#/compliance"); });
  }

  // ---------- shared page parts ----------
  const ui = { appts: "upcoming", mem: "all", q: "", memOpen: null, assigning: false };
  const memSel = new Set();
  const full = (d) => fmt(d, { day: "numeric", month: "short", year: "numeric" });
  const plus = (d, months) => { const x = new Date(d); x.setMonth(x.getMonth() + months); return x; };
  const head = (title, sub) => `<header class="page-head"><h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p></header>`;
  const seg = (key, opts) => `<div class="seg" role="group" aria-label="Show">${opts.map((o) => `<button data-set="${key}=${o[0]}" aria-pressed="${o[0] === ui[key]}">${o[1]}</button>`).join("")}</div>`;
  const dayBlock = (d, next) => `<div class="day ${next ? "next" : ""}"><small>${fmt(d, { month: "short" })}</small><span class="num">${d.getDate()}</span></div>`;
  const dchip = (d) => (d ? `<span class="chip ${d}">${cap(d)}</span>` : `<span class="chip">All umpires</span>`);
  const PROFILE_FIELDS = [["full_name", "full name"], ["preferred_name", "preferred name"], ["phone", "phone number"], ["city", "city"], ["home_club", "home club"]];
  function profileGaps() { return PROFILE_FIELDS.filter((f) => !SAMPLE.profile[f[0]]).map((f) => f[1]); }
  function profilePct() { return Math.round((1 - profileGaps().length / PROFILE_FIELDS.length) * 100); }

  // ---------- umpire: appointments ----------
  function viewAppointments() {
    const S = SAMPLE, up = S.appointments, next = up[0];
    const games = S.gamesByMonth.reduce((n, p) => n + p[1], 0);
    const row = (a, isNext, past) => `
      <div class="row">${dayBlock(a.starts_at, isNext)}
        <div class="row-main"><b>${esc(a.match)}</b><span>${fmt(a.starts_at, { weekday: "short" })} ${time(a.starts_at)}, ${esc(a.venue)}${past ? ", " + esc(a.event) : ""}</span>${a.with ? `<span>With ${esc(a.with.join(" and "))}</span>` : ""}</div>
        <span class="chip ${a.position}">${cap(a.position)}</span>
      </div>`;
    let body;
    if (ui.appts === "upcoming") {
      const groups = [];
      up.forEach((a) => { let g = groups.find((x) => x.event === a.event); if (!g) groups.push((g = { event: a.event, items: [] })); g.items.push(a); });
      body = groups.map((g) => `<section class="panel"><div class="panel-top"><h2>${esc(g.event)}</h2><span class="when">${fmt(g.items[0].starts_at, { weekday: "long", month: "short", day: "numeric" })}</span></div>
        ${g.items.map((a) => row(a, a === next)).join("")}</section>`).join("");
    } else {
      body = `<section class="panel">${S.pastGames.map((a) => row(a, false, true)).join("")}</section>`;
    }
    return head("Appointments", `${up.length} coming up. The next is ${fmt(next.starts_at, { weekday: "long" })} at ${time(next.starts_at)}, ${next.venue}.`) + `
      <div class="page-tools">${seg("appts", [["upcoming", `Upcoming ${up.length}`], ["past", "Past"]])}</div>
      <div class="split">
        <div class="stack">${body}</div>
        <section class="panel tally">
          <div class="panel-top"><h2>This year</h2></div>
          <div class="big num">${games}</div><p class="unit">games umpired</p>
          ${bars(S.gamesByMonth)}
          <div class="axis"><span>${S.gamesByMonth[0][0]}</span><span>${S.gamesByMonth[S.gamesByMonth.length - 1][0]}</span></div>
          ${S.accreditations.map((a) => `<div class="kv"><span>${cap(a.discipline)}</span><b>${a.games} games</b></div>`).join("")}
        </section>
      </div>`;
  }

  // ---------- umpire: accreditation ----------
  function viewAccreditation() {
    const S = SAMPLE;
    const card = (d) => {
      const a = S.accreditations.find((x) => x.discipline === d);
      if (!a) return `<section class="panel acc off">${dchip(d)}<div class="big num">Not yet</div>${pips(["", "", ""])}<p>You aren't accredited as a ${d} umpire. Ask your coach about an assessment.</p></section>`;
      return `<section class="panel acc">${dchip(d)}<div class="big num">Level ${a.level}</div>${pips(Array.from({ length: a.of }, (_, i) => (i < a.level ? "on" : "")))}
        <dl class="facts"><div><dt>Awarded</dt><dd>${full(a.awarded_on)}</dd></div><div><dt>Valid to</dt><dd>${full(a.expires_on)}</dd></div><div><dt>Games this year</dt><dd>${a.games}</dd></div></dl></section>`;
    };
    const soonest = S.accreditations.slice().sort((a, b) => a.expires_on - b.expires_on)[0];
    return head("Accreditation", `You're accredited in ${S.accreditations.length} of 3 disciplines. ${cap(soonest.discipline)} is the first to renew, in ${monthYear(soonest.expires_on)}.`) + `
      <div class="acc-grid">${["field", "boundary", "goal"].map(card).join("")}</div>
      <section class="panel"><div class="panel-top"><h2>History</h2></div>
        ${S.accHistory.map((h) => `<div class="row"><div class="row-main"><b>${cap(h.discipline)} Level ${h.level}</b><span class="wrap2">Awarded by ${esc(h.by)}${h.notes ? ". " + esc(h.notes) : ""}</span></div><div class="row-aside">${full(h.awarded_on)}</div></div>`).join("")}
      </section>`;
  }

  // ---------- umpire: compliance ----------
  const REQ_STATE = { approved: "Approved", pending_review: "With the committee", missing: "Needed" };
  function viewCompliance() {
    const S = SAMPLE, done = S.compliance.filter((c) => c.status === "approved").length, need = S.compliance.filter((c) => c.status === "missing");
    const rows = S.compliance.map((c) => {
      const when = c.status === "approved" ? `Completed ${full(c.completed)}. Renew by ${full(plus(c.completed, c.renew_months))}.`
        : c.status === "pending_review" ? `${esc(c.file)} uploaded today. The committee will check it.`
        : `Due ${full(c.due)}.`;
      const act = c.status === "missing" && c.requires_upload
        ? `<label class="btn">${icon("up", "sm")} Upload certificate<input type="file" class="sr" accept=".pdf,image/*" data-upload="${c.id}" /></label>`
        : `<span class="chip ${c.status}">${REQ_STATE[c.status]}</span>`;
      return `<div class="req"><span class="state ${c.status}">${icon("check", "sm")}</span>
        <div class="req-main"><b>${esc(c.name)}</b><p>${esc(c.description)}</p><small class="${c.status === "missing" ? "flag" : ""}">${when}</small></div>
        <div class="req-act">${act}</div></div>`;
    }).join("");
    return head("Compliance", need.length ? `${done} of ${S.compliance.length} complete. ${need[0].name} is due ${dayMonth(need[0].due)}.` : done === S.compliance.length ? "Everything is current." : `${done} of ${S.compliance.length} approved. The rest is with the committee.`) + `
      <section class="panel reqs">${pips(S.compliance.map((c) => (c.status === "approved" ? "on" : c.status === "missing" ? "wait" : "")))}${rows}</section>`;
  }

  // ---------- learning ----------
  function viewLearning() {
    const S = SAMPLE;
    return head("Learning", `${S.learning.length} modules assigned by your coach. The first is due ${fmt(S.learning[0].due_on, { weekday: "long" })}.`) + `
      <div class="mods">${S.learning.map((m) => `
        <section class="panel mod">
          <div class="mod-top">${dchip(m.discipline)}<span>${m.minutes} min</span></div>
          <h2>${esc(m.title)}</h2><p>${esc(m.summary)}</p>
          ${meter(m.done)}
          <div class="mod-foot"><span>${m.done ? Math.round(m.done * 100) + "% done. " : ""}Due ${dayMonth(m.due_on)}</span><button class="btn" data-soon>${m.done ? "Continue" : "Start"}</button></div>
        </section>`).join("")}</div>
      <section class="panel"><div class="panel-top"><h2>Library</h2></div>
        ${S.library.map((m) => `<div class="row"><div class="row-main"><b>${esc(m.title)}</b><span>${esc(m.summary)}</span></div>${dchip(m.discipline)}<div class="row-aside">${m.minutes} min</div>
          ${m.done ? `<span class="chip approved">Done</span>` : `<button class="btn quiet" data-soon>Start</button>`}</div>`).join("")}
      </section>`;
  }
  function viewLearningStaff() {
    const M = SAMPLE.modules, a = M.reduce((n, m) => n + m.assigned, 0), c = M.reduce((n, m) => n + m.completed, 0), o = M.reduce((n, m) => n + m.overdue, 0);
    return head("Learning", `${Math.round((c / a) * 100)}% of assigned modules are done. ${o} are overdue.`) + `
      <section class="panel docs">
        <div class="doc lrn doc-head"><div>Module</div><div>For</div><div>Completed</div><div class="doc-col">Overdue</div><div></div></div>
        ${M.map((m) => `<div class="doc lrn">
          <div class="row-main"><b>${esc(m.title)}</b><span>${m.minutes} min</span></div>
          <div>${dchip(m.discipline)}</div>
          <div class="prog">${m.assigned ? `${meter(m.completed / m.assigned)}<span>${m.completed} of ${m.assigned}</span>` : `<span>Not assigned yet</span>`}</div>
          <div class="doc-col ${m.overdue ? "lapsed" : ""}">${m.overdue || "None"}</div>
          <div class="doc-acts"><span class="chip ${m.published ? "approved" : ""}">${m.published ? "Published" : "Draft"}</span></div>
        </div>`).join("")}
      </section>
      <p class="foot-note">To assign a module, tick members on the <a href="#/members">Members</a> page.</p>`;
  }

  // ---------- events ----------
  function viewEvents() {
    const S = SAMPLE, staff = role === "staff", list = S.events.filter((e) => staff || e.published);
    let month = "";
    const rows = list.map((e) => {
      const m = fmt(e.starts_on, { month: "long", year: "numeric" }), mine = S.appointments.filter((a) => a.event === e.name).length;
      const lead = m !== month ? `<h3 class="month">${m}</h3>` : ""; month = m;
      const when = e.ends_on ? `${fmt(e.starts_on, { weekday: "short" })} ${dayMonth(e.starts_on)} to ${fmt(e.ends_on, { weekday: "short" })} ${dayMonth(e.ends_on)}` : fmt(e.starts_on, { weekday: "long" });
      const aside = staff ? `${e.published ? "" : `<span class="chip">Draft</span>`}<div class="row-aside">${e.appointed ? e.appointed + " appointed" : "No appointments yet"}</div>`
        : mine ? `<a class="chip field" href="#/appointments">You're on ${mine} ${mine === 1 ? "game" : "games"}</a>` : "";
      return `${lead}<div class="row">${dayBlock(e.starts_on)}<div class="row-main"><b>${esc(e.name)}</b><span>${when}, ${esc(e.location)}</span>${e.description ? `<span>${esc(e.description)}</span>` : ""}</div>${aside}</div>`;
    }).join("");
    const first = list[0];
    return head("Events", `${list.length} on the calendar. ${first.name} is first, on ${fmt(first.starts_on, { weekday: "long" })} ${dayMonth(first.starts_on)}.`) + `<section class="panel cal">${rows}</section>`;
  }

  // ---------- announcements ----------
  const AUDIENCE = { "": "Everyone", umpire: "Umpires", applicant: "Prospective umpires" };
  function viewAnnouncements() {
    const staff = role === "staff";
    const list = visibleNews().slice().sort((a, b) => (b.draft ? 1 : 0) - (a.draft ? 1 : 0) || (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.days - b.days);
    const compose = staff ? `<section class="panel compose">
        <div class="panel-top"><h2>New announcement</h2></div>
        <label class="fld"><span>Title</span><input type="text" id="an-title" /></label>
        <label class="fld"><span>Message</span><textarea id="an-body" rows="4"></textarea></label>
        <div class="compose-foot">
          <label class="fld inline"><span>Send to</span><select id="an-aud">${Object.keys(AUDIENCE).map((k) => `<option value="${k}">${AUDIENCE[k]}</option>`).join("")}</select></label>
          <label class="opt"><input type="checkbox" id="an-pin" /> Pin to the top</label>
          <span class="grow"></span>
          <button class="btn quiet" data-announce="draft">Save draft</button><button class="btn" data-announce="send">Send announcement</button>
        </div>
        <p class="err" id="an-err" hidden>Add a title and a message first.</p>
      </section>` : "";
    return head("Announcements", staff ? "Write to everyone, or only umpires or prospective umpires." : "News from the committee, newest first.") + `
      <div class="feed">${compose}${list.map((a) => `
        <article class="panel post">
          <div class="post-meta">${a.draft ? `<span class="chip under_review">Draft</span>` : ""}${a.pinned ? `<span class="pinned">${icon("pin", "sm")} Pinned</span>` : ""}<span>${a.draft ? "Not sent" : ago(a.days)}</span>${staff ? `<span>To ${AUDIENCE[a.audience || ""].toLowerCase()}</span>` : ""}</div>
          <h2>${esc(a.title)}</h2><p>${esc(a.body)}</p>
          ${a.draft ? `<div class="acts"><button class="btn" data-send-draft="${SAMPLE.announcements.indexOf(a)}">Send announcement</button></div>` : ""}
        </article>`).join("")}</div>`;
  }

  // ---------- profile ----------
  function viewProfile() {
    const P = SAMPLE.profile, gaps = profileGaps(), pct = profilePct();
    const f = (id, label, type = "text", extra = "") => `<label class="fld"><span>${label}</span><input type="${type}" id="pf-${id}" value="${esc(P[id] || "")}" ${extra} /></label>`;
    return head("Profile", "How the committee and your coach reach you, and what other umpires see.") + `
      <div class="profile">
        <section class="panel id-card">
          <div class="avatar xl">${esc(initials(P.full_name))}</div>
          <h2>${esc(P.full_name)}</h2><p>${esc(roleTitle())}</p><p>${esc([P.home_club, [P.city, P.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "))}</p>
          ${meter(pct / 100)}<small>${gaps.length ? `${pct}% complete. Add your ${esc(gaps[0])}.` : "Your profile is complete."}</small>
        </section>
        <section class="panel form-card">
          <div class="form">
            ${f("full_name", "Full name")}${f("preferred_name", "Preferred name")}
            <label class="fld"><span>Email</span><input type="email" value="${esc(P.email)}" readonly /><small>You sign in with this. Ask the committee to change it.</small></label>
            ${f("phone", "Phone", "tel", 'autocomplete="tel"')}
            ${f("city", "City")}${f("state", "State")}
            ${f("home_club", "Home club")}
            <fieldset class="fld"><legend>Disciplines</legend><div class="opts">${["field", "boundary", "goal"].map((d) => `<label class="opt"><input type="checkbox" data-disc="${d}" ${P.disciplines.includes(d) ? "checked" : ""} /> ${cap(d)}</label>`).join("")}</div></fieldset>
            <label class="fld full"><span>About you</span><textarea id="pf-bio" rows="3">${esc(P.bio)}</textarea></label>
          </div>
          <div class="acts"><button class="btn" data-save-profile>Save profile</button></div>
        </section>
      </div>`;
  }

  // ---------- prospective: application, getting started ----------
  function viewApplication() {
    const A = SAMPLE.application, order = ["draft", "submitted", "under_review", "approved"], names = ["Started", "Submitted", "With the committee", "Decision"];
    const at = order.indexOf(A.status), gone = A.status === "withdrawn";
    return head("Application", gone ? "You withdrew this application." : `Submitted ${ago(A.submitted_days).toLowerCase()}. It's with the committee now.`) + `
      <div class="feed">
        <section class="panel wide">
          <div class="panel-top"><h2>Where it's up to</h2><span class="chip ${gone ? "" : A.status}">${gone ? "Withdrawn" : STATUS[A.status]}</span></div>
          <ol class="steps">${names.map((n, i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}"${i === at ? ' aria-current="step"' : ""}>${n}</li>`).join("")}</ol>
          <p class="lede">${gone ? "The committee won't review it while it's withdrawn." : "The committee reviews applications every fortnight, and you'll get an email as soon as there's a decision."}</p>
        </section>
        <section class="panel post">
          <div class="panel-top"><h2>Your answers</h2></div>
          <dl class="answers">${A.answers.map((qa) => `<div><dt>${esc(qa[0])}</dt><dd>${esc(qa[1])}</dd></div>`).join("")}</dl>
        </section>
        <div class="acts">${gone ? `<button class="btn" data-withdraw="submitted">Send it again</button>` : `<button class="btn quiet" data-withdraw="withdrawn">Withdraw application</button>`}</div>
      </div>`;
  }
  function viewStarted() {
    const O = SAMPLE.onboarding, done = O.filter((o) => o.done).length;
    return head("Getting started", done === O.length ? "All done. You're ready for your first game." : `${done} of ${O.length} done. You can do these in any order while the committee reviews your application.`) + `
      <div class="feed"><section class="panel reqs">${pips(O.map((o) => (o.done ? "on" : "")))}
        ${O.map((o, i) => `<button class="check" role="checkbox" aria-checked="${o.done}" data-step="${i}"><span class="tick">${icon("check", "sm")}</span><span class="row-main"><b>${esc(o.title)}</b><span>${esc(o.body)}</span></span></button>`).join("")}
      </section></div>`;
  }

  // ---------- committee: members ----------
  const REQ_NAMES = ["Rules test", "Background check", "Concussion course", "SafeSport"];
  const COMP = { a: "on", p: "", m: "wait" }, COMP_WORD = { p: "waiting to be checked", m: "missing" };
  const needsEye = (m) => /[^a]/.test(m.comp) || m.expiring > 0;
  function memberList() {
    const q = ui.q.trim().toLowerCase();
    return SAMPLE.members.filter((m) => (ui.mem === "all" || (ui.mem === "attention" ? needsEye(m) : ui.mem in m.acc)) && (!q || (m.name + " " + m.club + " " + m.where).toLowerCase().includes(q)));
  }
  function memberRows() {
    const list = memberList();
    if (!list.length) return `<p class="empty">No members match. Try a different name, club or city.</p>`;
    return `<div class="doc mem doc-head"><input type="checkbox" data-mem-all aria-label="Select all members shown" /><div>Member</div><div>Accreditation</div><div>Compliance</div><div class="doc-col">Last game</div></div>` + list.map((m) => {
      const ok = m.comp.split("").filter((c) => c === "a").length, open = ui.memOpen === m.id;
      const issues = m.comp.split("").map((c, i) => (c === "a" ? "" : `${REQ_NAMES[i]} is ${COMP_WORD[c]}`)).filter(Boolean);
      if (m.expiring) issues.push(`Accreditation expires on ${dayMonth(inDays(m.expiring))}`);
      return `<div class="doc mem ${memSel.has(m.id) ? "sel" : ""}" data-mem="${m.id}">
        <input type="checkbox" data-mem-check="${m.id}" ${memSel.has(m.id) ? "checked" : ""} aria-label="Select ${esc(m.name)}" />
        <button class="doc-who" data-mem-view="${m.id}" aria-expanded="${open}"><div class="avatar">${esc(initials(m.name))}</div><div class="row-main"><b>${esc(m.name)}${m.role !== "umpire" ? ` <span class="chip">${m.role === "admin" ? "Committee" : "Coach"}</span>` : ""}</b><span>${esc(m.club)}, ${esc(m.where)}</span></div></button>
        <div class="chips">${Object.keys(m.acc).map((d) => `<span class="chip ${d}">${cap(d)} ${m.acc[d]}</span>`).join("")}</div>
        <div class="prog">${pips(m.comp.split("").map((c) => COMP[c]))}<span class="${ok < 4 ? "flag" : ""}">${ok} of 4</span></div>
        <div class="doc-col">${ago(m.last)}</div>
        ${open ? `<div class="mem-open">
          <dl class="facts"><div><dt>Email</dt><dd>${esc(m.email)}</dd></div><div><dt>Games this year</dt><dd>${m.games}</dd></div><div><dt>Last game</dt><dd>${ago(m.last)}</dd></div><div><dt>Learning assigned</dt><dd>${m.assigned.length ? esc(m.assigned.join(", ")) : "None"}</dd></div></dl>
          ${issues.length ? `<ul class="issues">${issues.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="hint">Nothing outstanding.</p>`}
        </div>` : ""}
      </div>`;
    }).join("");
  }
  function viewMembers() {
    const S = SAMPLE, total = S.roster.field + S.roster.boundary + S.roster.goal, eye = S.members.filter(needsEye).length;
    return head("Members", `${total} active umpires. This preview lists ${S.members.length} of them, and ${eye} need a look.`) + `
      <section class="panel docs">
        <div class="docs-top tools">
          ${seg("mem", [["all", "All"], ["field", "Field"], ["boundary", "Boundary"], ["goal", "Goal"], ["attention", `Needs a look ${eye}`]])}
          <label class="search">${icon("search", "sm")}<span class="sr">Search members</span><input type="search" id="mem-q" placeholder="Search name, club or city" value="${esc(ui.q)}" /></label>
        </div>
        <div id="mem-rows">${memberRows()}</div>
      </section>
      <div id="bulk" role="region" aria-label="Selected members"></div>`;
  }
  function syncMembers() {
    const bar = $("#bulk"); if (!bar) return;
    const shown = memberList().map((m) => m.id), n = memSel.size, all = $("[data-mem-all]");
    document.querySelectorAll("[data-mem]").forEach((r) => r.classList.toggle("sel", memSel.has(r.dataset.mem)));
    const picked = shown.filter((id) => memSel.has(id)).length;
    if (all) { all.checked = picked > 0 && picked === shown.length; all.indeterminate = picked > 0 && picked < shown.length; }
    if (!n) ui.assigning = false;
    bar.classList.toggle("on", n > 0); bar.classList.toggle("menu", ui.assigning);
    bar.innerHTML = !n ? "" : ui.assigning
      ? `<span>Assign to ${n}</span>${SAMPLE.modules.filter((m) => m.published).map((m) => `<button data-mem-module="${esc(m.title)}">${esc(m.title)}</button>`).join("")}<button data-mem-back aria-label="Back">${icon("x", "sm")}</button>`
      : `<span>${n} selected</span><button class="solid" data-mem-assign>Assign learning</button><button data-mem-clear aria-label="Clear selection">${icon("x", "sm")}</button>`;
  }

  // ---------- more (phones: everything that doesn't fit the bar) ----------
  function viewMore() {
    return head("More", "The rest of the hub.") + `<div class="feed"><section class="panel">${NAV[role].filter(Boolean).slice(3).map((n) => `<a class="row" href="#/${n[0]}">${icon(n[2])}<div class="row-main"><b>${n[1]}</b><span>${esc(STUBS[n[0]] || "")}</span></div>${icon("next", "sm")}</a>`).join("")}</section></div>`;
  }

  const PAGES = {
    appointments: { umpire: viewAppointments }, accreditation: { umpire: viewAccreditation },
    compliance: { umpire: viewCompliance, staff: viewDocuments },
    learning: { umpire: viewLearning, staff: viewLearningStaff },
    events: { umpire: viewEvents, staff: viewEvents },
    announcements: { applicant: viewAnnouncements, umpire: viewAnnouncements, staff: viewAnnouncements },
    profile: { applicant: viewProfile, umpire: viewProfile, staff: viewProfile },
    more: { applicant: viewMore, umpire: viewMore, staff: viewMore },
    application: { applicant: viewApplication }, "getting-started": { applicant: viewStarted },
    applications: { staff: viewApplications }, members: { staff: viewMembers },
  };

  // ---------- render ----------
  let lastCounts = {};
  function renderSide() {
    const r = route();
    const live = role === "staff" ? { applications: SAMPLE.queue.length, compliance: SAMPLE.docsWaiting.length }
      : role === "umpire" ? { compliance: SAMPLE.compliance.filter((c) => c.status === "missing").length, learning: SAMPLE.learning.length } : {};
    const onMore = NAV[role].some((n, i) => n && i >= 3 && n[0] === r) || r === "more";
    const count = (n) => (n[0] in live ? live[n[0]] : n[3]);
    const prev = lastCounts; lastCounts = live;
    const wasBumped = (n) => n[0] in live && n[0] in prev && prev[n[0]] !== live[n[0]];
    $("#side").innerHTML = `
      <a class="brand" href="#/home"><img src="icons/icon-192.png" alt="" /><div><b>USAFL Umpires</b><span>${ROLES[role].label} hub</span></div></a>
      <nav class="nav" aria-label="Main">
        ${NAV[role].map((n, i) => n ? `<a href="#/${n[0]}" class="${i >= 3 ? "more" : ""}" ${n[0] === r ? 'aria-current="page"' : ""}>${icon(n[2])}<span>${n[1]}</span>${count(n) ? `<span class="count ${wasBumped(n) ? "bump" : ""}">${count(n)}</span>` : ""}</a>` : '<div class="gap"></div>').join("")}
        <a href="#/more" class="more-link" ${onMore ? 'aria-current="page"' : ""}>${icon("dots")}<span>More</span></a>
      </nav>
      <a class="me" href="#/profile"><div class="avatar">${esc(initials(SAMPLE.profile.full_name))}</div><div><b>${esc(SAMPLE.profile.full_name)}</b><span>${esc(roleTitle())}</span></div></a>`;
  }

  function previewBar() {
    const dark = document.documentElement.dataset.theme === "dark";
    const isLive = mode === "live", canSwitch = !isLive || LIVE_ROLE[me.role] === "staff";
    return `<div class="preview">
      <p>${isLive ? `Signed in as ${esc(me.email)}. Your profile is live; the rest is sample data until it's connected.` : "Sample data. Nothing here is saved."}</p>
      ${canSwitch ? `<div class="seg" role="group" aria-label="${isLive ? "View as" : "Preview as"}">${Object.keys(ROLES).map((k) => `<button data-role="${k}" aria-pressed="${k === role}">${ROLES[k].label}</button>`).join("")}</div>` : ""}
      ${isLive ? `<button class="btn quiet" data-signout>Sign out</button>` : `<button class="btn quiet" data-signin>Sign in</button>`}
      <button class="icon-btn" data-theme-toggle aria-label="Switch to ${dark ? "light" : "dark"} theme">${icon(dark ? "sun" : "moon")}</button>
    </div>`;
  }

  // ---------- sign-in ----------
  function viewGate() {
    const dark = document.documentElement.dataset.theme === "dark";
    const form = gate.sent ? `
        <h1 class="hello"><strong>Check your email.</strong></h1>
        <p class="sub">We sent a sign-in link to <b>${esc(gate.sent)}</b>. Open it on this device and you'll land in the hub.</p>
        ${gate.error ? `<p class="err" role="alert">${esc(gate.error)}</p>` : ""}
        <div class="acts"><button class="btn quiet" data-resend ${gate.busy ? "disabled" : ""}>${gate.busy ? "Sending" : "Send it again"}</button><button class="btn quiet" data-other-email>Use a different email</button></div>
        <p class="hint">Nothing after a couple of minutes? Check your spam folder.</p>` : `
        <h1 class="hello"><strong>Sign in.</strong></h1>
        <p class="sub">Enter your email and we'll send you a link. There's no password to remember.</p>
        ${gate.notice ? `<p class="notice" role="status">${esc(gate.notice)}</p>` : ""}
        <form id="signin" novalidate>
          <label class="fld"><span>Email</span><input type="email" id="si-email" autocomplete="email" inputmode="email" ${gate.error ? 'aria-invalid="true" aria-describedby="si-err"' : ""} /></label>
          ${gate.error ? `<p class="err" id="si-err" role="alert">${esc(gate.error)}</p>` : ""}
          <button class="btn" ${gate.busy ? "disabled" : ""}>${gate.busy ? "Sending" : "Email me a link"}</button>
        </form>
        <p class="hint">New to umpiring? Use the same box. We'll set up your account and you can apply from there.</p>`;
    return `<div class="gate-wrap">
      <section class="gate-main">
        <div class="gate-top"><div class="brand"><img src="icons/icon-192.png" alt="" /><div><b>USAFL Umpires</b><span>The umpiring hub</span></div></div>
          <button class="icon-btn" data-theme-toggle aria-label="Switch to ${dark ? "light" : "dark"} theme">${icon(dark ? "sun" : "moon")}</button></div>
        <div class="gate-form">${form}</div>
        <div class="gate-foot"><button class="linkish" data-preview>Look around with sample data ${icon("next", "sm")}</button><a class="linkish" href="nationals/">Nationals 2026 app ${icon("out", "sm")}</a></div>
      </section>
      <section class="gate-art" aria-hidden="true">${ground({
        goal: { name: "Goal umpire", note: "Judges every score and signals it with the flags." },
        field: { name: "Field umpire", note: "Runs the game: bounces, marks, free kicks." },
        boundary: { name: "Boundary umpire", note: "Calls the ball out and throws it back in." },
      })}</section>
    </div>`;
  }
  async function sendLink(email) {
    gate.busy = true; gate.error = ""; render();
    try { await Hub.sendLink(email, location.origin + location.pathname); gate.sent = email; }
    catch (e) { gate.error = e.status === 429 ? "You've asked for a few links already. Wait a minute, then try again." : e.status ? "We couldn't send the link. Check the address and try again." : "You seem to be offline. Check your connection and try again."; }
    gate.busy = false; render();
  }
  async function startLive() {
    mode = "loading"; render();
    try {
      const row = await Hub.profile();
      if (!row || !row.is_active) { Hub.forget(); mode = "gate"; gate.notice = row ? "Your account is paused. Contact the committee to get back in." : "We couldn't find your profile. Sign in again, or contact the committee."; render(); return; }
      useProfile(row); role = LIVE_ROLE[row.role]; mode = "live";
    } catch (e) {
      mode = "gate";
      if (e.status && e.status < 500) { Hub.forget(); gate.notice = "Your sign-in has expired. Enter your email for a new link."; }
      else gate.notice = "We couldn't reach the hub. Check your connection and reload.";
    }
    render();
  }

  function render() {
    const out = mode === "gate" || mode === "loading";
    document.body.classList.toggle("gate", out);
    if (out) {
      $("#side").innerHTML = "";
      if (mode === "loading") { $("#view").innerHTML = `<p class="loading" role="status">Signing you in</p>`; return; }
      const typed = $("#si-email") ? $("#si-email").value : "";
      $("#view").innerHTML = viewGate(); firstPaint = false;
      if ($("#si-email")) $("#si-email").value = typed;
      return;
    }
    renderSide();
    const r = route(), view = $("#view");
    const page = PAGES[r] && PAGES[r][role];
    if (page) { view.innerHTML = previewBar() + page(parts()[1]); if (r === "members") syncMembers(); else syncBulk(); return; }
    if (r !== "home") {
      view.innerHTML = previewBar() + `<div class="stub"><h1>Page not found</h1><p>That page isn't part of this view.</p><a class="btn" href="#/home">Back to home</a></div>`;
      return;
    }
    const h = { applicant: homeApplicant, umpire: homeUmpire, staff: homeStaff }[role]();
    view.innerHTML = previewBar() + `
      <header class="head">
        <div><h1 class="hello">G'day, <strong>${esc(SAMPLE.profile.preferred_name)}.</strong></h1><p class="sub">${esc(h.sub)}</p></div>
        <div class="today">${fmt(today, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
      </header>
      <div class="home">
        <section class="hero" aria-label="${esc(h.note)}">${ground(h.callouts)}<p class="hero-note">${esc(h.note)}</p></section>
        <div class="cards">${h.cards}</div>
        <div class="panels">${h.panels}</div>
      </div>`;
    firstPaint = false;
  }

  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
  let toastTimer = 0, toastUndo = null;
  function showToast(text, undo) {
    const el = $("#toast");
    toastUndo = undo || null;
    el.innerHTML = `<span>${icon("check", "sm")} ${esc(text)}</span>${undo ? '<button data-undo>Undo</button>' : ""}`;
    el.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undo ? 7000 : 3000);
  }
  function hideToast() { $("#toast").classList.remove("on"); toastUndo = null; }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-undo]")) { const u = toastUndo; hideToast(); if (u) u(); return; }
    const roleBtn = e.target.closest("[data-role]");
    if (roleBtn) { role = roleBtn.dataset.role; if (mode !== "live") store.set("usafl.hub.previewRole", role); if (route() !== "home") location.hash = "#/home"; else render(); return; }
    if (e.target.closest("[data-theme-toggle]")) {
      const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = t; store.set("usafl.theme", t);
      $("#theme-color").content = t === "dark" ? "#0e0d0c" : "#f6f5f3";
      render(); return;
    }
    const t0 = e.target, S = SAMPLE;
    if (t0.closest("[data-preview]")) { mode = "preview"; firstPaint = true; go("#/home"); return; }
    if (t0.closest("[data-signin]")) { mode = "gate"; gate.sent = ""; gate.error = ""; gate.notice = ""; firstPaint = true; render(); return; }
    if (t0.closest("[data-signout]")) { mode = "gate"; me = null; gate.sent = ""; gate.error = ""; gate.notice = "You're signed out."; firstPaint = true; Hub.signOut(); render(); return; }
    if (t0.closest("[data-resend]")) { sendLink(gate.sent); return; }
    if (t0.closest("[data-other-email]")) { gate.sent = ""; gate.error = ""; render(); $("#si-email").focus(); return; }
    const setBtn = t0.closest("[data-set]");
    if (setBtn) { const kv = setBtn.dataset.set.split("="); ui[kv[0]] = kv[1]; ui.memOpen = null; render(); return; }
    if (t0.closest("[data-soon]")) { showToast("Module pages are the next thing to design"); return; }
    const wd = t0.closest("[data-withdraw]");
    if (wd) { const was = S.application.status; S.application.status = wd.dataset.withdraw; render(); showToast(wd.dataset.withdraw === "withdrawn" ? "Withdrew your application" : "Sent your application", () => { S.application.status = was; render(); }); return; }
    if (t0.closest("[data-save-profile]")) {
      ["full_name", "preferred_name", "phone", "city", "state", "home_club", "bio"].forEach((k) => { S.profile[k] = $("#pf-" + k).value.trim(); });
      if (!S.profile.full_name) S.profile.full_name = mode === "live" ? me.full_name || me.email.split("@")[0] : "Sam Carter";
      if (!S.profile.preferred_name) S.profile.preferred_name = S.profile.full_name.split(" ")[0];
      S.profile.disciplines = [...document.querySelectorAll("[data-disc]:checked")].map((c) => c.dataset.disc);
      if (mode !== "live") { render(); showToast("Saved profile"); return; }
      const P = S.profile, btn = t0.closest("[data-save-profile]"); btn.disabled = true;
      const nul = (v) => v || null;
      Hub.saveProfile({ full_name: P.full_name, preferred_name: nul(P.preferred_name), phone: nul(P.phone), city: nul(P.city), state: nul(P.state), home_club: nul(P.home_club), bio: nul(P.bio), disciplines: P.disciplines })
        .then((row) => { useProfile(row); render(); showToast("Saved profile"); }, () => { useProfile(me); btn.disabled = false; showToast("Couldn't save your profile. Try again."); });
      return;
    }
    const an = t0.closest("[data-announce]");
    if (an) {
      const title = $("#an-title").value.trim(), body = $("#an-body").value.trim(), draft = an.dataset.announce === "draft";
      if (!title || !body) { $("#an-err").hidden = false; $(title ? "#an-body" : "#an-title").focus(); return; }
      const post = { title, body, days: 0, audience: $("#an-aud").value || null, pinned: $("#an-pin").checked, draft };
      S.announcements.unshift(post); render();
      showToast(draft ? "Saved draft" : `Sent to ${AUDIENCE[post.audience || ""].toLowerCase()}`, () => { S.announcements.splice(S.announcements.indexOf(post), 1); render(); });
      return;
    }
    const sd = t0.closest("[data-send-draft]");
    if (sd) { const post = S.announcements[+sd.dataset.sendDraft]; post.draft = false; post.days = 0; render(); showToast(`Sent to ${AUDIENCE[post.audience || ""].toLowerCase()}`, () => { post.draft = true; render(); }); return; }
    if (t0.matches("[data-mem-check]")) { t0.checked ? memSel.add(t0.dataset.memCheck) : memSel.delete(t0.dataset.memCheck); syncMembers(); return; }
    if (t0.matches("[data-mem-all]")) { memberList().forEach((m) => (t0.checked ? memSel.add(m.id) : memSel.delete(m.id))); document.querySelectorAll("[data-mem-check]").forEach((c) => { c.checked = t0.checked; }); syncMembers(); return; }
    const mv = t0.closest("[data-mem-view]");
    if (mv) { ui.memOpen = ui.memOpen === mv.dataset.memView ? null : mv.dataset.memView; $("#mem-rows").innerHTML = memberRows(); syncMembers(); const b = $(`[data-mem-view="${mv.dataset.memView}"]`); if (b) b.focus(); return; }
    if (t0.closest("[data-mem-assign]")) { ui.assigning = true; syncMembers(); return; }
    if (t0.closest("[data-mem-back]")) { ui.assigning = false; syncMembers(); return; }
    if (t0.closest("[data-mem-clear]")) { memSel.clear(); document.querySelectorAll("[data-mem-check]").forEach((c) => { c.checked = false; }); syncMembers(); return; }
    const mm = t0.closest("[data-mem-module]");
    if (mm) {
      const title = mm.dataset.memModule, who = S.members.filter((m) => memSel.has(m.id) && !m.assigned.includes(title));
      const n = memSel.size; who.forEach((m) => m.assigned.push(title));
      memSel.clear(); ui.assigning = false; render();
      showToast(`Assigned ${title} to ${n} ${n === 1 ? "member" : "members"}`, () => { who.forEach((m) => m.assigned.splice(m.assigned.indexOf(title), 1)); render(); });
      return;
    }
    const pickedApp = SAMPLE.applications.find((a) => a.id === parts()[1]) || SAMPLE.applications.filter(appFilter === "waiting" ? isWaiting : appFilter === "decided" ? (a) => !isWaiting(a) : () => true)[0];
    const f = e.target.closest("[data-filter]");
    if (f) { appFilter = f.dataset.filter; deciding = null; if (parts()[1]) location.hash = "#/applications"; else render(); return; }
    const d = e.target.closest("[data-decide]");
    if (d && pickedApp) { deciding = { id: pickedApp.id, kind: d.dataset.decide }; decideError = ""; render(); $("#msg").focus(); return; }
    if (e.target.closest("[data-cancel]")) { deciding = null; decideError = ""; render(); return; }
    if (e.target.closest("[data-confirm]") && pickedApp && deciding) {
      const msg = $("#msg").value.trim();
      if (deciding.kind === "decline" && !msg) { decideError = "Write a short message so they know why."; render(); $("#msg").focus(); return; }
      const was = { status: pickedApp.status, decided_days: pickedApp.decided_days, decided_by: pickedApp.decided_by, decision_message: pickedApp.decision_message };
      const ok = deciding.kind === "approve", app = pickedApp;
      Object.assign(app, { status: ok ? "approved" : "declined", decided_days: 0, decided_by: "you", decision_message: msg });
      deciding = null; decideError = "";
      // Like clearing a tray: the reviewed one leaves, the next one is already open, and Undo is right there.
      const nextUp = SAMPLE.queue[0];
      showToast(`${ok ? "Approved" : "Declined"} ${app.name}`, () => { Object.assign(app, was); go("#/applications/" + app.id); });
      go(nextUp && appFilter === "waiting" ? "#/applications/" + nextUp.id : "#/applications/" + app.id);
      return;
    }
    if (e.target.closest("[data-add-note]") && pickedApp) {
      const body = $("#note").value.trim();
      if (body) { pickedApp.notes.push({ author: SAMPLE.profile.full_name, days: 0, body }); render(); showToast("Saved note"); }
      return;
    }
    const t = e.target;
    if (t.matches("[data-doc-check]")) { t.checked ? docSel.add(t.dataset.docCheck) : docSel.delete(t.dataset.docCheck); syncBulk(); return; }
    if (t.matches("[data-doc-all]")) { docSel.clear(); if (t.checked) SAMPLE.docsWaiting.forEach((x) => docSel.add(x.id)); document.querySelectorAll("[data-doc-check]").forEach((c) => { c.checked = t.checked; }); syncBulk(); return; }
    const df = t.closest("[data-doc-filter]");
    if (df) { docFilter = df.dataset.docFilter; docSel.clear(); docOpen = null; render(); return; }
    const dv = t.closest("[data-doc-view]");
    if (dv) { docOpen = docOpen === dv.dataset.docView ? null : dv.dataset.docView; render(); const b = $(`[data-doc-view="${dv.dataset.docView}"]`); if (b) b.focus(); return; }
    const da = t.closest("[data-doc-act]");
    if (da) { decideDocs([da.dataset.id], da.dataset.docAct); return; }
    const bulk = t.closest("[data-bulk]");
    if (bulk) { decideDocs([...docSel], bulk.dataset.bulk); return; }
    if (t.closest("[data-bulk-clear]")) { docSel.clear(); document.querySelectorAll("[data-doc-check]").forEach((c) => { c.checked = false; }); syncBulk(); return; }
    const step = e.target.closest("[data-step]");
    if (step) { const o = SAMPLE.onboarding[+step.dataset.step]; o.done = !o.done; render(); }
  });
  document.addEventListener("change", (e) => {
    const up = e.target.closest("[data-upload]");
    if (!up || !up.files.length) return;
    const c = SAMPLE.compliance.find((x) => x.id === up.dataset.upload), was = { status: c.status, file: c.file };
    c.status = "pending_review"; c.file = up.files[0].name;
    render(); showToast(`Sent ${c.name} to the committee`, () => { Object.assign(c, was); render(); });
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "mem-q") return;
    ui.q = e.target.value; ui.memOpen = null; $("#mem-rows").innerHTML = memberRows(); syncMembers();
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "signin") return;
    e.preventDefault();
    const email = $("#si-email").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { gate.error = "Enter your email address, like name@example.com."; render(); $("#si-email").focus(); return; }
    sendLink(email);
  });
  addEventListener("hashchange", () => { deciding = null; decideError = ""; render(); $("#main").scrollTop = 0; });
  // ---------- boot ----------
  const back = Hub.takeRedirect(location.hash);
  if (back) history.replaceState(null, "", location.pathname + "#/home");
  if (back === "error") gate.notice = "That link has expired or was already used. Enter your email for a new one.";
  if (Hub.signedIn) startLive(); else render();
})();
