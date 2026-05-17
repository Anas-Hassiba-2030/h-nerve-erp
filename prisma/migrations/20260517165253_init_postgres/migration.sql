-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "companyId" TEXT,
    "title" TEXT,
    "avatarColor" TEXT NOT NULL DEFAULT 'emerald',
    "rank" TEXT NOT NULL DEFAULT 'PAWN',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "bonusPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'JO',
    "city" TEXT,
    "foundedYear" INTEGER,
    "employees" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT 'emerald',
    "ticker" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'JO',
    "tier" TEXT NOT NULL DEFAULT 'BUSINESS',
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "starRating" INTEGER NOT NULL DEFAULT 4,
    "baselineADR" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "roomType" TEXT NOT NULL DEFAULT 'STANDARD',
    "rooms" INTEGER NOT NULL DEFAULT 1,
    "guests" INTEGER NOT NULL DEFAULT 2,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyBatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "productAr" TEXT NOT NULL,
    "quantityLiters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityGrade" TEXT NOT NULL DEFAULT 'A',
    "fatContent" DOUBLE PRECISION NOT NULL DEFAULT 3.5,
    "productionDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PRODUCTION',
    "destination" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "areaDunum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tempC" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "soilMoisture" DOUBLE PRECISION,
    "alertLevel" TEXT NOT NULL DEFAULT 'OK',
    "lastReadAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variety" TEXT,
    "plantedAt" TIMESTAMP(3) NOT NULL,
    "expectedHarvest" TIMESTAMP(3) NOT NULL,
    "expectedYieldKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualYieldKg" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'GROWING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "founder" TEXT NOT NULL,
    "vertical" TEXT NOT NULL DEFAULT 'OTHER',
    "stage" TEXT NOT NULL DEFAULT 'INTAKE',
    "cohort" TEXT NOT NULL DEFAULT '2026',
    "fundingJod" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyForecast" (
    "id" TEXT NOT NULL,
    "sourceCompanyId" TEXT NOT NULL,
    "targetCompanyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "productLabel" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "predictedDemand" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "signal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplyForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JOD',
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'CORE',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "module" TEXT NOT NULL DEFAULT 'GENERAL',
    "points" INTEGER NOT NULL DEFAULT 10,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "icon" TEXT NOT NULL DEFAULT 'Trophy',
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FutureProject" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'IDEA',
    "budgetJod" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "startQuarter" TEXT,
    "targetQuarter" TEXT,
    "kpis" TEXT,
    "ownerName" TEXT,
    "progressPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FutureProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketStock" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelAr" TEXT,
    "exchange" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "changePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "companyId" TEXT,
    "region" TEXT NOT NULL DEFAULT 'MENA',
    "history" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SustainabilityScore" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "environmentalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "socialScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "governanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overall" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbonTons" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterCubicM" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "renewablePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SustainabilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'WARN',
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scopeCompanyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cooldownHours" INTEGER NOT NULL DEFAULT 24,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DIRECT',
    "entityType" TEXT,
    "entityId" TEXT,
    "title" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelEn" TEXT,
    "href" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "summaryEn" TEXT,
    "meta" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "module" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Digest" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "body" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "insightCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Digest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainNode" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "label" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainEdge" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'structural',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilSession" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "contextRefs" TEXT NOT NULL DEFAULT '[]',
    "recommendation" TEXT,
    "confidence" DOUBLE PRECISION,
    "dissentNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "usedLiveLlm" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilVoice" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "speakerLabelAr" TEXT NOT NULL,
    "speakerLabelEn" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "thesis" TEXT NOT NULL,
    "evidenceJson" TEXT NOT NULL DEFAULT '[]',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "llmModel" TEXT,
    "isStub" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilVoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Narrative" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "topic" TEXT NOT NULL,
    "register" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "factsHash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "model" TEXT,
    "isStub" BOOLEAN NOT NULL DEFAULT false,
    "ms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Narrative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "goalEn" TEXT,
    "rationale" TEXT,
    "rationaleEn" TEXT,
    "targetMetric" TEXT NOT NULL,
    "targetDelta" DOUBLE PRECISION NOT NULL,
    "targetDeadline" TIMESTAMP(3) NOT NULL,
    "projectedDelta" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "rollbackCondition" TEXT,
    "rollbackConditionEn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceInsightId" TEXT,
    "sourceCouncilSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "committedById" TEXT,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanStep" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actionEn" TEXT,
    "ownerRole" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 7,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PlanStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "module" TEXT NOT NULL,
    "headlineAr" TEXT NOT NULL,
    "headlineEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "lessonAr" TEXT,
    "lessonEn" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "entityRefsJson" TEXT NOT NULL DEFAULT '[]',
    "outcomeMetric" TEXT,
    "outcomeDelta" DOUBLE PRECISION,
    "vectorJson" TEXT NOT NULL DEFAULT '[]',
    "vectorVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainFeedback" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "targetRef" TEXT NOT NULL,
    "targetType" TEXT,
    "module" TEXT,
    "category" TEXT,
    "signalDelta" DOUBLE PRECISION,
    "note" TEXT,
    "metadataJson" TEXT,

    CONSTRAINT "BrainFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainPattern" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "statementEn" TEXT NOT NULL,
    "statementAr" TEXT,
    "ruleJson" TEXT NOT NULL DEFAULT '{}',
    "kindsJson" TEXT NOT NULL DEFAULT '[]',
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "module" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ENABLED',
    "authoredBy" TEXT NOT NULL DEFAULT 'auto',
    "firstObservedAt" TIMESTAMP(3) NOT NULL,
    "lastObservedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FederationOptIn" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "status" TEXT NOT NULL DEFAULT 'DISABLED',
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "agreedAt" TIMESTAMP(3),
    "agreedById" TEXT,
    "shareModules" TEXT NOT NULL DEFAULT '[]',
    "budgetUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetMax" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FederationOptIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FederationPeer" (
    "id" TEXT NOT NULL,
    "peerToken" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "contributionsJson" TEXT NOT NULL DEFAULT '[]',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FederationPeer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FederationPattern" (
    "id" TEXT NOT NULL,
    "clusterKey" TEXT NOT NULL,
    "statementEn" TEXT NOT NULL,
    "statementAr" TEXT,
    "tierJson" TEXT NOT NULL DEFAULT '{}',
    "module" TEXT,
    "category" TEXT,
    "peerCount" INTEGER NOT NULL,
    "averageDelta" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "kAnonymity" INTEGER NOT NULL DEFAULT 5,
    "noiseEpsilon" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "visibleTo" TEXT NOT NULL DEFAULT 'default',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FederationPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainIQHistory" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "snappedAt" TIMESTAMP(3) NOT NULL,
    "iq" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "decisionVelocity" DOUBLE PRECISION NOT NULL,
    "outcomeQuality" DOUBLE PRECISION NOT NULL,
    "userTrust" DOUBLE PRECISION NOT NULL,
    "drivenBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainIQHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainWeight" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "target" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'default',
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfTuningReport" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "observationsJson" TEXT NOT NULL DEFAULT '[]',
    "proposedAdjustmentsJson" TEXT NOT NULL DEFAULT '[]',
    "editorialEn" TEXT,
    "editorialAr" TEXT,
    "iqBefore" INTEGER NOT NULL,
    "iqAfterIfApplied" INTEGER NOT NULL,
    "iqAfterApplied" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewerNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelfTuningReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'MENA',
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "status" TEXT NOT NULL DEFAULT 'PROVISIONING',
    "inviteToken" TEXT,
    "seededCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "TenantStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantTheme" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "preset" TEXT NOT NULL DEFAULT 'heritage',
    "paletteJson" TEXT NOT NULL DEFAULT '{}',
    "emblem" TEXT NOT NULL DEFAULT '◆',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPack" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TenantPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowNode" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "label" TEXT,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "posX" DOUBLE PRECISION,
    "posY" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEdge" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,

    CONSTRAINT "WorkflowEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "traceJson" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "providerKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "scopesJson" TEXT NOT NULL DEFAULT '[]',
    "account" TEXT,
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    "connectedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "tokenBlob" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payloadDigest" TEXT,
    "ms" INTEGER,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "kind" TEXT NOT NULL DEFAULT 'other',
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT,
    "title" TEXT,
    "titleEn" TEXT,
    "summary" TEXT,
    "summaryEn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PARSING',
    "linkedTo" TEXT,
    "parsedMs" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocExtraction" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldsJson" TEXT NOT NULL DEFAULT '{}',
    "headline" TEXT,
    "headlineEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocClause" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'info',
    "quote" TEXT NOT NULL,
    "quoteEn" TEXT,
    "page" INTEGER,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "note" TEXT,
    "noteEn" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocClause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "productId" TEXT,
    "supplierId" TEXT,
    "warehouseId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT 'test',
    "source" TEXT,
    "tenantId" TEXT,
    "accepted" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "importLogId" TEXT NOT NULL,
    "sku" TEXT,
    "productName" TEXT,
    "quantity" INTEGER,
    "unitCost" DECIMAL(12,2),
    "supplier" TEXT,
    "warehouse" TEXT,
    "rowData" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "error" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "unitCost" DECIMAL(12,2),
    "supplierId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importCount" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceImportLogId" TEXT,
    "note" TEXT,
    "userId" TEXT,
    "documentRef" TEXT,
    "unitCost" DECIMAL(12,2),
    "warehouseId" TEXT,
    "transferRef" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MAIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantImportMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "description" TEXT,
    "fieldMapJson" TEXT NOT NULL DEFAULT '{}',
    "defaultsJson" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantImportMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedAt" TIMESTAMP(3),
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2),

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "soNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredBy" TIMESTAMP(3),
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderLine" (
    "id" TEXT NOT NULL,
    "soId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fulfilledQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(12,2),

    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "warehouseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "reversesId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "memo" TEXT,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "DairyBatch_batchNumber_key" ON "DairyBatch"("batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketStock_ticker_key" ON "MarketStock"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "SustainabilityScore_companyId_period_year_key" ON "SustainabilityScore"("companyId", "period", "year");

-- CreateIndex
CREATE INDEX "AlertRule_isActive_kind_idx" ON "AlertRule"("isActive", "kind");

-- CreateIndex
CREATE INDEX "AlertRule_scopeCompanyId_idx" ON "AlertRule"("scopeCompanyId");

-- CreateIndex
CREATE INDEX "MessageThread_entityType_entityId_idx" ON "MessageThread"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ThreadParticipant_userId_idx" ON "ThreadParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadParticipant_threadId_userId_key" ON "ThreadParticipant"("threadId", "userId");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_authorId_idx" ON "Message"("authorId");

-- CreateIndex
CREATE INDEX "Pin_userId_idx" ON "Pin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pin_userId_entityType_entityId_key" ON "Pin"("userId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entity_entityId_idx" ON "ActivityLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- CreateIndex
CREATE INDEX "Digest_createdAt_idx" ON "Digest"("createdAt");

-- CreateIndex
CREATE INDEX "Digest_weekStart_idx" ON "Digest"("weekStart");

-- CreateIndex
CREATE INDEX "BrainNode_kind_idx" ON "BrainNode"("kind");

-- CreateIndex
CREATE INDEX "BrainNode_refId_idx" ON "BrainNode"("refId");

-- CreateIndex
CREATE INDEX "BrainNode_ts_idx" ON "BrainNode"("ts");

-- CreateIndex
CREATE INDEX "BrainEdge_fromId_idx" ON "BrainEdge"("fromId");

-- CreateIndex
CREATE INDEX "BrainEdge_toId_idx" ON "BrainEdge"("toId");

-- CreateIndex
CREATE INDEX "BrainEdge_kind_idx" ON "BrainEdge"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "BrainEdge_fromId_toId_kind_key" ON "BrainEdge"("fromId", "toId", "kind");

-- CreateIndex
CREATE INDEX "CouncilSession_ranAt_idx" ON "CouncilSession"("ranAt");

-- CreateIndex
CREATE INDEX "CouncilSession_status_idx" ON "CouncilSession"("status");

-- CreateIndex
CREATE INDEX "CouncilVoice_sessionId_orderIndex_idx" ON "CouncilVoice"("sessionId", "orderIndex");

-- CreateIndex
CREATE INDEX "Narrative_expiresAt_idx" ON "Narrative"("expiresAt");

-- CreateIndex
CREATE INDEX "Narrative_scope_topic_idx" ON "Narrative"("scope", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "Narrative_scope_topic_register_locale_factsHash_key" ON "Narrative"("scope", "topic", "register", "locale", "factsHash");

-- CreateIndex
CREATE INDEX "Plan_status_idx" ON "Plan"("status");

-- CreateIndex
CREATE INDEX "Plan_sourceInsightId_idx" ON "Plan"("sourceInsightId");

-- CreateIndex
CREATE INDEX "Plan_sourceCouncilSessionId_idx" ON "Plan"("sourceCouncilSessionId");

-- CreateIndex
CREATE INDEX "Plan_createdAt_idx" ON "Plan"("createdAt");

-- CreateIndex
CREATE INDEX "PlanStep_planId_orderIndex_idx" ON "PlanStep"("planId", "orderIndex");

-- CreateIndex
CREATE INDEX "PlanStep_status_idx" ON "PlanStep"("status");

-- CreateIndex
CREATE INDEX "Memory_occurredAt_idx" ON "Memory"("occurredAt");

-- CreateIndex
CREATE INDEX "Memory_module_idx" ON "Memory"("module");

-- CreateIndex
CREATE INDEX "BrainFeedback_scope_ts_idx" ON "BrainFeedback"("scope", "ts");

-- CreateIndex
CREATE INDEX "BrainFeedback_scope_kind_idx" ON "BrainFeedback"("scope", "kind");

-- CreateIndex
CREATE INDEX "BrainFeedback_scope_module_kind_idx" ON "BrainFeedback"("scope", "module", "kind");

-- CreateIndex
CREATE INDEX "BrainFeedback_targetType_targetRef_idx" ON "BrainFeedback"("targetType", "targetRef");

-- CreateIndex
CREATE INDEX "BrainPattern_scope_status_idx" ON "BrainPattern"("scope", "status");

-- CreateIndex
CREATE INDEX "BrainPattern_scope_module_idx" ON "BrainPattern"("scope", "module");

-- CreateIndex
CREATE UNIQUE INDEX "FederationOptIn_scope_key" ON "FederationOptIn"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "FederationPeer_peerToken_key" ON "FederationPeer"("peerToken");

-- CreateIndex
CREATE INDEX "FederationPeer_tier_idx" ON "FederationPeer"("tier");

-- CreateIndex
CREATE INDEX "FederationPeer_vertical_idx" ON "FederationPeer"("vertical");

-- CreateIndex
CREATE UNIQUE INDEX "FederationPattern_clusterKey_key" ON "FederationPattern"("clusterKey");

-- CreateIndex
CREATE INDEX "FederationPattern_visibleTo_module_idx" ON "FederationPattern"("visibleTo", "module");

-- CreateIndex
CREATE INDEX "FederationPattern_expiresAt_idx" ON "FederationPattern"("expiresAt");

-- CreateIndex
CREATE INDEX "BrainIQHistory_scope_snappedAt_idx" ON "BrainIQHistory"("scope", "snappedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrainWeight_scope_target_key" ON "BrainWeight"("scope", "target");

-- CreateIndex
CREATE INDEX "SelfTuningReport_scope_ranAt_idx" ON "SelfTuningReport"("scope", "ranAt");

-- CreateIndex
CREATE INDEX "SelfTuningReport_scope_status_idx" ON "SelfTuningReport"("scope", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_region_idx" ON "Tenant"("region");

-- CreateIndex
CREATE INDEX "TenantStep_tenantId_orderIndex_idx" ON "TenantStep"("tenantId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "TenantStep_tenantId_key_key" ON "TenantStep"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TenantTheme_tenantId_key" ON "TenantTheme"("tenantId");

-- CreateIndex
CREATE INDEX "TenantPack_packKey_idx" ON "TenantPack"("packKey");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPack_tenantId_packKey_key" ON "TenantPack"("tenantId", "packKey");

-- CreateIndex
CREATE INDEX "Workflow_scope_status_idx" ON "Workflow"("scope", "status");

-- CreateIndex
CREATE INDEX "WorkflowNode_workflowId_idx" ON "WorkflowNode"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowEdge_workflowId_idx" ON "WorkflowEdge"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowEdge_workflowId_fromNodeId_toNodeId_key" ON "WorkflowEdge"("workflowId", "fromNodeId", "toNodeId");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_startedAt_idx" ON "WorkflowRun"("workflowId", "startedAt");

-- CreateIndex
CREATE INDEX "Integration_scope_status_idx" ON "Integration"("scope", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_scope_providerKey_key" ON "Integration"("scope", "providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_integrationId_key" ON "IntegrationCredential"("integrationId");

-- CreateIndex
CREATE INDEX "IntegrationLog_integrationId_ts_idx" ON "IntegrationLog"("integrationId", "ts");

-- CreateIndex
CREATE INDEX "Document_scope_status_idx" ON "Document"("scope", "status");

-- CreateIndex
CREATE INDEX "Document_scope_kind_idx" ON "Document"("scope", "kind");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocExtraction_documentId_key" ON "DocExtraction"("documentId");

-- CreateIndex
CREATE INDEX "DocClause_documentId_orderIndex_idx" ON "DocClause"("documentId", "orderIndex");

-- CreateIndex
CREATE INDEX "BrainInsight_tenantId_type_idx" ON "BrainInsight"("tenantId", "type");

-- CreateIndex
CREATE INDEX "BrainInsight_tenantId_severity_idx" ON "BrainInsight"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "BrainInsight_tenantId_resolvedAt_dismissedAt_idx" ON "BrainInsight"("tenantId", "resolvedAt", "dismissedAt");

-- CreateIndex
CREATE INDEX "BrainInsight_productId_idx" ON "BrainInsight"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BrainInsight_tenantId_type_productId_key" ON "BrainInsight"("tenantId", "type", "productId");

-- CreateIndex
CREATE INDEX "ImportLog_createdAt_idx" ON "ImportLog"("createdAt");

-- CreateIndex
CREATE INDEX "ImportLog_endpoint_idx" ON "ImportLog"("endpoint");

-- CreateIndex
CREATE INDEX "ImportLog_tenantId_idx" ON "ImportLog"("tenantId");

-- CreateIndex
CREATE INDEX "ImportRow_importLogId_idx" ON "ImportRow"("importLogId");

-- CreateIndex
CREATE INDEX "ImportRow_sku_idx" ON "ImportRow"("sku");

-- CreateIndex
CREATE INDEX "ImportRow_productId_idx" ON "ImportRow"("productId");

-- CreateIndex
CREATE INDEX "Product_tenantId_deletedAt_idx" ON "Product"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "Product_tenantId_supplierId_idx" ON "Product"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "Product_tenantId_warehouseId_idx" ON "Product"("tenantId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_warehouseId_key" ON "Product"("tenantId", "sku", "warehouseId");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_productId_occurredAt_idx" ON "InventoryMovement"("tenantId", "productId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_type_occurredAt_idx" ON "InventoryMovement"("tenantId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_deletedAt_idx" ON "InventoryMovement"("productId", "deletedAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_warehouseId_idx" ON "InventoryMovement"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "InventoryMovement_transferRef_idx" ON "InventoryMovement"("transferRef");

-- CreateIndex
CREATE INDEX "Warehouse_tenantId_active_idx" ON "Warehouse"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_tenantId_code_key" ON "Warehouse"("tenantId", "code");

-- CreateIndex
CREATE INDEX "TenantImportMapping_tenantId_active_idx" ON "TenantImportMapping"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "TenantImportMapping_tenantId_sourceSystem_key" ON "TenantImportMapping"("tenantId", "sourceSystem");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_status_idx" ON "PurchaseOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_supplierId_idx" ON "PurchaseOrder"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_orderedAt_idx" ON "PurchaseOrder"("tenantId", "orderedAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_poId_idx" ON "PurchaseOrderLine"("poId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_productId_idx" ON "PurchaseOrderLine"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_soNumber_key" ON "SalesOrder"("soNumber");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_status_idx" ON "SalesOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_customerId_idx" ON "SalesOrder"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_orderedAt_idx" ON "SalesOrder"("tenantId", "orderedAt");

-- CreateIndex
CREATE INDEX "SalesOrderLine_soId_idx" ON "SalesOrderLine"("soId");

-- CreateIndex
CREATE INDEX "SalesOrderLine_productId_idx" ON "SalesOrderLine"("productId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_deletedAt_idx" ON "Supplier"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_name_key" ON "Supplier"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Customer_tenantId_deletedAt_idx" ON "Customer"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_name_key" ON "Customer"("tenantId", "name");

-- CreateIndex
CREATE INDEX "LedgerAccount_tenantId_type_idx" ON "LedgerAccount"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_tenantId_code_key" ON "LedgerAccount"("tenantId", "code");

-- CreateIndex
CREATE INDEX "FinancialPeriod_tenantId_status_idx" ON "FinancialPeriod"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FinancialPeriod_tenantId_year_idx" ON "FinancialPeriod"("tenantId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPeriod_tenantId_year_month_key" ON "FinancialPeriod"("tenantId", "year", "month");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_periodId_idx" ON "JournalEntry"("tenantId", "periodId");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_reference_idx" ON "JournalEntry"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_status_idx" ON "JournalEntry"("tenantId", "status");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DairyBatch" ADD CONSTRAINT "DairyBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyForecast" ADD CONSTRAINT "SupplyForecast_sourceCompanyId_fkey" FOREIGN KEY ("sourceCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyForecast" ADD CONSTRAINT "SupplyForecast_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyForecast" ADD CONSTRAINT "SupplyForecast_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FutureProject" ADD CONSTRAINT "FutureProject_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketStock" ADD CONSTRAINT "MarketStock_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SustainabilityScore" ADD CONSTRAINT "SustainabilityScore_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_scopeCompanyId_fkey" FOREIGN KEY ("scopeCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainEdge" ADD CONSTRAINT "BrainEdge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "BrainNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainEdge" ADD CONSTRAINT "BrainEdge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "BrainNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilVoice" ADD CONSTRAINT "CouncilVoice_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CouncilSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanStep" ADD CONSTRAINT "PlanStep_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantStep" ADD CONSTRAINT "TenantStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantTheme" ADD CONSTRAINT "TenantTheme_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPack" ADD CONSTRAINT "TenantPack_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNode" ADD CONSTRAINT "WorkflowNode_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationCredential" ADD CONSTRAINT "IntegrationCredential_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocExtraction" ADD CONSTRAINT "DocExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocClause" ADD CONSTRAINT "DocClause_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_importLogId_fkey" FOREIGN KEY ("importLogId") REFERENCES "ImportLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_soId_fkey" FOREIGN KEY ("soId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FinancialPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
