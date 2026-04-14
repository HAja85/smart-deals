import React from "react";

const Testimonial = () => {
  const cardsData = [
    { image: "https://randomuser.me/api/portraits/men/32.jpg", name: "Khalid Al-Mutairi", handle: "Kuwait City", text: "Ordered 3 cartons of water through a group deal — saved almost 30% compared to the supermarket price!" },
    { image: "https://randomuser.me/api/portraits/women/44.jpg", name: "Fatima Al-Rashidi", handle: "Salmiya", text: "Finally a platform that makes bulk buying easy for families. The countdown timer keeps me motivated to act fast!" },
    { image: "https://randomuser.me/api/portraits/men/68.jpg", name: "Ahmed Al-Sabah", handle: "Hawalli", text: "As a restaurant owner, group deals on cooking oil and rice are exactly what I needed. Excellent service." },
    { image: "https://randomuser.me/api/portraits/women/21.jpg", name: "Maryam Al-Hajri", handle: "Jabriya", text: "The progress bar on each deal is brilliant — you can see how close a deal is to success in real time." },
    { image: "https://randomuser.me/api/portraits/men/15.jpg", name: "Yousef Al-Kandari", handle: "Farwaniya", text: "Joined a deal for 50 egg trays and saved over 15 KWD. My catering business loves SmartDeals!" },
    { image: "https://randomuser.me/api/portraits/women/56.jpg", name: "Nour Al-Ameeri", handle: "Rumaithiya", text: "Clean UI, fast checkout, and real savings. I check SmartDeals every week for new group deals." },
  ];

  const CreateCard = ({ card }) => (
    <div className="p-5 rounded-xl mx-3 shadow-md bg-white hover:shadow-lg transition-all duration-300 w-64 sm:w-72 shrink-0 border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <img className="w-11 h-11 rounded-full object-cover border-2 border-[#58A0C8]" src={card.image} alt={card.name} />
        <div>
          <p className="font-semibold text-gray-900 text-sm">{card.name}</p>
          <span className="text-xs text-emerald-600 font-medium">{card.handle}</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">"{card.text}"</p>
      <div className="flex gap-1 mt-3">
        {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-sm">★</span>)}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes marqueeScroll { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        .marquee-inner { animation: marqueeScroll 30s linear infinite; }
        .marquee-reverse { animation-direction: reverse; }
      `}</style>

      <section className="py-16 bg-gray-50">
        <div className="text-center mb-10 px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#34699A] mb-3">What Our Clients Say</h2>
          <p className="text-gray-600 max-w-xl mx-auto text-sm md:text-base">
            Real savings from real Kuwaiti shoppers who buy smarter with SmartDeals.
          </p>
        </div>

        <div className="w-full mx-auto max-w-[1505px] overflow-hidden relative">
          <div className="marquee-inner flex transform-gpu min-w-[200%] py-4">
            {[...cardsData, ...cardsData].map((card, i) => <CreateCard key={i} card={card} />)}
          </div>
        </div>

        <div className="w-full mx-auto max-w-[1505px] overflow-hidden relative mt-4">
          <div className="marquee-inner marquee-reverse flex transform-gpu min-w-[200%] py-4">
            {[...cardsData, ...cardsData].map((card, i) => <CreateCard key={i} card={card} />)}
          </div>
        </div>
      </section>
    </>
  );
};

export default Testimonial;
