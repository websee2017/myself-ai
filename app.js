const sb = window.supabase.createClient(
  "https://zfdbptikvcyhrqtqdkxj.supabase.co",
  "sb_publishable_Jr7ICxOpjLZP78Ogwuwrcg_OBRE5eeG"
);

let currentUser = null;

let sessions = [];
let currentChatId = null;

/* -------------------- 登录检查 -------------------- */

async function checkLogin() {
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  sessions = loadSessions();

  if (sessions.length === 0) {
    createNewChat();
  } else {
    currentChatId = sessions[0].id;
  }

  renderSidebar();
  renderMessages();
}

checkLogin();

/* -------------------- 会话管理 -------------------- */

function createNewChat() {

  const chatId = "chat_" + Date.now();

  const chat = {
    id: chatId,
    title: "New Chat",
    messages: [],
    updatedAt: Date.now()
  };

  sessions.unshift(chat);

  if (sessions.length > 20) {
    sessions = sessions.slice(0, 20);
  }

  currentChatId = chatId;

  saveSessions();

  renderSidebar();
  renderMessages();
}

function newChat() {
  createNewChat();
}

function switchChat(chatId) {

  currentChatId = chatId;

  renderSidebar();
  renderMessages();
}

function deleteChat(chatId) {

  const ok = confirm(
    "Delete this conversation?"
  );

  if (!ok) return;

  sessions = sessions.filter(
    s => s.id !== chatId
  );

  if (currentChatId === chatId) {

    if (sessions.length > 0) {

      currentChatId =
        sessions[0].id;

    } else {

      createNewChat();
      return;

    }

  }

  saveSessions();

  renderSidebar();
  renderMessages();

}

function getCurrentChat() {
  return sessions.find(
    s => s.id === currentChatId
  );
}

/* -------------------- localStorage -------------------- */

function saveSessions() {

  localStorage.setItem(
    "myai_sessions",
    JSON.stringify(sessions)
  );
}

function loadSessions() {

  const data =
    localStorage.getItem("myai_sessions");

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/* -------------------- Sidebar -------------------- */

function renderSidebar() {

  const chatList =
    document.getElementById("chatList");

  if (!chatList) return;

  chatList.innerHTML = "";

  sessions.forEach((chat, index) => {

    const item =
      document.createElement("div");

    item.className = "chat-item";

    if (chat.id === currentChatId) {
      item.classList.add("active");
    }

    const title =
      document.createElement("span");

    title.textContent =
      "Chat " + (index + 1);

    title.onclick = () => {
      switchChat(chat.id);
    };

    const delBtn =
      document.createElement("button");

    delBtn.className =
      "delete-chat";

    delBtn.innerHTML = "🗑";

    delBtn.title =
      "Delete Chat";

    delBtn.onclick = (e) => {

      e.stopPropagation();

      deleteChat(chat.id);

    };

    item.appendChild(title);
    item.appendChild(delBtn);

    chatList.appendChild(item);

  });

}

/* -------------------- Messages -------------------- */

function renderMessages() {

  const box =
    document.getElementById("messages");

  if (!box) return;

  box.innerHTML = "";

  const chat = getCurrentChat();

  if (!chat) return;

  chat.messages.forEach(msg => {

    const div =
      document.createElement("div");

    div.className =
      "msg " +
      (msg.role === "user"
        ? "user"
        : "ai");

    div.innerText = msg.text;

    box.appendChild(div);
  });

  scrollToBottom();
}

function addMessageUI(role, text) {

  const div =
    document.createElement("div");

  div.className =
    "msg " +
    (role === "user"
      ? "user"
      : "ai");

  div.innerText = text;

  document
    .getElementById("messages")
    .appendChild(div);

  scrollToBottom();

  return div;
}

function scrollToBottom() {

  const box =
    document.getElementById("messages");

  box.scrollTop =
    box.scrollHeight;
}

/* -------------------- Enter发送 -------------------- */

function handleKey(event) {

  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {
    event.preventDefault();
    send();
  }
}

/* -------------------- 图片处理 -------------------- */

function toBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(reader.result);

      reader.onerror = reject;

      reader.readAsDataURL(file);
    }
  );
}

/* -------------------- Logout -------------------- */

async function logout() {

  await sb.auth.signOut();

  window.location.href =
    "index.html";
}

/* -------------------- Send -------------------- */

async function send() {

  const input =
    document.getElementById("input");

  const imageInput =
    document.getElementById("imageInput");

  const model =
    document.getElementById("modelSelect")
      .value;

  const text =
    input.value.trim();

  const file =
    imageInput.files[0];

  if (!text && !file) return;

  input.value = "";

  let image = null;

  if (file) {
    image = await toBase64(file);
  }

  const chat = getCurrentChat();

  if (!chat) return;

  /* 用户消息 */

  const userText =
    text || "[Image]";

  chat.messages.push({
    role: "user",
    text: userText
  });
  
  if (chat.messages.length > 60) {
    chat.messages =
      chat.messages.slice(-60);
  }

  saveSessions();

  renderSidebar();
  renderMessages();

  const loadingDiv =
    addMessageUI(
      "ai",
      "Thinking..."
    );

  try {

    const res =
      await fetch(
        "https://api.hippo1996.top",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            message: text,
            image: image,
            model: model,
            context:
              chat.messages.slice(-60),
            user_id:
              currentUser?.id
          })
        }
      );

    const data =
      await res.json();

    const reply =
      data.reply ||
      "No response";

    loadingDiv.innerText =
      reply;

    chat.messages.push({
      role: "ai",
      text: reply
    });

    if (
      chat.messages.length > 60
    ) {
      chat.messages =
        chat.messages.slice(-60);
    }

    saveSessions();

    renderMessages();

  } catch (err) {

    loadingDiv.innerText =
      "Error: " + err.message;
  }

  imageInput.value = "";
}

// ===== 模型显示 =====

const modelSelect =
  document.getElementById("modelSelect");

if (modelSelect) {

  modelSelect.addEventListener("change", () => {

    const currentModel =
      document.getElementById("currentModel");

    if (currentModel) {

      currentModel.textContent =
        "Current Model: " +
        modelSelect.options[
          modelSelect.selectedIndex
        ].text;

    }

  });

}