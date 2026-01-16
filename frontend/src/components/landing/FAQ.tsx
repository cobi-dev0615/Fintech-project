import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Meus dados financeiros estão seguros?",
    answer: "Sim, absolutamente. Utilizamos criptografia de 256 bits de nível bancário e solicitamos apenas acesso somente leitura às suas contas através das APIs oficiais do Open Finance. Nunca armazenamos suas credenciais bancárias."
  },
  {
    question: "Quais bancos e instituições são suportados?",
    answer: "Suportamos todos os principais bancos brasileiros, incluindo Itaú, Bradesco, Santander, Banco do Brasil, Nubank, Inter e muitos outros através do ecossistema Open Finance."
  },
  {
    question: "Como funciona a integração com a B3?",
    answer: "Conectamos diretamente à B3 (Bolsa de Valores Brasileira) usando seu CPF. Isso nos permite importar automaticamente todas as suas posições de ações, FIIs e BDRs com cotações em tempo real."
  },
  {
    question: "Posso cancelar minha assinatura a qualquer momento?",
    answer: "Sim, você pode cancelar sua assinatura a qualquer momento. Se cancelar, continuará tendo acesso até o final do período de cobrança atual."
  },
  {
    question: "O que acontece se eu atingir meu limite de conexões?",
    answer: "Se você atingir o limite de conexões do seu plano, pode fazer upgrade para um plano superior ou desconectar uma instituição existente para adicionar uma nova."
  },
  {
    question: "Vocês oferecem suporte para assessores financeiros?",
    answer: "Sim! Nosso plano Business foi projetado especificamente para assessores financeiros e consultores, permitindo gerenciar múltiplos portfólios de clientes com relatórios white-label."
  }
];

const FAQ = () => {
  return (
    <section className="py-24 bg-gray-950">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Perguntas frequentes
            </h2>
            <p className="text-lg text-gray-400">
              Tudo que você precisa saber sobre o zurT.
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl px-6 data-[state=open]:border-orange-500/50 data-[state=open]:shadow-lg transition-all"
              >
                <AccordionTrigger className="text-left font-medium text-white hover:no-underline py-5 hover:text-orange-400 transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
