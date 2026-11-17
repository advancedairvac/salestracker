const DEFAULT_MESSAGES = {
  H24: "Morning, did you get those couple emails from yesterday?",
  H36: "Just checking in to see if you had a chance to review the information.",
  W1: "I wanted to follow up and see if you have any questions.",
  W2: "I wanted to check in and see how things are progressing.",
  M1: "Just following up to see if you are ready to move forward.",
  MANUAL: "I wanted to follow up with you regarding this opportunity.",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date) {
  if (!date) return "";

  const value = new Date(date);

  return {
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(value),

    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(value),
  };
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function renderOptionalLine(value) {
  if (!value) return "";

  return `<div style="margin:0 0 7px;">${escapeHtml(value)}</div>`;
}

export function getDefaultFollowUpMessage(eventType) {
  return DEFAULT_MESSAGES[eventType] || DEFAULT_MESSAGES.MANUAL;
}

export function renderFollowUpEmail({ opportunity, followUp, customMessage }) {
  if (!opportunity || !followUp) {
    throw new Error("Opportunity and follow-up data are required.");
  }

  const customer = opportunity.customer;

  if (!customer) {
    throw new Error("Customer information is missing.");
  }

  const customerName = customer.pocName || customer.businessName || "";
  const businessName = customer.businessName || customer.pocName || "";
  const jobType = opportunity.jobType || "";
  const address = customer.location || "";
  const phone = customer.phone || "";
  const email = customer.email || "";
  const value = formatCurrency(opportunity.value);

  const followUpDate = formatDateTime(followUp.dueAt);
  const opportunityCreatedDate = formatDate(opportunity.createdAt);

  const message =
    customMessage?.trim() || getDefaultFollowUpMessage(followUp.eventType);

  const messageHtml = escapeHtml(message).replace(/\n/g, "<br />");

  const subject = `Follow up with ${customerName || businessName || "Customer"}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#ffffff;
  font-family:Arial,Helvetica,sans-serif;
  color:#111111;
">

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#ffffff;"
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="max-width:600px;background:#ffffff;"
        >

          <!-- HEADER -->

          <tr>
            <td style="padding:8px 15px 10px;">

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
              >
                <tr>
                  <td width="54" valign="middle">
                    <div style="
                      width:48px;
                      height:48px;
                      border:1px solid #d5d5d5;
                      border-radius:12px;
                    "></div>
                  </td>

                  <td valign="middle">
                    <div style="
                      font-size:19px;
                      font-weight:800;
                      line-height:23px;
                    ">SALES TRACKER</div>

                    <div style="
                      font-size:18px;
                      line-height:22px;
                    ">To: ${escapeHtml(opportunity.assignedTo?.name || "Salesman")}</div>
                  </td>

                  <td align="right" valign="top" style="
                    font-size:18px;
                    white-space:nowrap;
                  ">
                    ${escapeHtml(formatDate(new Date()).split(",")[0])}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #d5d5d5;"></td>
          </tr>

          <!-- FOLLOW-UP TITLE -->

          <tr>
            <td align="center" style="
              padding:12px 15px 13px;
              font-size:23px;
              line-height:30px;
              font-weight:400;
            ">
              Follow up with ${escapeHtml(customerName || businessName)}
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #d5d5d5;"></td>
          </tr>

          <!-- OPPORTUNITY DETAILS -->

          <tr>
            <td style="
              padding:37px 29px 0;
              font-size:16px;
              line-height:21px;
            ">

              ${
                businessName
                  ? `<div style="font-weight:800;font-size:17px;margin-bottom:2px;">${escapeHtml(businessName)}</div>`
                  : ""
              }

              ${renderOptionalLine(jobType)}
              ${renderOptionalLine(address)}

              ${
                value
                  ? `<div style="margin-top:34px;margin-bottom:36px;">
                      <span style="
                        display:inline-block;
                        background:#000000;
                        color:#ffffff;
                        padding:3px 5px;
                        font-size:17px;
                        font-weight:800;
                      ">${escapeHtml(value)}</span>
                    </div>`
                  : `<div style="margin-top:34px;margin-bottom:36px;"></div>`
              }

              <div style="margin-bottom:3px;">
                ${escapeHtml(customerName)}
              </div>

              ${renderOptionalLine(phone)}
              ${renderOptionalLine(email)}

              <!-- FOLLOW-UP DATE -->

              <div style="margin-top:28px;line-height:25px;">
                ${escapeHtml(followUpDate.date)}
              </div>

              <div style="line-height:25px;">
                ${escapeHtml(followUpDate.time)}
              </div>

              <!-- CUSTOM MESSAGE -->

              <div style="
                margin-top:25px;
                font-size:17px;
                line-height:25px;
              ">
                ${messageHtml}
              </div>

              <!-- OPPORTUNITY CREATED DATE -->

              <div style="
                margin-top:28px;
                padding-bottom:25px;
                color:#888888;
                font-size:16px;
                line-height:24px;
              ">
                <div>Date Opportunity was started :</div>
                <div>${escapeHtml(opportunityCreatedDate)}</div>
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

  const text = [
    "SALES TRACKER",
    `To: ${opportunity.assignedTo?.name || "Salesman"}`,
    "",
    subject,
    "",
    businessName,
    jobType,
    address,
    value,
    "",
    customerName,
    phone,
    email,
    "",
    followUpDate.date,
    followUpDate.time,
    "",
    message,
    "",
    "Date Opportunity was started:",
    opportunityCreatedDate,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject,
    html,
    text,
  };
}
