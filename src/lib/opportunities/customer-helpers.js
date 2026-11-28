
import { getAllServiceTitanCustomers } from "@/lib/integrations/servicetitan";
import { getServiceTitanCustomerById } from "@/lib/dashboard/customer-sync";

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Resolve a selected ServiceTitan customer from the shared API cache and
 * protect manual entry from creating a second customer with matching contact
 * details. The warning intentionally does not disclose which field matched.
 */
export async function resolveServiceTitanOpportunityCustomer(values) {
  const requestedId = String(values.stCustomerId || "").trim();
  const email = normalizeEmail(values.email);
  const phone = normalizePhone(values.phone);

  if (!requestedId && !email && phone.length < 7) return null;

  if (requestedId) {
    const selected = await getServiceTitanCustomerById(requestedId);
    if (!selected) throw new Error("TITAN_CUSTOMER_UNAVAILABLE");

    return {
      ...selected,
      stCustomerId: requestedId,
      businessName: selected.businessName || values.businessName || "",
      pocName: selected.pocName || selected.name || values.pocName || "",
      phone: selected.phone || values.phone || "",
      email: selected.email || values.email || "",
      location: selected.location || values.location || "",
    };
  }

  // A fresh Titan cache check has already run in the opportunity form.
  // Avoid repeating a full ServiceTitan scan during the save action.
  if (values.titanCustomerCacheVerified === "true") return null;

  const customers = await getAllServiceTitanCustomers({
    pageSize: 100,
    maxPages: 100,
  });

  return (
    customers.find((customer) => {
      const sameEmail =
        email && normalizeEmail(customer.email) === email;
      const candidatePhone = normalizePhone(customer.phone);
      const samePhone =
        phone.length >= 7 &&
        candidatePhone.length >= 7 &&
        candidatePhone === phone;
      return sameEmail || samePhone;
    }) || null
  );
}

export function toOpportunityCustomerSnapshot(customer, values = {}) {
  return {
    stCustomerId: String(customer.stCustomerId || customer.id),
    businessName: values.businessName || customer.businessName || null,
    pocName: values.pocName || customer.pocName || customer.name || null,
    phone: values.phone || customer.phone || null,
    email: values.email || customer.email || null,
    location: values.location || customer.location || null,
  };
}

export async function findOrCreateOpportunityCustomer(
  tx,
  values,
  {
    nameMatch = "any",
    matchNames = true,
    updateMode = "preserve",
  } = {},
) {
  const {
    customerId,
    stCustomerId,
    businessName,
    pocName,
    phone,
    email,
    location,
  } = values;

  let customer = null;

  // ============================================
  // 1. MATCH BY SERVICETITAN CUSTOMER ID
  // ============================================

  if (stCustomerId) {
    customer = await tx.customer.findUnique({
      where: {
        stCustomerId: String(stCustomerId),
      },
    });
  }

  // ============================================
  // 2. MATCH BY LOCAL CUSTOMER ID
  // ============================================

  if (!customer && customerId) {
    customer = await tx.customer.findUnique({
      where: {
        id: customerId,
      },
    });
  }

  // ============================================
  // 3. OPTIONAL NAME-BASED MATCHING
  // ============================================

  if (
    !customer &&
    matchNames &&
    (businessName || pocName)
  ) {
    const customerConditions = [];

    if (businessName) {
      customerConditions.push({
        businessName: {
          equals: businessName,
          mode: "insensitive",
        },
      });
    }

    if (pocName) {
      customerConditions.push({
        pocName: {
          equals: pocName,
          mode: "insensitive",
        },
      });
    }

    let nameWhere = null;

    if (nameMatch === "both") {
      if (businessName && pocName) {
        nameWhere = {
          AND: customerConditions,
        };
      }
    } else {
      nameWhere = {
        OR: customerConditions,
      };
    }

    if (nameWhere) {
      customer = await tx.customer.findFirst({
        where: nameWhere,
        orderBy: {
          createdAt: "asc",
        },
      });
    }
  }

  // ============================================
  // 4. UPDATE EXISTING CUSTOMER
  // ============================================

  if (customer) {
    const preserveExistingValues = updateMode === "preserve";

    return tx.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        stCustomerId: stCustomerId
          ? String(stCustomerId)
          : customer.stCustomerId || null,

        businessName: preserveExistingValues
          ? businessName || customer.businessName || null
          : businessName || null,

        pocName: preserveExistingValues
          ? pocName || customer.pocName || null
          : pocName || null,

        phone: preserveExistingValues
          ? phone || customer.phone || null
          : phone || null,

        email: preserveExistingValues
          ? email || customer.email || null
          : email || null,

        location: preserveExistingValues
          ? location || customer.location || null
          : location || null,
      },
    });
  }

  // ============================================
  // 5. CREATE NEW CUSTOMER
  // ============================================

  return tx.customer.create({
    data: {
      stCustomerId: stCustomerId
        ? String(stCustomerId)
        : null,

      businessName: businessName || null,
      pocName: pocName || null,
      phone: phone || null,
      email: email || null,
      location: location || null,
    },
  });
}
