"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

interface Message {
  role: "assistant" | "user";
  text: string;
}

function getContext(pathname: string): "admin" | "owner" | "staff" | "customer" {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/owner")) return "owner";
  if (
    pathname === "/staff/dashboard" ||
    pathname.startsWith("/staff/dashboard/") ||
    pathname === "/staff/classes" ||
    pathname.startsWith("/staff/classes/") ||
    pathname === "/staff/profile" ||
    pathname.startsWith("/staff/profile/")
  ) {
    return "staff";
  }
  return "customer";
}

function getWelcome(ctx: ReturnType<typeof getContext>): string {
  switch (ctx) {
    case "admin":
      return "Hi! I'm your VibePass admin assistant. Ask me about managing businesses, approvals, analytics, or platform settings.";
    case "owner":
      return "Hi! I'm your Studio assistant. I can help with creating classes, managing bookings, inviting staff, or reading your analytics.";
    case "staff":
      return "Hi! I'm your Staff assistant. Ask me about your upcoming classes, bookings, or how to manage attendees.";
    default:
      return "Hi! I'm the VibePass assistant. I can help you find classes, manage bookings, or answer questions about studios near you.";
  }
}

const QUICK_QUESTIONS: Record<ReturnType<typeof getContext>, string[]> = {
  admin: [
    "How do I approve a business?",
    "How do I feature a class?",
    "How do I suspend a business?",
    "Where can I see all bookings?",
  ],
  owner: [
    "How do I create a class?",
    "How do I invite staff?",
    "How do I read my analytics?",
    "How do I set up payments?",
  ],
  staff: [
    "How do I see my upcoming classes?",
    "How do I mark attendance?",
    "How do I view class bookings?",
    "How do I update my profile?",
  ],
  customer: [
    "How do I find classes near me?",
    "How do I cancel a booking?",
    "Is there a membership option?",
    "How do I book multiple seats?",
  ],
};

const MOCK_RESPONSES: Record<string, string> = {
  "how do i approve a business":
    "Go to **Admin → Owner Approvals**. You'll see a list of businesses pending review. Click any business to view their details, then approve or reject with a reason. Approved businesses appear on the marketplace immediately.",
  "how do i feature a class":
    "Go to **Admin → Featured**. Search for the class and toggle 'Featured'. Set a slot number to control the homepage carousel order and use the preview to see what customers will see.",
  "how do i suspend a business":
    "Go to **Admin → Businesses**, open the business page, and use the 'Suspend' action. You'll be asked for a reason which is shown to the owner so they know why.",
  "where can i see all bookings":
    "Go to **Admin → Bookings** for a full list. You can filter by date, business, or status. Export is available for reporting.",
  "how do i create a class":
    "Go to **Classes → Create Class** in your owner sidebar. Fill in the title, category, date/time, instructor, capacity and price. Publish when ready — it'll go live on the marketplace immediately.",
  "how do i invite staff":
    "Go to **Staff** in your owner sidebar and click **Invite Staff**. Enter their email and role. They'll receive an invite link and can register or link their existing account.",
  "how do i read my analytics":
    "Your **Dashboard** shows revenue, occupancy rate, and bookings over time. For deeper insights, click any class to see its individual performance including attendee demographics.",
  "how do i set up payments":
    "Go to **Settings → Payments**. Connect your Razorpay account by entering your API keys. Once connected, set a price on any class to enable paid bookings.",
  "how do i find classes near me":
    "Go to **Classes** and use the category filters or search bar. You can filter by category, date, and price. All classes show the studio location.",
  "how do i cancel a booking":
    "Go to **My Bookings**, find the booking you want to cancel, and click **Cancel**. Cancellation policies vary by studio — check the class details for the refund policy.",
  "is there a membership option":
    "VibePass currently supports per-class bookings. Studio owners can offer bundled packages by creating class series. Membership subscriptions are planned for a future release.",
  "how do i book multiple seats":
    "On the booking page, click **Add Another Person** to add extra attendees. Each gets their own booking confirmation. All seats are charged at the same per-seat price.",
  "how do i see my upcoming classes":
    "Your **Staff Dashboard** shows all upcoming classes you're listed as an instructor for. Click any class to see enrolled attendees.",
  "how do i mark attendance":
    "Open a class from your Staff Dashboard and use the **Attendees** tab. You can mark each attendee as present or absent.",
  "how do i view class bookings":
    "Go to **My Classes** and click a class title. The **Bookings** tab shows everyone who has registered with their contact details.",
  "how do i update my profile":
    "Go to **Profile** in the staff sidebar. You can update your bio, specialties, experience, and profile photo. Your public profile is shown on class pages.",
};

function getMockResponse(question: string): string {
  const key = question.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  for (const [pattern, answer] of Object.entries(MOCK_RESPONSES)) {
    if (key.includes(pattern.replace(/[^a-z0-9 ]/g, ""))) {
      return answer;
    }
  }
  return "That's a great question! For detailed guidance, check the Help section in your portal settings, or reach out to support. I'm still learning and improving every day.";
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(text: string) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ctx = getContext(pathname);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: getWelcome(ctx) },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    const delay = 700 + (text.trim().length % 5) * 100;
    setTimeout(() => {
      const reply = getMockResponse(text);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      setTyping(false);
    }, delay);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="ai-bubble">
      {/* Chat panel */}
      {open && (
        <div className="ai-panel animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-teal-600 to-indigo-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm">
                ✦
              </div>
              <div>
                <p className="text-sm font-black text-white">VibePass AI</p>
                <p className="text-[10px] text-teal-100">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white text-lg leading-none"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 text-[10px] text-white">
                    ✦
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                    msg.role === "user"
                      ? "rounded-br-sm bg-teal-600 text-white"
                      : "rounded-bl-sm bg-slate-100 text-slate-800"
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                />
              </div>
            ))}
            {typing && (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 text-[10px] text-white">
                  ✦
                </div>
                <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div className="border-t border-slate-100 px-4 pb-2 pt-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Quick help
              </p>
              <div className="flex flex-col gap-1.5">
                {QUICK_QUESTIONS[ctx].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-100 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white disabled:opacity-40 hover:bg-teal-700 transition-colors"
              aria-label="Send"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path
                  d="M3 10 L17 10 M12 5 L17 10 L12 15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="ai-bubble-btn"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M6 6 L18 18 M6 18 L18 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <span className="text-xl">✦</span>
        )}
      </button>
    </div>
  );
}
