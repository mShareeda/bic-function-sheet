import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import { FunctionSheetDocument } from "@/components/pdf/function-sheet-document";
import React, { type ReactElement } from "react";

function loadLogoBase64(): string {
  try {
    const buf = readFileSync(join(process.cwd(), "public", "bic-logo.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

export async function renderFunctionSheetPdf(eventId: string): Promise<Buffer> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      coordinator: { select: { displayName: true } },
      agendaItems: { include: { venue: true }, orderBy: { sequence: "asc" } },
      departments: {
        include: {
          department: true,
          requirements: {
            include: {
              assignments: {
                include: { user: { select: { displayName: true } } },
              },
              managerNotes: {
                include: { author: { select: { displayName: true } } },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { department: { sortOrder: "asc" } },
      },
    },
  });

  if (!event) throw new Error("Event not found");

  const logoSrc = loadLogoBase64();
  const isProvisional = event.status === "PROVISIONAL_FUNCTION_SHEET_SENT";
  const element = React.createElement(FunctionSheetDocument, { event, logoSrc, isProvisional }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
