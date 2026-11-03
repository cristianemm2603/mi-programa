document.addEventListener('DOMContentLoaded', () => {
  const recoveryForm = document.getElementById('recovery-form');
  const secondaryForgotLink = document.querySelector('.secondary-forgot-link');

  if (recoveryForm) {
    recoveryForm.addEventListener('submit', (event) => {
      event.preventDefault(); // Evita que la página se recargue inmediatamente

      const usernameInput = document.getElementById('recovery-username');
      const formMessage = document.getElementById('form-message');
      const emailValue = usernameInput.value.trim();

      // Expresión regular para validar formato de correo electrónico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Limpiar mensajes y estilos previos
      formMessage.textContent = '';
      formMessage.style.color = '';

      // 1. Si el formato no corresponde a un correo válido
      if (!emailRegex.test(emailValue)) {
        formMessage.style.color = '#c0392b'; // Mismo color de error de tu styles.css (--color-error)
        formMessage.textContent = 'usuario incorrecto';
        return;
      }

      // 2. Si el correo es correcto y válido
      formMessage.style.color = '#1e7e34'; // Color de éxito verde
      formMessage.textContent = 'enviando...';

      // Simulamos un pequeño retraso de 1.2 segundos para que el usuario visualice el mensaje verde de éxito
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);
    });
  }

  // Redirección complementaria para "¿Olvidaste tu usuario?"
  if (secondaryForgotLink) {
    secondaryForgotLink.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = 'usuario.html';
    });
  }
});
