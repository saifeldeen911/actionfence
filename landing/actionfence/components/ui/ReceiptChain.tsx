"use client";

import { motion } from "framer-motion";
import SiteContainer from "@/components/ui/SiteContainer";

const properties = [
  { title: "Hash-chained", desc: "Each receipt references the previous one. Deleting or modifying breaks the chain." },
  { title: "HMAC-SHA256 signed", desc: "Tampered receipts instantly fail signature verification." },
  { title: "Append-only", desc: "New receipts only. No updates. No deletes." },
  { title: "Verifiable", desc: "ReceiptStore.verifyChain() validates the entire chain in one call." },
  { title: "Redactable", desc: "Sensitive fields stripped before storage without breaking hash integrity." },
];

export default function ReceiptChain() {
  return (
    <section className="w-full border-t border-zinc-800 py-32">
      <SiteContainer>
        <div className="grid grid-cols-1 gap-16 xl:grid-cols-12 xl:gap-24">
        
        {/* Left: Content */}
        <div className="col-span-1 xl:col-span-5 flex flex-col gap-12">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight">
            Every decision leaves a <span className="text-accent/75">cryptographic trail.</span>
          </h2>

          <div className="flex flex-col border-t border-zinc-800">
            {properties.map((prop, i) => (
              <div key={i} className="group flex flex-col py-6 border-b border-zinc-800">
                <h3 className="text-lg font-medium text-white tracking-tight group-hover:text-accent">{prop.title}</h3>
                <p className="text-zinc-500 mt-2">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Brutalist Receipt Visual */}
        <div className="col-span-1 xl:col-span-7 flex flex-col items-center justify-center relative min-h-150 overflow-hidden border border-zinc-800 bg-[#09090b]">
          
          <div className="flex flex-col gap-8 w-full max-w-lg py-16 px-4">
            
            {/* Receipt 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="w-full border border-accent/20 bg-background p-6 font-mono text-sm relative z-10"
            >
              <div className="flex justify-between border-b border-accent/20 pb-4 mb-4">
                <span className="text-zinc-500">Receipt #a1b2c3d4</span>
                <span className="text-zinc-600">2026-05-07T14:02:11Z</span>
              </div>
              <div className="flex flex-col gap-2 text-zinc-300">
                <div className="flex justify-between"><span>Agent:</span><span className="text-white">agt_7x9f2k</span></div>
                <div className="flex justify-between"><span>Action:</span><span className="text-white">book_flight</span></div>
                <div className="flex justify-between"><span>Status:</span><span className="text-zinc-50">[+] ALLOWED</span></div>
                <div className="flex justify-between"><span>Spend:</span><span className="text-white">$250.00</span></div>
              </div>
              <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-accent/20 text-xs text-zinc-600">
                <div className="flex justify-between"><span>Payload Hash:</span><span>0x8f3a9...</span></div>
                <div className="flex justify-between"><span>Prev Hash:</span><span>0x7e2d4...</span></div>
                <div className="flex justify-between"><span>Signature:</span><span className="text-zinc-400">0x4f9b8...</span></div>
              </div>
            </motion.div>

            {/* Connecting Chain Line */}
            <div className="w-px h-16 bg-zinc-700 mx-auto -my-10 relative z-0">
              <motion.div 
                animate={{ height: ["0%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-full bg-zinc-300"
              />
            </div>

            {/* Receipt 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.2 }}
              className="w-full border border-accent/20 bg-background p-6 font-mono text-sm relative z-10 opacity-75"
            >
              <div className="flex justify-between border-b border-accent/20 pb-4 mb-4">
                <span className="text-zinc-500">Receipt #e5f6g7h8</span>
                <span className="text-zinc-600">2026-05-07T14:05:32Z</span>
              </div>
              <div className="flex flex-col gap-2 text-zinc-300">
                <div className="flex justify-between"><span>Agent:</span><span className="text-white">agt_7x9f2k</span></div>
                <div className="flex justify-between"><span>Action:</span><span className="text-white">delete_db</span></div>
                <div className="flex justify-between"><span>Status:</span><span className="text-zinc-500">[-] BLOCKED</span></div>
                <div className="flex justify-between"><span>Spend:</span><span className="text-white">$0.00</span></div>
              </div>
              <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-accent/20 text-xs text-zinc-600">
                <div className="flex justify-between"><span>Payload Hash:</span><span>0x1c9e2...</span></div>
                <div className="flex justify-between"><span>Prev Hash:</span><span className="text-zinc-400">0x8f3a9...</span></div>
                <div className="flex justify-between"><span>Signature:</span><span className="text-zinc-400">0x2a1f0...</span></div>
              </div>
            </motion.div>

          </div>
        </div>

        </div>
      </SiteContainer>
    </section>
  );
}
