(() => {
  function initFeatureImageLightbox() {
    const images = [...document.querySelectorAll(".feature-image")];

    if (!images.length || document.querySelector(".image-lightbox")) {
      return;
    }

    const lightbox = document.createElement("div");
    lightbox.className = "image-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.setAttribute("aria-label", "Full-size image preview");

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "image-lightbox-close";
    closeButton.setAttribute("aria-label", "Close image");
    closeButton.textContent = "×";

    const preview = document.createElement("img");
    preview.className = "image-lightbox-preview";
    preview.alt = "";

    lightbox.append(closeButton, preview);
    document.body.appendChild(lightbox);

    let lastFocusedElement = null;

    function openLightbox(image) {
      lastFocusedElement = document.activeElement;
      preview.src = image.currentSrc || image.src;
      preview.alt = image.alt || "";
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      closeButton.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      preview.removeAttribute("src");

      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }
    }

    images.forEach((image) => {
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute("aria-haspopup", "dialog");
      image.setAttribute("aria-label", `${image.alt || "Image"} — open full size`);

      image.addEventListener("click", () => openLightbox(image));
      image.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(image);
        }
      });
    });

    closeButton.addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox.classList.contains("open")) {
        closeLightbox();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFeatureImageLightbox);
  } else {
    initFeatureImageLightbox();
  }
})();