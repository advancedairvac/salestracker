
"use client";

import { useState, useTransition } from "react";
import Input from "@/components/ui/input";

import {
  updateEmailTemplate,
  getEmailTemplatePreview,
  sendEmailTemplateTest,
} from "@/app/admin/settings/email-templates/actions";

const EVENT_LABELS = {
  H24: "24 Hours",
  H36: "36 Hours",
  W1: "1 Week",
  W2: "2 Weeks",
  M1: "1 Month",
  MANUAL: "Manual",
};

function Modal({ title, onClose, children, maxWidth = "max-w-2xl" }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto border border-[#dedede] bg-white shadow-xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e5e5e5] px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-black">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center text-xl text-[#777] hover:bg-[#f5f5f5]"
          >
            ×
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#555]">
      {children}
    </label>
  );
}

function FormInput({ value, onChange, placeholder, maxLength }) {
  return (
    <Input
      variant="plain"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
}

function FormTextarea({ value, onChange, placeholder }) {
  return (
    <Input
      as="textarea"
      variant="plain"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={6}
      maxLength={5000}
    />
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
}) {
  const styles =
    variant === "secondary"
      ? "border border-[#d5d5d5] bg-white text-black hover:border-black"
      : "border border-black bg-black text-white hover:bg-[#333]";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

export default function EmailTemplatesContent({ templates }) {
  const [items, setItems] = useState(templates);

  const [editingTemplate, setEditingTemplate] = useState(null);
  const [testTemplate, setTestTemplate] = useState(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [recipientEmail, setRecipientEmail] = useState("");

  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const [message, setMessage] = useState(null);

  const [isPending, startTransition] = useTransition();

  function openEdit(template) {
    setEditingTemplate(template);
    setSubject(template.subject);
    setBody(template.body);
    setPreviewHtml("");
    setShowPreview(false);
    setMessage(null);
  }

  function closeEdit() {
    setEditingTemplate(null);
    setPreviewHtml("");
    setShowPreview(false);
    setMessage(null);
  }

  function handleSave() {
    if (!editingTemplate) return;

    setMessage(null);

    startTransition(async () => {
      try {
        const result = await updateEmailTemplate({
          templateId: editingTemplate.id,
          subject,
          body,
        });

        setItems((previous) =>
          previous.map((item) =>
            item.id === result.template.id
              ? result.template
              : item,
          ),
        );

        setEditingTemplate(result.template);
        setSubject(result.template.subject);
        setBody(result.template.body);
        setMessage({
          type: "success",
          text: "Template updated successfully.",
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: error.message || "Unable to update template.",
        });
      }
    });
  }

  function handlePreview() {
    if (!editingTemplate) return;

    setMessage(null);

    startTransition(async () => {
      try {
        const result = await getEmailTemplatePreview({
          templateId: editingTemplate.id,
          subject,
          body,
        });

        setPreviewHtml(result.html);
        setShowPreview(true);
      } catch (error) {
        setMessage({
          type: "error",
          text: error.message || "Unable to generate preview.",
        });
      }
    });
  }

  function openTest(template) {
    setTestTemplate(template);
    setRecipientEmail("");
    setMessage(null);
  }

  function closeTest() {
    setTestTemplate(null);
    setRecipientEmail("");
    setMessage(null);
  }

  function handleSendTest() {
    if (!testTemplate) return;

    setMessage(null);

    startTransition(async () => {
      try {
        const result = await sendEmailTemplateTest({
          templateId: testTemplate.id,
          recipientEmail,
        });

        setMessage({
          type: "success",
          text: result.message,
        });

        setRecipientEmail("");
      } catch (error) {
        setMessage({
          type: "error",
          text: error.message || "Unable to send test email.",
        });
      }
    });
  }

  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {items.map((template, index) => (
          <article
            key={template.id}
            className="border border-[#d5d5d5] bg-white p-4 transition-colors hover:border-[#999] sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#e5e5e5] text-sm font-bold text-black">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-black">
                    {template.name}
                  </h3>

                  <p className="mt-1 text-xs font-medium uppercase text-[#777]">
                    {EVENT_LABELS[template.eventType]}
                  </p>
                </div>
              </div>

              <span
                className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                  template.isActive ? "text-green-700" : "text-[#999]"
                }`}
              >
                {template.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-5 border-t border-[#e5e5e5] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#777]">
                Email Subject
              </p>

              <p className="mt-1 break-words text-sm font-medium text-black">
                {template.subject}
              </p>

              <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-[#777]">
                Custom Message
              </p>

              <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-[#555]">
                {template.body}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e5e5e5] pt-4">
              <ActionButton
                onClick={() => openEdit(template)}
                variant="primary"
              >
                Edit Template
              </ActionButton>

              <ActionButton
                onClick={() => openTest(template)}
                variant="secondary"
                disabled={!template.isActive}
              >
                Send Test
              </ActionButton>
            </div>
          </article>
        ))}
      </div>

      {editingTemplate && (
        <Modal
          title={`Edit ${editingTemplate.name}`}
          onClose={closeEdit}
        >
          <div className="space-y-5">
            <div>
              <FieldLabel>Template Name</FieldLabel>

              <div className="border border-[#e5e5e5] bg-[#f8f8f8] px-3 py-3 text-sm text-[#777]">
                {editingTemplate.name}
              </div>
            </div>

            <div>
              <FieldLabel>Event Type</FieldLabel>

              <div className="border border-[#e5e5e5] bg-[#f8f8f8] px-3 py-3 text-sm text-[#777]">
                {editingTemplate.eventType}
              </div>
            </div>

            <div>
              <FieldLabel>Email Subject</FieldLabel>

              <FormInput
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Enter email subject"
                maxLength={200}
              />
            </div>

            <div>
              <FieldLabel>Custom Message</FieldLabel>

              <FormTextarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Enter your follow-up message"
              />

              <p className="mt-2 text-xs text-[#999]">
                Maximum 5,000 characters.
              </p>
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.type === "success"
                    ? "text-green-700"
                    : "text-red-600"
                }`}
              >
                {message.text}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#e5e5e5] pt-4">
              <ActionButton
                onClick={closeEdit}
                variant="secondary"
                disabled={isPending}
              >
                Cancel
              </ActionButton>

              <ActionButton
                onClick={handlePreview}
                variant="secondary"
                disabled={isPending}
              >
                {isPending && !showPreview ? "Please Wait..." : "Preview"}
              </ActionButton>

              <ActionButton
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Save Changes"}
              </ActionButton>
            </div>

            {showPreview && previewHtml && (
              <div className="border-t border-[#e5e5e5] pt-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-black">
                  Email Preview
                </h3>

                <iframe
                  title="Email template preview"
                  srcDoc={previewHtml}
                  sandbox=""
                  className="h-[520px] w-full border border-[#d5d5d5] bg-white"
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {testTemplate && (
        <Modal
          title={`Send Test — ${testTemplate.name}`}
          onClose={closeTest}
          maxWidth="max-w-lg"
        >
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-[#777]">
              Send this template to your email address using example
              customer and opportunity data. No real follow-up record
              will be changed.
            </p>

            <div>
              <FieldLabel>Recipient Email Address</FieldLabel>

              <FormInput
                value={recipientEmail}
                onChange={(event) =>
                  setRecipientEmail(event.target.value)
                }
                placeholder="Enter your email address"
                maxLength={254}
              />
            </div>

            <div className="border border-[#e5e5e5] bg-[#fafafa] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-black">
                Example Data
              </p>

              <div className="mt-2 space-y-1 text-xs text-[#777]">
                <p>Business: San Diego Community College</p>
                <p>Customer: Jason Botticelli</p>
                <p>Job: 2 Pumps + Kit [Mission Valley]</p>
                <p>Value: $21,400</p>
              </div>
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.type === "success"
                    ? "text-green-700"
                    : "text-red-600"
                }`}
              >
                {message.text}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-[#e5e5e5] pt-4">
              <ActionButton
                onClick={closeTest}
                variant="secondary"
                disabled={isPending}
              >
                Close
              </ActionButton>

              <ActionButton
                onClick={handleSendTest}
                disabled={isPending || !recipientEmail.trim()}
              >
                {isPending ? "Sending..." : "Send Test Email"}
              </ActionButton>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
