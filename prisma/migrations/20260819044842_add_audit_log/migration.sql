-- CreateTable
CREATE TABLE "action_plan_audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "steps_json" JSONB NOT NULL,
    "result_json" JSONB NOT NULL,
    "success_count" INTEGER NOT NULL,
    "fail_count" INTEGER NOT NULL,

    CONSTRAINT "action_plan_audit_log_pkey" PRIMARY KEY ("id")
);
