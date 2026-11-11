
export async function findOrCreateOpportunityCustomer(
  tx,
  values,
  {
    nameMatch = "any",
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

  // 1. Match by ServiceTitan Customer ID.
  if (stCustomerId) {
    customer = await tx.customer.findUnique({
      where: {
        stCustomerId,
      },
    });
  }

  // 2. Match by local Customer ID.
  if (!customer && customerId) {
    customer = await tx.customer.findUnique({
      where: {
        id: customerId,
      },
    });
  }

  // 3. Fallback matching by customer names.
  if (!customer && (businessName || pocName)) {
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
      // Match only when both names are provided and match.
      if (businessName && pocName) {
        nameWhere = {
          AND: customerConditions,
        };
      }
    } else {
      // Match when either provided name matches.
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

  // 4. Update existing customer.
  if (customer) {
    const preserveExistingValues = updateMode === "preserve";

    return tx.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        stCustomerId: stCustomerId || customer.stCustomerId || null,

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

  // 5. Create new customer.
  return tx.customer.create({
    data: {
      stCustomerId: stCustomerId || null,
      businessName: businessName || null,
      pocName: pocName || null,
      phone: phone || null,
      email: email || null,
      location: location || null,
    },
  });
}
