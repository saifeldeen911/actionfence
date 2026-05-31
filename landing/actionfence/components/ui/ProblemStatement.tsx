"use client";

import { motion } from "framer-motion";

const problems = [
  {
    num: "01",
    title: "Runaway Spending",
    description: "An agent told to \"book the best flight\" books 200 hotel rooms instead. Per-call limits aren't enough — smart agents fragment $500 into 100 × $5 transactions.",
  },
  {
    num: "02",
    title: "No Audit Trail",
    description: "\"Who authorized this $2,300 charge?\" Without cryptographic receipts, you have no proof of what happened, when, or why.",
  },
  {
    num: "03",
    title: "Honor-System Security",
    description: "Most \"AI safety\" tools rely on the agent behaving correctly. Client-side enforcement is a suggestion, not a guarantee.",
  },
];

export default function ProblemStatement() {
  return (
    <section id="problem-statement" className="w-full px-6 md:px-12 py-32 border-t border-zinc-800">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12">
        
        <div className="col-span-1 lg:col-span-4">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter leading-tight lg:sticky lg:top-32">
            Agents can book flights, delete databases, and drain your Stripe balance — often before you even know it happened.
          </h2>
        </div>

        <div className="col-span-1 lg:col-span-8 flex flex-col">
          {problems.map((problem, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              key={i}
              className="group flex flex-col md:flex-row gap-6 md:gap-12 py-12 border-b border-zinc-800 first:pt-0"
            >
              <div className="text-accent/80 font-mono text-sm shrink-0 mt-1">
                {problem.num}
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-medium tracking-tight text-zinc-100 group-hover:text-accent transition-colors">
                  {problem.title}
                </h3>
                <p className="text-lg text-zinc-500 leading-relaxed max-w-2xl">
                  {problem.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
