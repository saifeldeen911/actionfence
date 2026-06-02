import Image from "next/image";

export default function TrustModelDiagram() {
  return (
    <div className="w-full flex flex-col border border-zinc-800 bg-[#09090b] rounded-xl overflow-hidden shadow-2xl">
      {/* Top Half: Diagram */}
      <div className="relative w-full flex items-center justify-center p-3 md:p-8 lg:p-12 overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />

      {/* Diagram Container */}
      <div className="w-full overflow-x-auto pb-6 -mb-6 md:pb-0 md:mb-0">
        <div className="relative z-10 flex flex-row items-center justify-between min-w-72.5 w-full mx-auto h-45 md:h-50 px-1 md:px-0">
          
          {/* Left Column */}
          <div className="flex-none relative z-20">
            <div className="relative inline-flex items-center justify-center px-3 md:px-6 h-10 md:h-12 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-zinc-300 font-medium text-[11px] md:text-sm shadow-xl backdrop-blur-sm whitespace-nowrap">
              AI Agent
              <div className="absolute -right-1 md:-right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 bg-[#09090b] border border-zinc-500 rounded-sm" />
            </div>
          </div>

          {/* Connector Left */}
          <div className="flex-1 h-full relative z-10 min-w-4 md:min-w-12 flex items-center">
             <div className="w-full h-0.5 bg-linear-to-r from-zinc-500 to-[#7c83ff]" />
          </div>

          {/* Middle Column */}
          <div className="flex-none relative z-20">
            <div className="relative flex items-center justify-center w-16 h-16 md:w-28 md:h-28 bg-[#09090b] border-2 border-accent rounded-xl md:rounded-4xl shadow-[0_0_30px_rgba(124,131,255,0.2)]">
              <div className="absolute -left-1 md:-left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 bg-[#09090b] border border-accent rounded-sm" />
              {/* Enlarged Logo */}
              <Image src="/icon-work/actionfence-favicon-master.png" alt="ActionFence" width={80} height={80} className="w-12 h-12 md:w-20 md:h-20 object-contain" />
              <div className="absolute -right-1 md:-right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 bg-[#09090b] border border-accent rounded-sm" />
            </div>
          </div>

          {/* Connector Right */}
          <div className="flex-1 h-full relative z-10 min-w-4 md:min-w-12">
             <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 200">
               <path d="M 0,100 C 40,100 60,36 100,36" fill="none" stroke="url(#grad-right)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
               <path d="M 0,100 C 40,100 60,164 100,164" fill="none" stroke="url(#grad-right)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
               <defs>
                 <linearGradient id="grad-right" x1="0%" y1="0%" x2="100%" y2="0%">
                   <stop offset="0%" stopColor="#7c83ff" />
                   <stop offset="100%" stopColor="#71717a" />
                 </linearGradient>
               </defs>
            </svg>
          </div>

          {/* Right Column */}
          <div className="flex-none flex flex-col justify-between h-45 md:h-50 py-4 md:py-3 relative z-20">
            <div className="relative flex items-center justify-center w-24 md:w-32 h-10 md:h-12 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-zinc-300 font-medium text-[11px] md:text-sm shadow-xl backdrop-blur-sm whitespace-nowrap">
              <div className="absolute -left-1 md:-left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 bg-[#09090b] border border-zinc-500 rounded-sm" />
              MCP Tools
            </div>
            <div className="relative flex items-center justify-center w-24 md:w-32 h-10 md:h-12 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-zinc-300 font-medium text-[11px] md:text-sm shadow-xl backdrop-blur-sm whitespace-nowrap">
              <div className="absolute -left-1 md:-left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 bg-[#09090b] border border-zinc-500 rounded-sm" />
              APIs
            </div>
          </div>

        </div>
      </div>
      </div>

      {/* Bottom Half: Cloudflare-style description */}
      <div className="w-full border-t border-zinc-800 p-6 md:p-8 bg-zinc-900/20">
        <h3 className="text-zinc-100 font-medium text-lg md:text-xl mb-2 tracking-tight">Zero-Trust Architecture</h3>
        <p className="text-zinc-400 text-sm md:text-base max-w-3xl leading-relaxed">
          Policy lives entirely on your server. Agents cannot bypass the middleware, read the 
          <code className="mx-1.5 px-1.5 py-0.5 bg-zinc-800 border border-zinc-700/50 rounded-md text-accent text-[13px] font-mono">guard-policy.json</code>, 
          or tamper with the cryptographic receipt chain.
        </p>
      </div>
    </div>
  );
}
