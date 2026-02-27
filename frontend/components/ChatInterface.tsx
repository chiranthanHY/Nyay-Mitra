"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, MapPin, Scale, Shield, MessageCircle, Zap } from "lucide-react";
import RightsCardGenerator from "@/components/RightsCardGenerator";

// ── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "bot";

interface Message {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    category?: string;
    location?: string;
}

interface QuickQuestion {
    text: string;
    icon: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const QUICK_QUESTIONS: QuickQuestion[] = [
    { icon: "🏠", text: "My landlord won't return my security deposit" },
    { icon: "💼", text: "My employer hasn't paid salary for 2 months" },
    { icon: "👮", text: "How do I file an FIR at the police station?" },
    { icon: "💻", text: "I got cheated in a UPI scam. What can I do?" },
    { icon: "👨‍👩‍👧", text: "I'm facing domestic violence. What are my rights?" },
    { icon: "🏗️", text: "My builder hasn't given flat possession after 3 years" },
];

const CATEGORIES = [
    { icon: "👨‍👩‍👧", label: "Family & Marriage", id: "family" },
    { icon: "🏠", label: "Property & Rent", id: "property" },
    { icon: "⚒️", label: "Labour & Employment", id: "labour" },
    { icon: "🚔", label: "Criminal Law", id: "criminal" },
    { icon: "🛒", label: "Consumer Rights", id: "consumer" },
    { icon: "💻", label: "Cyber Crime", id: "cyber" },
    { icon: "⚖️", label: "Human Rights", id: "human_rights" },
];

const CATEGORY_LABELS: Record<string, string> = {
    family: "Family Law",
    property: "Property Law",
    labour: "Labour Law",
    criminal: "Criminal Law",
    consumer: "Consumer Law",
    cyber: "Cyber Law",
    human_rights: "Human Rights",
};

function formatTime(date: Date): string {
    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

// ── ChatInterface Component ────────────────────────────────────────────────────

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [location, setLocation] = useState("Bengaluru, Karnataka");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [showRightsCard, setShowRightsCard] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sessionId = useRef(`session_${Date.now()}`);

    // Auto-scroll to bottom
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, scrollToBottom]);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = "auto";
            ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
        }
    }, [inputValue]);

    const addMessage = useCallback(
        (role: MessageRole, content: string, category?: string) => {
            const msg: Message = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
                role,
                content,
                timestamp: new Date(),
                category,
                location,
            };
            setMessages((prev) => [...prev, msg]);
            return msg;
        },
        [location]
    );

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isLoading) return;

            setError(null);
            setInputValue("");
            addMessage("user", trimmed);
            setIsLoading(true);

            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: trimmed,
                        location: location,
                        session_id: sessionId.current,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || `Server error: ${response.status}`);
                }

                const data = await response.json();
                addMessage("bot", data.reply, data.category);

                if (data.category) {
                    setActiveCategory(data.category);
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to get response";
                console.error("Chat error:", err);

                // If backend is not running, show a helpful mock response
                if (message.includes("Failed to fetch") || message.includes("ECONNREFUSED")) {
                    addMessage(
                        "bot",
                        "⚠️ *Backend not connected*\n\nTo see NyayMitra in action:\n\n" +
                        "1. Start the backend: `cd backend && uvicorn app.main:app --reload`\n" +
                        "2. Refresh this page\n\n" +
                        "📞 For urgent legal help: **NALSA Toll-Free: 15100**\n" +
                        "🌐 Karnataka Legal Aid: **080-2235-0202**"
                    );
                } else {
                    setError(`Error: ${message}. Please try again.`);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, location, addMessage]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    const handleQuickQuestion = (q: QuickQuestion) => {
        sendMessage(q.text);
    };

    const handleCategoryClick = (cat: typeof CATEGORIES[0]) => {
        setActiveCategory(cat.id);
        const query = `Tell me about ${cat.label} in India`;
        sendMessage(query);
    };

    const showWelcome = messages.length === 0 && !isLoading;

    return (
        <div className="app-shell">
            {/* ── Sidebar ── */}
            <aside className="sidebar">
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="logo-icon">⚖️</div>
                    <div className="logo-text">
                        <h1>NyayMitra</h1>
                        <span>न्याय मित्र • Legal AI</span>
                    </div>
                </div>

                <div className="sidebar-divider" />

                {/* Legal Categories */}
                <div>
                    <p className="sidebar-section-title">Legal Topics</p>
                    <div className="category-list">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                id={`category-${cat.id}`}
                                className={`category-item ${activeCategory === cat.id ? "active" : ""}`}
                                onClick={() => handleCategoryClick(cat)}
                            >
                                <span className="category-icon">{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sidebar-divider" />

                {/* Quick Questions */}
                <div>
                    <p className="sidebar-section-title">Quick Questions</p>
                    <div className="quick-questions">
                        {QUICK_QUESTIONS.slice(0, 4).map((q, i) => (
                            <button
                                key={i}
                                id={`quick-question-${i}`}
                                className="quick-btn"
                                onClick={() => handleQuickQuestion(q)}
                            >
                                {q.icon} {q.text}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sidebar-divider" />

                {/* Know Your Rights */}
                <button
                    id="open-rights-card"
                    className="rights-card-sidebar-btn"
                    onClick={() => setShowRightsCard(true)}
                >
                    <Shield size={16} />
                    <div>
                        <div className="rights-btn-title">🛡️ Know Your Rights</div>
                        <div className="rights-btn-desc">Generate a shareable rights card</div>
                    </div>
                </button>

                <div className="sidebar-divider" />

                {/* Emergency Card */}
                <div className="info-card">
                    <div className="info-card-title">
                        <Shield size={13} />
                        Free Legal Aid
                    </div>
                    <div className="info-card-text">
                        NALSA National Helpline:
                        <span className="info-card-number"> 📞 15100</span>
                    </div>
                    <div className="info-card-text" style={{ marginTop: "8px" }}>
                        Karnataka KLSA:
                        <span className="info-card-number"> 📞 080-2235-0202</span>
                    </div>
                </div>
            </aside>

            {/* ── Main Chat ── */}
            <main className="chat-area">
                {/* Header */}
                <div className="chat-header">
                    <div className="chat-header-left">
                        <div className="header-avatar">⚖️</div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: "15px" }}>NyayMitra AI</div>
                            <div className="header-status">
                                <div className="status-dot" />
                                {isLoading ? "Analyzing your case..." : "Online — Ready to help"}
                            </div>
                        </div>
                    </div>
                    <div className="location-badge" onClick={() => document.getElementById("location-input")?.focus()}>
                        <MapPin size={12} />
                        {location || "Set location"}
                    </div>
                </div>

                {/* Messages */}
                <div className="messages-container" id="messages-container">
                    {/* Welcome Screen */}
                    {showWelcome && (
                        <div className="welcome-screen">
                            <div className="welcome-orb">⚖️</div>
                            <div>
                                <h2 className="welcome-title">NyayMitra</h2>
                                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                                    न्याय मित्र — Your AI Legal Companion
                                </p>
                            </div>
                            <p className="welcome-subtitle">
                                Get free legal guidance on Indian law — property, family, labour, criminal, consumer
                                rights and more. Local lawyer referrals for Bengaluru included.
                            </p>
                            <div className="welcome-features">
                                {[
                                    { icon: <MessageCircle size={13} />, text: "Text & Voice" },
                                    { icon: <Scale size={13} />, text: "Indian Law" },
                                    { icon: <MapPin size={13} />, text: "Bengaluru Focus" },
                                    { icon: <Shield size={13} />, text: "Free & Confidential" },
                                    { icon: <Zap size={13} />, text: "AI Powered" },
                                    { icon: <Shield size={13} />, text: "Know Your Rights" },
                                ].map((f, i) => (
                                    <div key={i} className="feature-chip">
                                        {f.icon} {f.text}
                                    </div>
                                ))}
                            </div>
                            <div className="quick-questions" style={{ width: "100%", maxWidth: "520px", gap: "8px" }}>
                                {QUICK_QUESTIONS.map((q, i) => (
                                    <button
                                        key={i}
                                        id={`welcome-quick-${i}`}
                                        className="quick-btn"
                                        onClick={() => handleQuickQuestion(q)}
                                        style={{ fontSize: "13px", padding: "12px 16px" }}
                                    >
                                        {q.icon} {q.text}
                                    </button>
                                ))}
                            </div>
                            <button
                                id="welcome-rights-btn"
                                className="welcome-rights-btn"
                                onClick={() => setShowRightsCard(true)}
                            >
                                <Shield size={16} />
                                🛡️ Generate a "Know Your Rights" Card
                            </button>
                        </div>
                    )}

                    {/* Message List */}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            id={`message-${msg.id}`}
                            className={`message-row ${msg.role}`}
                        >
                            <div className={`message-avatar ${msg.role}`}>
                                {msg.role === "bot" ? "⚖️" : "👤"}
                            </div>
                            <div>
                                {msg.role === "bot" && msg.category && (
                                    <div className="category-tag">
                                        <Scale size={10} />
                                        {CATEGORY_LABELS[msg.category] || msg.category}
                                    </div>
                                )}
                                <div className={`message-bubble ${msg.role}`}>
                                    {msg.content}
                                </div>
                                <div className="message-meta">
                                    {formatTime(msg.timestamp)}
                                    {msg.role === "bot" && msg.location && (
                                        <> · <MapPin size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {msg.location}</>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="message-row bot" id="typing-indicator">
                            <div className="message-avatar bot">⚖️</div>
                            <div>
                                <div className="typing-indicator">
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                </div>
                                <div className="message-meta">Consulting legal knowledge...</div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="error-banner">⚠️ {error}</div>
                )}

                {/* Input Area */}
                <div className="input-area">
                    <div className="input-wrapper">
                        <input
                            id="location-input"
                            className="location-input-small"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Your location..."
                            title="Enter your city or area for local legal advice"
                        />
                        <textarea
                            ref={textareaRef}
                            id="message-input"
                            className="message-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe your legal issue... (e.g. 'My landlord is threatening me')"
                            disabled={isLoading}
                            rows={1}
                        />
                        <button
                            id="send-button"
                            className="send-btn"
                            onClick={() => sendMessage(inputValue)}
                            disabled={isLoading || !inputValue.trim()}
                            aria-label="Send message"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <p className="input-hint">
                        <Shield size={10} />
                        Your conversations are private. Always consult a licensed lawyer for your specific case.
                    </p>
                </div>
            </main>
            <RightsCardGenerator
                isOpen={showRightsCard}
                onClose={() => setShowRightsCard(false)}
                location={location}
            />
        </div>
    );
}
