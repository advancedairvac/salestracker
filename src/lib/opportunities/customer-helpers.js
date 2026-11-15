
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
