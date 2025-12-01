"use client";

import { Layout } from "@/components/layout";
import Link from "next/link";

export default function HomePage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-5xl font-bold mb-6">AI Marisa Playground</h1>
        <p className="text-xl text-gray-600 mb-12">
          Plataforma para teste e avaliação de modelos de IA conversacional da
          Eleven Labs
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/login">
            <div className="p-8 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition">
              <h2 className="text-2xl font-bold mb-4">Entrar no Sistema</h2>
              <p className="text-gray-600">Acesse com seu email @marisa.care</p>
            </div>
          </Link>

          <div className="p-8 bg-gray-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Sobre</h2>
            <p className="text-gray-600">
              Teste modelos de IA, participe de A/B testing e ajude a melhorar a
              qualidade dos nossos modelos.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
