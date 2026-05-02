/** Department brand colors for card headers and PDF blocks. */
export const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  "Facility Management":     { bg: "#CC99FF", text: "#000000" },
  "Food & Beverage":         { bg: "#99CCFF", text: "#000000" },
  "Activities":              { bg: "#0000FF", text: "#FFFFFF" },
  "Sporting":                { bg: "#FF0000", text: "#FFFFFF" },
  "Drag":                    { bg: "#6AE040", text: "#000000" },
  "Engineering Workshop":    { bg: "#A80000", text: "#FFFFFF" },
  "Technical Operations":    { bg: "#FF9900", text: "#000000" },
  "Off-Road":                { bg: "#66FFCC", text: "#000000" },
  "ICT":                     { bg: "#FFCC99", text: "#000000" },
  "Retail & Corporate Sales":{ bg: "#C45911", text: "#FFFFFF" },
  "Miscellaneous":           { bg: "#C0C0C0", text: "#000000" },
  "Supplier":                { bg: "#FF99CC", text: "#000000" },
  "Marketing & PR":          { bg: "#FFFF00", text: "#000000" },
  "Entertainment":           { bg: "#6600CC", text: "#FFFFFF" },
  "Logistics":               { bg: "#958A55", text: "#FFFFFF" },
  "Safety & Security":       { bg: "#00B050", text: "#FFFFFF" },
};

/** Returns the color pair for a department name, or a neutral fallback. */
export function getDeptColor(name: string): { bg: string; text: string } {
  return DEPT_COLORS[name] ?? { bg: "#F1F5F9", text: "#0F172A" };
}
