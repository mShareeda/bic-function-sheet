-- CreateTable: RequirementTemplate
-- Stores pre-canned requirement text per event type × department.
-- Used by the event creation wizard to pre-populate department fields.

CREATE TABLE "RequirementTemplate" (
    "id"             TEXT NOT NULL,
    "eventType"      TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "items"          TEXT[],

    CONSTRAINT "RequirementTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RequirementTemplate_eventType_departmentName_key"
    ON "RequirementTemplate"("eventType", "departmentName");

CREATE INDEX "RequirementTemplate_eventType_idx"
    ON "RequirementTemplate"("eventType");
