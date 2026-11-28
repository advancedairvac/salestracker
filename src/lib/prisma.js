import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

import {
  getCachedDatabaseRead,
  invalidateDatabaseCache,
  stableSerialize,
} from "@/lib/cache/database-cache";

const globalForPrisma = globalThis;

const MODEL_DELEGATES = new Set([
  "user",
  "customer",
  "opportunity",
  "followUpSchedule",
  "followUp",
  "notificationLog",
  "emailTemplate",
  "activity",
  "sale",
]);

const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

function getDatabaseConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) return connectionString;

  try {
    const parsedUrl = new URL(connectionString);
    const sslMode = parsedUrl.searchParams.get("sslmode")?.toLowerCase();

    // pg-connection-string warns that these legacy aliases will change
    // behavior in its next major version. State the intended verification.
    if (["prefer", "require", "verify-ca"].includes(sslMode)) {
      parsedUrl.searchParams.set("sslmode", "verify-full");
    }

    return parsedUrl.toString();
  } catch {
    return connectionString;
  }
}

function shouldBypassReadCache(model, operation) {
  // Keep authentication, authorization, and opportunity status checks live.
  if (["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow"].includes(operation)) {
    return model === "User" || model === "Opportunity";
  }

  return false;
}

function wrapDelegate(model, delegate, { cacheReads, onWrite }) {
  return new Proxy(delegate, {
    get(target, property) {
      const operation = String(property);
      const original = Reflect.get(target, property, target);

      if (typeof original !== "function") return original;

      if (READ_OPERATIONS.has(operation) && cacheReads) {
        return (args) => {
          const cacheKey = `database:${model}:${operation}:${stableSerialize(args ?? {})}`;

          return getCachedDatabaseRead({
            key: cacheKey,
            bypass: shouldBypassReadCache(model, operation),
            loader: () => original.call(target, args),
          });
        };
      }

      if (WRITE_OPERATIONS.has(operation)) {
        return async (...args) => {
          onWrite?.();

          if (cacheReads) invalidateDatabaseCache();

          const result = await original.apply(target, args);

          if (cacheReads) invalidateDatabaseCache();

          return result;
        };
      }

      return original.bind(target);
    },
  });
}

function wrapPrismaClient(client, { cacheReads = true, onWrite = null } = {}) {
  const delegates = new Map();

  return new Proxy(client, {
    get(target, property) {
      if (property === "$transaction" && cacheReads) {
        return (input, ...options) => {
          const transaction = target.$transaction.bind(target);

          if (typeof input !== "function") {
            invalidateDatabaseCache();

            return transaction(input, ...options).then((result) => {
              invalidateDatabaseCache();
              return result;
            });
          }

          let transactionChangedData = false;

          return transaction(
            (transactionClient) =>
              input(
                wrapPrismaClient(transactionClient, {
                  cacheReads: false,
                  onWrite: () => {
                    transactionChangedData = true;
                  },
                }),
              ),
            ...options,
          ).then((result) => {
            if (transactionChangedData) invalidateDatabaseCache();
            return result;
          });
        };
      }

      if (typeof property === "string" && MODEL_DELEGATES.has(property)) {
        if (!delegates.has(property)) {
          const delegate = Reflect.get(target, property, target);

          delegates.set(
            property,
            wrapDelegate(property[0].toUpperCase() + property.slice(1), delegate, {
              cacheReads,
              onWrite,
            }),
          );
        }

        return delegates.get(property);
      }

      const value = Reflect.get(target, property, target);

      if (typeof value === "function") return value.bind(target);

      return value;
    },
  });
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: getDatabaseConnectionString(),
      ssl: {
        rejectUnauthorized: true,
      },
    }),
  });

  return client;
};

export const prisma =
  globalForPrisma.prismaWithReadCache ??
  wrapPrismaClient(globalForPrisma.prisma ?? createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaWithReadCache = prisma;
  globalForPrisma.prisma = prisma;
}
