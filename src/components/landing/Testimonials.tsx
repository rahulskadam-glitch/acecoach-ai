"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Ava Martinez",
    role: "Competitive Player",
    quote: "AceCoach AI transformed my footwork and timing with insights that feel like a coach in my pocket.",
    rating: 5,
  },
  {
    name: "Marcus Chen",
    role: "Performance Coach",
    quote: "The report cards help athletes internalize their mechanics and train with clarity every week.",
    rating: 5,
  },
  {
    name: "Lena Osei",
    role: "College Athlete",
    quote: "Every session reveals the one detail I need to improve next. The AI feedback is incredibly precise.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-24 py-20">
      <div className="max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Testimonials</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Athletes and coaches trust AceCoach AI for better training.
        </h2>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <motion.article
            key={testimonial.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
            className="rounded-[2rem] border border-white/10 bg-[#0C1626]/95 p-8 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-300">
                <span className="text-sm font-semibold uppercase tracking-[0.24em]">{testimonial.name.charAt(0)}</span>
              </div>
              <div>
                <p className="font-semibold text-white">{testimonial.name}</p>
                <p className="text-sm text-slate-400">{testimonial.role}</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-300">
                {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4" />
                ))}
              </div>
              <p className="text-base leading-7 text-slate-300">{testimonial.quote}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
