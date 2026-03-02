"use client";

import { useState } from "react";
import { Plus, MessageSquare, ChevronLeft, ChevronRight, Scale, Shield, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatSession {
    id: string;
    title: string;
    createdAt: Date;
    preview: string;
}

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onNewChat: () => void;
    chatHistory: ChatSession[];
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
    onDeleteChat: (id: string) => void;
    onCategoryClick: (category: string, label: string) => void;
    activeCategory: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
    { icon: "👨‍👩‍👧", label: "Family & Marriage", id: "family" },
    { icon: "🏠", label: "Property & Rent", id: "property" },
    { icon: "⚒️", label: "Labour & Employment", id: "labour" },
    { icon: "🚔", label: "Criminal Law", id: "criminal" },
    { icon: "🛒", label: "Consumer Rights", id: "consumer" },
    { icon: "💻", label: "Cyber Crime", id: "cyber" },
    { icon: "⚖️", label: "Human Rights", id: "human_rights" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByDate(chats: ChatSession[]): { label: string; chats: ChatSession[] }[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: { label: string; chats: ChatSession[] }[] = [
        { label: "Today", chats: [] },
        { label: "Yesterday", chats: [] },
        { label: "Previous 7 Days", chats: [] },
        { label: "Older", chats: [] },
    ];

    chats.forEach((chat) => {
        const d = new Date(chat.createdAt);
        if (d >= today) groups[0].chats.push(chat);
        else if (d >= yesterday) groups[1].chats.push(chat);
        else if (d >= weekAgo) groups[2].chats.push(chat);
        else groups[3].chats.push(chat);
    });

    return groups.filter((g) => g.chats.length > 0);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({
    isOpen,
    onToggle,
    onNewChat,
    chatHistory,
    activeChatId,
    onSelectChat,
    onDeleteChat,
    onCategoryClick,
    activeCategory,
}: SidebarProps) {
    const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

    const groups = groupByDate(chatHistory);

    return (
        <>
            {/* Collapsed toggle button */}
            {!isOpen && (
                <button
                    onClick={onToggle}
                    style={{
                        position: "fixed",
                        top: "16px",
                        left: "16px",
                        zIndex: 100,
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(15,15,25,0.9)",
                        color: "#9CA3AF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    <ChevronRight size={18} />
                </button>
            )}

            {/* Sidebar panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        initial={{ x: -280, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -280, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{
                            width: "280px",
                            minWidth: "280px",
                            height: "100vh",
                            background: "linear-gradient(180deg, #0F0A1A 0%, #0B0B14 100%)",
                            borderRight: "1px solid rgba(139, 92, 246, 0.08)",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            position: "relative",
                            zIndex: 50,
                        }}
                    >
                        {/* Header: Logo + Collapse */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px 16px 12px",
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
                                <span style={{ fontWeight: 700, fontSize: "16px", color: "#F0F0FF" }}>
                                    NyayMitra
                                </span>
                            </div>
                            <button
                                onClick={onToggle}
                                style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "rgba(255,255,255,0.05)",
                                    color: "#6B7280",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                        </div>

                        {/* New Chat button */}
                        <div style={{ padding: "0 12px 12px" }}>
                            <button
                                onClick={onNewChat}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "10px 14px",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(139, 92, 246, 0.25)",
                                    background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.06))",
                                    color: "#DDD6FE",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    (e.target as HTMLElement).style.background = "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(219,39,119,0.1))";
                                }}
                                onMouseLeave={(e) => {
                                    (e.target as HTMLElement).style.background = "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(219,39,119,0.05))";
                                }}
                            >
                                <Plus size={16} />
                                New Chat
                            </button>
                        </div>

                        {/* Divider */}
                        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 12px" }} />

                        {/* Chat History */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "8px 8px",
                            }}
                        >
                            {groups.length === 0 && (
                                <div
                                    style={{
                                        padding: "24px 16px",
                                        textAlign: "center",
                                        color: "#4B5563",
                                        fontSize: "13px",
                                    }}
                                >
                                    No conversations yet.
                                    <br />
                                    Start a new chat!
                                </div>
                            )}

                            {groups.map((group) => (
                                <div key={group.label} style={{ marginBottom: "8px" }}>
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            color: "#4B5563",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            padding: "8px 8px 4px",
                                        }}
                                    >
                                        {group.label}
                                    </div>
                                    {group.chats.map((chat) => (
                                        <div
                                            key={chat.id}
                                            onClick={() => onSelectChat(chat.id)}
                                            onMouseEnter={() => setHoveredChatId(chat.id)}
                                            onMouseLeave={() => setHoveredChatId(null)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                padding: "8px 10px",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                backgroundColor:
                                                    activeChatId === chat.id
                                                        ? "rgba(124, 58, 237, 0.12)"
                                                        : hoveredChatId === chat.id
                                                            ? "rgba(255,255,255,0.04)"
                                                            : "transparent",
                                                transition: "background 0.15s",
                                            }}
                                        >
                                            <MessageSquare
                                                size={14}
                                                style={{
                                                    color: activeChatId === chat.id ? "#C4B5FD" : "#6D5BA3",
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <span
                                                style={{
                                                    flex: 1,
                                                    fontSize: "13px",
                                                    color: activeChatId === chat.id ? "#E0E0FF" : "#9CA3AF",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {chat.title}
                                            </span>
                                            {hoveredChatId === chat.id && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteChat(chat.id);
                                                    }}
                                                    style={{
                                                        width: "22px",
                                                        height: "22px",
                                                        borderRadius: "4px",
                                                        border: "none",
                                                        background: "transparent",
                                                        color: "#6B7280",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        cursor: "pointer",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Divider */}
                        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 12px" }} />

                        {/* Legal Topics */}
                        <div style={{ padding: "8px 8px 4px" }}>
                            <div
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color: "#4B5563",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    padding: "4px 8px",
                                }}
                            >
                                Legal Topics
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "4px 4px 8px" }}>
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => onCategoryClick(cat.id, cat.label)}
                                        style={{
                                            fontSize: "11px",
                                            padding: "4px 10px",
                                            borderRadius: "999px",
                                            border: "1px solid rgba(139, 92, 246, 0.12)",
                                            background:
                                                activeCategory === cat.id
                                                    ? "rgba(139, 92, 246, 0.18)"
                                                    : "rgba(139, 92, 246, 0.04)",
                                            color: activeCategory === cat.id ? "#DDD6FE" : "#8B8BA3",
                                            cursor: "pointer",
                                            fontFamily: "inherit",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {cat.icon} {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer info */}
                        <div
                            style={{
                                padding: "10px 16px 14px",
                                borderTop: "1px solid rgba(139,92,246,0.08)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#6D5BA3" }}>
                                <Shield size={11} />
                                <span>NALSA Helpline: <span style={{ color: "#A78BFA", fontWeight: 600 }}>15100</span></span>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
