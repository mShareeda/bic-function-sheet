-- Enforce exactly-one-FK rule at the database level.
-- num_nonnulls() returns the count of non-null arguments; we require exactly 1
-- (either eventId or requirementId, never both and never neither).
ALTER TABLE "Attachment"
  ADD CONSTRAINT "attachment_exactly_one_fk_check"
  CHECK (num_nonnulls("eventId", "requirementId") = 1);
