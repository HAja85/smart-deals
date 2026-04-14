import React, { useState } from "react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqsData = [
    { question: "What is SmartDeals Kuwait?", answer: "SmartDeals is Kuwait's first group-buying marketplace for supermarket essentials. Suppliers post bulk deals, consumers join them, and when the target quantity is reached, everyone saves big." },
    { question: "How does a group deal work?", answer: "A supplier creates a deal with a target quantity and a price per unit. Consumers join by selecting their desired quantity. Once the total orders reach the target before the deadline, the deal becomes Successful and all payments are captured. If the target isn't met, orders are cancelled." },
    { question: "What currency are prices shown in?", answer: "All prices on SmartDeals are shown in Kuwaiti Dinar (KWD · د.ك), formatted to 3 decimal places as is standard in Kuwait." },
    { question: "Who can create deals?", answer: "Only Supplier accounts can create products and post deals. Consumer accounts can browse deals and place orders. You choose your role when signing up." },
    { question: "What happens if a deal fails?", answer: "If a deal expires before reaching its target quantity, the deal status changes to Failed and all pending orders are automatically cancelled — no charges are made." },
    { question: "Can I place multiple orders?", answer: "Yes! You can join any active deal and select your desired quantity. Orders are tracked in your 'My Orders' page where you can see payment status in real time." },
  ];

  return (
    <section className="w-full py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#34699A] mb-3">Frequently Asked Questions</h2>
        <p className="text-gray-600 text-sm md:text-base mb-10 max-w-md mx-auto">
          Everything you need to know about group buying on SmartDeals Kuwait.
        </p>

        <div className="flex flex-col gap-3 text-left">
          {faqsData.map((faq, index) => (
            <div key={index} className="w-full bg-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between w-full p-4 cursor-pointer" onClick={() => setOpenIndex(openIndex === index ? null : index)}>
                <h3 className="text-gray-900 text-base font-medium pr-4">{faq.question}</h3>
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"
                  className={`shrink-0 ${openIndex === index ? "rotate-180" : ""} transition-transform duration-300`}>
                  <path d="m4.5 7.2 3.793 3.793a1 1 0 0 0 1.414 0L13.5 7.2" stroke="#34699A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={`px-4 overflow-hidden transition-all duration-400 ease-in-out ${openIndex === index ? "max-h-40 opacity-100 pb-4" : "max-h-0 opacity-0"}`}>
                <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
