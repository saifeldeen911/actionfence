import SectionShell from "./SectionShell";

const properties = [
  { title: "Hash-chained", desc: "Each receipt references the previous one, so edits or deletions break continuity immediately." },
  { title: "HMAC-SHA256 signed", desc: "Every decision record is signed, and tampering fails verification on replay." },
  { title: "Append-only", desc: "History grows forward only; no record updates and no silent rewrites." },
  { title: "Verifiable", desc: "ReceiptStore.verifyChain() can validate the full timeline in a single integrity pass." },
  { title: "Redactable", desc: "Sensitive fields can be removed for storage while preserving decision integrity." },
];

export default function ReceiptChain() {
  return (
    <section className="w-full py-32 border-t border-zinc-800">
      <SectionShell>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-16 xl:gap-24">
        
        {/* Left: Content */}
        <div className="col-span-1 xl:col-span-5 flex flex-col gap-12">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tighter leading-tight">
            Every decision leaves a <span className="text-accent/75">cryptographic trail.</span>
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
            When someone asks who approved what, when, and under which policy, the receipt chain gives a verifiable answer.
          </p>

          <div className="flex flex-col border-t border-zinc-800">
            {properties.map((prop, i) => (
              <div key={i} className="group flex flex-col py-6 border-b border-zinc-800">
                <h3 className="text-lg font-medium text-white tracking-tight group-hover:text-accent">{prop.title}</h3>
                <p className="text-zinc-500 mt-2">{prop.desc}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Proof captured. Next step: install and enforce.
          </p>
        </div>

        {/* Right: Brutalist Receipt Visual */}
        <div className="col-span-1 xl:col-span-7 flex flex-col items-center justify-center relative min-h-150 overflow-hidden border border-zinc-800 bg-[#09090b]">
          
          <div className="flex flex-col gap-8 w-full max-w-lg py-16 px-4">
            
            {/* Receipt 1 */}
            <div
              className="w-full border border-accent/20 bg-background p-6 font-mono text-sm relative z-10"
            >
              <div className="flex justify-between border-b border-accent/20 pb-4 mb-4">
                <span className="text-zinc-400">Receipt #a1b2c3d4</span>
                <span className="text-zinc-400">2026-05-07T14:02:11Z</span>
              </div>
              <div className="flex flex-col gap-2 text-zinc-300">
                <div className="flex justify-between"><span>Agent:</span><span className="text-white">agt_7x9f2k</span></div>
                <div className="flex justify-between"><span>Action:</span><span className="text-white">book_flight</span></div>
                <div className="flex justify-between"><span>Status:</span><span className="text-zinc-50">[+] ALLOWED</span></div>
                <div className="flex justify-between"><span>Spend:</span><span className="text-white">$250.00</span></div>
              </div>
              <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-accent/20 text-xs text-zinc-400">
                <div className="flex justify-between"><span>Payload Hash:</span><span>0x8f3a9...</span></div>
                <div className="flex justify-between"><span>Prev Hash:</span><span>0x7e2d4...</span></div>
                <div className="flex justify-between"><span>Signature:</span><span className="text-zinc-400">0x4f9b8...</span></div>
              </div>
            </div>

            {/* Connecting Chain Line */}
            <div className="w-px h-16 bg-zinc-700 mx-auto -my-10 relative z-0">
              <div className="h-full w-full bg-zinc-300/80" />
            </div>

            {/* Receipt 2 */}
            <div
              className="w-full border border-accent/20 bg-background p-6 font-mono text-sm relative z-10"
            >
              <div className="flex justify-between border-b border-accent/20 pb-4 mb-4">
                <span className="text-zinc-400">Receipt #e5f6g7h8</span>
                <span className="text-zinc-400">2026-05-07T14:05:32Z</span>
              </div>
              <div className="flex flex-col gap-2 text-zinc-300">
                <div className="flex justify-between"><span>Agent:</span><span className="text-white">agt_7x9f2k</span></div>
                <div className="flex justify-between"><span>Action:</span><span className="text-white">delete_db</span></div>
                <div className="flex justify-between"><span>Status:</span><span className="text-zinc-300">[-] BLOCKED</span></div>
                <div className="flex justify-between"><span>Spend:</span><span className="text-white">$0.00</span></div>
              </div>
              <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-accent/20 text-xs text-zinc-400">
                <div className="flex justify-between"><span>Payload Hash:</span><span>0x1c9e2...</span></div>
                <div className="flex justify-between"><span>Prev Hash:</span><span className="text-zinc-400">0x8f3a9...</span></div>
                <div className="flex justify-between"><span>Signature:</span><span className="text-zinc-400">0x2a1f0...</span></div>
              </div>
            </div>

          </div>
        </div>

        </div>
      </SectionShell>
    </section>
  );
}
