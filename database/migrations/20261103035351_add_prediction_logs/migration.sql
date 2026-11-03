-- CreateTable
CREATE TABLE "prediction_logs" (
    "id" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "doctorId" TEXT,
    "department" TEXT,
    "targetDate" TIMESTAMP(3),
    "forecastPeriod" TEXT,
    "predictionResult" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "algorithmVersion" TEXT NOT NULL DEFAULT 'v1.0-statistical-baseline',
    "isCached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prediction_logs_predictionType_doctorId_idx" ON "prediction_logs"("predictionType", "doctorId");

-- CreateIndex
CREATE INDEX "prediction_logs_predictionType_department_idx" ON "prediction_logs"("predictionType", "department");

-- CreateIndex
CREATE INDEX "prediction_logs_createdAt_idx" ON "prediction_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "prediction_logs" ADD CONSTRAINT "prediction_logs_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
