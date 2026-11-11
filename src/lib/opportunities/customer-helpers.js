
export async function findOrCreateOpportunityCustomer(tx, {
  customerId,
  stCustomerId,
  businessName,
  pocName,
  phone,
  email,
  location,
}) {
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

  // 3. Fallback matching for manually entered customers.
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

    customer = await tx.customer.findFirst({
      where: {
        OR: customerConditions,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  // 4. Update existing customer.
  if (customer) {
    return tx.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        businessName: businessName || customer.businessName || null,
        pocName,
        phone: phone || customer.phone,
        email: email || customer.email,
        location: location || customer.location,
        ...(stCustomerId ? { stCustomerId } : {}),
      },
    });
  }

  // 5. Create new customer.
  return tx.customer.create({
    data: {
      stCustomerId: stCustomerId || null,
      businessName: businessName || null,
      pocName,
      phone: phone || null,
      email: email || null,
      location: location || null,
    },
  });
}
