"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Scale, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GradientAIChatInput } from "@/components/ui/gradient-ai-chat-input";
import Sidebar, { ChatSession } from "@/components/Sidebar";
import RightsCardGenerator from "@/components/RightsCardGenerator";

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "bot";

interface Message {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    category?: string;
}

interface StoredChat {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    family: "Family Law",
    property: "Property Law",
    labour: "Labour Law",
    criminal: "Criminal Law",
    consumer: "Consumer Law",
    cyber: "Cyber Law",
    human_rights: "Human Rights",
};

const QUICK_SUGGESTIONS = [
    { emoji: "🏠", text: "My landlord won't return my security deposit" },
    { emoji: "💼", text: "My employer hasn't paid salary for 2 months" },
    { emoji: "👮", text: "How do I file an FIR at the police station?" },
    { emoji: "💻", text: "I got cheated in a UPI scam. What can I do?" },
    { emoji: "👨‍👩‍👧", text: "I'm facing domestic violence. What are my rights?" },
    { emoji: "🏗️", text: "My builder hasn't given flat possession after 3 years" },
];

// ── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "nyaymitra_chats";

function loadChats(): StoredChat[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveChats(chats: StoredChat[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function generateId() {
    return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NyayMitraApp() {
    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [showRightsCard, setShowRightsCard] = useState(false);
    const location = "Bengaluru, Karnataka";

    // Chat history
    const [chatHistory, setChatHistory] = useState<StoredChat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);

    // Sidebar
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionId = useRef(`session_${Date.now()}`);

    // Load chats from localStorage on mount
    useEffect(() => {
        setChatHistory(loadChats());
    }, []);

    // Auto-scroll
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, scrollToBottom]);

    // Save current chat to history
    const saveCurrentChat = useCallback(
        (msgs: Message[]) => {
            if (msgs.length === 0) return;

            const chatId = activeChatId || generateId();
            const firstUserMsg = msgs.find((m) => m.role === "user");
            const title = firstUserMsg
                ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "")
                : "New Chat";

            setChatHistory((prev) => {
                const existing = prev.findIndex((c) => c.id === chatId);
                const updated: StoredChat = {
                    id: chatId,
                    title,
                    messages: msgs,
                    createdAt: existing >= 0 ? prev[existing].createdAt : new Date().toISOString(),
                };

                let newHistory: StoredChat[];
                if (existing >= 0) {
                    newHistory = [...prev];
                    newHistory[existing] = updated;
                } else {
                    newHistory = [updated, ...prev];
                }

                saveChats(newHistory);
                return newHistory;
            });

            if (!activeChatId) {
                setActiveChatId(chatId);
            }
        },
        [activeChatId]
    );

    // Send message
    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isLoading) return;

            setError(null);

            // Open sidebar once chat starts
            if (messages.length === 0) {
                setSidebarOpen(true);
            }

            const userMsg: Message = {
                id: `${Date.now()}_user`,
                role: "user",
                content: trimmed,
                timestamp: new Date(),
            };

            const newMessages = [...messages, userMsg];
            setMessages(newMessages);
            setIsLoading(true);

            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: trimmed,
                        location,
                        session_id: sessionId.current,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || `Server error: ${response.status}`);
                }

                const data = await response.json();
                const botMsg: Message = {
                    id: `${Date.now()}_bot`,
                    role: "bot",
                    content: data.reply,
                    timestamp: new Date(),
                    category: data.category,
                };

                if (data.category) setActiveCategory(data.category);

                const withBot = [...newMessages, botMsg];
                setMessages(withBot);
                saveCurrentChat(withBot);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to get response";

                if (message.includes("Failed to fetch") || message.includes("ECONNREFUSED")) {
                    const botMsg: Message = {
                        id: `${Date.now()}_bot`,
                        role: "bot",
                        content:
                            "⚠️ *Backend not connected*\n\n" +
                            "To see NyayMitra in action:\n\n" +
                            "1. Start the backend: `cd backend && uvicorn app.main:app --reload`\n" +
                            "2. Refresh this page\n\n" +
                            "📞 For urgent legal help: **NALSA Toll-Free: 15100**\n" +
                            "🌐 Karnataka Legal Aid: **080-2235-0202**",
                        timestamp: new Date(),
                    };
                    const withBot = [...newMessages, botMsg];
                    setMessages(withBot);
                    saveCurrentChat(withBot);
                } else {
                    setError(`Error: ${message}. Please try again.`);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, messages, location, saveCurrentChat]
    );

    // New chat
    const handleNewChat = () => {
        setMessages([]);
        setActiveChatId(null);
        setActiveCategory(null);
        setError(null);
        setSidebarOpen(false);
        sessionId.current = `session_${Date.now()}`;
    };

    // Select a chat from history
    const handleSelectChat = (id: string) => {
        const chat = chatHistory.find((c) => c.id === id);
        if (chat) {
            setMessages(chat.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
            setActiveChatId(id);
            sessionId.current = `session_${id}`;
        }
    };

    // Delete
    const handleDeleteChat = (id: string) => {
        setChatHistory((prev) => {
            const updated = prev.filter((c) => c.id !== id);
            saveChats(updated);
            return updated;
        });
        if (activeChatId === id) {
            handleNewChat();
        }
    };

    // Category click
    const handleCategoryClick = (catId: string, label: string) => {
        setActiveCategory(catId);
        sendMessage(`Tell me about ${label} in India`);
    };

    const isLanding = messages.length === 0 && !isLoading;

    // ── Chat history items for sidebar
    const sidebarHistory: ChatSession[] = chatHistory.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: new Date(c.createdAt),
        preview: c.messages[c.messages.length - 1]?.content.slice(0, 60) || "",
    }));

    // ── Gradient config (shared)
    const gradientConfig = {
        mainGradient: {
            light: { topLeft: "#a855f7", topRight: "#ec4899", bottomRight: "#f97316", bottomLeft: "#06b6d4" },
            dark: { topLeft: "#7c3aed", topRight: "#db2777", bottomRight: "#ea580c", bottomLeft: "#0891b2" },
        },
        outerGradient: {
            light: { topLeft: "#8b5cf6", topRight: "#d946ef", bottomRight: "#f59e0b", bottomLeft: "#14b8a6" },
            dark: { topLeft: "#6d28d9", topRight: "#a21caf", bottomRight: "#d97706", bottomLeft: "#0d9488" },
        },
        buttonBorderColor: { light: "#c084fc", dark: "#7c3aed" },
        shadowColor: { light: "rgb(168, 85, 247)", dark: "rgb(124, 58, 237)" },
    };

    return (
        <div style={{ display: "flex", height: "100vh", background: "#0A0A0F", overflow: "hidden" }}>
            {/* Sidebar — only in chat state */}
            {!isLanding && (
                <Sidebar
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                    onNewChat={handleNewChat}
                    chatHistory={sidebarHistory}
                    activeChatId={activeChatId}
                    onSelectChat={handleSelectChat}
                    onDeleteChat={handleDeleteChat}
                    onCategoryClick={handleCategoryClick}
                    activeCategory={activeCategory}
                />
            )}

            {/* Main content */}
            <main
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    height: "100vh",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <AnimatePresence mode="wait">
                    {isLanding ? (
                        /* ═══════════════ LANDING STATE ═══════════════ */
                        <motion.div
                            key="landing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 0.4 }}
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "40px 24px",
                                position: "relative",
                                overflow: "hidden",
                            }}
                        >
                            {/* Animated background blobs */}
                            <div className="demo-bg-blob demo-blob-1" />
                            <div className="demo-bg-blob demo-blob-2" />
                            <div className="demo-bg-blob demo-blob-3" />
                            <div className="demo-bg-blob demo-blob-4" />
                            <div className="demo-grain" />

                            {/* Floating badges */}
                            <motion.div
                                className="demo-badge demo-badge-1"
                                animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                ✨ AI Powered
                            </motion.div>
                            <motion.div
                                className="demo-badge demo-badge-2"
                                animate={{ y: [0, 10, 0], rotate: [0, -3, 3, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            >
                                🔥 Next Gen
                            </motion.div>

                            {/* Hero */}
                            <motion.div
                                style={{ textAlign: "center", position: "relative", zIndex: 2, marginBottom: "32px" }}
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                <div style={{ fontSize: "12px", letterSpacing: "0.2em", color: "#6B7280", marginBottom: "12px", textTransform: "uppercase" }}>
                                    ⚖️ NYAY MITRA
                                </div>
                                <h1 style={{ margin: 0, lineHeight: 1.15 }}>
                                    <span className="demo-title-gradient" style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800 }}>
                                        Ask Anything.
                                    </span>
                                    <br />
                                    <span style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, color: "#F0F0FF" }}>
                                        Get Justice.
                                    </span>
                                </h1>
                                <p style={{ color: "#6B7280", fontSize: "15px", marginTop: "16px", maxWidth: "480px" }}>
                                    Your AI-powered legal bestie 💜 Free, fast & confidential legal
                                    guidance for every Indian citizen.
                                </p>
                            </motion.div>

                            {/* Gradient Input */}
                            <motion.div
                                style={{ width: "100%", maxWidth: "680px", position: "relative", zIndex: 2 }}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                            >
                                <GradientAIChatInput
                                    placeholder="Describe your legal issue... ⚖️"
                                    onSend={sendMessage}
                                    disabled={isLoading}
                                    dropdownOptions={[
                                        { id: "hindi", label: "🇮🇳 Hindi", value: "hindi" },
                                        { id: "english", label: "🇬🇧 English", value: "english" },
                                        { id: "kannada", label: "🏛️ Kannada", value: "kannada" },
                                    ]}
                                    {...gradientConfig}
                                />
                            </motion.div>

                            {/* Know Your Rights card */}
                            <motion.button
                                onClick={() => setShowRightsCard(true)}
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "14px 24px",
                                    borderRadius: "16px",
                                    border: "1px solid rgba(16,185,129,0.2)",
                                    background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(52,211,153,0.04))",
                                    color: "#34D399",
                                    fontSize: "15px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    marginTop: "16px",
                                    position: "relative",
                                    zIndex: 2,
                                    maxWidth: "680px",
                                    width: "100%",
                                    justifyContent: "center",
                                }}
                            >
                                <Shield size={18} />
                                <span>Know Your Rights — Generate a Rights Card</span>
                            </motion.button>

                            {/* Quick suggestion pills */}
                            <motion.div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    justifyContent: "center",
                                    gap: "8px",
                                    marginTop: "20px",
                                    maxWidth: "700px",
                                    position: "relative",
                                    zIndex: 2,
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                {QUICK_SUGGESTIONS.map((q, i) => (
                                    <motion.button
                                        key={i}
                                        onClick={() => sendMessage(q.text)}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.7 + i * 0.08 }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "8px 16px",
                                            borderRadius: "999px",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            background: "rgba(255,255,255,0.04)",
                                            color: "#9CA3AF",
                                            fontSize: "13px",
                                            cursor: "pointer",
                                            fontFamily: "inherit",
                                        }}
                                    >
                                        <span>{q.emoji}</span>
                                        <span>{q.text}</span>
                                    </motion.button>
                                ))}
                            </motion.div>

                            {/* Footer */}
                            <motion.p
                                style={{
                                    color: "#374151",
                                    fontSize: "12px",
                                    marginTop: "32px",
                                    position: "relative",
                                    zIndex: 2,
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.2 }}
                            >
                                built with 💜 for india • powered by AI • always free
                            </motion.p>
                        </motion.div>
                    ) : (
                        /* ═══════════════ CHAT STATE ═══════════════ */
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                height: "100%",
                            }}
                        >
                            {/* Chat header */}
                            <div
                                style={{
                                    padding: "12px 24px",
                                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "rgba(10,10,15,0.8)",
                                    backdropFilter: "blur(12px)",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            borderRadius: "10px",
                                            background: "linear-gradient(135deg, #7c3aed, #db2777)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "16px",
                                        }}
                                    >
                                        ⚖️
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: "14px", color: "#F0F0FF" }}>
                                            NyayMitra AI
                                        </div>
                                        <div style={{ fontSize: "12px", color: isLoading ? "#F59E0B" : "#10B981", display: "flex", alignItems: "center", gap: "4px" }}>
                                            <div
                                                style={{
                                                    width: "6px",
                                                    height: "6px",
                                                    borderRadius: "50%",
                                                    background: isLoading ? "#F59E0B" : "#10B981",
                                                }}
                                            />
                                            {isLoading ? "Analyzing your case..." : "Online — Ready to help"}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <button
                                        onClick={() => setShowRightsCard(true)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "6px 14px",
                                            borderRadius: "999px",
                                            border: "1px solid rgba(16,185,129,0.3)",
                                            background: "rgba(16,185,129,0.08)",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            color: "#34D399",
                                            cursor: "pointer",
                                            fontFamily: "inherit",
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        <Shield size={12} />
                                        Know Your Rights
                                    </button>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "4px 12px",
                                            borderRadius: "999px",
                                            border: "1px solid rgba(124,58,237,0.3)",
                                            fontSize: "12px",
                                            color: "#A78BFA",
                                        }}
                                    >
                                        <MapPin size={12} />
                                        {location}
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    padding: "20px 0",
                                }}
                            >
                                <div style={{ maxWidth: "768px", margin: "0 auto", padding: "0 24px" }}>
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                                                marginBottom: "20px",
                                            }}
                                        >
                                            {msg.role === "user" ? (
                                                /* ── User message: right-aligned bubble ── */
                                                <>
                                                    <div
                                                        style={{
                                                            maxWidth: "75%",
                                                            padding: "12px 18px",
                                                            borderRadius: "18px 18px 4px 18px",
                                                            background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                                                            color: "#F0F0FF",
                                                            fontSize: "14px",
                                                            lineHeight: "1.6",
                                                            whiteSpace: "pre-wrap",
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "11px",
                                                            color: "#4B5563",
                                                            marginTop: "4px",
                                                            marginRight: "4px",
                                                        }}
                                                    >
                                                        {new Date(msg.timestamp).toLocaleTimeString("en-IN", {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: true,
                                                        })}
                                                    </div>
                                                </>
                                            ) : (
                                                /* ── Bot message: left-aligned with avatar ── */
                                                <div style={{ display: "flex", gap: "10px", maxWidth: "85%", alignItems: "flex-start" }}>
                                                    <div
                                                        style={{
                                                            width: "32px",
                                                            height: "32px",
                                                            borderRadius: "10px",
                                                            background: "linear-gradient(135deg, #7c3aed, #db2777)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: "15px",
                                                            flexShrink: 0,
                                                            marginTop: "2px",
                                                        }}
                                                    >
                                                        ⚖️
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        {msg.category && (
                                                            <div
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: "4px",
                                                                    fontSize: "11px",
                                                                    color: "#A78BFA",
                                                                    background: "rgba(124,58,237,0.1)",
                                                                    padding: "2px 8px",
                                                                    borderRadius: "999px",
                                                                    marginBottom: "6px",
                                                                }}
                                                            >
                                                                <Scale size={10} />
                                                                {CATEGORY_LABELS[msg.category] || msg.category}
                                                            </div>
                                                        )}
                                                        <div
                                                            style={{
                                                                padding: "12px 16px",
                                                                borderRadius: "4px 18px 18px 18px",
                                                                background: "rgba(255,255,255,0.04)",
                                                                border: "1px solid rgba(139,92,246,0.08)",
                                                                fontSize: "14px",
                                                                lineHeight: "1.7",
                                                                color: "#D1D5DB",
                                                                whiteSpace: "pre-wrap",
                                                                wordBreak: "break-word",
                                                            }}
                                                        >
                                                            {msg.content}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: "11px",
                                                                color: "#4B5563",
                                                                marginTop: "4px",
                                                                marginLeft: "4px",
                                                            }}
                                                        >
                                                            {new Date(msg.timestamp).toLocaleTimeString("en-IN", {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                                hour12: true,
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Typing indicator */}
                                    {isLoading && (
                                        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", alignItems: "flex-start" }}>
                                            <div
                                                style={{
                                                    width: "30px",
                                                    height: "30px",
                                                    borderRadius: "8px",
                                                    background: "linear-gradient(135deg, #7c3aed, #db2777)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "14px",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                ⚖️
                                            </div>
                                            <div style={{ display: "flex", gap: "4px", padding: "12px 0", alignItems: "center" }}>
                                                {[0, 1, 2].map((i) => (
                                                    <motion.div
                                                        key={i}
                                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                                        style={{
                                                            width: "7px",
                                                            height: "7px",
                                                            borderRadius: "50%",
                                                            background: "#7C3AED",
                                                        }}
                                                    />
                                                ))}
                                                <span style={{ fontSize: "12px", color: "#4B5563", marginLeft: "8px" }}>
                                                    Consulting legal knowledge...
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div
                                    style={{
                                        padding: "8px 24px",
                                        background: "rgba(239,68,68,0.1)",
                                        borderTop: "1px solid rgba(239,68,68,0.2)",
                                        fontSize: "13px",
                                        color: "#FCA5A5",
                                        textAlign: "center",
                                    }}
                                >
                                    ⚠️ {error}
                                </div>
                            )}

                            {/* Input */}
                            <div
                                style={{
                                    padding: "12px 24px 16px",
                                    borderTop: "1px solid rgba(255,255,255,0.04)",
                                }}
                            >
                                <div style={{ maxWidth: "768px", margin: "0 auto" }}>
                                    <GradientAIChatInput
                                        placeholder="Describe your legal issue..."
                                        onSend={sendMessage}
                                        disabled={isLoading}
                                        dropdownOptions={[
                                            { id: "hindi", label: "🇮🇳 Hindi", value: "hindi" },
                                            { id: "english", label: "🇬🇧 English", value: "english" },
                                            { id: "kannada", label: "🏛️ Kannada", value: "kannada" },
                                        ]}
                                        {...gradientConfig}
                                    />
                                    <p
                                        style={{
                                            textAlign: "center",
                                            fontSize: "11px",
                                            color: "#374151",
                                            marginTop: "8px",
                                        }}
                                    >
                                        Your conversations are private. Always consult a licensed lawyer for your specific case.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Rights Card Generator (modal) */}
            <RightsCardGenerator
                isOpen={showRightsCard}
                onClose={() => setShowRightsCard(false)}
                location={location}
            />
        </div>
    );
}
