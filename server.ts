import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { INITIAL_PRODUCTS } from "./src/data/initialData.js";
import { createWhiteLabelRouter } from "./server/whiteLabelRouter.js";
import { computeDeterministicCrossSell } from "./src/utils/recommendations.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "8mb" }));
app.use("/api/whitelabel", createWhiteLabelRouter());

// Initialize Gemini SDK lazily / safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Dynamic XML Sitemap for Search Engines (SEO)
app.get("/sitemap.xml", (req, res) => {
  const host = req.get("host") || `localhost:${PORT}`;
  const protocol = req.protocol || "https";
  const baseUrl = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, "");
  const lastmod = new Date().toISOString().split("T")[0];

  const staticRoutes = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/?view=offers", priority: "0.9", changefreq: "daily" },
    { loc: "/?view=track-order", priority: "0.7", changefreq: "weekly" },
    { loc: "/?view=profile", priority: "0.7", changefreq: "weekly" },
    { loc: "/?view=wishlist", priority: "0.6", changefreq: "weekly" },
    { loc: "/?view=white-label", priority: "0.8", changefreq: "weekly" },
    { loc: "/?view=ads", priority: "0.7", changefreq: "weekly" },
    { loc: "/?view=faq", priority: "0.7", changefreq: "monthly" },
    { loc: "/?view=policies", priority: "0.6", changefreq: "monthly" },
    { loc: "/?view=about", priority: "0.7", changefreq: "monthly" },
    { loc: "/?view=sitemap", priority: "0.8", changefreq: "weekly" },
  ];

  const categories = ["electronics", "accessories", "gaming", "home", "fashion"];
  const categoryRoutes = categories.map((cat) => ({
    loc: `/?category=${cat}`,
    priority: "0.85",
    changefreq: "daily",
  }));

  const productRoutes = INITIAL_PRODUCTS.map((p) => ({
    loc: `/?product=${encodeURIComponent(p.id)}`,
    priority: "0.8",
    changefreq: "weekly",
  }));

  const escapeXml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const allUrls = [...staticRoutes, ...categoryRoutes, ...productRoutes]
    .map(
      (item) => `  <url>
    <loc>${escapeXml(`${baseUrl}${item.loc}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

// Robots.txt pointing crawlers to /sitemap.xml
app.get("/robots.txt", (req, res) => {
  const host = req.get("host") || `localhost:${PORT}`;
  const protocol = req.protocol || "https";
  const baseUrl = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, "");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

// AI Assistant Shopping Advisor powered by Gemini 3.6 Flash
app.post("/api/ai-assistant", async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "الرجاء إدخال رسالة أو استفسار." });
    }

    const ai = getGeminiClient();

    // Catalog summary for Gemini context
    const catalogSummary = INITIAL_PRODUCTS.map(p => 
      `- المعرف: ${p.id} | المنتج: ${p.name} | السعر: ${p.price} ر.س | التصنيف: ${p.categoryNameAr} | المخزون: ${p.stock} | الميزات: ${p.description}`
    ).join("\n");

    const systemInstruction = `أنت المساعد الذكي الخبير لـ "متجر رواج" (Rawaj Store)، متجر إلكتروني فاخر رائد باللغة العربية.
وظيفتك مساعدة العملاء بنبرة راقية ومحترفة وودودة باللغة العربية.

كتالوج المنتجات المتاحة حالياً في المتجر:
${catalogSummary}

قواعد الإجابة:
1. قدم نصائح دقيقة ومخصصة ومبنية على منتجات كتالوج المتجر أعلاه.
2. إذا طلب المستخدم اقتراحاً، اذكر اسم المنتج وسعره وميزاته ومبررات الاختيار.
3. يمكنك الإجابة عن الاستفسارات التقنية وسياسات الشحن والضمان (نوفر ضمان سنتين، وتوصيل مجاني للطلبات أكثر من 200 ريال).
4. في نهاية الإجابة، يرجى تضمين قائمة بالمعرفات الموصى بها في سطر خاص بالصيغة: [RECOMMENDED_IDS: prod-1, prod-2] إذا كانت هناك منتجات مناسبة.`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          ...conversationHistory.map((h: any) => ({
            role: h.sender === "user" ? "user" : "model",
            parts: [{ text: h.text }]
          })),
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        }
      });

      const responseText = response.text || "مرحباً بك! يسعدني مساعدتك في اختيار أفضل المنتجات في متجر رواج.";

      // Extract recommended IDs if any
      const match = responseText.match(/\[RECOMMENDED_IDS:\s*([\w-,\s]+)\]/);
      let recommendedProductIds: string[] = [];
      let cleanedText = responseText.replace(/\[RECOMMENDED_IDS:\s*[\w-,\s]+\]/, '').trim();

      if (match && match[1]) {
        recommendedProductIds = match[1].split(',').map(s => s.trim()).filter(Boolean);
      }

      return res.json({
        reply: cleanedText,
        recommendedProductIds
      });
    } else {
      // Intelligent fallback when Gemini API Key is not yet configured in environment
      const lower = message.toLowerCase();
      let reply = "أهلاً بك! أنا المساعد الذكي لمتجر رواج. يسعدني إجابة كافة استفساراتك واقتراح الأنسب لك.";
      let recs: string[] = [];

      if (lower.includes("حاسوب") || lower.includes("لابتوب") || lower.includes("أعمال") || lower.includes("برمجة")) {
        reply = "أنصحك بحاسوب **نيوبروم بوك برو 16** الفاخر، فهو مزود بمعالج خارق وبطارية تدوم حتى 22 ساعة وشاشة XDR مريحة جداً للعين.";
        recs = ["prod-1"];
      } else if (lower.includes("ساعة") || lower.includes("رياضة") || lower.includes("صحة")) {
        reply = "إليك **ساعة رواج الذكية Ultra Fit 3** المصنوعة من التيتانيوم والمقاومة للماء، وتوفر تتبعاً دقيقاً للغاية للأنشطة الرياضية ونبضات القلب.";
        recs = ["prod-2"];
      } else if (lower.includes("صوت") || lower.includes("سماعة") || lower.includes("عزل")) {
        reply = "سماعات **رواج بودز برو Max** توفر عزل ضوضاء تكيفي سينمائي بنسبة 99.8% وصوتاً ثلاثي الأبعاد مع بطارية 35 ساعة.";
        recs = ["prod-3"];
      } else if (lower.includes("ألعاب") || lower.includes("سوني") || lower.includes("بلايستيشن") || lower.includes("شاشة")) {
        reply = "أرشح لك جهاز **Titan Console X** أحدث منصة ألعاب 4K حقيقية مع شاشة **UltraSight 34 OLED** المنحنية لتجربة ألعاب لا تضاهى.";
        recs = ["prod-4", "prod-6"];
      } else if (lower.includes("قهوة") || lower.includes("منزل") || lower.includes("إسبيرسو")) {
        reply = "ماكينة القهوة الذكية **Espresso Master Touch** هي الخيار الأمثل لعشاق القهوة المختصة مع 19 بار ضغط إيطالي ورغوة حليب تلقائية.";
        recs = ["prod-7"];
      } else {
        reply = "يسعدني إرشادك وتوفير تفاصيل أي منتج! نوفر شحناً مجانياً للطلبات الأكبر من 200 ريال ضماناً شهيراً لمدة سنتين وصيانة شاملة.";
        recs = ["prod-1", "prod-2", "prod-4"];
      }

      return res.json({
        reply,
        recommendedProductIds: recs
      });
    }
  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    res.status(500).json({
      error: "حدث خطأ أثناء معالجة طلبك الذكي.",
      details: error.message
    });
  }
});

// AI-Powered Cross-Selling Product Recommendations (Browsing + Purchase History)
app.post("/api/recommendations/cross-sell", async (req, res) => {
  try {
    const {
      currentProductId,
      products: clientCatalog,
      browsingHistory = [],
      purchaseHistory = [],
      cartProductIds = [],
      focusMode = "all",
    } = req.body || {};

    const catalog = Array.isArray(clientCatalog) && clientCatalog.length > 0
      ? clientCatalog
      : INITIAL_PRODUCTS;

    const currentProduct = catalog.find((p: any) => p.id === currentProductId);
    if (!currentProduct) {
      return res.status(404).json({ error: "المنتج المطلوب غير موجود." });
    }

    const fallbackResult = computeDeterministicCrossSell({
      currentProduct,
      catalog,
      browsingHistory: Array.isArray(browsingHistory) ? browsingHistory : [],
      purchaseHistory: Array.isArray(purchaseHistory) ? purchaseHistory : [],
      cartProductIds: Array.isArray(cartProductIds) ? cartProductIds : [],
      focusMode: focusMode === "purchases" || focusMode === "browsing" ? focusMode : "all",
      maxResults: 3,
    });

    const ai = getGeminiClient();
    if (!ai) {
      return res.json(fallbackResult);
    }

    const candidates = catalog.filter((p: any) => p.id !== currentProduct.id && p.stock > 0);
    if (candidates.length === 0) {
      return res.json(fallbackResult);
    }

    const catalogLines = candidates
      .map(
        (p: any) =>
          `- id: ${p.id} | الاسم: ${p.name} | التصنيف: ${p.categoryNameAr} (${p.category}) | السعر: ${p.price} ر.س | التقييم: ${p.rating} | الوصف: ${p.description}`
      )
      .join("\n");

    const viewedSummary = (Array.isArray(browsingHistory) ? browsingHistory : [])
      .slice(0, 8)
      .map((b: any) => {
        const matched = catalog.find((p: any) => p.id === b.productId);
        return matched
          ? `${matched.name} (التصنيف: ${matched.categoryNameAr}، عدد المشاهدات: ${b.viewCount || 1})`
          : `${b.productId} (${b.category})`;
      })
      .join("، ");

    const purchaseSummary = (Array.isArray(purchaseHistory) ? purchaseHistory : [])
      .slice(0, 8)
      .map((p: any) => `${p.name} (${p.categoryNameAr}، طلب ${p.orderNumber})`)
      .join("، ");

    const focusInstruction =
      focusMode === "purchases"
        ? "ركّز بشكل أساسي على اقتراح مكملات تتوافق مع مشتريات العميل السابقة لتعزيز البيع المتقاطع."
        : focusMode === "browsing"
        ? "ركّز بشكل أساسي على اهتمامات العميل الظاهرة في سجل التصفح الأخير."
        : "ادمج بذكاء بين سجل التصفح والمشتريات السابقة والمنتج المعروض حالياً لاقتراح أفضل 3 منتجات بيع متقاطع.";

    const systemInstruction = `أنت محرك توصيات ذكي للبيع المتقاطع (Cross-selling) في متجر رواج الإلكتروني الفاخر.
مهمتك اختيار أفضل 3 منتجات مختلفة عن المنتج المعروض حالياً لتكملة تجربة العميل وزيادة القيمة المضافة له.
${focusInstruction}
يجب أن يكون لكل منتج سبب واضح ومقنع بالعربية (في سطر واحد موجز لا يتجاوز 18 كلمة) يربطه بسجل التصفح أو المشتريات السابقة أو المنتج الحالي.
لا تقترح معرفات غير موجودة في قائمة المرشحين، ولا تقترح المنتج المعروض حالياً (${currentProduct.id}).`;

    const promptText = `المنتج المعروض حالياً: ${currentProduct.name} (${currentProduct.categoryNameAr} - ${currentProduct.price} ر.س)
سجل التصفح الأخير للعميل: ${viewedSummary || "لم يتصفح منتجات أخرى بعد"}
المشتريات السابقة للعميل: ${purchaseSummary || "لا توجد مشتريات سابقة مسجلة"}
المنتجات الموجودة حالياً في السلة: ${Array.isArray(cartProductIds) && cartProductIds.length > 0 ? cartProductIds.join("، ") : "السلة فارغة"}

المنتجات المرشحة المتاحة في المخزون:
${catalogLines}`;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: promptText,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headlineAr: {
              type: Type.STRING,
              description: "جملة عربية موجزة توضح سبب التخصيص بناءً على سجل التصفح والمشتريات.",
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  badgeAr: {
                    type: Type.STRING,
                    description: "وسم قصير من 2-3 كلمات مثل: يكمل مشترياتك، بيع متقاطع ذكي، حسب تصفحك",
                  },
                  reasonAr: {
                    type: Type.STRING,
                    description: "سبب البيع المتقاطع باللغة العربية بشكل مختصر ومباشر.",
                  },
                  matchScore: {
                    type: Type.INTEGER,
                    description: "نسبة التوافق من 75 إلى 99",
                  },
                },
                required: ["productId", "badgeAr", "reasonAr", "matchScore"],
              },
            },
          },
          required: ["headlineAr", "recommendations"],
        },
      },
    });

    const parsed = JSON.parse((aiResponse.text ?? "{}").trim());
    const candidateMap = new Map(candidates.map((c: any) => [c.id, c]));
    const seen = new Set<string>();
    const validAiRecs = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
      .filter((item: any) => {
        if (!item || typeof item.productId !== "string") return false;
        if (!candidateMap.has(item.productId) || seen.has(item.productId)) return false;
        seen.add(item.productId);
        return true;
      })
      .slice(0, 3)
      .map((item: any) => ({
        productId: item.productId,
        badgeAr: String(item.badgeAr || "بيع متقاطع ذكي").slice(0, 32),
        reasonAr: String(item.reasonAr || "خيار متكامل يعزز تجربتك مع هذا المنتج."),
        matchScore: Math.min(99, Math.max(75, Number(item.matchScore) || 92)),
      }));

    // Pad with deterministic cross-sell items if AI returned fewer than 3
    for (const fb of fallbackResult.recommendations) {
      if (validAiRecs.length >= 3) break;
      if (!seen.has(fb.productId)) {
        seen.add(fb.productId);
        validAiRecs.push(fb);
      }
    }

    return res.json({
      headlineAr: parsed.headlineAr || fallbackResult.headlineAr,
      source: "gemini-ai",
      recommendations: validAiRecs,
    });
  } catch (error: any) {
    console.error("Cross-Sell Recommendations Error:", error);
    // Graceful fallback so PDP recommendations never break
    try {
      const {
        currentProductId,
        products: clientCatalog,
        browsingHistory = [],
        purchaseHistory = [],
        cartProductIds = [],
        focusMode = "all",
      } = req.body || {};
      const catalog = Array.isArray(clientCatalog) && clientCatalog.length > 0
        ? clientCatalog
        : INITIAL_PRODUCTS;
      const currentProduct = catalog.find((p: any) => p.id === currentProductId);
      if (currentProduct) {
        return res.json(
          computeDeterministicCrossSell({
            currentProduct,
            catalog,
            browsingHistory: Array.isArray(browsingHistory) ? browsingHistory : [],
            purchaseHistory: Array.isArray(purchaseHistory) ? purchaseHistory : [],
            cartProductIds: Array.isArray(cartProductIds) ? cartProductIds : [],
            focusMode: focusMode === "purchases" || focusMode === "browsing" ? focusMode : "all",
            maxResults: 3,
          })
        );
      }
    } catch {
      // Ignore nested error
    }
    return res.status(500).json({ error: "تعذر تحميل المنتجات المقترحة حالياً." });
  }
});

// Seller Chat endpoint for instant response simulation
app.post("/api/seller-chat", (req, res) => {
  const { message, productId } = req.body;
  const lower = (message || "").toLowerCase();
  
  let reply = "شكراً لتواصلك مع البائع! يسعدنا الإجابة عن أي استفسار تخص التجهيز والشحن والعروض الخاصة.";
  
  if (lower.includes("توصيل") || lower.includes("شحن") || lower.includes("متى")) {
    reply = "نقوم بشحن الطلبات داخل المكلا وحضرموت وصنعاء وعدن خلال 24-48 ساعة عمل، وبقية محافظات الجمهورية اليمنية خلال 2 إلى 4 أيام عمل عبر شركاء التوصيل المعتمدين.";
  } else if (lower.includes("ضمان") || lower.includes("صيانة")) {
    reply = "جميع المنتجات الإلكترونية بالمتجر خاضعة لضمان وكيل محلي معتمد لمدة 24 شهراً (سنتين) ضد عيوب المصنع.";
  } else if (lower.includes("خصم") || lower.includes("جملة") || lower.includes("كمية")) {
    reply = "يسعدنا تقديم كود خصم خاص 10% إضافي للكميات (الكود: RAWAJ10). يسري عند إضافة 2 أو أكثر من المنتجات للسلة.";
  } else if (productId) {
    const product = INITIAL_PRODUCTS.find(p => p.id === productId);
    if (product) {
      reply = `بالنسبة لمنتج "${product.name}"، فهو متوفر حالياً بالمخزون (${product.stock} قطعة)، وجاهز للشحن الفوري! هل ترغب في حجز قطعة لك؟`;
    }
  }

  return res.json({ reply, timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) });
});

// Start Server and Vite Middleware
async function start() {
  // Serve local product demonstration videos with byte-range seeking support
  app.use("/videos", express.static(path.join(process.cwd(), "public", "videos")));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
