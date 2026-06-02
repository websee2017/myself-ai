const sb = window.supabase.createClient(
  "https://zfdbptikvcyhrqtqdkxj.supabase.co",
  "sb_publishable_Jr7ICxOpjLZP78Ogwuwrcg_OBRE5eeG"
);

let currentUser = null;

// ===== 多会话数据 =====
let sessions = loadSessions();
let currentChatId = null;

// ===== 登录 =====
async function checkLogin() {
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  // 没有会话就创建一个
  if (sessions.length === 0) {
    createNewChat();
  } else {
    currentChatId = sessions[0].id;
  }

  renderSidebar();
  renderMessages();
}

checkLogin();

// ===== 获取当前会话 =====
function getCurrentChat() {
  return sessions.find(s => s.id === currentChatId);
}

// ===== New Chat（关键修复） =====
function newChat() {

  const id = "chat_" + Date.now();

  const newSession = {
    id,
    title: "New Chat",
    messages: [],
    updatedAt: Date.now()
  };

  sessions.unshift(newSession);

  // 最多20个会话
  if (sessions.length > 20) {
    sessions = sessions.slice(0, 20);
  }

  currentChatId = id;

  saveSessions();

  renderSidebar();
  renderMessages();
}

// ===== 选择会话 =====
function switchChat(id) {
  currentChatId = id;
  renderMessages();
}

// ===== sidebar渲染 =====
function renderSidebar() {

  const sidebar = document.getElementById("sidebar");

  let html = `
    <h3>🧠 MyAI</h3>
    <button onclick="newChat()">+ New Chat</button>
    <button onclick="location.href='change-password.html'">Change Password</button>
    <button onclick="logout()">Logout</button>
    <hr style="margin:10px 0;opacity:.2;">
  `;

  sessions.forEach(s => {
    html += `
      <div onclick="switchChat('${s.id}')"
        style="
          padding:8px;
          cursor:pointer;
          border-radius:8px;
          margin-bottom:6px;
          background:${s.id === currentChatId ? '#2563eb' : '#1f2937'};
        ">
        ${s.title}
      </div>
    `;
  });

  sidebar.innerHTML = html;
}

// ===== 渲染聊天 =====
function renderMessages() {

  const box = document.getElementById("messages");
  box.innerHTML = "";

  const chat = getCurrentChat();
  if (!chat) return;

  chat.messages.forEach(m => {
    addMessageUI(m.role, m.text);
  });

  scrollToBottom();
}

// ===== UI消息 =====
function addMessageUI(role, text) {

  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user" : "ai");
  div.innerText = text;

  document.getElementById("messages").appendChild(div);
}

// ===== 保存 =====
function saveSessions() {
  localStorage.setItem("myai_sessions", JSON.stringify(sessions));
}

// ===== 读取 =====
function loadSessions() {
  const data = localStorage.getItem("myai_sessions");
  return data ? JSON.parse(data) : [];
}

// ===== scroll =====
function scrollToBottom() {
  const box = document.getElementById("messages");
  box.scrollTop = box.scrollHeight;
}

// ===== Enter =====
function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

// ===== Base64 =====
function toBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// ===== logout =====
async function logout() {
  await sb.auth.signOut();
  window.location.href = "index.html";
}

// ===== send =====
async function send() {

  const input = document.getElementById("input");
  const fileInput = document.getElementById("imageInput");
  const model = document.getElementById("modelSelect").value;

  const text = input.value.trim();
  const file = fileInput.files[0];

  if (!text && !file) return;

  input.value = "";

  let image = null;
  if (file) image = await toBase64(file);

  const chat = getCurrentChat();
  if (!chat) return;

  // ===== user msg =====
  chat.messages.push({
    role: "user",
    text: text || "[Image]"
  });

  // 限制 30轮上下文（60条消息）
  if (chat.messages.length > 60) {
    chat.messages = chat.messages.slice(-60);
  }

  saveSessions();
  renderMessages();

  // AI loading
  const loadingId = document.createElement("div");
  loadingId.className = "msg ai";
  loadingId.innerText = "Thinking...";
  document.getElementById("messages").appendChild(loadingId);

  scrollToBottom();

  try {

    const res = await fetch("https://api.hippo1996.top", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        image: image,
        model: model,
        context: chat.messages.slice(-60),
        user_id: currentUser?.id
      })
    });

    const data = await res.json();

    const reply = data?.reply || "No response";

    chat.messages.push({
      role: "ai",
      text: reply
    });

    chat.updatedAt = Date.now();

    saveSessions();
    renderMessages();
    renderSidebar();

  } catch (err) {
    loadingId.innerText = "Error: " + err.message;
  }

  fileInput.value = "";
}