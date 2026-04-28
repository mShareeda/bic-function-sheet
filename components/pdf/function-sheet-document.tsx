import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 36, color: "#1a1a1a" },
  header: { marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#666" },
  vipBadge: { fontSize: 8, color: "#fff", backgroundColor: "#cc0000", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 6 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 2 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 130, color: "#555", fontFamily: "Helvetica-Bold" },
  value: { flex: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0f0f0", padding: 4, borderRadius: 2, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  tableRow: { flexDirection: "row", padding: "3 4", borderBottomWidth: 1, borderBottomColor: "#eee" },
  col1: { width: 24 },
  col2: { width: 80 },
  col3: { flex: 1 },
  col4: { width: 90 },
  col5: { width: 36 },
  deptBlock: { marginBottom: 10, borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 3 },
  deptTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", backgroundColor: "#f5f5f5", padding: "4 8" },
  reqItem: { padding: "4 8", borderBottomWidth: 1, borderBottomColor: "#eee" },
  reqDesc: { marginBottom: 2 },
  reqMeta: { fontSize: 8, color: "#888" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#999" },
});

type EventData = {
  title: string; status: string; eventDate: Date; confirmationReceived: Date | null;
  isVip: boolean; estimatedGuests: number | null; clientName: string | null; clientContact: string | null;
  salespersonName: string | null; maximizerNumber: string | null;
  coordinator: { displayName: string } | null;
  setupStart: Date; setupEnd: Date; liveStart: Date; liveEnd: Date;
  breakdownStart: Date; breakdownEnd: Date;
  agendaItems: {
    sequence: number; startTime: Date; endTime: Date; description: string;
    participants: number | null; venue: { name: string } | null; venueText: string | null;
  }[];
  departments: {
    department: { name: string };
    requirements: {
      id: string; description: string; priority: string | null;
      assignments: { user: { displayName: string } }[];
    }[];
  }[];
};

export function FunctionSheetDocument({ event }: { event: EventData }) {
  const generated = format(new Date(), "d MMM yyyy HH:mm");

  return (
    <Document title={`${event.title} - Function Sheet`} author="BIC Function Sheet">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>Bahrain International Circuit</Text>
          <Text style={styles.title}>Function Sheet</Text>
          <Text style={styles.subtitle}>{event.title}</Text>
          {event.isVip && <Text style={styles.vipBadge}>VIP / DIGNITARY</Text>}
        </View>

        {/* Event details */}
        <Text style={styles.sectionTitle}>Event Details</Text>
        {(
          [
            ["Event date", format(event.eventDate, "EEEE, d MMMM yyyy")],
            ["Status", event.status.replace(/_/g, " ")],
            ...(event.confirmationReceived ? [["Confirmation received", format(event.confirmationReceived, "d MMM yyyy")]] : []),
            ...(event.coordinator ? [["Coordinator", event.coordinator.displayName]] : []),
            ...(event.salespersonName ? [["Salesperson", event.salespersonName]] : []),
            ...(event.maximizerNumber ? [["Maximizer #", event.maximizerNumber]] : []),
            ...(event.clientName ? [["Client", event.clientName]] : []),
            ...(event.clientContact ? [["Client contact", event.clientContact]] : []),
            ...(event.estimatedGuests != null ? [["Estimated guests", String(event.estimatedGuests)]] : []),
          ] as [string, string][]
        ).map(([label, value], i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.label}>{label}:</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}

        {/* Schedule */}
        <Text style={styles.sectionTitle}>Schedule</Text>
        {(
          [
            ["Setup", event.setupStart, event.setupEnd],
            ["Live event", event.liveStart, event.liveEnd],
            ["Breakdown", event.breakdownStart, event.breakdownEnd],
          ] as [string, Date, Date][]
        ).map(([label, start, end]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}:</Text>
            <Text style={styles.value}>{format(start, "HH:mm")} – {format(end, "HH:mm")}</Text>
          </View>
        ))}

        {/* Agenda */}
        {event.agendaItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Agenda</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>#</Text>
              <Text style={styles.col2}>Time</Text>
              <Text style={styles.col3}>Description</Text>
              <Text style={styles.col4}>Venue</Text>
              <Text style={styles.col5}>Pax</Text>
            </View>
            {event.agendaItems.map((item) => (
              <View key={item.sequence} style={styles.tableRow}>
                <Text style={styles.col1}>{item.sequence}</Text>
                <Text style={styles.col2}>{format(item.startTime, "HH:mm")} – {format(item.endTime, "HH:mm")}</Text>
                <Text style={styles.col3}>{item.description}</Text>
                <Text style={styles.col4}>{item.venue?.name ?? item.venueText ?? ""}</Text>
                <Text style={styles.col5}>{item.participants ?? ""}</Text>
              </View>
            ))}
          </>
        )}

        {/* Department requirements */}
        {event.departments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Department Requirements</Text>
            {event.departments.map((ed) => (
              <View key={ed.department.name} style={styles.deptBlock}>
                <Text style={styles.deptTitle}>{ed.department.name}</Text>
                {ed.requirements.length === 0 ? (
                  <View style={styles.reqItem}><Text style={styles.reqMeta}>No requirements.</Text></View>
                ) : (
                  ed.requirements.map((req, i) => (
                    <View key={req.id} style={styles.reqItem}>
                      <Text style={styles.reqDesc}>{i + 1}. {req.description}</Text>
                      {req.priority && <Text style={styles.reqMeta}>Priority: {req.priority}</Text>}
                      {req.assignments.length > 0 && (
                        <Text style={styles.reqMeta}>
                          Assigned: {req.assignments.map((a) => a.user.displayName).join(", ")}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>BIC Function Sheet — Confidential</Text>
          <Text>Generated: {generated}</Text>
        </View>
      </Page>
    </Document>
  );
}
