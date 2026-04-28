import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { FunctionSheetDocument } from "@/components/pdf/function-sheet-document";
import React, { type ReactElement } from "react";

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

  const element = React.createElement(FunctionSheetDocument, { event }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
