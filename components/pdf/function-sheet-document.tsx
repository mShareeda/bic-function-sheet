import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";

const COLORS = {
  ink: "#0F172A",
  body: "#1E293B",
  muted: "#64748B",
  faint: "#94A3B8",
  rule: "#E2E8F0",
  surface: "#F8FAFC",
  primary: "#B91C1C",
  primaryFaint: "#FEE2E2",
  vip: "#CC0000",
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
    fontSize: 7,
    color: "#fff",
    backgroundColor: COLORS.vip,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
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

export function FunctionSheetDocument({ event }: { event: EventData }) {
  const generated = format(new Date(), "d MMM yyyy HH:mm");
  const totalReqs = event.departments.reduce(
    (n, d) => n + d.requirements.length,
    0,
  );

  return (
    <Document
      title={`${event.title} - Function Sheet`}
      author="BIC Function Sheet"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header band ── */}
        <View style={styles.headerBand} fixed>
          <View>
            <Text style={styles.brandLine}>BAHRAIN INTERNATIONAL CIRCUIT</Text>
            <Text style={styles.docTitle}>Function Sheet</Text>
            <Text style={styles.eventTitle}>{event.title}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.badgeRow}>
              {event.isVip && <Text style={styles.vipBadge}>VIP</Text>}
              <Text style={styles.statusBadge}>
                {(STATUS_LABEL[event.status] ?? event.status).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.generated}>Generated {generated}</Text>
          </View>
        </View>

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
          <KV label="Client Name" value={event.clientName ?? "—"} />
          <KV label="Client Contact" value={event.clientContact ?? "—"} />
          <KV label="VIP / Dignitary" value={event.isVip ? "Yes" : "No"} />
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
            {event.departments.map((ed) => (
              <View
                key={ed.department.name}
                style={styles.deptBlock}
                wrap={false}
              >
                <View style={styles.deptHeader}>
                  <Text style={styles.deptName}>{ed.department.name}</Text>
                  <Text style={styles.deptCount}>
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
            ))}
          </>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text>BIC Function Sheet · {event.title} · Confidential</Text>
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
