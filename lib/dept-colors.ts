/** Department brand colors for card headers and PDF blocks. */
export const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  // ── Facility Management variants ────────────────────────────────────────────
  "Facility Management Cleaning & Logistics":            { bg: "#CC99FF", text: "#000000" },
  "Facility Management Electrical & Special Electronics":{ bg: "#CC99FF", text: "#000000" },
  "Facility Management AC/Mechanical & Landscaping":     { bg: "#CC99FF", text: "#000000" },
  "Facility Management Civil Works":                     { bg: "#CC99FF", text: "#000000" },
  "Facility Management":                                 { bg: "#CC99FF", text: "#000000" },

  // ── Food & Beverage ─────────────────────────────────────────────────────────
  "Food and Beverage":        { bg: "#99CCFF", text: "#000000" },
  "Food & Beverage":          { bg: "#99CCFF", text: "#000000" },

  // ── Operations & Activities ─────────────────────────────────────────────────
  "Activities":               { bg: "#0000FF", text: "#FFFFFF" },
  "Sporting":                 { bg: "#FF0000", text: "#FFFFFF" },
  "Drag":                     { bg: "#6AE040", text: "#000000" },
  "Engineering Workshop":     { bg: "#A80000", text: "#FFFFFF" },
  "Technical Operations":     { bg: "#FF9900", text: "#000000" },
  "Off-Road":                 { bg: "#66FFCC", text: "#000000" },
  "ICT":                      { bg: "#FFCC99", text: "#000000" },

  // ── Commercial ──────────────────────────────────────────────────────────────
  "Retail & Corporate Sales": { bg: "#C45911", text: "#FFFFFF" },

  // ── Marketing / Media ───────────────────────────────────────────────────────
  "Marketing":                { bg: "#FFFF00", text: "#000000" },
  "Media & Public Relations": { bg: "#FFFF00", text: "#000000" },
  "Marketing & PR":           { bg: "#FFFF00", text: "#000000" },

  // ── Other ───────────────────────────────────────────────────────────────────
  "Entertainment":            { bg: "#6600CC", text: "#FFFFFF" },
  "Logistics":                { bg: "#958A55", text: "#000000" },
  "Safety & Security":        { bg: "#00B050", text: "#FFFFFF" },
  "Miscellaneous":            { bg: "#C0C0C0", text: "#000000" },
  "Supplier":                 { bg: "#FF99CC", text: "#000000" },
};

/** Returns the color pair for a department name, or a neutral fallback. */
export function getDeptColor(name: string): { bg: string; text: string } {
  // Exact match first
  if (DEPT_COLORS[name]) return DEPT_COLORS[name];

  // Prefix match (covers "Facility Management *" variants not in the map)
  const prefix = Object.keys(DEPT_COLORS).find(
    (k) => name.startsWith(k) || k.startsWith(name),
  );
  if (prefix) return DEPT_COLORS[prefix]!;

  return { bg: "#F1F5F9", text: "#0F172A" };
}
