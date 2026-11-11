
export function getFormValue(formData, key) {
  return formData.get(key)?.toString().trim() || "";
}

export function getFormValues(formData) {
  return {
    customerId: getFormValue(formData, "customerId"),
    stCustomerId: getFormValue(formData, "stCustomerId"),
    opportunityDate: getFormValue(formData, "opportunityDate"),
    pocName: getFormValue(formData, "pocName"),
    businessName: getFormValue(formData, "businessName"),
    jobType: getFormValue(formData, "jobType"),
    email: getFormValue(formData, "email"),
    textMessage: getFormValue(formData, "textMessage"),
    phone: getFormValue(formData, "phone"),
    location: getFormValue(formData, "location"),
    value: getFormValue(formData, "value"),
    assignedToId: getFormValue(formData, "assignedToId"),
    followUpDate: getFormValue(formData, "followUpDate"),
  };
}

export function getErrorState(error, values) {
  return { error, values };
}
