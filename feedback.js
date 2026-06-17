(() => {
  const STORAGE_KEY = "kontur-feedback-v3";
  const feedbackEndpoint = "https://komplectaciapublish.vercel.app/api/feedback";
  const state = loadState();
  const sessionId = getSessionId();
  const boxes = Array.from(document.querySelectorAll("[data-feedback]"));

  boxes.forEach((box) => {
    const key = box.dataset.feedback;
    const saved = state.sections[key] || {};
    const input = box.querySelector(".feedback-input");
    const status = document.createElement("p");
    status.className = "feedback-note";
    status.setAttribute("aria-live", "polite");
    box.appendChild(status);

    if (input) input.value = saved.comment || "";
    setSelected(box, saved.value || "");

    box.querySelectorAll(".reaction-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        state.sections[key] = state.sections[key] || {};
        state.sections[key].title = box.dataset.title;
        state.sections[key].value = button.dataset.value;
        setSelected(box, button.dataset.value);
        saveState();
        await sendFeedback({
          event: "reaction",
          section: key,
          title: box.dataset.title,
          value: button.dataset.value
        }, status);
      });
    });

    if (input) {
      input.addEventListener("input", () => {
        state.sections[key] = state.sections[key] || {};
        state.sections[key].title = box.dataset.title;
        state.sections[key].comment = input.value.trim();
        saveState();
      });

      input.addEventListener("blur", async () => {
        const comment = input.value.trim();
        if (!comment) return;
        await sendFeedback({
          event: "comment",
          section: key,
          title: box.dataset.title,
          value: state.sections[key] && state.sections[key].value ? state.sections[key].value : "",
          comment
        }, status);
      });
    }
  });

  function setSelected(box, value) {
    box.querySelectorAll(".reaction-btn").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.value === value);
    });
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { sections: {} };
    } catch {
      return { sections: {} };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async function sendFeedback(payload, statusNode) {
    setStatus(statusNode, "Отправляем ответ...");
    try {
      const response = await fetch(feedbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          sessionId,
          pageUrl: window.location.href
        })
      });

      if (!response.ok) throw new Error("Feedback endpoint error");
      setStatus(statusNode, "Ответ учтен");
    } catch {
      setStatus(statusNode, "Не удалось отправить автоматически. Можно написать в @helpkomplektbot.");
    }
  }

  function setStatus(node, message) {
    node.textContent = message;
    window.clearTimeout(node._timer);
    node._timer = window.setTimeout(() => {
      node.textContent = "";
    }, 7000);
  }

  function getSessionId() {
    if (state.sessionId) return state.sessionId;
    state.sessionId = "s-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
    saveState();
    return state.sessionId;
  }
})();
