import { GoogleGenAI } from "@google/genai";
import { db, rtdb } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { ref, get } from "firebase/database";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getSiteData() {
  const productsSnapshot = await get(ref(rtdb, "products"));
  const products = productsSnapshot.val() ? Object.values(productsSnapshot.val()) : [];
  
  let settings = [];
  try {
    const settingsSnapshot = await getDocs(collection(db, "settings"));
    settings = settingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Settings Firestore error:", error);
  }

  return {
    productCount: products.length,
    products,
    settings,
    adminName: "আশিকুর রহমান",
    companyName: "রেক রেডিয়েন্ট ট্রেডার্স",
    location: "সালামপুর, লালপুর, নাটোর",
    openingTime: "সকাল ০৯টা থেকে রাত ১০টা",
    adminContact: "০১৭১৫৮৩৬৮৯৭",
    developerContact: "০১৩২৮২৭৬২৪০"
  };
}

export async function askAI(question: string, context: any) {
  const safeContext = context || {
    productCount: 0,
    adminName: "আশিকুর রহমান",
    companyName: "রেক রেডিয়েন্ট ট্রেডার্স",
    location: "সালামপুর, লালপুর, নাটোর",
    openingTime: "সকাল ০৯টা থেকে রাত ১০টা",
    adminContact: "০১৭১৫৮৩৬৮৯৭",
    developerContact: "০১৩২৮২৭৬২৪০",
    products: []
  };

  const prompt = `
    You are a helpful AI assistant for an e-commerce website.
    Use the following context to answer the user's question in Bengali.
    Keep the answer concise, helpful, and friendly.
    If the user asks about sensitive data, do not reveal it.
    If the user asks for contact info, provide it.
    If the user asks for WhatsApp, provide a link in the format: [WhatsApp-এ যোগাযোগ](https://wa.me/8801328276240).
    
    Context:
    - Product count: ${safeContext.productCount}
    - Admin Name: ${safeContext.adminName}
    - Company Name: ${safeContext.companyName}
    - Location: ${safeContext.location}
    - Opening Time: ${safeContext.openingTime}
    - Admin contact: ${safeContext.adminContact}
    - Developer contact: ${safeContext.developerContact}
    - Products: ${JSON.stringify(safeContext.products.slice(0, 10))} (only showing first 10 for brevity)
    
    User Question: ${question}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "দুঃখিত, আমি এই প্রশ্নের উত্তর দিতে পারছি না।";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "দুঃখিত, বর্তমানে এআই সহকারী কাজ করছে না। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
  }
}
