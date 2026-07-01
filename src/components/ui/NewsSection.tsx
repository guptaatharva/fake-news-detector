"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface Article {
  title: string;
  description: string;
  image: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

export default function NewsSection() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="w-full max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-5xl font-bold">
            🔥 Trending News in India
          </h2>

          <p className="mt-4 text-lg text-gray-400">
            Loading today's headlines...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-7xl mx-auto">

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-5xl md:text-6xl font-extrabold">
          🔥 Trending News in India
        </h2>

        <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
          Stay updated with today's biggest headlines from trusted news sources.
          Verify every story before you believe or share it.
        </p>
      </motion.div>

      {/* Cards */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

        {articles.map((article, index) => (
          <motion.div
            key={index}
            initial={{
              opacity: 0,
              y: 40,
              scale: 0.9,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            viewport={{ once: true }}
            transition={{
              duration: 0.55,
              delay: index * 0.1,
            }}
            whileHover={{
              scale: 1.04,
              y: -10,
            }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-lg transition-all duration-300 hover:border-teal-500 hover:shadow-[0_0_35px_rgba(20,184,166,0.35)]"
          >
            {article.image && (
              <div className="overflow-hidden">
                <motion.img
                  src={article.image}
                  alt={article.title}
                  className="h-56 w-full object-cover"
                  whileHover={{
                    scale: 1.08,
                  }}
                  transition={{
                    duration: 0.35,
                  }}
                />
              </div>
            )}

            <div className="flex h-[420px] flex-col p-6">

              <p className="mb-3 text-sm text-teal-400">
                {article.source.name}
              </p>

              <h3 className="mb-4 text-2xl font-bold leading-tight line-clamp-3">
                {article.title}
              </h3>

              <p className="flex-grow text-gray-400 line-clamp-4">
                {article.description}
              </p>

              <div className="mt-6 flex gap-3">

                <Link
                  href="/dashboard"
                  className="flex-1"
                >
                  <button className="w-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600 py-3 font-semibold transition hover:scale-105">
                    Verify →
                  </button>
                </Link>

                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <button className="w-full rounded-full border border-white/20 py-3 transition hover:bg-white/10">
                    Read
                  </button>
                </a>

              </div>

            </div>
          </motion.div>
        ))}

      </div>

    </section>
  );
}