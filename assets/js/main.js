const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelector("[data-nav-links]");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const year = document.querySelector("[data-year]");
if (year) {
  year.textContent = new Date().getFullYear();
}

const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = contactForm.querySelector("[data-form-note]");
    const data = new FormData(contactForm);
    const name = `${data.get("first-name") || ""} ${data.get("last-name") || ""}`.trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!name || !email || !message) {
      if (note) note.textContent = "Please complete your name, email and message.";
      return;
    }

    const body = encodeURIComponent(`Assalamu alaikum, I would like to ask about a cupping appointment.

Name: ${name}
Email: ${email}
Message: ${message}`);
    window.location.href = `https://wa.me/447552540000?text=${body}`;
    if (note) note.textContent = "WhatsApp should open with the message ready.";
  });
}
