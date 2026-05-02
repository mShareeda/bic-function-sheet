import { PrismaClient, type RoleName } from "@prisma/client";
import { hashPassword, generateTempPassword } from "../lib/password";

const prisma = new PrismaClient();

const DEPARTMENTS = [
  "Facility Management Cleaning & Logistics",
  "Facility Management Electrical & Special Electronics",
  "Facility Management AC/Mechanical & Landscaping",
  "Facility Management Civil Works",
  "Food and Beverage",
  "Activities",
  "Sporting",
  "Drag",
  "Engineering Workshop",
  "Technical Operations",
  "Off-Road",
  "ICT",
  "Retail & Corporate Sales",
  "Marketing",
  "Media & Public Relations",
  "Safety & Security",
  "Miscellaneous",
  "Supplier",
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type TemplateEntry = { eventType: string; departmentName: string; items: string[] };

const REQUIREMENT_TEMPLATES: TemplateEntry[] = [
  // ── Race Day ──────────────────────────────────────────────────────────────
  {
    eventType: "race_day",
    departmentName: "Safety & Security",
    items: [
      "Safety officer briefing for all personnel at 07:00",
      "Crowd control barriers installed at all spectator zones",
      "Emergency response team on standby at pit lane entry",
      "Medical bay stocked and staffed with qualified paramedics",
      "Fire marshals positioned at grid and fuel areas",
      "Radio communication network operational and tested",
      "Vehicle inspection checkpoint active at circuit entrance",
    ],
  },
  {
    eventType: "race_day",
    departmentName: "ICT",
    items: [
      "Timing and scoring system installed and tested",
      "Live results display screens at all spectator areas",
      "Race control communication network operational",
      "Backup communications system on standby",
      "Media and photographer Wi-Fi access points configured",
      "PA system tested and operational",
    ],
  },
  {
    eventType: "race_day",
    departmentName: "Marketing",
    items: [
      "Sponsor branding installed at circuit perimeter and pit lane",
      "Welcome banners and directional signage at all circuit entries",
      "Social media coverage team briefed and deployed",
      "Event programme printed and distributed",
    ],
  },
  {
    eventType: "race_day",
    departmentName: "Media & Public Relations",
    items: [
      "Media centre set up with press passes allocated",
      "Photographer bibs and pit lane access permits issued",
      "Post-race press conference room prepared",
      "Live stream production team briefed",
    ],
  },
  {
    eventType: "race_day",
    departmentName: "Technical Operations",
    items: [
      "Circuit inspection completed and signed off",
      "Tyre barriers and catch fencing checked",
      "Pit lane equipment and fuel rigs verified",
      "Track surface sweep completed before first session",
      "Safety car and medical car on standby",
    ],
  },
  {
    eventType: "race_day",
    departmentName: "Food and Beverage",
    items: [
      "Hospitality suite catering service from 08:00",
      "Pit lane personnel refreshment stations stocked",
      "VIP paddock catering arrangements confirmed",
      "Spectator food and beverage outlets operational",
    ],
  },
  {
    eventType: "race_day",
    departmentName: "Facility Management Cleaning & Logistics",
    items: [
      "Circuit and paddock area cleaned before gates open",
      "Waste management stations deployed at all spectator zones",
      "Toilets and amenities checked and stocked",
      "Post-event full circuit and paddock clean-up",
    ],
  },
  {
    eventType: "race_day",
    departmentName: "Facility Management Electrical & Special Electronics",
    items: [
      "All circuit lighting checked and operational",
      "Start/finish gantry lighting confirmed",
      "Generator backup power tested for race control and timing",
    ],
  },
  {
    eventType: "race_day",
    departmentName: "Sporting",
    items: [
      "Clerk of the course appointed and briefed",
      "Stewards appointed and race regulations distributed",
      "Scrutineering bay set up and staffed",
      "Podium ceremony equipment prepared",
      "Results processing system tested",
    ],
  },

  // ── Corporate Hospitality ─────────────────────────────────────────────────
  {
    eventType: "corporate_hospitality",
    departmentName: "Food and Beverage",
    items: [
      "Welcome drinks reception on arrival",
      "Three-course seated dinner service",
      "Dietary requirements confirmed with client",
      "Bar service throughout the event",
      "Service staff briefed and in uniform",
    ],
  },
  {
    eventType: "corporate_hospitality",
    departmentName: "Safety & Security",
    items: [
      "Guest list verified and access control in place",
      "Security personnel at all venue entry points",
      "Emergency evacuation plan distributed to staff",
    ],
  },
  {
    eventType: "corporate_hospitality",
    departmentName: "ICT",
    items: [
      "Presentation AV system set up and tested",
      "Guest Wi-Fi network configured",
      "Microphone and sound system checked",
    ],
  },
  {
    eventType: "corporate_hospitality",
    departmentName: "Marketing",
    items: [
      "Client branding and signage installed per brief",
      "Welcome backdrop for photography prepared",
      "Gift bags or branded items arranged",
    ],
  },
  {
    eventType: "corporate_hospitality",
    departmentName: "Retail & Corporate Sales",
    items: [
      "VIP merchandise display prepared",
      "Gift vouchers or packages ready for distribution",
    ],
  },
  {
    eventType: "corporate_hospitality",
    departmentName: "Facility Management Cleaning & Logistics",
    items: [
      "Venue deep-cleaned and dressed before guest arrival",
      "Table linen and place settings arranged per floor plan",
      "Post-event breakdown and clean-up crew on standby",
    ],
  },
  {
    eventType: "corporate_hospitality",
    departmentName: "Activities",
    items: [
      "Entertainment or activity programme confirmed with client",
      "Activity facilitators briefed and on site",
      "Equipment checked and ready before guest arrival",
    ],
  },

  // ── Track Day ─────────────────────────────────────────────────────────────
  {
    eventType: "track_day",
    departmentName: "Safety & Security",
    items: [
      "Driver briefing at 08:30 — attendance mandatory",
      "Track safety car and ambulance on standby",
      "Medical officer on site throughout",
      "Fire extinguishers at pit lane and grid",
    ],
  },
  {
    eventType: "track_day",
    departmentName: "Technical Operations",
    items: [
      "Circuit inspection and debris sweep before sessions",
      "Pit lane speed limiter zones marked",
      "Recovery vehicle on standby",
      "Session timing system operational",
    ],
  },
  {
    eventType: "track_day",
    departmentName: "Engineering Workshop",
    items: [
      "Workshop bay available for participant vehicle repairs",
      "Basic tools and consumables stocked",
      "Qualified mechanic on standby",
    ],
  },
  {
    eventType: "track_day",
    departmentName: "ICT",
    items: [
      "Lap timing system installed and tested",
      "Timing screens at pit lane wall operational",
      "PA system for session announcements working",
    ],
  },
  {
    eventType: "track_day",
    departmentName: "Facility Management Cleaning & Logistics",
    items: [
      "Pit garages allocated and cleaned before participant arrival",
      "Fuel storage area designated and marked",
      "Post-event pit lane clean-up completed",
    ],
  },

  // ── Exhibition ────────────────────────────────────────────────────────────
  {
    eventType: "exhibition",
    departmentName: "Marketing",
    items: [
      "Exhibition layout and floor plan approved",
      "Exhibitor signage and fascia boards installed",
      "Directional wayfinding throughout venue",
      "Social media campaign activated on event day",
    ],
  },
  {
    eventType: "exhibition",
    departmentName: "Media & Public Relations",
    items: [
      "Press invitations sent and RSVP list confirmed",
      "Media kit prepared and distributed",
      "Photography coverage arranged",
    ],
  },
  {
    eventType: "exhibition",
    departmentName: "Retail & Corporate Sales",
    items: [
      "Sales team briefed on exhibitor and visitor targets",
      "Point of sale materials at key locations",
      "Leads capture system in place",
    ],
  },
  {
    eventType: "exhibition",
    departmentName: "ICT",
    items: [
      "Exhibitor Wi-Fi zones configured",
      "AV presentation screens at main stage",
      "Lead scanning system or badge readers deployed",
    ],
  },
  {
    eventType: "exhibition",
    departmentName: "Facility Management Cleaning & Logistics",
    items: [
      "Venue dressed before exhibitor build-up",
      "Loading bay access managed throughout build and breakdown",
      "Waste management throughout event hours",
    ],
  },
  {
    eventType: "exhibition",
    departmentName: "Safety & Security",
    items: [
      "Crowd management plan in place for peak visitor hours",
      "Fire exits clear and signage visible",
      "Security staff at all entry points",
    ],
  },
  {
    eventType: "exhibition",
    departmentName: "Activities",
    items: [
      "Interactive demonstration areas staffed",
      "Activity schedule published and visible to visitors",
    ],
  },

  // ── Conference ────────────────────────────────────────────────────────────
  {
    eventType: "conference",
    departmentName: "ICT",
    items: [
      "Main stage AV: projector/screen, microphones, and sound system tested",
      "Breakout room AV configured",
      "Delegate Wi-Fi network set up and tested",
      "Live streaming system operational if required",
      "Presentation laptops and clickers available at lectern",
    ],
  },
  {
    eventType: "conference",
    departmentName: "Food and Beverage",
    items: [
      "Morning coffee and pastries from 07:30",
      "Lunch service for all delegates",
      "Afternoon refreshment break",
      "Dietary requirements catered for",
    ],
  },
  {
    eventType: "conference",
    departmentName: "Safety & Security",
    items: [
      "Delegate registration and access control at main entry",
      "Security staff briefed on emergency procedures",
    ],
  },
  {
    eventType: "conference",
    departmentName: "Marketing",
    items: [
      "Event branding installed in main hall and registration area",
      "Delegate name badges printed and sorted",
      "Conference programme printed and at each seat",
    ],
  },
  {
    eventType: "conference",
    departmentName: "Facility Management AC/Mechanical & Landscaping",
    items: [
      "HVAC system set to conference temperature before delegate arrival",
      "Ventilation checked in all breakout rooms",
    ],
  },
  {
    eventType: "conference",
    departmentName: "Facility Management Cleaning & Logistics",
    items: [
      "Main hall and all rooms cleaned and dressed before delegate arrival",
      "Lectern, chairs, and tables arranged per floor plan",
      "Post-event breakdown and clean",
    ],
  },

  // ── Concert / Entertainment ───────────────────────────────────────────────
  {
    eventType: "concert_entertainment",
    departmentName: "Safety & Security",
    items: [
      "Crowd management plan for audience capacity",
      "Security at all venue entry and exit points",
      "Barrier system at stage front confirmed",
      "Medical team on site throughout",
      "Emergency evacuation plan distributed to all staff",
    ],
  },
  {
    eventType: "concert_entertainment",
    departmentName: "ICT",
    items: [
      "Stage PA and sound system tested with production team",
      "Stage lighting rig tested",
      "Backstage communications system operational",
    ],
  },
  {
    eventType: "concert_entertainment",
    departmentName: "Marketing",
    items: [
      "Event branding and sponsor logos installed",
      "Ticket scanning system operational at gates",
      "Social media live coverage team deployed",
    ],
  },
  {
    eventType: "concert_entertainment",
    departmentName: "Media & Public Relations",
    items: [
      "Press and photographer access passes issued",
      "Media pit area designated and managed",
      "Post-event press release prepared",
    ],
  },
  {
    eventType: "concert_entertainment",
    departmentName: "Facility Management Electrical & Special Electronics",
    items: [
      "Power supply for stage rig confirmed and load tested",
      "Generator backup on standby",
      "Electrical safety check signed off",
    ],
  },
  {
    eventType: "concert_entertainment",
    departmentName: "Food and Beverage",
    items: [
      "Concession stands operational before doors open",
      "Bar service throughout the event",
      "Artist hospitality rider fulfilled backstage",
    ],
  },
  {
    eventType: "concert_entertainment",
    departmentName: "Activities",
    items: [
      "Pre-show support acts scheduled and briefed",
      "Audience engagement activities confirmed",
    ],
  },

  // ── Off-Road Event ────────────────────────────────────────────────────────
  {
    eventType: "off_road_event",
    departmentName: "Off-Road",
    items: [
      "Off-road course inspected and route markers installed",
      "Spectator exclusion zones clearly marked",
      "Recovery vehicles positioned at key course sections",
      "Course officials briefed and deployed",
      "Timing checkpoints installed and tested",
    ],
  },
  {
    eventType: "off_road_event",
    departmentName: "Safety & Security",
    items: [
      "Driver and co-driver briefing completed",
      "Medical team on standby at service park and course",
      "Spectator safety barriers at crossing points",
    ],
  },
  {
    eventType: "off_road_event",
    departmentName: "Technical Operations",
    items: [
      "Vehicle scrutineering bay set up and staffed",
      "Fuel pumping area designated in service park",
      "Results board operational at service park",
    ],
  },
  {
    eventType: "off_road_event",
    departmentName: "Facility Management Cleaning & Logistics",
    items: [
      "Service park allocated and laid out",
      "Competitor entry and parking managed",
      "Post-event service park cleared",
    ],
  },
  {
    eventType: "off_road_event",
    departmentName: "ICT",
    items: [
      "Timing and tracking system for course operational",
      "Results display at service park",
      "Communication radios distributed to all marshals",
    ],
  },

  // ── Drag Event ────────────────────────────────────────────────────────────
  {
    eventType: "drag_event",
    departmentName: "Drag",
    items: [
      "Drag strip inspected and surface checked for debris",
      "Timing system (reaction, elapsed time, trap speed) tested",
      "Christmas tree starting system tested",
      "Burnout box water supply and surface prepared",
      "Staging lanes organised and marked",
      "Return road open and marshalled",
    ],
  },
  {
    eventType: "drag_event",
    departmentName: "Safety & Security",
    items: [
      "Spectator barriers and fencing at track perimeter checked",
      "Fire crew on standby at start line",
      "Medical officer at finish line",
      "Driver briefing — all participants sign waiver",
    ],
  },
  {
    eventType: "drag_event",
    departmentName: "Technical Operations",
    items: [
      "Vehicle safety inspection before first pass",
      "Track surface temperature monitoring",
      "Recovery vehicle on standby at finish end",
    ],
  },
  {
    eventType: "drag_event",
    departmentName: "Engineering Workshop",
    items: [
      "Workshop available for competitor use between rounds",
      "Compressed air supply at staging area",
    ],
  },
  {
    eventType: "drag_event",
    departmentName: "ICT",
    items: [
      "Scoreboard displaying live times operational",
      "PA system for announcements and results working",
    ],
  },

  // ── Private Event ─────────────────────────────────────────────────────────
  {
    eventType: "private_event",
    departmentName: "Food and Beverage",
    items: [
      "Menu confirmed with client at least 72 hours prior",
      "Dietary requirements catered for",
      "Service staff ratio: 1 per 15 guests",
      "Bar service as per client brief",
    ],
  },
  {
    eventType: "private_event",
    departmentName: "Safety & Security",
    items: [
      "Guest list access control at entry",
      "Security staff briefed on event profile",
      "First aid kit available on site",
    ],
  },
  {
    eventType: "private_event",
    departmentName: "Facility Management Cleaning & Logistics",
    items: [
      "Venue dressed per client brief before guests arrive",
      "Post-event full venue clean and restore",
    ],
  },
  {
    eventType: "private_event",
    departmentName: "Activities",
    items: [
      "Entertainment or activity programme agreed with client",
      "Facilitators and equipment on site 1 hour before guests arrive",
    ],
  },
];

async function main() {
  console.log("Seeding departments...");
  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const name = DEPARTMENTS[i];
    await prisma.department.upsert({
      where: { name },
      update: { sortOrder: i, isActive: true },
      create: { name, slug: slugify(name), sortOrder: i },
    });
  }
  console.log(`Seeded ${DEPARTMENTS.length} departments.`);

  console.log("Seeding requirement templates...");
  for (const t of REQUIREMENT_TEMPLATES) {
    await prisma.requirementTemplate.upsert({
      where: { eventType_departmentName: { eventType: t.eventType, departmentName: t.departmentName } },
      update: { items: t.items },
      create: t,
    });
  }
  console.log(`Seeded ${REQUIREMENT_TEMPLATES.length} requirement templates.`);

  // Bootstrap admin
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@bic.local").toLowerCase();
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME ?? "BIC Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Bootstrap admin already exists: ${email}`);
  } else {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        mustChangePassword: true,
        roles: { create: [{ role: "ADMIN" as RoleName }] },
      },
    });
    console.log("================================================");
    console.log("Bootstrap admin created. Save these credentials:");
    console.log(`  email:    ${user.email}`);
    console.log(`  password: ${tempPassword}`);
    console.log("You will be asked to change the password on first sign-in.");
    console.log("================================================");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
