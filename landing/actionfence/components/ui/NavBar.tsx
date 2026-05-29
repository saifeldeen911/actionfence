"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function NavBar() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npm install actionfence");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-8 mix-blend-difference text-white">
      <div className="text-xl font-medium tracking-tight">
        ActionFence
      </div>

      <nav className="hidden md:flex items-center gap-12 text-sm font-medium">
        <a href="#features" className="hover:opacity-50 transition-opacity">Features</a>
        <a href="#docs" className="hover:opacity-50 transition-opacity">Docs</a>
        <a href="#examples" className="hover:opacity-50 transition-opacity">Examples</a>
        <a href="https://github.com/saifeldeen911/actionfence" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">GitHub</a>
      </nav>

      <button
        onClick={handleCopy}
        className="text-sm font-mono hover:opacity-50 transition-opacity"
      >
        {copied ? "[ copied ]" : "[ npm install ]"}
      </button>
    </header>
  );
}
