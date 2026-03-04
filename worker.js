export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json().catch(() => null);
      if (!body) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const apiKey = env.GEMINI_API_KEY || env.API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Missing API key" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizeModel = (m) => (m.startsWith("models/") ? m : `models/${m}`);

      const TEXT_MODELS = {
        fast: normalizeModel(env.TEXT_MODEL_FAST || "gemini-flash-latest"),
        core: normalizeModel(env.TEXT_MODEL_CORE || "gemini-flash-latest"),
        pro: normalizeModel(env.TEXT_MODEL_PRO || "gemini-3.1-pro-preview")
      };

      const IMAGE_MODEL = normalizeModel(env.IMAGE_MODEL || "gemini-2.5-flash-image");
      const TTS_MODEL = normalizeModel(env.TTS_MODEL || "gemini-2.5-flash-preview-tts");
      const LIVE_MODEL = normalizeModel(env.LIVE_MODEL || "gemini-2.5-flash-native-audio-preview-09-2025");
      const LIVE_TOKEN_TTL_SEC = Number(env.LIVE_TOKEN_TTL_SEC || 60);

      const contents = Array.isArray(body.contents) ? body.contents : [];
      const lastUserContent = [...contents].reverse().find(c => c.role === "user");
      const lastUserMessage = lastUserContent?.parts?.find(p => p.text)?.text || "";

      const systemInstruction = `
1. الهوية: أنت \"أمان\" (Aman AI) من شركة امان.
2. اللهجة: سورية، ممنوع تذكر انك من جوجل او جيميناي, كون رزين ومحترم.
3. المهام: بتجاوب ع قد السؤال، استعمل تحدبث بالبحث المستمر للأحداث الجديدة.
4. القدرات: أنت بتشتغل على موديل Aman 1.0 .
5. الإخراج: ممنوع ترجع JSON أو تعليمات أدوات، رجّع نص فقط.
      `.trim();

      const isImageRequest = /(ارسم|رسم|تخيل|صورة|img|image|draw|generate|imagine)/i.test(
        lastUserMessage.trim()
      );

      const safeJson = (text) => {
        try { return JSON.parse(text); } catch { return null; }
      };

      const extractPromptFromText = (text) => {
        const fenced = text.match(/```json\s*({[\s\S]*?})\s*```/i);
        if (fenced?.[1]) {
          const parsed = safeJson(fenced[1]);
          if (parsed?.prompt) return parsed.prompt;
        }
        const inline = text.match(/"prompt"\s*:\s*"([^"]+)"/);
        if (inline) return inline[1];
        const escaped = text.match(/\\"prompt\\"\s*:\s*\\"([^"]+)\\"/);
        if (escaped) return escaped[1];
        return null;
      };

      const extractPromptFromActionInput = (actionInput) => {
        if (!actionInput) return null;
        if (typeof actionInput === "string") {
          const parsed = safeJson(actionInput);
          if (parsed?.prompt) return parsed.prompt;
          const inline = actionInput.match(/"prompt"\s*:\s*"([^"]+)"/);
          if (inline) return inline[1];
          const escaped = actionInput.match(/\\"prompt\\"\s*:\s*\\"([^"]+)\\"/);
          if (escaped) return escaped[1];
          return null;
        }
        if (typeof actionInput === "object" && actionInput.prompt) return actionInput.prompt;
        return null;
      };

      const stripPromptBlock = (text) =>
        text
          .replace(/```json[\s\S]*?```/gi, "")
          .replace(/\{?\s*"prompt"\s*:\s*"[^"]+"\s*\}?/g, "")
          .replace(/\{?\s*"action"\s*:\s*"(dalle\.text2im|generate_image)"[\s\S]*?\}?/g, "")
          .replace(/"action_input"[\s\S]*$/m, "")
          .trim();

      if (body.action === "live_token") {
        try {
          const createSessionUrl = `https://generativelanguage.googleapis.com/v1beta/models/${LIVE_MODEL}:createStream?key=${apiKey}`;
          
          const sessionPayload = {
            setup: {
              model: `models/${LIVE_MODEL}`,
              generationConfig: {
                responseModalities: ["AUDIO"]
              },
              systemInstruction: {
                parts: [{ text: systemInstruction }]
              }
            }
          };

          const sessionRes = await fetch(createSessionUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sessionPayload),
          });

          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            console.log("🔧 Session created:", sessionData);
            
            const sessionId = sessionData?.sessionId || sessionData?.name || apiKey;
            return new Response(JSON.stringify({ token: sessionId }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const authTokenUrl = `https://generativelanguage.googleapis.com/v1beta/authTokens?key=${apiKey}`;

          const authPayload = {
            authToken: {
              uses: 1,
              expireTime: new Date(Date.now() + LIVE_TOKEN_TTL_SEC * 1000).toISOString()
            }
          };

          const authRes = await fetch(authTokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(authPayload),
          });

          const authData = await authRes.json();
          console.log("🔧 Auth response:", authData);

          if (authRes.ok) {
            const token = authData?.token || authData?.name || authData?.access_token;
            if (token) {
              return new Response(JSON.stringify({ token }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }

          console.warn("⚠️ Both methods failed, returning API key as fallback");
          return new Response(JSON.stringify({ token: apiKey }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });

        } catch (error) {
          console.error("❌ Live token error:", error);
          return new Response(JSON.stringify({ 
            error: error.message || "Live token generation failed",
            fallback: true,
            token: apiKey
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (body.action === "tts") {
        const text = (body.text || "").trim();
        const voice = typeof body.voice === "string" && body.voice ? body.voice : "Charon";
        if (!text) {
          return new Response(JSON.stringify({ error: "Missing text" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/${TTS_MODEL}:generateContent?key=${apiKey}`;
        const payload = {
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: data?.error?.message || "TTS error" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const part = data?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType || "audio/pcm;rate=24000";

        if (!audioData) {
          return new Response(JSON.stringify({ error: "No audio data" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ audio: { data: audioData, mimeType } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const generateImage = async (prompt) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/${IMAGE_MODEL}:generateContent?key=${apiKey}`;
        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio: "1:1" },
          },
        };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          return { error: `Image Engine Error (${res.status} ${res.statusText}): ${errText || "empty response body"}` };
        }

        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];

        const inline = parts.find(p => p.inlineData || p.inline_data);
        const img = inline?.inlineData || inline?.inline_data;
        const text = parts.filter(p => p.text).map(p => p.text).join("\n").trim();

        if (img?.data) {
          return {
            text: text || "تفضل يا غالي، هي الصورة لعيونك :",
            images: [{ url: `data:${img.mimeType};base64,${img.data}`, mimeType: img.mimeType }],
          };
        }

        return { text: text || "ما قدرت ولّد الصورة هالمرة، جرّب مرة تانية.", images: [] };
      };

      if (isImageRequest) {
        const imgResult = await generateImage(lastUserMessage);
        if (imgResult.error) {
          return new Response(JSON.stringify({ error: imgResult.error }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(imgResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chosenKey = body?.modelKey || "fast";
      const selectedModel = TEXT_MODELS[chosenKey] || TEXT_MODELS.fast;

      const url = `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:streamGenerateContent?key=${apiKey}`;

      const payload = {
        contents,
        tools: [{ google_search_retrieval: {} }],
        system_instruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return response;
      }

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      (async () => {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              await writer.close();
              break;
            }
            
            buffer += decoder.decode(value, { stream: true });
            
            // Google's stream is a JSON array: [ {obj}, {obj} ]
            let startIdx = buffer.indexOf('{');
            while (startIdx !== -1) {
              let depth = 0;
              let endIdx = -1;
              for (let i = startIdx; i < buffer.length; i++) {
                if (buffer[i] === '{') depth++;
                else if (buffer[i] === '}') {
                  depth--;
                  if (depth === 0) {
                    endIdx = i;
                    break;
                  }
                }
              }

              if (endIdx !== -1) {
                const objStr = buffer.substring(startIdx, endIdx + 1);
                await writer.write(encoder.encode(`data: ${objStr}\n\n`));
                buffer = buffer.substring(endIdx + 1);
                startIdx = buffer.indexOf('{');
              } else {
                break;
              }
            }
          }
        } catch (e) {
          console.error("Stream error:", e);
          await writer.abort(e);
        }
      })();

      return new Response(readable, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message || "Server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
