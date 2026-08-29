"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldQuestion, XOctagon } from "lucide-react";

const verdicts = [
  {
    status: "VERIFIED",
    color: "text-verificator-verified",
    bg: "bg-verificator-verified/10",
    border: "border-verificator-verified/30",
    icon: ShieldCheck,
    desc: "The claim is completely accurate and supported by high-authority sources without contradiction."
  },
  {
    status: "PARTIALLY VERIFIED",
    color: "text-verificator-mostlyTrue",
    bg: "bg-verificator-mostlyTrue/10",
    border: "border-verificator-mostlyTrue/30",
    icon: ShieldAlert,
    desc: "The core claim is true, but contains minor inaccuracies, missing context, or relies on less definitive sources."
  },
  {
    status: "MISLEADING",
    color: "text-verificator-mixture",
    bg: "bg-verificator-mixture/10",
    border: "border-verificator-mixture/30",
    icon: AlertTriangle,
    desc: "A mix of truth and falsehoods, or true facts presented in a way that implies a false conclusion."
  },
  {
    status: "UNVERIFIED",
    color: "text-verificator-unverifiable",
    bg: "bg-verificator-unverifiable/10",
    border: "border-verificator-unverifiable/30",
    icon: ShieldQuestion,
    desc: "Insufficient authoritative evidence exists to prove or disprove the claim. Often applies to subjective statements or extreme futures."
  },
  {
    status: "FALSE",
    color: "text-verificator-false",
    bg: "bg-verificator-false/10",
    border: "border-verificator-false/30",
    icon: XOctagon,
    desc: "The claim is demonstrably inaccurate and directly contradicted by established, authoritative evidence."
  }
];

export default function NuancedVerdictGuide() {
  return (
    <div className="mx-auto w-full max-w-5xl py-24 px-6 relative z-20">
      <div className="flex flex-col md:flex-row gap-12 items-center">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <h2 className="text-3xl md:text-5xl font-display font-black tracking-wider text-foreground">
            WHY NOT JUST <br/> <span className="text-accent">TRUE OR FALSE?</span>
          </h2>
          <p className="text-muted-foreground font-mono text-sm leading-relaxed max-w-md mx-auto md:mx-0">
            Information isn't binary. The real world operates in nuances, context, and varying degrees of evidence. VeraCius maps the complexity of intelligence analysis to five distinct states, ensuring precision over simplification.
          </p>
        </div>

        <div className="flex-1 w-full flex flex-col gap-3">
          {verdicts.map((item, i) => (
            <motion.div
              key={item.status}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-2xl border ${item.bg} ${item.border} backdrop-blur-sm bg-card/50`}
            >
              <div className={`mt-0.5 shrink-0 ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`font-display font-bold tracking-wide text-sm mb-1 ${item.color}`}>
                  {item.status}
                </h4>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
