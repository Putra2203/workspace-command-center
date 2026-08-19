-- CreateTable
CREATE TABLE "query_cache" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_cache_pkey" PRIMARY KEY ("key")
);
