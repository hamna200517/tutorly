import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { studentNavItems } from "../../features/student/navigation";
import {
  studentChatContactsRequest,
  studentConversationsRequest,
  studentSendMessageRequest,
  studentThreadRequest,
} from "../../api/student";

export default function StudentChatPage() {
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedPeerId, setSelectedPeerId] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadConversations = async ({ preserveSelection = true } = {}) => {
    setLoading(true);
    setError("");
    try {
      const data = await studentConversationsRequest();
      const list = data?.conversations || [];
      setConversations(list);

      if (!preserveSelection) {
        setSelectedPeerId(list[0] ? String(list[0].peer_account_id) : "");
        return;
      }

      const stillExists = list.some((item) => String(item.peer_account_id) === String(selectedPeerId));
      if (!selectedPeerId && list[0]) {
        setSelectedPeerId(String(list[0].peer_account_id));
      } else if (!stillExists && !contacts.some((item) => String(item.account_id) === String(selectedPeerId))) {
        setSelectedPeerId(list[0] ? String(list[0].peer_account_id) : "");
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations({ preserveSelection: false });
  }, []);

  useEffect(() => {
    async function loadContacts() {
      setLoadingContacts(true);
      try {
        const data = await studentChatContactsRequest();
        const list = (data?.contacts || []).map((item) => ({
          account_id: item.account_id,
          label: item.label || item.email,
          email: item.email || "",
          role: item.role,
        }));
        setContacts(list);
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Could not load chat contacts.");
      } finally {
        setLoadingContacts(false);
      }
    }

    loadContacts();
  }, []);

  useEffect(() => {
    async function loadThread() {
      if (!selectedPeerId) {
        setMessages([]);
        return;
      }

      try {
        const data = await studentThreadRequest(selectedPeerId, { limit: 30, offset: 0 });
        setMessages(data?.messages || []);
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Could not load thread.");
      }
    }

    loadThread();
  }, [selectedPeerId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedPeerId || !messageText.trim()) return;

    setSending(true);
    setError("");
    setSuccess("");
    try {
      await studentSendMessageRequest({
        receiver_account_id: Number(selectedPeerId),
        content: messageText.trim(),
      });
      setMessageText("");
      setSuccess("Message sent.");
      await loadConversations();
      const data = await studentThreadRequest(selectedPeerId, { limit: 30, offset: 0 });
      setMessages(data?.messages || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <RoleLayout
      roleTitle="Student"
      roleSubtitle="Your messages."
      accentLabel="Student"
      navItems={studentNavItems}
      headerLabel="Chat"
      quickStats={[
        { label: "Contacts", value: loadingContacts ? "..." : String(contacts.length), note: "Tutors and academies you can reach" },
        { label: "Messages", value: messages.length ? String(messages.length) : "0", note: "Messages in this conversation" },
        {
          label: "Conversations",
          value: loading ? "..." : String(conversations.length),
          note: "Open conversations",
        },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Start Chat</p>
          <h3>Choose who to message</h3>

          {loadingContacts ? <p className="muted">Loading contacts...</p> : null}

          {!loadingContacts && contacts.length === 0 ? (
            <p className="muted">No tutors or academies are available to message right now.</p>
          ) : null}

          {contacts.length > 0 ? (
            <div className="form-grid" style={{ marginTop: "16px" }}>
              <div>
                <label htmlFor="peerSelect">Tutor or Academy</label>
                <select id="peerSelect" value={selectedPeerId} onChange={(e) => setSelectedPeerId(e.target.value)}>
                  <option value="">Select a contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.account_id} value={contact.account_id}>
                      {contact.label} - {contact.role}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPeerId ? (
                <p className="muted">
                  {contacts.find((item) => String(item.account_id) === String(selectedPeerId))?.email || "Selected contact"}
                </p>
              ) : null}
            </div>
          ) : null}
        </article>

        <article className="soft-card">
          <p className="section-kicker">Conversations</p>
          <h3>Select a tutor or academy</h3>

          {loading ? <p className="muted">Loading conversations...</p> : null}
          {error ? <p className="error">{error}</p> : null}

          {!loading && conversations.length === 0 ? (
            <p className="muted">No conversations yet. Pick a contact above and send your first message.</p>
          ) : null}

          {conversations.length > 0 ? (
            <div className="conversation-list">
              {conversations.map((item) => (
                <button
                  key={item.peer_account_id}
                  type="button"
                  className={`conversation-card ${String(item.peer_account_id) === selectedPeerId ? "active" : ""}`}
                  onClick={() => setSelectedPeerId(String(item.peer_account_id))}
                >
                  <strong>{item.peer_email}</strong>
                  <span className="muted">
                    {item.peer_role} | {item.last_message || "No preview"}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </article>

        <article className="soft-card">
          <p className="section-kicker">Thread</p>
          <h3>Send and review messages</h3>

          <div className="thread-box">
            {messages.length === 0 ? (
              <p className="muted">Select a conversation to load messages.</p>
            ) : (
              messages.map((message) => (
                <div key={message.message_id} className="message-bubble">
                  <p>{message.content}</p>
                  <span className="muted">{new Date(message.sent_at).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="form-grid" style={{ marginTop: "16px" }}>
            <div>
              <label htmlFor="messageText">Message</label>
              <textarea
                id="messageText"
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message here..."
              />
            </div>

            <button className="btn-primary" type="submit" disabled={sending || !selectedPeerId}>
              {sending ? "Sending..." : "Send Message"}
            </button>

            {success ? <p className="success">{success}</p> : null}
          </form>
        </article>
      </div>
    </RoleLayout>
  );
}
