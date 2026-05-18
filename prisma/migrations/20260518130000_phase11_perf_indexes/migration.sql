-- CreateIndex
CREATE INDEX "Booking_hotelId_idx" ON "Booking"("hotelId");

-- CreateIndex
CREATE INDEX "Booking_checkIn_idx" ON "Booking"("checkIn");

-- CreateIndex
CREATE INDEX "Transaction_companyId_occurredAt_idx" ON "Transaction"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_createdById_idx" ON "Transaction"("createdById");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");
