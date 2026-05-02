import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { getDeptColor } from "@/lib/dept-colors";

const COLORS = {
  ink: "#0F172A",
  body: "#1E293B",
  muted: "#64748B",
  faint: "#94A3B8",
  rule: "#E2E8F0",
  surface: "#F8FAFC",
  primary: "#B91C1C",
  primaryFaint: "#FEE2E2",
  vip: "#D97706",
  vipDark: "#92400E",
  vipFaint: "#FEF3C7",
  vipBorder: "#F59E0B",
  live: "#16A34A",
  accent: "#F59E0B",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    padding: 36,
    color: COLORS.body,
    lineHeight: 1.4,
  },

  // Header band
  headerBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 10,
    marginBottom: 14,
  },
  headerBandVip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 4,
    borderBottomColor: COLORS.vipBorder,
    paddingBottom: 10,
    marginBottom: 4,
    backgroundColor: COLORS.vipFaint,
    paddingTop: 6,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    marginTop: -8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  vipRibbon: {
    backgroundColor: COLORS.vip,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: "center",
    paddingVertical: 5,
    marginBottom: 12,
    borderRadius: 3,
  },
  brandLine: { fontSize: 8, color: COLORS.muted, letterSpacing: 1.2 },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginTop: 2,
  },
  eventTitle: { fontSize: 11, color: COLORS.body, marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  badgeRow: { flexDirection: "row", gap: 4, marginTop: 4 },
  vipBadge: {
    fontSize: 8,
    color: "#fff",
    backgroundColor: COLORS.vip,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  statusBadge: {
    fontSize: 7,
    color: "#fff",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  generated: { fontSize: 7, color: COLORS.faint, marginTop: 6 },

  // Section
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },

  // Two-column key/value grid
  kvGrid: { flexDirection: "row", flexWrap: "wrap" },
  kvCell: { width: "50%", paddingRight: 8, marginBottom: 5 },
  kvLabel: {
    fontSize: 7.5,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  kvValue: { fontSize: 9.5, color: COLORS.ink },
  kvValueBold: { fontSize: 9.5, color: COLORS.ink, fontFamily: "Helvetica-Bold" },

  // Schedule windows
  windowsRow: { flexDirection: "row", gap: 8 },
  windowCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 4,
    padding: 8,
  },
  windowLabel: {
    fontSize: 7.5,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  windowTime: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  windowDate: { fontSize: 7.5, color: COLORS.muted, marginTop: 2 },

  // Tables
  th: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    padding: "5 6",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  thText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tr: {
    flexDirection: "row",
    padding: "6 6",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  trAlt: {
    flexDirection: "row",
    padding: "6 6",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    backgroundColor: "#FAFAFA",
  },
  agendaCol1: { width: 22, fontFamily: "Helvetica-Bold" },
  agendaCol2: { width: 92 },
  agendaCol3: { flex: 1, paddingRight: 6 },
  agendaCol4: { width: 110 },

  // Department blocks
  deptBlock: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 4,
    overflow: "hidden",
  },
  deptHeader: {
    backgroundColor: COLORS.surface,
    padding: "7 10",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deptName: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  deptCount: { fontSize: 8, color: COLORS.muted },
  reqItem: {
    padding: "8 10",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  reqHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  reqIndex: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.muted,
  },
  reqDesc: { fontSize: 9.5, color: COLORS.body, lineHeight: 1.45 },
  reqMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  pill: {
    fontSize: 7.5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    color: COLORS.body,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.rule,
  },
  pillBold: {
    fontSize: 7.5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    color: "#fff",
    backgroundColor: COLORS.primary,
    fontFamily: "Helvetica-Bold",
  },
  noteBlock: {
    marginTop: 5,
    padding: 6,
    backgroundColor: "#FFFBEB",
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    borderRadius: 2,
  },
  noteAuthor: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  noteBody: { fontSize: 8.5, color: COLORS.body, marginTop: 1 },
  emptyDept: {
    padding: "8 10",
    fontSize: 8.5,
    color: COLORS.faint,
    fontStyle: "italic",
  },

  // Cover page
  coverPage: {
    fontFamily: "Helvetica",
    padding: 0,
    backgroundColor: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  coverTop: {
    width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: 32,
    alignItems: "center",
  },
  coverTopVip: {
    width: "100%",
    backgroundColor: COLORS.vipDark,
    paddingVertical: 32,
    alignItems: "center",
  },
  coverLogo: { width: 100, height: 100, objectFit: "contain" },
  coverLogoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverBrand: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 2,
    marginTop: 14,
    fontFamily: "Helvetica-Bold",
  },
  coverDocType: {
    fontSize: 20,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    marginTop: 4,
  },
  coverBody: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 48,
    paddingVertical: 36,
    alignItems: "center",
  },
  coverVipRibbon: {
    width: "100%",
    backgroundColor: COLORS.vip,
    paddingVertical: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  coverVipText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
  },
  coverEventTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    textAlign: "center",
    lineHeight: 1.3,
    marginBottom: 8,
  },
  coverClient: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: 32,
  },
  coverDivider: {
    width: 48,
    height: 3,
    backgroundColor: COLORS.primary,
    marginBottom: 28,
    borderRadius: 2,
  },
  coverDividerVip: {
    width: 48,
    height: 3,
    backgroundColor: COLORS.vipBorder,
    marginBottom: 28,
    borderRadius: 2,
  },
  coverGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 28,
  },
  coverCell: {
    width: "50%",
    padding: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.rule,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  coverCellLabel: {
    fontSize: 7,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  coverCellValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.3,
  },
  coverCellSub: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 1,
  },
  coverCoordinator: {
    fontSize: 10,
    color: COLORS.body,
    textAlign: "center",
    marginBottom: 4,
  },
  coverFooter: {
    width: "100%",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.rule,
    paddingTop: 12,
    paddingHorizontal: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingBottom: 24,
  },
  coverFooterText: { fontSize: 7.5, color: COLORS.faint },
  coverConfidential: {
    fontSize: 7.5,
    color: COLORS.primary,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLORS.faint,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.rule,
  },
  pageNumber: { fontSize: 7.5, color: COLORS.faint },
});

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PROVISIONAL_FUNCTION_SHEET_SENT: "Provisional",
  FUNCTION_SHEET_SENT: "Sheet sent",
  IN_SETUP: "In setup",
  LIVE: "Live",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

type EventData = {
  title: string;
  status: string;
  eventDate: Date;
  confirmationReceived: Date | null;
  isVip: boolean;
  estimatedGuests: number | null;
  clientName: string | null;
  clientContact: string | null;
  salespersonName: string | null;
  maximizerNumber: string | null;
  coordinator: { displayName: string } | null;
  setupStart: Date;
  setupEnd: Date;
  liveStart: Date;
  liveEnd: Date;
  breakdownStart: Date;
  breakdownEnd: Date;
  agendaItems: {
    sequence: number;
    startTime: Date;
    endTime: Date;
    description: string;
    venue: { name: string } | null;
    venueText: string | null;
  }[];
  departments: {
    department: { name: string };
    requirements: {
      id: string;
      description: string;
      priority: string | null;
      assignments: { user: { displayName: string } }[];
      managerNotes?: {
        id: string;
        body: string;
        author: { displayName: string };
        createdAt: Date;
      }[];
    }[];
  }[];
};

function KV({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.kvCell}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={bold ? styles.kvValueBold : styles.kvValue}>{value}</Text>
    </View>
  );
}

export function FunctionSheetDocument({
  event,
  logoSrc = "",
  isProvisional = false,
}: {
  event: EventData;
  logoSrc?: string;
  isProvisional?: boolean;
}) {
  const generated = format(new Date(), "d MMM yyyy HH:mm");
  const totalReqs = event.departments.reduce(
    (n, d) => n + d.requirements.length,
    0,
  );
  const docTypeLabel = isProvisional ? "PROVISIONAL FUNCTION SHEET" : "FUNCTION SHEET";

  return (
    <Document
      title={`${event.title} - ${isProvisional ? "Provisional " : ""}Function Sheet`}
      author="BIC Function Sheet"
    >
      {/* ── Cover page ── */}
      <Page size="A4" style={styles.coverPage}>
        {/* Top band with logo */}
        <View style={event.isVip ? styles.coverTopVip : styles.coverTop}>
          {logoSrc ? (
            <Image src={logoSrc} style={styles.coverLogo} />
          ) : (
            <View style={styles.coverLogoPlaceholder} />
          )}
          <Text style={styles.coverBrand}>BAHRAIN INTERNATIONAL CIRCUIT</Text>
          <Text style={styles.coverDocType}>{docTypeLabel}</Text>
        </View>

        {/* VIP ribbon */}
        {event.isVip && (
          <View style={styles.coverVipRibbon}>
            <Text style={styles.coverVipText}>
              ★  VIP / DIGNITARY EVENT — ELEVATED PROTOCOL  ★
            </Text>
          </View>
        )}

        {/* Cover body */}
        <View style={styles.coverBody}>
          {/* Provisional warning */}
          {isProvisional && (
            <View
              style={{
                width: "100%",
                backgroundColor: "#FEF3C7",
                borderWidth: 1,
                borderColor: "#F59E0B",
                borderRadius: 4,
                padding: 10,
                marginBottom: 18,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#92400E", letterSpacing: 0.5, textTransform: "uppercase" }}>
                ⚠ Provisional — subject to change
              </Text>
              <Text style={{ fontSize: 8, color: "#78350F", marginTop: 3, textAlign: "center" }}>
                This is a preliminary function sheet. A confirmed version will follow.
              </Text>
            </View>
          )}
          <Text style={styles.coverEventTitle}>{event.title}</Text>

          <View style={event.isVip ? styles.coverDividerVip : styles.coverDivider} />

          {/* Key dates grid */}
          <View style={styles.coverGrid}>
            <View style={styles.coverCell}>
              <Text style={styles.coverCellLabel}>Event Date</Text>
              <Text style={styles.coverCellValue}>
                {format(event.eventDate, "EEEE, d MMMM yyyy")}
              </Text>
              <Text style={styles.coverCellSub}>
                {format(event.eventDate, "HH:mm")}
              </Text>
            </View>
            <View style={[styles.coverCell, { borderRightWidth: 0 }]}>
              <Text style={styles.coverCellLabel}>Setup Window</Text>
              <Text style={styles.coverCellValue}>
                {format(event.setupStart, "d MMM, HH:mm")} →{" "}
                {format(event.setupEnd, "HH:mm")}
              </Text>
              <Text style={styles.coverCellSub}>
                {format(event.setupEnd, "d MMM yyyy") !== format(event.setupStart, "d MMM yyyy")
                  ? `ends ${format(event.setupEnd, "d MMM")}`
                  : ""}
              </Text>
            </View>
            <View style={[styles.coverCell, { borderBottomWidth: 0 }]}>
              <Text style={styles.coverCellLabel}>Live Event</Text>
              <Text style={styles.coverCellValue}>
                {format(event.liveStart, "d MMM, HH:mm")} →{" "}
                {format(event.liveEnd, "HH:mm")}
              </Text>
              <Text style={styles.coverCellSub}>
                {format(event.liveEnd, "d MMM yyyy") !== format(event.liveStart, "d MMM yyyy")
                  ? `ends ${format(event.liveEnd, "d MMM")}`
                  : ""}
              </Text>
            </View>
            <View style={[styles.coverCell, { borderRightWidth: 0, borderBottomWidth: 0 }]}>
              <Text style={styles.coverCellLabel}>Breakdown Window</Text>
              <Text style={styles.coverCellValue}>
                {format(event.breakdownStart, "d MMM, HH:mm")} →{" "}
                {format(event.breakdownEnd, "HH:mm")}
              </Text>
              <Text style={styles.coverCellSub}>
                {format(event.breakdownEnd, "d MMM yyyy") !== format(event.breakdownStart, "d MMM yyyy")
                  ? `ends ${format(event.breakdownEnd, "d MMM")}`
                  : ""}
              </Text>
            </View>
          </View>

          {event.coordinator && (
            <Text style={styles.coverCoordinator}>
              Coordinator: {event.coordinator.displayName}
            </Text>
          )}
          <Text style={[styles.coverCellLabel, { textAlign: "center", marginTop: 4 }]}>
            {event.departments.length} dept · {totalReqs} req · Status:{" "}
            {STATUS_LABEL[event.status] ?? event.status}
          </Text>
        </View>

        {/* Cover footer */}
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>Generated {generated}</Text>
          <Text style={styles.coverConfidential}>CONFIDENTIAL</Text>
        </View>
      </Page>

      {/* ── Main content page(s) ── */}
      <Page size="A4" style={styles.page}>
        {/* ── Header band (VIP gets a tinted band + thicker gold rule) ── */}
        <View
          style={event.isVip ? styles.headerBandVip : styles.headerBand}
          fixed
        >
          <View>
            <Text style={styles.brandLine}>BAHRAIN INTERNATIONAL CIRCUIT</Text>
            <Text style={styles.docTitle}>
              {isProvisional ? "Provisional Function Sheet" : "Function Sheet"}
            </Text>
            <Text style={styles.eventTitle}>{event.title}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.badgeRow}>
              {event.isVip && (
                <Text style={styles.vipBadge}>★ VIP / DIGNITARY</Text>
              )}
              <Text style={styles.statusBadge}>
                {(STATUS_LABEL[event.status] ?? event.status).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.generated}>Generated {generated}</Text>
          </View>
        </View>

        {event.isVip && (
          <Text style={styles.vipRibbon}>
            ★  VIP / DIGNITARY EVENT — HANDLE WITH ELEVATED PROTOCOL  ★
          </Text>
        )}

        {/* ── Event details ── */}
        <Text style={styles.sectionTitle}>Event Details</Text>
        <View style={styles.kvGrid}>
          <KV
            label="Event Date"
            value={format(event.eventDate, "EEEE, d MMMM yyyy 'at' HH:mm")}
            bold
          />
          <KV
            label="Confirmation Received"
            value={
              event.confirmationReceived
                ? format(event.confirmationReceived, "d MMM yyyy 'at' HH:mm")
                : "—"
            }
          />
          <KV
            label="Coordinator"
            value={event.coordinator?.displayName ?? "Unassigned"}
          />
          <KV label="Salesperson" value={event.salespersonName ?? "—"} />
          <KV label="Maximizer #" value={event.maximizerNumber ?? "—"} />
          <KV
            label="Estimated Guests"
            value={
              event.estimatedGuests != null
                ? String(event.estimatedGuests)
                : "—"
            }
          />
          <KV
            label="VIP / Dignitary"
            value={event.isVip ? "★ Yes — VIP" : "No"}
            bold={event.isVip}
          />
          <KV
            label="Status"
            value={STATUS_LABEL[event.status] ?? event.status}
          />
        </View>

        {/* ── Schedule ── */}
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.windowsRow}>
          {(
            [
              ["Setup", event.setupStart, event.setupEnd],
              ["Live Event", event.liveStart, event.liveEnd],
              ["Breakdown", event.breakdownStart, event.breakdownEnd],
            ] as [string, Date, Date][]
          ).map(([label, start, end]) => (
            <View key={label} style={styles.windowCard}>
              <Text style={styles.windowLabel}>{label}</Text>
              <Text style={styles.windowTime}>
                {format(start, "HH:mm")} → {format(end, "HH:mm")}
              </Text>
              <Text style={styles.windowDate}>
                {format(start, "d MMM")}
                {format(start, "yyyy-MM-dd") !== format(end, "yyyy-MM-dd") &&
                  ` → ${format(end, "d MMM")}`}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Agenda ── */}
        {event.agendaItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Agenda ({event.agendaItems.length})
            </Text>
            <View style={styles.th}>
              <Text style={[styles.thText, styles.agendaCol1]}>#</Text>
              <Text style={[styles.thText, styles.agendaCol2]}>Time</Text>
              <Text style={[styles.thText, styles.agendaCol3]}>Description</Text>
              <Text style={[styles.thText, styles.agendaCol4]}>Venue</Text>
            </View>
            {event.agendaItems.map((item, i) => (
              <View
                key={item.sequence}
                style={i % 2 === 1 ? styles.trAlt : styles.tr}
                wrap={false}
              >
                <Text style={styles.agendaCol1}>{item.sequence}</Text>
                <Text style={styles.agendaCol2}>
                  {format(item.startTime, "HH:mm")} –{" "}
                  {format(item.endTime, "HH:mm")}
                </Text>
                <Text style={styles.agendaCol3}>{item.description}</Text>
                <Text style={styles.agendaCol4}>
                  {item.venue?.name ?? item.venueText ?? "—"}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── Department requirements ── */}
        {event.departments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Department Requirements ({event.departments.length} dept ·{" "}
              {totalReqs} req)
            </Text>
            {event.departments.map((ed) => {
              const dColor = getDeptColor(ed.department.name);
              return (
              <View
                key={ed.department.name}
                style={styles.deptBlock}
                wrap={false}
              >
                <View style={[styles.deptHeader, { backgroundColor: dColor.bg }]}>
                  <Text style={[styles.deptName, { color: dColor.text }]}>{ed.department.name}</Text>
                  <Text style={[styles.deptCount, { color: dColor.text, opacity: 0.75 }]}>
                    {ed.requirements.length}{" "}
                    {ed.requirements.length === 1
                      ? "requirement"
                      : "requirements"}
                  </Text>
                </View>
                {ed.requirements.length === 0 ? (
                  <Text style={styles.emptyDept}>
                    No requirements specified.
                  </Text>
                ) : (
                  ed.requirements.map((req, i) => (
                    <View key={req.id} style={styles.reqItem}>
                      <View style={styles.reqHead}>
                        <Text style={styles.reqIndex}>#{i + 1}</Text>
                      </View>
                      <Text style={styles.reqDesc}>{req.description}</Text>
                      <View style={styles.reqMetaRow}>
                        {req.priority && (
                          <Text style={styles.pillBold}>
                            {req.priority.toUpperCase()}
                          </Text>
                        )}
                        {req.assignments.length > 0 && (
                          <Text style={styles.pill}>
                            Assigned:{" "}
                            {req.assignments
                              .map((a) => a.user.displayName)
                              .join(", ")}
                          </Text>
                        )}
                        {req.assignments.length === 0 && (
                          <Text style={styles.pill}>Unassigned</Text>
                        )}
                      </View>
                      {(req.managerNotes ?? []).map((n) => (
                        <View key={n.id} style={styles.noteBlock}>
                          <Text style={styles.noteAuthor}>
                            {n.author.displayName} ·{" "}
                            {format(n.createdAt, "d MMM HH:mm")}
                          </Text>
                          <Text style={styles.noteBody}>{n.body}</Text>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </View>
              );
            })}
          </>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text>
            BIC Function Sheet · {event.title}
            {event.isVip ? " · ★ VIP" : ""} · Confidential
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
