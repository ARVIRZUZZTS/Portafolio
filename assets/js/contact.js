/* =====================================================================
   CONTACTO · enlaces (WhatsApp/Email) + envío con EmailJS
   El SDK de EmailJS se carga solo cuando el usuario envía el formulario.
   ===================================================================== */
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const cfg = window.WKConfig;
    if (!cfg) return;

    /* ---------------- Enlaces de contacto ---------------- */
    const wa = document.getElementById("whatsappCard");
    if (wa) {
      const text = encodeURIComponent(cfg.site.whatsappMsg);
      wa.href = `https://wa.me/${cfg.site.whatsapp}?text=${text}`;
    }
    const mail = document.getElementById("mailCard");
    if (mail) mail.href = `mailto:${cfg.site.email}`;

    /* ---------------- Toast ---------------- */
    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toastText");
    let toastTimer = null;
    function showToast(msg, isError) {
      if (!toast || !toastText) return;
      toastText.textContent = msg;
      toast.classList.toggle("toast--error", !!isError);
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
    }
    window.WKToast = showToast;

    /* ---------------- Formulario ---------------- */
    const form = document.getElementById("contactForm");
    const status = document.getElementById("formStatus");
    const btn = document.getElementById("submitBtn");
    const label = document.getElementById("submitLabel");
    if (!form) return;

    const t = window.WKi18n ? window.WKi18n.t : () => "";
    let sdkPromise = null;

    function loadEmailJS() {
      if (window.emailjs) return Promise.resolve(window.emailjs);
      if (sdkPromise) return sdkPromise;
      sdkPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
        s.onload = () => (window.emailjs ? resolve(window.emailjs) : reject(new Error("SDK")));
        s.onerror = () => reject(new Error("No se pudo cargar EmailJS"));
        document.head.appendChild(s);
      });
      return sdkPromise;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        status.dataset.state = "error";
        status.textContent = t("contact.error");
        return;
      }

      const { publicKey, serviceId, templateId } = cfg.emailjs;
      if (!publicKey || publicKey.startsWith("TU_")) {
        status.dataset.state = "error";
        status.textContent = t("contact.error");
        showToast(t("contact.error"), true);
        return;
      }

      btn.disabled = true;
      status.dataset.state = "";
      status.textContent = t("contact.sending");
      if (label) label.textContent = t("contact.sending") + "…";

      try {
        const sdk = await loadEmailJS();
        sdk.init({ publicKey });
        await sdk.send(serviceId, templateId, {
          name, email, message,
          title: "Nuevo mensaje desde tu portafolio",
          time: new Date().toLocaleString(),
        });
        status.dataset.state = "ok";
        status.textContent = t("contact.success");
        showToast(t("contact.success"));
        form.reset();
      } catch (err) {
        console.error(err);
        status.dataset.state = "error";
        status.textContent = t("contact.error");
        showToast(t("contact.error"), true);
      } finally {
        btn.disabled = false;
        if (label) label.textContent = t("contact.submit");
      }
    });
  });
})();
